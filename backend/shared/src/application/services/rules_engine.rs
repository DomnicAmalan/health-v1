//! Rules Engine Service - Custom Business Rules Evaluation
//!
//! A lightweight, pure-Rust rules engine for healthcare applications.
//! Supports:
//! - Decision tables with pattern matching
//! - Dynamic tax calculation by jurisdiction
//! - Drug scheduling and interaction rules
//! - Compliance enforcement (HIPAA, GDPR, etc.)
//! - Clinical decision support
//! - Workflow routing

use std::collections::HashMap;
use std::sync::Arc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::RwLock;

use crate::shared::{AppError, AppResult};

// ============================================================================
// Rule Categories and Types
// ============================================================================

/// Rule categories for organization
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum RuleCategory {
    /// Tax calculation rules
    Tax,
    /// Drug scheduling and regulation rules
    DrugScheduling,
    /// Compliance enforcement rules
    Compliance,
    /// Billing and pricing rules
    Billing,
    /// Clinical decision support rules
    Clinical,
    /// Workflow routing rules
    Workflow,
    /// Field validation rules
    Validation,
    /// Authorization rules
    Authorization,
    /// Notification rules
    Notification,
    /// Custom rules
    Custom,
}

/// Hit policy for decision tables
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum HitPolicy {
    /// Return first matching rule
    #[default]
    First,
    /// Return all matching rules
    Collect,
    /// All rules must match (AND)
    All,
    /// At least one rule must match (OR)
    Any,
}

/// A condition in a decision rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleCondition {
    /// Field path (dot notation supported, e.g., "jurisdiction.country_code")
    pub field: String,
    /// Operator for comparison
    pub operator: ConditionOperator,
    /// Value to compare against
    pub value: Value,
}

/// Comparison operators for conditions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConditionOperator {
    /// Equals
    Eq,
    /// Not equals
    Ne,
    /// Greater than
    Gt,
    /// Greater than or equal
    Gte,
    /// Less than
    Lt,
    /// Less than or equal
    Lte,
    /// Value is in list
    In,
    /// Value is not in list
    NotIn,
    /// String contains
    Contains,
    /// String starts with
    StartsWith,
    /// String ends with
    EndsWith,
    /// Matches regex pattern
    Matches,
    /// Field exists (is not null)
    Exists,
    /// Wildcard match (matches anything)
    Any,
}

/// A single row in a decision table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionTableRow {
    /// Conditions that must match (AND)
    pub conditions: Vec<RuleCondition>,
    /// Output values when conditions match
    pub output: Value,
    /// Optional priority (lower = higher priority)
    #[serde(default)]
    pub priority: i32,
    /// Optional description
    #[serde(default)]
    pub description: Option<String>,
}

/// Decision table content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionTable {
    /// Hit policy
    #[serde(default)]
    pub hit_policy: HitPolicy,
    /// Input fields (for documentation)
    #[serde(default)]
    pub inputs: Vec<String>,
    /// Output fields (for documentation)
    #[serde(default)]
    pub outputs: Vec<String>,
    /// Decision rules/rows
    pub rules: Vec<DecisionTableRow>,
}

/// A decision rule stored in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionRule {
    /// Unique identifier
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Description of what this rule does
    pub description: Option<String>,
    /// Rule category
    pub category: RuleCategory,
    /// The decision table content
    pub content: DecisionTable,
    /// Whether the rule is active
    pub is_active: bool,
    /// Version number
    pub version: i32,
    /// When the rule becomes effective
    pub effective_from: Option<chrono::DateTime<chrono::Utc>>,
    /// When the rule expires
    pub effective_to: Option<chrono::DateTime<chrono::Utc>>,
    /// Organization ID (for multi-tenant support)
    pub organization_id: Option<String>,
    /// Region/jurisdiction this rule applies to
    pub jurisdiction_id: Option<String>,
    /// Tags for filtering
    pub tags: Vec<String>,
    /// Created timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// Updated timestamp
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

// ============================================================================
// Input Context Types
// ============================================================================

/// Input context for rule evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleContext {
    /// Jurisdiction information
    #[serde(default)]
    pub jurisdiction: JurisdictionContext,
    /// Service/item being evaluated
    #[serde(default)]
    pub service: ServiceContext,
    /// Patient context (for clinical rules)
    #[serde(default)]
    pub patient: Option<PatientContext>,
    /// User context (for authorization rules)
    #[serde(default)]
    pub user: Option<UserContext>,
    /// Amount for financial calculations
    #[serde(default)]
    pub amount: Option<f64>,
    /// Additional custom data
    #[serde(default)]
    pub custom: HashMap<String, Value>,
}

impl Default for RuleContext {
    fn default() -> Self {
        Self {
            jurisdiction: JurisdictionContext::default(),
            service: ServiceContext::default(),
            patient: None,
            user: None,
            amount: None,
            custom: HashMap::new(),
        }
    }
}

/// Jurisdiction context for location-aware rules
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct JurisdictionContext {
    /// ISO 3166-1 alpha-2 country code
    pub country_code: String,
    /// Region/state code
    #[serde(default)]
    pub region_code: Option<String>,
    /// City (optional)
    #[serde(default)]
    pub city: Option<String>,
    /// Postal code (optional)
    #[serde(default)]
    pub postal_code: Option<String>,
}

/// Service context for billing/pricing rules
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ServiceContext {
    /// Service type (healthcare, goods, etc.)
    #[serde(default)]
    pub service_type: String,
    /// Service code (CPT, HCPCS, etc.)
    #[serde(default)]
    pub code: Option<String>,
    /// Department
    #[serde(default)]
    pub department: Option<String>,
    /// Is healthcare service (often tax exempt)
    #[serde(default)]
    pub is_healthcare: bool,
}

/// Patient context for clinical decision support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientContext {
    /// Patient ID
    pub patient_id: String,
    /// Age in years
    #[serde(default)]
    pub age: Option<i32>,
    /// Weight in kg
    #[serde(default)]
    pub weight_kg: Option<f64>,
    /// Gender
    #[serde(default)]
    pub gender: Option<String>,
    /// Current diagnoses (ICD codes)
    #[serde(default)]
    pub diagnoses: Vec<String>,
    /// Current medications (RxNorm or NDC codes)
    #[serde(default)]
    pub medications: Vec<String>,
    /// Known allergies
    #[serde(default)]
    pub allergies: Vec<String>,
    /// Lab results (name -> value)
    #[serde(default)]
    pub lab_values: HashMap<String, f64>,
}

/// User context for authorization rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserContext {
    /// User ID
    pub user_id: String,
    /// User roles
    #[serde(default)]
    pub roles: Vec<String>,
    /// User permissions
    #[serde(default)]
    pub permissions: Vec<String>,
    /// Organization ID
    #[serde(default)]
    pub organization_id: Option<String>,
    /// Department
    #[serde(default)]
    pub department: Option<String>,
}

// ============================================================================
// Output Result Types
// ============================================================================

/// Result of rule evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleResult {
    /// Whether any rule matched
    pub matched: bool,
    /// Output data from the rule(s)
    pub output: Value,
    /// Number of rules that matched
    #[serde(default)]
    pub match_count: usize,
    /// Trace information for debugging
    #[serde(default)]
    pub trace: Option<Vec<String>>,
    /// Performance metrics
    #[serde(default)]
    pub performance_ms: Option<f64>,
}

/// Tax calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxResult {
    /// Tax system type (GST, VAT, SALES_TAX, etc.)
    pub tax_system: String,
    /// Individual tax components
    pub components: Vec<TaxComponent>,
    /// Total tax amount
    pub total_tax: f64,
    /// Whether healthcare exemption applies
    pub healthcare_exempt: bool,
}

/// Individual tax component
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxComponent {
    /// Component code (CGST, SGST, VAT, STATE_TAX, etc.)
    pub code: String,
    /// Component display name
    pub name: String,
    /// Tax rate as percentage
    pub rate: f64,
    /// Calculated tax amount
    pub amount: f64,
}

/// Drug scheduling result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrugScheduleResult {
    /// Schedule classification
    pub schedule: String,
    /// Regulatory body
    pub regulatory_body: String,
    /// Whether prescription is required
    pub prescription_required: bool,
    /// Whether controlled substance logging is required
    pub controlled_substance: bool,
    /// Maximum days supply allowed
    #[serde(default)]
    pub max_days_supply: Option<i32>,
    /// Refill restrictions
    #[serde(default)]
    pub refill_restrictions: Option<String>,
}

/// Clinical alert from decision support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClinicalAlert {
    /// Alert type (interaction, contraindication, allergy, dosing)
    pub alert_type: String,
    /// Severity (critical, high, medium, low)
    pub severity: String,
    /// Alert message
    pub message: String,
    /// Recommended action
    #[serde(default)]
    pub recommendation: Option<String>,
    /// Related items (drug codes, diagnoses, etc.)
    #[serde(default)]
    pub related_items: Vec<String>,
}

/// Workflow decision result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDecision {
    /// Next step/state
    pub next_step: String,
    /// Assigned role/user
    #[serde(default)]
    pub assign_to: Option<String>,
    /// Priority (urgent, high, normal, low)
    #[serde(default)]
    pub priority: Option<String>,
    /// Due date offset (e.g., "+2d", "+1w")
    #[serde(default)]
    pub due_offset: Option<String>,
    /// Notifications to send
    #[serde(default)]
    pub notifications: Vec<String>,
    /// Additional metadata
    #[serde(default)]
    pub metadata: HashMap<String, Value>,
}

// ============================================================================
// Rules Engine Implementation
// ============================================================================

/// Pure-Rust Rules Engine
pub struct RulesEngine {
    /// Cached decision rules by ID
    rules_cache: Arc<RwLock<HashMap<String, DecisionRule>>>,
    /// Compiled regex patterns cache
    regex_cache: Arc<RwLock<HashMap<String, Regex>>>,
}

impl RulesEngine {
    /// Create a new rules engine
    pub fn new() -> Self {
        Self {
            rules_cache: Arc::new(RwLock::new(HashMap::new())),
            regex_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Load a decision rule into the engine
    pub async fn load_rule(&self, rule: DecisionRule) -> AppResult<()> {
        // Pre-compile any regex patterns in the rule
        for row in &rule.content.rules {
            for condition in &row.conditions {
                if condition.operator == ConditionOperator::Matches {
                    if let Value::String(pattern) = &condition.value {
                        let mut regex_cache = self.regex_cache.write().await;
                        if !regex_cache.contains_key(pattern) {
                            let regex = Regex::new(pattern).map_err(|e| {
                                AppError::Validation(format!("Invalid regex pattern '{}': {}", pattern, e))
                            })?;
                            regex_cache.insert(pattern.clone(), regex);
                        }
                    }
                }
            }
        }

        let mut rules_cache = self.rules_cache.write().await;
        rules_cache.insert(rule.id.clone(), rule);

        Ok(())
    }

    /// Load multiple rules
    pub async fn load_rules(&self, rules: Vec<DecisionRule>) -> AppResult<()> {
        for rule in rules {
            self.load_rule(rule).await?;
        }
        Ok(())
    }

    /// Unload a rule from the engine
    pub async fn unload_rule(&self, rule_id: &str) -> AppResult<()> {
        let mut rules_cache = self.rules_cache.write().await;
        rules_cache.remove(rule_id);
        Ok(())
    }

    /// Evaluate a rule by ID
    pub async fn evaluate(&self, rule_id: &str, context: &RuleContext) -> AppResult<RuleResult> {
        let rules_cache = self.rules_cache.read().await;
        let rule = rules_cache
            .get(rule_id)
            .ok_or_else(|| AppError::NotFound(format!("Rule not found: {}", rule_id)))?;

        if !Self::is_rule_effective(rule) {
            return Err(AppError::Validation(format!(
                "Rule '{}' is not currently effective",
                rule_id
            )));
        }

        let context_value = serde_json::to_value(context)
            .map_err(|e| AppError::Internal(format!("Failed to serialize context: {}", e)))?;

        let start = std::time::Instant::now();
        let result = self.evaluate_decision_table(&rule.content, &context_value).await?;
        let elapsed = start.elapsed().as_secs_f64() * 1000.0;

        Ok(RuleResult {
            matched: result.matched,
            output: result.output,
            match_count: result.match_count,
            trace: result.trace,
            performance_ms: Some(elapsed),
        })
    }

    /// Evaluate a rule with raw JSON context
    pub async fn evaluate_raw(&self, rule_id: &str, context: Value) -> AppResult<RuleResult> {
        let rules_cache = self.rules_cache.read().await;
        let rule = rules_cache
            .get(rule_id)
            .ok_or_else(|| AppError::NotFound(format!("Rule not found: {}", rule_id)))?;

        if !Self::is_rule_effective(rule) {
            return Err(AppError::Validation(format!(
                "Rule '{}' is not currently effective",
                rule_id
            )));
        }

        let start = std::time::Instant::now();
        let result = self.evaluate_decision_table(&rule.content, &context).await?;
        let elapsed = start.elapsed().as_secs_f64() * 1000.0;

        Ok(RuleResult {
            matched: result.matched,
            output: result.output,
            match_count: result.match_count,
            trace: result.trace,
            performance_ms: Some(elapsed),
        })
    }

    /// Evaluate a decision table against input context
    async fn evaluate_decision_table(
        &self,
        table: &DecisionTable,
        context: &Value,
    ) -> AppResult<RuleResult> {
        let mut matched_outputs: Vec<Value> = Vec::new();
        let mut trace: Vec<String> = Vec::new();

        // Sort rules by priority
        let mut rules: Vec<&DecisionTableRow> = table.rules.iter().collect();
        rules.sort_by_key(|r| r.priority);

        for (idx, row) in rules.iter().enumerate() {
            let row_matches = self.evaluate_row_conditions(&row.conditions, context).await?;

            if row_matches {
                trace.push(format!("Rule {} matched", idx));
                matched_outputs.push(row.output.clone());

                // For "First" hit policy, return immediately
                if table.hit_policy == HitPolicy::First {
                    return Ok(RuleResult {
                        matched: true,
                        output: row.output.clone(),
                        match_count: 1,
                        trace: Some(trace),
                        performance_ms: None,
                    });
                }
            } else {
                trace.push(format!("Rule {} did not match", idx));
            }
        }

        let match_count = matched_outputs.len();

        match table.hit_policy {
            HitPolicy::First => Ok(RuleResult {
                matched: false,
                output: Value::Null,
                match_count: 0,
                trace: Some(trace),
                performance_ms: None,
            }),
            HitPolicy::Collect => Ok(RuleResult {
                matched: !matched_outputs.is_empty(),
                output: Value::Array(matched_outputs),
                match_count,
                trace: Some(trace),
                performance_ms: None,
            }),
            HitPolicy::All => Ok(RuleResult {
                matched: match_count == rules.len(),
                output: if match_count == rules.len() {
                    Value::Array(matched_outputs)
                } else {
                    Value::Null
                },
                match_count,
                trace: Some(trace),
                performance_ms: None,
            }),
            HitPolicy::Any => Ok(RuleResult {
                matched: !matched_outputs.is_empty(),
                output: matched_outputs.first().cloned().unwrap_or(Value::Null),
                match_count,
                trace: Some(trace),
                performance_ms: None,
            }),
        }
    }

    /// Evaluate all conditions in a rule row (AND logic)
    async fn evaluate_row_conditions(
        &self,
        conditions: &[RuleCondition],
        context: &Value,
    ) -> AppResult<bool> {
        for condition in conditions {
            if !self.evaluate_condition(condition, context).await? {
                return Ok(false);
            }
        }
        Ok(true)
    }

    /// Evaluate a single condition
    async fn evaluate_condition(&self, condition: &RuleCondition, context: &Value) -> AppResult<bool> {
        // Handle wildcard/any operator
        if condition.operator == ConditionOperator::Any {
            return Ok(true);
        }

        // Get the field value from context using dot notation
        let field_value = self.get_field_value(&condition.field, context);

        // Handle Exists operator
        if condition.operator == ConditionOperator::Exists {
            return Ok(!field_value.is_null());
        }

        // If field doesn't exist and we're not checking existence, no match
        if field_value.is_null() {
            return Ok(false);
        }

        // Evaluate based on operator
        match condition.operator {
            ConditionOperator::Eq => Ok(self.values_equal(&field_value, &condition.value)),
            ConditionOperator::Ne => Ok(!self.values_equal(&field_value, &condition.value)),
            ConditionOperator::Gt => self.compare_values(&field_value, &condition.value, |a, b| a > b),
            ConditionOperator::Gte => self.compare_values(&field_value, &condition.value, |a, b| a >= b),
            ConditionOperator::Lt => self.compare_values(&field_value, &condition.value, |a, b| a < b),
            ConditionOperator::Lte => self.compare_values(&field_value, &condition.value, |a, b| a <= b),
            ConditionOperator::In => self.value_in_list(&field_value, &condition.value),
            ConditionOperator::NotIn => self.value_in_list(&field_value, &condition.value).map(|v| !v),
            ConditionOperator::Contains => self.string_contains(&field_value, &condition.value),
            ConditionOperator::StartsWith => self.string_starts_with(&field_value, &condition.value),
            ConditionOperator::EndsWith => self.string_ends_with(&field_value, &condition.value),
            ConditionOperator::Matches => self.regex_matches(&field_value, &condition.value).await,
            ConditionOperator::Any | ConditionOperator::Exists => Ok(true),
        }
    }

    /// Get a field value from JSON using dot notation
    fn get_field_value(&self, field_path: &str, context: &Value) -> Value {
        let parts: Vec<&str> = field_path.split('.').collect();
        let mut current = context;

        for part in parts {
            match current {
                Value::Object(map) => {
                    if let Some(value) = map.get(part) {
                        current = value;
                    } else {
                        return Value::Null;
                    }
                }
                Value::Array(arr) => {
                    if let Ok(idx) = part.parse::<usize>() {
                        if let Some(value) = arr.get(idx) {
                            current = value;
                        } else {
                            return Value::Null;
                        }
                    } else {
                        return Value::Null;
                    }
                }
                _ => return Value::Null,
            }
        }

        current.clone()
    }

    /// Check if two JSON values are equal
    fn values_equal(&self, a: &Value, b: &Value) -> bool {
        // Handle wildcard string "*"
        if let Value::String(s) = b {
            if s == "*" {
                return true;
            }
        }
        a == b
    }

    /// Compare two values numerically
    fn compare_values<F>(&self, a: &Value, b: &Value, cmp: F) -> AppResult<bool>
    where
        F: Fn(f64, f64) -> bool,
    {
        let a_num = self.value_to_f64(a)?;
        let b_num = self.value_to_f64(b)?;
        Ok(cmp(a_num, b_num))
    }

    /// Convert JSON value to f64
    fn value_to_f64(&self, value: &Value) -> AppResult<f64> {
        match value {
            Value::Number(n) => n.as_f64().ok_or_else(|| {
                AppError::Validation("Cannot convert number to f64".to_string())
            }),
            Value::String(s) => s.parse::<f64>().map_err(|_| {
                AppError::Validation(format!("Cannot parse '{}' as number", s))
            }),
            _ => Err(AppError::Validation(format!(
                "Cannot convert {:?} to number",
                value
            ))),
        }
    }

    /// Check if value is in a list
    fn value_in_list(&self, value: &Value, list: &Value) -> AppResult<bool> {
        match list {
            Value::Array(arr) => Ok(arr.iter().any(|item| self.values_equal(value, item))),
            _ => Err(AppError::Validation(
                "IN operator requires an array value".to_string(),
            )),
        }
    }

    /// Check if string contains substring
    fn string_contains(&self, value: &Value, pattern: &Value) -> AppResult<bool> {
        match (value, pattern) {
            (Value::String(s), Value::String(p)) => Ok(s.contains(p.as_str())),
            _ => Ok(false),
        }
    }

    /// Check if string starts with prefix
    fn string_starts_with(&self, value: &Value, pattern: &Value) -> AppResult<bool> {
        match (value, pattern) {
            (Value::String(s), Value::String(p)) => Ok(s.starts_with(p.as_str())),
            _ => Ok(false),
        }
    }

    /// Check if string ends with suffix
    fn string_ends_with(&self, value: &Value, pattern: &Value) -> AppResult<bool> {
        match (value, pattern) {
            (Value::String(s), Value::String(p)) => Ok(s.ends_with(p.as_str())),
            _ => Ok(false),
        }
    }

    /// Check if value matches regex pattern
    async fn regex_matches(&self, value: &Value, pattern: &Value) -> AppResult<bool> {
        match (value, pattern) {
            (Value::String(s), Value::String(p)) => {
                let regex_cache = self.regex_cache.read().await;
                if let Some(regex) = regex_cache.get(p) {
                    Ok(regex.is_match(s))
                } else {
                    // Compile on the fly if not cached
                    let regex = Regex::new(p).map_err(|e| {
                        AppError::Validation(format!("Invalid regex pattern: {}", e))
                    })?;
                    Ok(regex.is_match(s))
                }
            }
            _ => Ok(false),
        }
    }

    // ========================================================================
    // Convenience Methods for Healthcare Use Cases
    // ========================================================================

    /// Calculate tax based on jurisdiction and service
    pub async fn calculate_tax(
        &self,
        jurisdiction: JurisdictionContext,
        service: ServiceContext,
        amount: f64,
    ) -> AppResult<TaxResult> {
        let context = RuleContext {
            jurisdiction,
            service,
            amount: Some(amount),
            ..Default::default()
        };

        // Try to evaluate tax rule
        match self.evaluate("tax_calculation", &context).await {
            Ok(result) if result.matched => {
                serde_json::from_value(result.output).map_err(|e| {
                    AppError::Internal(format!("Failed to parse tax result: {}", e))
                })
            }
            Ok(_) => {
                // No rule matched, return default (no tax)
                Ok(TaxResult {
                    tax_system: "none".to_string(),
                    components: vec![],
                    total_tax: 0.0,
                    healthcare_exempt: context.service.is_healthcare,
                })
            }
            Err(AppError::NotFound(_)) => {
                // Rule not loaded, return default
                Ok(TaxResult {
                    tax_system: "none".to_string(),
                    components: vec![],
                    total_tax: 0.0,
                    healthcare_exempt: context.service.is_healthcare,
                })
            }
            Err(e) => Err(e),
        }
    }

    /// Check drug scheduling for a jurisdiction
    pub async fn check_drug_schedule(
        &self,
        drug_code: &str,
        jurisdiction: JurisdictionContext,
    ) -> AppResult<DrugScheduleResult> {
        let mut context = RuleContext {
            jurisdiction,
            ..Default::default()
        };
        context
            .custom
            .insert("drug_code".to_string(), Value::String(drug_code.to_string()));

        match self.evaluate("drug_scheduling", &context).await {
            Ok(result) if result.matched => {
                serde_json::from_value(result.output).map_err(|e| {
                    AppError::Internal(format!("Failed to parse drug schedule result: {}", e))
                })
            }
            Ok(_) | Err(AppError::NotFound(_)) => {
                // Default: prescription required, not controlled
                Ok(DrugScheduleResult {
                    schedule: "unscheduled".to_string(),
                    regulatory_body: "unknown".to_string(),
                    prescription_required: true,
                    controlled_substance: false,
                    max_days_supply: None,
                    refill_restrictions: None,
                })
            }
            Err(e) => Err(e),
        }
    }

    /// Check for clinical alerts (drug interactions, allergies, etc.)
    pub async fn check_clinical_alerts(
        &self,
        patient: PatientContext,
        proposed_medication: &str,
    ) -> AppResult<Vec<ClinicalAlert>> {
        let mut context = RuleContext {
            patient: Some(patient),
            ..Default::default()
        };
        context.custom.insert(
            "proposed_medication".to_string(),
            Value::String(proposed_medication.to_string()),
        );

        match self.evaluate("clinical_alerts", &context).await {
            Ok(result) if result.matched => {
                serde_json::from_value(result.output).map_err(|e| {
                    AppError::Internal(format!("Failed to parse clinical alerts: {}", e))
                })
            }
            Ok(_) | Err(AppError::NotFound(_)) => Ok(vec![]),
            Err(e) => Err(e),
        }
    }

    /// Determine workflow routing
    pub async fn determine_workflow(
        &self,
        workflow_id: &str,
        context: RuleContext,
    ) -> AppResult<WorkflowDecision> {
        let result = self.evaluate(workflow_id, &context).await?;

        serde_json::from_value(result.output)
            .map_err(|e| AppError::Internal(format!("Failed to parse workflow decision: {}", e)))
    }

    // ========================================================================
    // Rule Management
    // ========================================================================

    /// Get all loaded rules
    pub async fn list_rules(&self) -> Vec<DecisionRule> {
        let cache = self.rules_cache.read().await;
        cache.values().cloned().collect()
    }

    /// Get a specific rule by ID
    pub async fn get_rule(&self, rule_id: &str) -> Option<DecisionRule> {
        let cache = self.rules_cache.read().await;
        cache.get(rule_id).cloned()
    }

    /// Filter rules by category
    pub async fn get_rules_by_category(&self, category: RuleCategory) -> Vec<DecisionRule> {
        let cache = self.rules_cache.read().await;
        cache
            .values()
            .filter(|r| r.category == category)
            .cloned()
            .collect()
    }

    /// Check if a rule is currently effective
    pub fn is_rule_effective(rule: &DecisionRule) -> bool {
        if !rule.is_active {
            return false;
        }

        let now = chrono::Utc::now();

        if let Some(from) = rule.effective_from {
            if now < from {
                return false;
            }
        }

        if let Some(to) = rule.effective_to {
            if now > to {
                return false;
            }
        }

        true
    }
}

impl Default for RulesEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Shared rules engine instance (thread-safe)
pub type SharedRulesEngine = Arc<RulesEngine>;

/// Create a shared rules engine instance
pub fn create_shared_rules_engine() -> SharedRulesEngine {
    Arc::new(RulesEngine::new())
}

// ============================================================================
// Pre-built Rule Templates
// ============================================================================

/// Create a tax calculation rule for a jurisdiction
pub fn create_tax_rule(
    country_code: &str,
    tax_system: &str,
    components: Vec<(String, String, f64)>, // (code, name, rate)
    healthcare_exempt: bool,
) -> DecisionRule {
    let output = serde_json::json!({
        "tax_system": tax_system,
        "components": components.iter().map(|(code, name, rate)| {
            serde_json::json!({
                "code": code,
                "name": name,
                "rate": rate,
                "amount": 0.0 // Will be calculated
            })
        }).collect::<Vec<_>>(),
        "total_tax": 0.0,
        "healthcare_exempt": healthcare_exempt
    });

    DecisionRule {
        id: format!("tax_{}", country_code.to_lowercase()),
        name: format!("Tax Rules - {}", country_code),
        description: Some(format!("Tax calculation rules for {}", country_code)),
        category: RuleCategory::Tax,
        content: DecisionTable {
            hit_policy: HitPolicy::First,
            inputs: vec!["jurisdiction.country_code".to_string()],
            outputs: vec!["tax_system".to_string(), "components".to_string()],
            rules: vec![DecisionTableRow {
                conditions: vec![RuleCondition {
                    field: "jurisdiction.country_code".to_string(),
                    operator: ConditionOperator::Eq,
                    value: Value::String(country_code.to_string()),
                }],
                output,
                priority: 0,
                description: Some(format!("{} tax rule", country_code)),
            }],
        },
        is_active: true,
        version: 1,
        effective_from: None,
        effective_to: None,
        organization_id: None,
        jurisdiction_id: Some(country_code.to_string()),
        tags: vec!["tax".to_string(), country_code.to_lowercase()],
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rules_engine_creation() {
        let engine = RulesEngine::new();
        let rules = engine.list_rules().await;
        assert!(rules.is_empty());
    }

    #[tokio::test]
    async fn test_load_and_evaluate_simple_rule() {
        let engine = RulesEngine::new();

        let rule = DecisionRule {
            id: "test_rule".to_string(),
            name: "Test Rule".to_string(),
            description: Some("A test rule".to_string()),
            category: RuleCategory::Custom,
            content: DecisionTable {
                hit_policy: HitPolicy::First,
                inputs: vec!["jurisdiction.country_code".to_string()],
                outputs: vec!["result".to_string()],
                rules: vec![
                    DecisionTableRow {
                        conditions: vec![RuleCondition {
                            field: "jurisdiction.country_code".to_string(),
                            operator: ConditionOperator::Eq,
                            value: Value::String("US".to_string()),
                        }],
                        output: serde_json::json!({"region": "United States"}),
                        priority: 0,
                        description: Some("US rule".to_string()),
                    },
                    DecisionTableRow {
                        conditions: vec![RuleCondition {
                            field: "jurisdiction.country_code".to_string(),
                            operator: ConditionOperator::Eq,
                            value: Value::String("IN".to_string()),
                        }],
                        output: serde_json::json!({"region": "India"}),
                        priority: 0,
                        description: Some("India rule".to_string()),
                    },
                ],
            },
            is_active: true,
            version: 1,
            effective_from: None,
            effective_to: None,
            organization_id: None,
            jurisdiction_id: None,
            tags: vec!["test".to_string()],
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        engine.load_rule(rule).await.expect("Failed to load rule");

        // Test US context
        let context = RuleContext {
            jurisdiction: JurisdictionContext {
                country_code: "US".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("test_rule", &context).await.expect("Failed to evaluate");
        assert!(result.matched);
        assert_eq!(result.output["region"], "United States");

        // Test India context
        let context = RuleContext {
            jurisdiction: JurisdictionContext {
                country_code: "IN".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("test_rule", &context).await.expect("Failed to evaluate");
        assert!(result.matched);
        assert_eq!(result.output["region"], "India");
    }

    #[tokio::test]
    async fn test_collect_hit_policy() {
        let engine = RulesEngine::new();

        let rule = DecisionRule {
            id: "collect_test".to_string(),
            name: "Collect Test".to_string(),
            description: None,
            category: RuleCategory::Custom,
            content: DecisionTable {
                hit_policy: HitPolicy::Collect,
                inputs: vec!["amount".to_string()],
                outputs: vec!["discount".to_string()],
                rules: vec![
                    DecisionTableRow {
                        conditions: vec![RuleCondition {
                            field: "amount".to_string(),
                            operator: ConditionOperator::Gte,
                            value: Value::Number(100.into()),
                        }],
                        output: serde_json::json!({"discount": "10%"}),
                        priority: 0,
                        description: None,
                    },
                    DecisionTableRow {
                        conditions: vec![RuleCondition {
                            field: "amount".to_string(),
                            operator: ConditionOperator::Gte,
                            value: Value::Number(500.into()),
                        }],
                        output: serde_json::json!({"discount": "15%"}),
                        priority: 0,
                        description: None,
                    },
                ],
            },
            is_active: true,
            version: 1,
            effective_from: None,
            effective_to: None,
            organization_id: None,
            jurisdiction_id: None,
            tags: vec![],
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        engine.load_rule(rule).await.expect("Failed to load rule");

        let context = RuleContext {
            amount: Some(600.0),
            ..Default::default()
        };

        let result = engine.evaluate("collect_test", &context).await.expect("Failed to evaluate");
        assert!(result.matched);
        assert_eq!(result.match_count, 2); // Both rules match
    }

    #[tokio::test]
    async fn test_rule_effectiveness() {
        let mut rule = DecisionRule {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: None,
            category: RuleCategory::Custom,
            content: DecisionTable {
                hit_policy: HitPolicy::First,
                inputs: vec![],
                outputs: vec![],
                rules: vec![],
            },
            is_active: true,
            version: 1,
            effective_from: None,
            effective_to: None,
            organization_id: None,
            jurisdiction_id: None,
            tags: vec![],
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        // Active rule with no date restrictions
        assert!(RulesEngine::is_rule_effective(&rule));

        // Inactive rule
        rule.is_active = false;
        assert!(!RulesEngine::is_rule_effective(&rule));

        // Future effective date
        rule.is_active = true;
        rule.effective_from = Some(chrono::Utc::now() + chrono::Duration::days(1));
        assert!(!RulesEngine::is_rule_effective(&rule));

        // Past expiration date
        rule.effective_from = None;
        rule.effective_to = Some(chrono::Utc::now() - chrono::Duration::days(1));
        assert!(!RulesEngine::is_rule_effective(&rule));
    }

    #[tokio::test]
    async fn test_regex_matching() {
        let engine = RulesEngine::new();

        let rule = DecisionRule {
            id: "regex_test".to_string(),
            name: "Regex Test".to_string(),
            description: None,
            category: RuleCategory::Validation,
            content: DecisionTable {
                hit_policy: HitPolicy::First,
                inputs: vec!["custom.email".to_string()],
                outputs: vec!["valid".to_string()],
                rules: vec![DecisionTableRow {
                    conditions: vec![RuleCondition {
                        field: "custom.email".to_string(),
                        operator: ConditionOperator::Matches,
                        value: Value::String(r"^[\w.-]+@[\w.-]+\.\w+$".to_string()),
                    }],
                    output: serde_json::json!({"valid": true}),
                    priority: 0,
                    description: None,
                }],
            },
            is_active: true,
            version: 1,
            effective_from: None,
            effective_to: None,
            organization_id: None,
            jurisdiction_id: None,
            tags: vec![],
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        engine.load_rule(rule).await.expect("Failed to load rule");

        // Valid email
        let mut context = RuleContext::default();
        context.custom.insert(
            "email".to_string(),
            Value::String("test@example.com".to_string()),
        );

        let result = engine.evaluate("regex_test", &context).await.expect("Failed to evaluate");
        assert!(result.matched);

        // Invalid email
        context.custom.insert(
            "email".to_string(),
            Value::String("not-an-email".to_string()),
        );

        let result = engine.evaluate("regex_test", &context).await.expect("Failed to evaluate");
        assert!(!result.matched);
    }
}
