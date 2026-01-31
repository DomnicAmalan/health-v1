-- Billing & Invoice Schema
-- GST-compliant invoicing with payment tracking

-- Patient Billing Account (running balance)
CREATE TABLE IF NOT EXISTS patient_billing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL, -- References patient in EHR

    -- Balance Tracking
    current_balance DECIMAL(12,2) DEFAULT 0, -- Positive = patient owes, Negative = credit
    credit_limit DECIMAL(12,2) DEFAULT 0,
    last_payment_date TIMESTAMPTZ,
    last_payment_amount DECIMAL(12,2),

    -- Account Status
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN (
        'active', 'suspended', 'closed', 'collections'
    )),
    suspension_reason TEXT,

    -- Contact for billing
    billing_address JSONB, -- {line1, line2, city, state, pincode, country}
    billing_phone VARCHAR(20),
    billing_email VARCHAR(200),

    -- Tax Info
    gstin VARCHAR(20), -- GST Identification Number (for B2B)
    pan VARCHAR(20), -- PAN for TDS if applicable

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, patient_id)
);

-- Invoice Status Enum
DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM (
        'draft',
        'pending',
        'partially_paid',
        'paid',
        'overdue',
        'cancelled',
        'refunded',
        'written_off'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invoice Type Enum
DO $$ BEGIN
    CREATE TYPE invoice_type AS ENUM (
        'opd',           -- Outpatient
        'ipd',           -- Inpatient
        'emergency',     -- Emergency
        'pharmacy',      -- Pharmacy only
        'lab',           -- Lab only
        'radiology',     -- Radiology only
        'procedure',     -- Procedure/Surgery
        'package',       -- Package billing
        'advance',       -- Advance payment
        'final',         -- Final/Discharge bill
        'credit_note',   -- Credit/Refund
        'debit_note'     -- Additional charges
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main Invoice Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Invoice Identification
    invoice_number VARCHAR(50) NOT NULL, -- Unique per organization (e.g., INV-2024-00001)
    invoice_type invoice_type NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Patient/Payer Info
    billing_account_id UUID REFERENCES patient_billing_accounts(id),
    patient_id UUID NOT NULL, -- Patient being billed
    patient_name VARCHAR(200) NOT NULL, -- Denormalized for invoice record
    patient_mrn VARCHAR(50),

    -- Visit/Encounter Reference
    visit_id UUID, -- Link to visit/admission
    visit_type VARCHAR(20), -- OPD, IPD, Emergency
    admission_date DATE,
    discharge_date DATE,

    -- GST Details
    place_of_supply VARCHAR(10), -- State code for GST
    is_inter_state BOOLEAN DEFAULT false, -- IGST vs CGST+SGST
    reverse_charge BOOLEAN DEFAULT false,

    -- Amounts (all in INR)
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_reason TEXT,
    taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Tax Breakdown
    cgst_amount DECIMAL(12,2) DEFAULT 0,
    sgst_amount DECIMAL(12,2) DEFAULT 0,
    igst_amount DECIMAL(12,2) DEFAULT 0,
    cess_amount DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,

    -- Adjustments
    round_off DECIMAL(12,2) DEFAULT 0,
    advance_adjusted DECIMAL(12,2) DEFAULT 0, -- Advance payments applied

    -- Final Amount
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance_due DECIMAL(12,2) DEFAULT 0,

    -- Status
    status invoice_status DEFAULT 'draft',
    is_finalized BOOLEAN DEFAULT false, -- Once finalized, cannot edit

    -- Insurance
    insurance_claim_id UUID, -- Reference to insurance claim if applicable
    insurance_amount DECIMAL(12,2) DEFAULT 0,
    patient_responsibility DECIMAL(12,2) DEFAULT 0,

    -- Notes
    notes TEXT,
    internal_notes TEXT,
    terms_conditions TEXT,

    -- Printing/PDF
    printed_at TIMESTAMPTZ,
    pdf_url TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    finalized_at TIMESTAMPTZ,
    finalized_by UUID,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason TEXT,

    UNIQUE(organization_id, invoice_number)
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Service Reference
    service_id UUID REFERENCES services(id),
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(300) NOT NULL,
    description TEXT,

    -- HSN/SAC Code
    tax_code VARCHAR(20),
    tax_code_type VARCHAR(10), -- HSN or SAC

    -- Quantity & Pricing
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'each',
    unit_price DECIMAL(12,2) NOT NULL,
    gross_amount DECIMAL(12,2) NOT NULL, -- quantity * unit_price

    -- Discounts
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL, -- After discount

    -- Tax
    is_taxable BOOLEAN DEFAULT true,
    cgst_rate DECIMAL(5,2) DEFAULT 0,
    cgst_amount DECIMAL(12,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2) DEFAULT 0,
    sgst_amount DECIMAL(12,2) DEFAULT 0,
    igst_rate DECIMAL(5,2) DEFAULT 0,
    igst_amount DECIMAL(12,2) DEFAULT 0,
    cess_rate DECIMAL(5,2) DEFAULT 0,
    cess_amount DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,

    -- Total
    total_amount DECIMAL(12,2) NOT NULL, -- Net + Tax

    -- Order/Encounter Reference
    order_id UUID, -- Link to order that generated this charge
    performed_at TIMESTAMPTZ,
    performed_by UUID,

    -- Line item ordering
    line_number INT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Method Enum
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'cash',
        'card',
        'upi',
        'net_banking',
        'cheque',
        'dd',
        'wallet',
        'insurance',
        'credit',
        'adjustment',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment Status Enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'completed',
        'failed',
        'refunded',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Payment Identification
    receipt_number VARCHAR(50) NOT NULL, -- Unique receipt number
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Payer Info
    billing_account_id UUID REFERENCES patient_billing_accounts(id),
    patient_id UUID NOT NULL,
    patient_name VARCHAR(200),
    payer_name VARCHAR(200), -- May differ from patient

    -- Amount
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',

    -- Payment Details
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'completed',

    -- Method-specific details (stored as JSON for flexibility)
    payment_details JSONB, -- {card_last4, upi_id, cheque_number, bank_name, etc.}

    -- Reference numbers
    transaction_id VARCHAR(100), -- Payment gateway transaction ID
    bank_reference VARCHAR(100),
    authorization_code VARCHAR(50),

    -- Allocation
    is_advance BOOLEAN DEFAULT false, -- Is this an advance payment?
    is_allocated BOOLEAN DEFAULT false, -- Has been applied to invoice(s)?

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Refund tracking
    is_refund BOOLEAN DEFAULT false,
    original_payment_id UUID REFERENCES payments(id),
    refund_reason TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    voided_at TIMESTAMPTZ,
    voided_by UUID,
    void_reason TEXT,

    UNIQUE(organization_id, receipt_number)
);

-- Payment Allocations (which invoices a payment applies to)
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),

    allocated_amount DECIMAL(12,2) NOT NULL,
    allocation_date TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(payment_id, invoice_id)
);

-- Billing Adjustments (credits, write-offs, etc.)
CREATE TABLE IF NOT EXISTS billing_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    adjustment_number VARCHAR(50) NOT NULL,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Type
    adjustment_type VARCHAR(30) NOT NULL CHECK (adjustment_type IN (
        'discount',
        'waiver',
        'write_off',
        'credit_note',
        'debit_note',
        'rounding',
        'other'
    )),

    -- References
    invoice_id UUID REFERENCES invoices(id),
    billing_account_id UUID REFERENCES patient_billing_accounts(id),
    patient_id UUID,

    -- Amount
    amount DECIMAL(12,2) NOT NULL,
    is_credit BOOLEAN NOT NULL, -- true = reduces balance, false = increases

    -- Reason & Approval
    reason TEXT NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    UNIQUE(organization_id, adjustment_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org_number ON invoices(organization_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_org_patient ON invoices(organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON invoices(organization_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_visit ON invoices(visit_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_receipt ON payments(organization_id, receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_org_patient ON payments(organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_date ON payments(organization_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_accounts_org_patient ON patient_billing_accounts(organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_invoice ON billing_adjustments(invoice_id);

-- Triggers for updated_at
CREATE TRIGGER update_invoices_timestamp
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_invoice_items_timestamp
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_payments_timestamp
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_billing_accounts_timestamp
    BEFORE UPDATE ON patient_billing_accounts
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();
