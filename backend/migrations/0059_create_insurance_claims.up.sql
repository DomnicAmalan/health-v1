-- Insurance Claims Schema
-- Pre-authorization, claim submission, and reimbursement tracking

-- Insurance Companies/Payers
CREATE TABLE IF NOT EXISTS insurance_payers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Payer Info
    payer_code VARCHAR(50) NOT NULL,
    payer_name VARCHAR(200) NOT NULL,
    payer_type VARCHAR(30) NOT NULL CHECK (payer_type IN (
        'private_insurance',
        'government',
        'tpa',           -- Third Party Administrator
        'corporate',
        'self_pay',
        'charity',
        'other'
    )),

    -- Contact
    address JSONB,
    phone VARCHAR(20),
    email VARCHAR(200),
    website VARCHAR(200),

    -- Network
    is_network BOOLEAN DEFAULT true, -- Is in-network?
    network_discount_percent DECIMAL(5,2) DEFAULT 0,

    -- Processing
    avg_processing_days INT DEFAULT 30,
    requires_pre_auth BOOLEAN DEFAULT true,
    electronic_submission BOOLEAN DEFAULT false,
    claim_submission_url TEXT,

    -- Credentials
    provider_id VARCHAR(100), -- Our ID with this payer
    api_credentials JSONB, -- Encrypted API keys if electronic

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, payer_code)
);

-- Insurance Plans
CREATE TABLE IF NOT EXISTS insurance_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_id UUID NOT NULL REFERENCES insurance_payers(id) ON DELETE CASCADE,

    plan_code VARCHAR(50) NOT NULL,
    plan_name VARCHAR(200) NOT NULL,
    plan_type VARCHAR(30) CHECK (plan_type IN (
        'individual',
        'family',
        'group',
        'senior',
        'maternity',
        'critical_illness',
        'comprehensive'
    )),

    -- Coverage
    coverage_limit DECIMAL(12,2), -- Max coverage amount
    room_rent_limit DECIMAL(12,2),
    room_rent_type VARCHAR(20) CHECK (room_rent_type IN (
        'fixed', 'percent_of_sum', 'as_per_actuals'
    )),

    -- Co-pay/Deductible
    copay_percent DECIMAL(5,2) DEFAULT 0,
    deductible_amount DECIMAL(12,2) DEFAULT 0,

    -- Waiting Periods (days)
    initial_waiting_period INT DEFAULT 30,
    pre_existing_waiting_period INT DEFAULT 48 * 30, -- 48 months in days

    -- Network details
    network_only BOOLEAN DEFAULT false,
    out_of_network_coverage_percent DECIMAL(5,2) DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(payer_id, plan_code)
);

-- Patient Insurance Policies
CREATE TABLE IF NOT EXISTS patient_insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES insurance_plans(id),

    -- Policy Details
    policy_number VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    member_id VARCHAR(100),

    -- Relationship
    relationship VARCHAR(20) CHECK (relationship IN (
        'self', 'spouse', 'child', 'parent', 'other'
    )),
    policy_holder_name VARCHAR(200),

    -- Dates
    effective_date DATE NOT NULL,
    expiry_date DATE,

    -- Coverage Used
    coverage_used DECIMAL(12,2) DEFAULT 0,
    coverage_remaining DECIMAL(12,2),

    -- Priority (for multiple insurances)
    is_primary BOOLEAN DEFAULT true,
    priority_order INT DEFAULT 1,

    -- Status
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    verification_notes TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, patient_id, policy_number)
);

-- Pre-Authorization Status
DO $$ BEGIN
    CREATE TYPE preauth_status AS ENUM (
        'draft',
        'submitted',
        'pending_info',
        'approved',
        'partially_approved',
        'denied',
        'expired',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Pre-Authorization Requests
CREATE TABLE IF NOT EXISTS insurance_preauths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Identification
    preauth_number VARCHAR(50) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Patient & Policy
    patient_id UUID NOT NULL,
    policy_id UUID NOT NULL REFERENCES patient_insurance_policies(id),

    -- Admission/Treatment Details
    admission_type VARCHAR(30) CHECK (admission_type IN (
        'elective', 'emergency', 'maternity', 'day_care'
    )),
    expected_admission_date DATE,
    expected_discharge_date DATE,
    expected_los INT, -- Length of stay

    -- Diagnosis
    primary_diagnosis_code VARCHAR(20),
    primary_diagnosis_desc TEXT,
    secondary_diagnoses JSONB, -- [{code, description}]

    -- Procedures
    planned_procedures JSONB, -- [{code, name, expected_cost}]

    -- Cost Estimate
    estimated_cost DECIMAL(12,2),
    requested_amount DECIMAL(12,2),

    -- Status
    status preauth_status DEFAULT 'draft',
    payer_reference VARCHAR(100), -- Payer's reference number

    -- Approval Details
    approved_amount DECIMAL(12,2),
    approved_los INT,
    approval_notes TEXT,
    denial_reason TEXT,
    approval_date DATE,
    expiry_date DATE,

    -- Documents
    documents JSONB, -- [{name, url, uploaded_at}]

    -- Audit
    submitted_at TIMESTAMPTZ,
    submitted_by UUID,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    UNIQUE(organization_id, preauth_number)
);

-- Claim Status
DO $$ BEGIN
    CREATE TYPE claim_status AS ENUM (
        'draft',
        'ready',
        'submitted',
        'acknowledged',
        'under_review',
        'query_raised',
        'approved',
        'partially_approved',
        'denied',
        'paid',
        'closed',
        'appealed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Insurance Claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Identification
    claim_number VARCHAR(50) NOT NULL,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- References
    invoice_id UUID REFERENCES invoices(id),
    preauth_id UUID REFERENCES insurance_preauths(id),
    policy_id UUID NOT NULL REFERENCES patient_insurance_policies(id),
    patient_id UUID NOT NULL,

    -- Admission Details
    admission_date DATE,
    discharge_date DATE,
    discharge_type VARCHAR(30),

    -- Diagnosis
    primary_diagnosis_code VARCHAR(20),
    primary_diagnosis_desc TEXT,
    secondary_diagnoses JSONB,

    -- Procedures Performed
    procedures JSONB, -- [{code, name, date, amount}]

    -- Amounts
    billed_amount DECIMAL(12,2) NOT NULL,
    allowed_amount DECIMAL(12,2),
    deductible_amount DECIMAL(12,2) DEFAULT 0,
    copay_amount DECIMAL(12,2) DEFAULT 0,
    approved_amount DECIMAL(12,2),
    paid_amount DECIMAL(12,2) DEFAULT 0,
    patient_liability DECIMAL(12,2) DEFAULT 0,

    -- Status
    status claim_status DEFAULT 'draft',
    payer_claim_number VARCHAR(100),

    -- Processing
    submission_date DATE,
    acknowledgment_date DATE,
    adjudication_date DATE,
    payment_date DATE,

    -- Denial/Query
    query_details JSONB, -- [{date, query, response}]
    denial_reason TEXT,
    denial_code VARCHAR(20),

    -- EOB (Explanation of Benefits)
    eob_received BOOLEAN DEFAULT false,
    eob_date DATE,
    eob_document_url TEXT,

    -- Appeal
    is_appealed BOOLEAN DEFAULT false,
    appeal_date DATE,
    appeal_reason TEXT,

    -- Documents
    documents JSONB,

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    submitted_by UUID,

    UNIQUE(organization_id, claim_number)
);

-- Claim History/Timeline
CREATE TABLE IF NOT EXISTS insurance_claim_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,

    action VARCHAR(50) NOT NULL,
    old_status claim_status,
    new_status claim_status,
    notes TEXT,

    action_date TIMESTAMPTZ DEFAULT NOW(),
    action_by UUID,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_payers_org ON insurance_payers(organization_id);
CREATE INDEX IF NOT EXISTS idx_insurance_plans_payer ON insurance_plans(payer_id);
CREATE INDEX IF NOT EXISTS idx_patient_policies_org_patient ON patient_insurance_policies(organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_policies_policy ON patient_insurance_policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_preauths_org_patient ON insurance_preauths(organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_preauths_status ON insurance_preauths(status);
CREATE INDEX IF NOT EXISTS idx_claims_org_patient ON insurance_claims(organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_invoice ON insurance_claims(invoice_id);
CREATE INDEX IF NOT EXISTS idx_claims_policy ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claim_history_claim ON insurance_claim_history(claim_id);

-- Triggers
CREATE TRIGGER update_insurance_payers_timestamp
    BEFORE UPDATE ON insurance_payers
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_insurance_plans_timestamp
    BEFORE UPDATE ON insurance_plans
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_patient_policies_timestamp
    BEFORE UPDATE ON patient_insurance_policies
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_preauths_timestamp
    BEFORE UPDATE ON insurance_preauths
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_claims_timestamp
    BEFORE UPDATE ON insurance_claims
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();
