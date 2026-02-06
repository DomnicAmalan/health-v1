-- Phase 1: Laboratory Information System (LIS) Core
-- Complete lab workflow: test catalog, orders, specimens, results, verification

-- Lab Test Definitions (Master Catalog)
CREATE TABLE IF NOT EXISTS lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA integration (^LAB(60) file)

    -- Test identification
    test_code VARCHAR(50) NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    test_name_short VARCHAR(100),
    loinc_code VARCHAR(50),  -- LOINC standard code
    category VARCHAR(100) NOT NULL,  -- Hematology, Biochemistry, Microbiology, Immunology, etc.

    -- Specimen requirements
    specimen_type VARCHAR(100) NOT NULL,  -- Blood, Urine, Stool, CSF, etc.
    specimen_volume VARCHAR(50),
    container_type VARCHAR(100),  -- EDTA tube, plain tube, sterile container, etc.
    container_color VARCHAR(50),  -- Purple top, red top, etc.

    -- Timing & processing
    turnaround_time_hours INTEGER,
    processing_priority VARCHAR(50) DEFAULT 'routine',  -- stat, urgent, routine
    requires_fasting BOOLEAN DEFAULT FALSE,
    special_preparation TEXT,

    -- Result configuration
    result_type VARCHAR(50) DEFAULT 'numeric',  -- numeric, text, culture, positive_negative
    result_unit VARCHAR(50),
    decimal_places INTEGER DEFAULT 2,

    -- Status & pricing
    is_active BOOLEAN DEFAULT TRUE,
    service_id UUID REFERENCES services(id),  -- Link to billing

    -- Method & equipment
    method_name VARCHAR(200),
    analyzer_name VARCHAR(200),
    department VARCHAR(100),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, test_code),
    CONSTRAINT valid_processing_priority CHECK (processing_priority IN ('stat', 'urgent', 'routine'))
);

-- Lab Panels (Test Groups)
CREATE TABLE IF NOT EXISTS lab_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA integration

    -- Panel identification
    panel_code VARCHAR(50) NOT NULL,
    panel_name VARCHAR(200) NOT NULL,
    description TEXT,
    loinc_code VARCHAR(50),

    -- Pricing
    service_id UUID REFERENCES services(id),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    category VARCHAR(100),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, panel_code)
);

-- Panel Components (Tests in a Panel)
CREATE TABLE IF NOT EXISTS lab_panel_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID NOT NULL REFERENCES lab_panels(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES lab_tests(id),

    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(panel_id, test_id)
);

-- Lab Reference Ranges
CREATE TABLE IF NOT EXISTS lab_reference_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,

    -- Patient demographics filters
    age_min_years INTEGER,
    age_max_years INTEGER,
    gender VARCHAR(20),  -- male, female, all

    -- Normal range
    reference_min DECIMAL(10,3),
    reference_max DECIMAL(10,3),
    unit VARCHAR(50) NOT NULL,

    -- Critical ranges (panic values)
    critical_min DECIMAL(10,3),
    critical_max DECIMAL(10,3),

    -- Range interpretation
    interpretation TEXT,  -- "Normal range", "Slightly elevated", etc.
    is_critical_low BOOLEAN DEFAULT FALSE,
    is_critical_high BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'all'))
);

-- Lab Orders
CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA ^LR integration

    -- Order identification
    order_number VARCHAR(100) NOT NULL,
    accession_number VARCHAR(100),  -- Lab accession number

    -- Patient context
    patient_id UUID NOT NULL,
    patient_name VARCHAR(200),  -- Denormalized for quick display
    patient_mrn VARCHAR(50),
    encounter_id UUID,  -- Link to clinical encounter

    -- Ordering provider
    ordering_provider_id UUID NOT NULL,
    ordering_provider_name VARCHAR(200),
    ordering_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Order details
    priority VARCHAR(50) DEFAULT 'routine',  -- stat, urgent, routine
    clinical_indication TEXT,
    clinical_question TEXT,
    special_instructions TEXT,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, collected, received, in_lab, completed, cancelled

    -- Specimen collection
    collection_required BOOLEAN DEFAULT TRUE,
    collected_datetime TIMESTAMPTZ,
    collected_by UUID,
    collected_by_name VARCHAR(200),
    specimen_quality VARCHAR(50),  -- good, hemolyzed, clotted, insufficient, etc.
    specimen_rejection_reason TEXT,

    -- Lab processing
    received_datetime TIMESTAMPTZ,
    received_by UUID,
    received_by_name VARCHAR(200),
    processing_started_datetime TIMESTAMPTZ,
    completed_datetime TIMESTAMPTZ,

    -- Results
    result_status VARCHAR(50),  -- preliminary, final, corrected, cancelled
    result_entered_by UUID,
    result_entered_by_name VARCHAR(200),
    result_entered_datetime TIMESTAMPTZ,
    result_verified_by UUID,
    result_verified_by_name VARCHAR(200),
    result_verified_datetime TIMESTAMPTZ,

    -- Critical values
    has_critical_values BOOLEAN DEFAULT FALSE,
    critical_value_notified BOOLEAN DEFAULT FALSE,
    critical_value_notified_datetime TIMESTAMPTZ,
    critical_value_notified_to UUID,

    -- Cancellation
    cancelled_by UUID,
    cancelled_datetime TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Comments & notes
    lab_comments TEXT,
    technician_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, order_number),
    CONSTRAINT valid_priority CHECK (priority IN ('stat', 'urgent', 'routine')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'collected', 'received', 'in_lab', 'completed', 'cancelled', 'rejected')),
    CONSTRAINT valid_result_status CHECK (result_status IS NULL OR result_status IN ('preliminary', 'final', 'corrected', 'cancelled'))
);

-- Lab Order Items (Individual Tests/Panels)
CREATE TABLE IF NOT EXISTS lab_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,

    -- Test reference (either individual test OR panel)
    test_id UUID REFERENCES lab_tests(id),
    panel_id UUID REFERENCES lab_panels(id),
    test_name VARCHAR(200) NOT NULL,  -- Denormalized for display
    test_code VARCHAR(50),

    -- Specimen tracking
    specimen_id VARCHAR(100),  -- Barcode or unique identifier
    specimen_type VARCHAR(100),
    specimen_collected_datetime TIMESTAMPTZ,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, collected, processing, completed, cancelled

    -- Result
    result_value VARCHAR(500),  -- Can be numeric, text, or structured
    result_unit VARCHAR(50),
    result_numeric DECIMAL(10,3),  -- Numeric value for trending/graphing
    result_text TEXT,  -- Free text result
    result_status VARCHAR(50),

    -- Interpretation
    is_abnormal BOOLEAN DEFAULT FALSE,
    is_critical BOOLEAN DEFAULT FALSE,
    abnormal_flag VARCHAR(10),  -- H (high), L (low), HH (critical high), LL (critical low)
    delta_check_flag BOOLEAN DEFAULT FALSE,  -- Significant change from previous

    -- Reference range (denormalized for historical accuracy)
    reference_min DECIMAL(10,3),
    reference_max DECIMAL(10,3),
    reference_range_text VARCHAR(200),

    -- Comments
    result_comment TEXT,
    technician_comment TEXT,

    -- Timing
    resulted_datetime TIMESTAMPTZ,
    verified_datetime TIMESTAMPTZ,

    -- Previous result (for delta checking)
    previous_result_value VARCHAR(500),
    previous_result_datetime TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (test_id IS NOT NULL OR panel_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_lab_tests_organization ON lab_tests(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_tests_category ON lab_tests(category) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_lab_tests_code ON lab_tests(test_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_tests_loinc ON lab_tests(loinc_code) WHERE loinc_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_lab_panels_organization ON lab_panels(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_panels_category ON lab_panels(category) WHERE is_active = TRUE AND deleted_at IS NULL;

CREATE INDEX idx_lab_reference_ranges_test ON lab_reference_ranges(test_id);

CREATE INDEX idx_lab_orders_organization ON lab_orders(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_orders_status ON lab_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_orders_priority_status ON lab_orders(priority, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_orders_ordering_datetime ON lab_orders(ordering_datetime DESC);
CREATE INDEX idx_lab_orders_provider ON lab_orders(ordering_provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_orders_order_number ON lab_orders(order_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_lab_orders_accession ON lab_orders(accession_number) WHERE accession_number IS NOT NULL;
CREATE INDEX idx_lab_orders_ien ON lab_orders(ien) WHERE ien IS NOT NULL;

CREATE INDEX idx_lab_order_items_order ON lab_order_items(order_id);
CREATE INDEX idx_lab_order_items_test ON lab_order_items(test_id) WHERE test_id IS NOT NULL;
CREATE INDEX idx_lab_order_items_panel ON lab_order_items(panel_id) WHERE panel_id IS NOT NULL;
CREATE INDEX idx_lab_order_items_status ON lab_order_items(status);
CREATE INDEX idx_lab_order_items_specimen ON lab_order_items(specimen_id) WHERE specimen_id IS NOT NULL;

-- Trigger: Auto-generate order number
CREATE OR REPLACE FUNCTION generate_lab_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'LAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('lab_order_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS lab_order_seq START 1;

CREATE TRIGGER trigger_generate_lab_order_number
    BEFORE INSERT ON lab_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_lab_order_number();

-- Trigger: Auto-update lab_orders.has_critical_values when items have critical results
CREATE OR REPLACE FUNCTION update_order_critical_flag()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lab_orders
    SET has_critical_values = EXISTS (
        SELECT 1 FROM lab_order_items
        WHERE order_id = NEW.order_id AND is_critical = TRUE
    )
    WHERE id = NEW.order_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_critical_flag
    AFTER INSERT OR UPDATE OF is_critical ON lab_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_critical_flag();

COMMENT ON TABLE lab_tests IS 'Master catalog of laboratory tests with specimen requirements and processing details';
COMMENT ON TABLE lab_panels IS 'Predefined groups of tests (e.g., CBC, BMP, CMP)';
COMMENT ON TABLE lab_panel_tests IS 'Individual tests that make up a panel';
COMMENT ON TABLE lab_reference_ranges IS 'Normal and critical ranges by age/gender for result interpretation';
COMMENT ON TABLE lab_orders IS 'Laboratory test orders with complete workflow tracking';
COMMENT ON TABLE lab_order_items IS 'Individual test results within an order';

COMMENT ON COLUMN lab_orders.ien IS 'VistA Internal Entry Number for ^LR global integration';
COMMENT ON COLUMN lab_orders.status IS 'Order workflow: pending → collected → received → in_lab → completed';
COMMENT ON COLUMN lab_orders.priority IS 'STAT (immediate), urgent (< 1 hour), routine (standard TAT)';
COMMENT ON COLUMN lab_order_items.abnormal_flag IS 'H=high, L=low, HH=critical high, LL=critical low, N=normal';
COMMENT ON COLUMN lab_order_items.delta_check_flag IS 'True if result differs significantly from previous value';
