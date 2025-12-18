//! Compliance Detection Service
//!
//! Detects applicable regulations based on geographic location and entity type.
//! Implements the compliance detection algorithm from the architecture plan.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use crate::shared::AppResult;
use crate::domain::entities::{
    GeographicRegion, ComplianceRule, EntityType,
};

/// Result of compliance detection
#[derive(Debug, Clone)]
pub struct ApplicableRegulation {
    pub regulation_id: Uuid,
    pub regulation_code: String,
    pub regulation_name: String,
    pub priority: i32,
    pub source_region_id: Uuid,
    pub source_region_name: String,
    pub effective_from: DateTime<Utc>,
    pub effective_to: Option<DateTime<Utc>>,
}

/// Geographic location input for compliance detection
#[derive(Debug, Clone)]
pub enum LocationInput {
    /// Region ID (UUID)
    RegionId(Uuid),
    /// Coordinates (latitude, longitude) - for future PostGIS integration
    Coordinates(f64, f64),
    /// Region hierarchy path (from village to continent)
    Hierarchy(Vec<Uuid>),
}

#[async_trait]
pub trait ComplianceService: Send + Sync {
    /// Detect applicable regulations for a location and entity type
    ///
    /// Algorithm:
    /// 1. Resolve location to geographic region hierarchy
    /// 2. Build hierarchy chain: village → town → city → state → country → continent
    /// 3. For each level, fetch applicable regulations
    /// 4. Apply time filter (effective_from <= now < effective_to)
    /// 5. Handle overrides (child can override parent rules)
    /// 6. Return consolidated list with requirements
    async fn detect_applicable_regulations(
        &self,
        location: LocationInput,
        entity_type: EntityType,
        as_of: Option<DateTime<Utc>>,
    ) -> AppResult<Vec<ApplicableRegulation>>;

    /// Get region hierarchy for a location
    async fn get_region_hierarchy(
        &self,
        location: LocationInput,
    ) -> AppResult<Vec<GeographicRegion>>;

    /// Get all compliance rules for a region
    async fn get_compliance_rules_for_region(
        &self,
        region_id: Uuid,
        entity_type: EntityType,
        as_of: Option<DateTime<Utc>>,
    ) -> AppResult<Vec<ComplianceRule>>;
}

/// Default implementation of compliance detection algorithm
pub struct ComplianceDetector;

impl ComplianceDetector {
    /// Build hierarchy chain from a region
    pub async fn build_hierarchy_chain(
        &self,
        region_id: Uuid,
        // In real implementation, this would query the database
        // For now, this is a placeholder
    ) -> AppResult<Vec<Uuid>> {
        // This would use the get_region_hierarchy SQL function
        // or recursively query parent_id until reaching root
        // Placeholder implementation
        Ok(vec![region_id])
    }

    /// Consolidate regulations from multiple regions, handling overrides
    pub fn consolidate_regulations(
        &self,
        regulations_by_region: Vec<(Uuid, Vec<ApplicableRegulation>)>,
    ) -> Vec<ApplicableRegulation> {
        use std::collections::HashMap;

        // Group by regulation_id, keeping highest priority
        let mut regulation_map: HashMap<Uuid, ApplicableRegulation> = HashMap::new();

        for (_region_id, regulations) in regulations_by_region {
            for reg in regulations {
                regulation_map
                    .entry(reg.regulation_id)
                    .and_modify(|existing| {
                        // If new regulation has higher priority, replace
                        if reg.priority > existing.priority {
                            *existing = reg.clone();
                        }
                    })
                    .or_insert(reg);
            }
        }

        // Convert to sorted vector (by priority descending)
        let mut result: Vec<ApplicableRegulation> = regulation_map.into_values().collect();
        result.sort_by(|a, b| b.priority.cmp(&a.priority));
        result
    }

    /// Filter regulations by effective dates
    pub fn filter_by_effective_date(
        &self,
        regulations: Vec<ApplicableRegulation>,
        as_of: DateTime<Utc>,
    ) -> Vec<ApplicableRegulation> {
        regulations
            .into_iter()
            .filter(|reg| {
                reg.effective_from <= as_of
                    && (reg.effective_to.is_none() || reg.effective_to.unwrap() > as_of)
            })
            .collect()
    }
}

