-- Imaging/Radiology Orders System
-- PostgreSQL tables for radiology orders, reports, and PACS integration
-- VistA ^RA (File #70) Radiology integration

-- Imaging Modalities Reference (Master data)
CREATE TABLE IF NOT EXISTS imaging_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Modality details
    modality_code VARCHAR(10) NOT NULL,  -- XR, CT, MRI, US, NM, PET, etc.
    modality_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Availability
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, modality_code)
);

-- Imaging Study Types (Catalog of available studies)
CREATE TABLE IF NOT EXISTS imaging_study_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Study identification
    study_code VARCHAR(50) NOT NULL,
    study_name VARCHAR(200) NOT NULL,
    modality_id UUID NOT NULL REFERENCES imaging_modalities(id),

    -- Clinical details
    body_part VARCHAR(100),
    study_description TEXT,
    typical_duration_minutes INTEGER,

    -- Ordering requirements
    requires_contrast BOOLEAN DEFAULT FALSE,
    requires_sedation BOOLEAN DEFAULT FALSE,
    requires_fasting BOOLEAN DEFAULT FALSE,
    special_instructions TEXT,

    -- Pricing
    service_id UUID REFERENCES services(id),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, study_code)
);

-- Imaging Orders
CREATE TABLE IF NOT EXISTS imaging_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA ^RA (File #70) integration

    -- Order identification
    order_number VARCHAR(100) NOT NULL,
    accession_number VARCHAR(100),  -- PACS accession number (generated when scheduled)
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    patient_ien INTEGER NOT NULL,
    encounter_id UUID REFERENCES encounters(id),

    -- Ordering provider
    ordering_provider_id UUID NOT NULL,
    ordering_provider_name VARCHAR(200),
    ordering_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Study details
    study_type_id UUID REFERENCES imaging_study_types(id),
    modality_id UUID REFERENCES imaging_modalities(id),
    study_name VARCHAR(200) NOT NULL,
    modality_code VARCHAR(10) NOT NULL,
    body_part VARCHAR(100),
    laterality VARCHAR(20),  -- left, right, bilateral, N/A

    -- Clinical information
    clinical_indication TEXT NOT NULL,
    clinical_history TEXT,
    relevant_diagnoses JSONB,  -- Array of ICD-10 codes
    special_instructions TEXT,

    -- Requirements
    requires_contrast BOOLEAN DEFAULT FALSE,
    contrast_type VARCHAR(100),
    requires_sedation BOOLEAN DEFAULT FALSE,
    requires_fasting BOOLEAN DEFAULT FALSE,
    patient_prepared BOOLEAN DEFAULT FALSE,

    -- Priority
    priority VARCHAR(50) DEFAULT 'routine',  -- stat, urgent, routine

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, scheduled, in_progress, completed, cancelled, discontinued
    scheduled_datetime TIMESTAMPTZ,
    performed_datetime TIMESTAMPTZ,
    completed_datetime TIMESTAMPTZ,

    -- Performing details
    performing_technologist_id UUID,
    performing_technologist_name VARCHAR(200),
    performing_location VARCHAR(200),
    equipment_used VARCHAR(200),

    -- Report details
    report_status VARCHAR(50),  -- preliminary, final, corrected, addendum
    radiologist_id UUID,
    radiologist_name VARCHAR(200),
    preliminary_findings TEXT,
    final_findings TEXT,
    impression TEXT,
    recommendations TEXT,

    preliminary_datetime TIMESTAMPTZ,
    final_datetime TIMESTAMPTZ,
    report_verified_by UUID,
    report_verified_datetime TIMESTAMPTZ,

    -- PACS integration
    pacs_study_instance_uid VARCHAR(200),  -- DICOM Study Instance UID
    pacs_url TEXT,  -- Link to PACS viewer
    series_count INTEGER DEFAULT 0,
    image_count INTEGER DEFAULT 0,

    -- Quality metrics
    is_critical_finding BOOLEAN DEFAULT FALSE,
    critical_finding_notified BOOLEAN DEFAULT FALSE,
    critical_finding_notified_datetime TIMESTAMPTZ,

    -- Cancellation
    cancelled_by UUID,
    cancelled_datetime TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- VistA sync
    mumps_data JSONB,
    mumps_last_sync TIMESTAMPTZ,

    -- Audit fields
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_imaging_status CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'discontinued')),
    CONSTRAINT valid_report_status CHECK (report_status IS NULL OR report_status IN ('preliminary', 'final', 'corrected', 'addendum')),
    CONSTRAINT valid_priority CHECK (priority IN ('stat', 'urgent', 'routine')),
    CONSTRAINT valid_laterality CHECK (laterality IS NULL OR laterality IN ('left', 'right', 'bilateral', 'N/A')),
    UNIQUE(organization_id, order_number)
);

-- Imaging Report Addenda (Additional findings added after initial report)
CREATE TABLE IF NOT EXISTS imaging_report_addenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES imaging_orders(id) ON DELETE CASCADE,

    -- Addendum details
    addendum_number INTEGER NOT NULL,
    addendum_text TEXT NOT NULL,
    addendum_reason VARCHAR(500),

    -- Author
    author_id UUID NOT NULL,
    author_name VARCHAR(200),
    addendum_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(order_id, addendum_number)
);

-- Imaging Order History (Track status changes)
CREATE TABLE IF NOT EXISTS imaging_order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES imaging_orders(id) ON DELETE CASCADE,

    -- Change details
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    change_reason TEXT,

    -- Who made the change
    changed_by UUID NOT NULL,
    changed_by_name VARCHAR(200),
    changed_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_imaging_orders_organization ON imaging_orders(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_patient ON imaging_orders(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_patient_ien ON imaging_orders(patient_ien) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_ordering_provider ON imaging_orders(ordering_provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_radiologist ON imaging_orders(radiologist_id) WHERE radiologist_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_status ON imaging_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_priority ON imaging_orders(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_modality ON imaging_orders(modality_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_ordering_datetime ON imaging_orders(ordering_datetime DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_scheduled ON imaging_orders(scheduled_datetime) WHERE scheduled_datetime IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_report_status ON imaging_orders(report_status) WHERE report_status IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_critical ON imaging_orders(is_critical_finding) WHERE is_critical_finding = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_accession ON imaging_orders(accession_number) WHERE accession_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_encounter ON imaging_orders(encounter_id) WHERE encounter_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_imaging_orders_ien ON imaging_orders(ien) WHERE ien IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_imaging_study_types_modality ON imaging_study_types(modality_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_imaging_study_types_active ON imaging_study_types(is_active) WHERE is_active = TRUE AND deleted_at IS NULL;

CREATE INDEX idx_imaging_report_addenda_order ON imaging_report_addenda(order_id);
CREATE INDEX idx_imaging_order_history_order ON imaging_order_history(order_id);

-- Trigger: Auto-update timestamp and version
CREATE OR REPLACE FUNCTION update_imaging_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    NEW.version := OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_imaging_order_timestamp
    BEFORE UPDATE ON imaging_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_imaging_order_timestamp();

-- Trigger: Record status changes in history
CREATE OR REPLACE FUNCTION record_imaging_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO imaging_order_history (
            order_id,
            previous_status,
            new_status,
            changed_by,
            changed_datetime
        )
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.updated_by,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_imaging_order_status_change
    AFTER UPDATE OF status ON imaging_orders
    FOR EACH ROW
    EXECUTE FUNCTION record_imaging_order_status_change();

-- Trigger: Generate accession number when scheduled
CREATE OR REPLACE FUNCTION generate_accession_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' AND NEW.accession_number IS NULL THEN
        -- Generate accession number: YYYYMMDD-ORG-SEQNUM
        NEW.accession_number := TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                               SUBSTRING(NEW.organization_id::text FROM 1 FOR 8) || '-' ||
                               LPAD(nextval('imaging_accession_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for accession numbers
CREATE SEQUENCE IF NOT EXISTS imaging_accession_seq START 1;

CREATE TRIGGER trigger_generate_accession_number
    BEFORE UPDATE OF status ON imaging_orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_accession_number();

-- Seed common imaging modalities
INSERT INTO imaging_modalities (organization_id, modality_code, modality_name, description)
SELECT
    id,
    unnest(ARRAY['XR', 'CT', 'MRI', 'US', 'NM', 'PET', 'FLUORO', 'MAMMO']),
    unnest(ARRAY['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Nuclear Medicine', 'PET Scan', 'Fluoroscopy', 'Mammography']),
    unnest(ARRAY[
        'Conventional radiography using X-rays',
        'Computed Tomography - cross-sectional imaging',
        'Magnetic Resonance Imaging - soft tissue imaging',
        'Ultrasound imaging using sound waves',
        'Nuclear medicine imaging with radioactive tracers',
        'Positron Emission Tomography - metabolic imaging',
        'Real-time X-ray imaging',
        'Breast imaging with X-rays'
    ])
FROM organizations
WHERE NOT EXISTS (SELECT 1 FROM imaging_modalities)
LIMIT 1;

COMMENT ON TABLE imaging_orders IS 'Radiology/imaging orders with PACS integration and VistA ^RA synchronization';
COMMENT ON TABLE imaging_study_types IS 'Catalog of available imaging studies by modality';
COMMENT ON TABLE imaging_modalities IS 'Master list of imaging modalities (XR, CT, MRI, etc.)';
COMMENT ON TABLE imaging_report_addenda IS 'Additional findings added to reports after initial finalization';
COMMENT ON TABLE imaging_order_history IS 'Audit trail of imaging order status changes';

COMMENT ON COLUMN imaging_orders.ien IS 'VistA ^RA (File #70) Internal Entry Number';
COMMENT ON COLUMN imaging_orders.accession_number IS 'PACS accession number - auto-generated when study is scheduled';
COMMENT ON COLUMN imaging_orders.pacs_study_instance_uid IS 'DICOM Study Instance UID for PACS integration';
COMMENT ON COLUMN imaging_orders.is_critical_finding IS 'True if report contains critical/urgent finding requiring immediate notification';
COMMENT ON COLUMN imaging_orders.status IS 'Order workflow: pending → scheduled → in_progress → completed';
COMMENT ON COLUMN imaging_orders.report_status IS 'Report state: preliminary (wet read) → final (attending verified) → corrected/addendum';
