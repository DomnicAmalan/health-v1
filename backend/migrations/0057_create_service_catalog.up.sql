-- Service Catalog Schema
-- Hospital services, procedures, and pricing with GST compliance

-- Service Category (OPD, IPD, Lab, Radiology, Pharmacy, etc.)
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES service_categories(id),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- GST/HSN-SAC Codes (India tax classification)
CREATE TABLE IF NOT EXISTS tax_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    code_type VARCHAR(10) NOT NULL CHECK (code_type IN ('HSN', 'SAC')), -- HSN for goods, SAC for services
    description TEXT NOT NULL,
    default_rate DECIMAL(5,2) NOT NULL, -- Default GST rate (5, 12, 18, 28)
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GST Rate Configuration by State
CREATE TABLE IF NOT EXISTS gst_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tax_code_id UUID NOT NULL REFERENCES tax_codes(id),
    state_code VARCHAR(10), -- NULL means default for all states
    cgst_rate DECIMAL(5,2) NOT NULL, -- Central GST
    sgst_rate DECIMAL(5,2) NOT NULL, -- State GST (same state)
    igst_rate DECIMAL(5,2) NOT NULL, -- Integrated GST (inter-state)
    cess_rate DECIMAL(5,2) DEFAULT 0, -- Additional cess if applicable
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, tax_code_id, state_code, effective_from)
);

-- Service Master (all billable services/procedures)
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id),

    -- Identification
    code VARCHAR(50) NOT NULL,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    short_name VARCHAR(100),

    -- Classification
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN (
        'consultation', 'procedure', 'investigation', 'therapy',
        'surgery', 'room_charge', 'nursing', 'pharmacy',
        'equipment', 'consumable', 'package', 'other'
    )),
    department_code VARCHAR(50),

    -- Pricing
    base_price DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'each', -- each, hour, day, session, etc.
    min_quantity INT DEFAULT 1,
    max_quantity INT,

    -- Tax
    tax_code_id UUID REFERENCES tax_codes(id),
    is_taxable BOOLEAN DEFAULT true,
    tax_inclusive BOOLEAN DEFAULT false, -- Is base_price inclusive of tax?

    -- Scheduling (for time-based services)
    duration_minutes INT,
    requires_appointment BOOLEAN DEFAULT false,

    -- Billing Rules
    requires_authorization BOOLEAN DEFAULT false,
    auto_bill BOOLEAN DEFAULT false, -- Auto-add to bill when ordered
    allow_discount BOOLEAN DEFAULT true,
    max_discount_percent DECIMAL(5,2) DEFAULT 100,

    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    UNIQUE(organization_id, code)
);

-- Service Price Tiers (different prices by patient type, payer, etc.)
CREATE TABLE IF NOT EXISTS service_price_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

    -- Tier Identification
    tier_name VARCHAR(100) NOT NULL, -- e.g., "General", "Private", "Insurance-A"
    tier_type VARCHAR(50) NOT NULL CHECK (tier_type IN (
        'default', 'patient_type', 'payer', 'department', 'time_based'
    )),

    -- Conditions (JSON for flexibility)
    conditions JSONB, -- e.g., {"patient_type": "private", "payer_id": "uuid"}

    -- Pricing
    price DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,

    -- Validity
    effective_from DATE NOT NULL,
    effective_to DATE,
    priority INT DEFAULT 0, -- Higher priority takes precedence
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Packages (bundled services)
CREATE TABLE IF NOT EXISTS service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(300) NOT NULL,
    description TEXT,

    -- Pricing
    package_price DECIMAL(12,2) NOT NULL, -- Total package price
    discount_percent DECIMAL(5,2), -- Discount from sum of individual services

    -- Tax
    tax_code_id UUID REFERENCES tax_codes(id),
    is_taxable BOOLEAN DEFAULT true,

    -- Validity
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,

    -- Limits
    max_uses_per_patient INT, -- NULL = unlimited
    validity_days INT, -- How long package is valid after purchase

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, code)
);

-- Package Items (services included in a package)
CREATE TABLE IF NOT EXISTS service_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),

    quantity INT NOT NULL DEFAULT 1,
    individual_price DECIMAL(12,2), -- Override price in package context
    is_optional BOOLEAN DEFAULT false, -- Can patient opt out?

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(package_id, service_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_org_category ON services(organization_id, category_id);
CREATE INDEX IF NOT EXISTS idx_services_org_code ON services(organization_id, code);
CREATE INDEX IF NOT EXISTS idx_services_org_active ON services(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);
CREATE INDEX IF NOT EXISTS idx_service_categories_org ON service_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_price_tiers_service ON service_price_tiers(service_id);
CREATE INDEX IF NOT EXISTS idx_gst_rates_org_tax ON gst_rates(organization_id, tax_code_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_org ON service_packages(organization_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_billing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_services_timestamp
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_service_categories_timestamp
    BEFORE UPDATE ON service_categories
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_gst_rates_timestamp
    BEFORE UPDATE ON gst_rates
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_service_packages_timestamp
    BEFORE UPDATE ON service_packages
    FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();
