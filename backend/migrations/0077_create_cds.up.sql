-- Phase 0.4: Clinical Decision Support (CDS)
-- Alerts, warnings, and clinical intelligence

CREATE TABLE IF NOT EXISTS clinical_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Alert identification
    alert_code VARCHAR(100) NOT NULL,  -- DRUG_INTERACTION_001, ALLERGY_ALERT_002, etc.
    alert_type VARCHAR(100) NOT NULL,  -- drug_interaction, drug_allergy, critical_value, duplicate_order, renal_dosing
    severity VARCHAR(50) NOT NULL,  -- info, warning, critical

    -- Patient context
    patient_id UUID NOT NULL,
    patient_name VARCHAR(200),
    encounter_id UUID,

    -- Alert content
    alert_title VARCHAR(500) NOT NULL,
    alert_message TEXT NOT NULL,
    recommendation TEXT,
    clinical_rationale TEXT,

    -- Trigger context
    triggered_by_entity_type VARCHAR(100),  -- medication, lab_result, vital_sign, order
    triggered_by_entity_id UUID,
    triggered_by_user_id UUID,
    triggered_by_user_name VARCHAR(200),
    triggered_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Alert data (structured)
    alert_data JSONB,  -- Drug names, lab values, reference ranges, etc.

    -- Response
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_by_name VARCHAR(200),
    acknowledged_datetime TIMESTAMPTZ,
    override_reason TEXT,
    override_justification TEXT,

    -- Action taken
    action_taken VARCHAR(100),  -- cancelled_order, modified_order, proceeded_anyway, consulted_pharmacist
    action_datetime TIMESTAMPTZ,

    -- Auto-dismiss rules
    auto_dismissed BOOLEAN DEFAULT FALSE,
    dismissal_reason TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_alert_severity CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT acknowledged_requires_user CHECK (
        (acknowledged = TRUE AND acknowledged_by IS NOT NULL AND acknowledged_datetime IS NOT NULL)
        OR acknowledged = FALSE
    )
);

CREATE INDEX idx_clinical_alerts_patient ON clinical_alerts(patient_id, acknowledged);
CREATE INDEX idx_clinical_alerts_severity ON clinical_alerts(severity, acknowledged);
CREATE INDEX idx_clinical_alerts_type ON clinical_alerts(alert_type, severity);
CREATE INDEX idx_clinical_alerts_triggered ON clinical_alerts(triggered_datetime DESC);
CREATE INDEX idx_clinical_alerts_entity ON clinical_alerts(triggered_by_entity_type, triggered_by_entity_id);

-- CDS Rules
-- Configurable clinical decision support rules
CREATE TABLE IF NOT EXISTS cds_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Rule identification
    rule_code VARCHAR(100) NOT NULL,
    rule_name VARCHAR(200) NOT NULL,
    rule_category VARCHAR(100) NOT NULL,  -- drug_safety, lab_interpretation, diagnostic_support

    -- Rule definition
    rule_type VARCHAR(100) NOT NULL,  -- drug_interaction, allergy_check, value_range, duplicate_check
    trigger_condition JSONB NOT NULL,  -- Condition that triggers rule evaluation
    rule_logic JSONB NOT NULL,  -- Rule evaluation logic

    -- Alert configuration
    alert_severity VARCHAR(50) NOT NULL,
    alert_title_template VARCHAR(500) NOT NULL,
    alert_message_template TEXT NOT NULL,
    recommendation_template TEXT,

    -- Rule behavior
    is_blockable BOOLEAN DEFAULT FALSE,  -- Can user override this alert?
    requires_override_reason BOOLEAN DEFAULT FALSE,
    auto_dismiss_after_minutes INTEGER,

    -- Activation
    is_active BOOLEAN DEFAULT TRUE,
    effective_start_date DATE,
    effective_end_date DATE,

    -- Priority
    execution_priority INTEGER DEFAULT 0,  -- Higher priority rules execute first

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, rule_code)
);

CREATE INDEX idx_cds_rules_org ON cds_rules(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_cds_rules_type ON cds_rules(rule_type, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_cds_rules_priority ON cds_rules(execution_priority DESC) WHERE is_active = TRUE AND deleted_at IS NULL;

-- CDS Rule Audit Log
-- Track when rules fire and their outcomes
CREATE TABLE IF NOT EXISTS cds_rule_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Rule execution
    rule_id UUID NOT NULL REFERENCES cds_rules(id),
    rule_code VARCHAR(100) NOT NULL,

    -- Context
    patient_id UUID NOT NULL,
    user_id UUID NOT NULL,
    execution_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Input data
    input_data JSONB,

    -- Evaluation result
    rule_fired BOOLEAN NOT NULL,
    alert_generated BOOLEAN NOT NULL,
    alert_id UUID REFERENCES clinical_alerts(id),

    -- Performance
    evaluation_duration_ms INTEGER,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cds_rule_audit_log_rule ON cds_rule_audit_log(rule_id, execution_datetime DESC);
CREATE INDEX idx_cds_rule_audit_log_patient ON cds_rule_audit_log(patient_id, execution_datetime DESC);
CREATE INDEX idx_cds_rule_audit_log_fired ON cds_rule_audit_log(rule_fired, execution_datetime DESC);

-- Pre-populate common CDS rules
INSERT INTO cds_rules (
    organization_id,
    rule_code,
    rule_name,
    rule_category,
    rule_type,
    trigger_condition,
    rule_logic,
    alert_severity,
    alert_title_template,
    alert_message_template,
    recommendation_template,
    is_blockable,
    requires_override_reason,
    is_active
)
SELECT
    o.id,
    'DUPLICATE_LAB_ORDER_24H',
    'Duplicate Lab Order Within 24 Hours',
    'resource_optimization',
    'duplicate_check',
    '{"entity_type": "lab_order", "time_window_hours": 24}'::jsonb,
    '{"check": "same_test", "within_hours": 24}'::jsonb,
    'warning',
    'Duplicate Lab Test Ordered',
    'The test {{test_name}} was already ordered for this patient within the last 24 hours. Previous order: {{previous_order_number}}',
    'Consider reviewing existing results before ordering duplicate test. If clinically necessary, you may proceed.',
    TRUE,
    TRUE,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM cds_rules
    WHERE rule_code = 'DUPLICATE_LAB_ORDER_24H'
      AND organization_id = o.id
);

COMMENT ON TABLE clinical_alerts IS 'Clinical alerts and warnings triggered by CDS rules';
COMMENT ON TABLE cds_rules IS 'Configurable clinical decision support rules with flexible trigger and evaluation logic';
COMMENT ON TABLE cds_rule_audit_log IS 'Audit trail of CDS rule executions for compliance and optimization';
