-- Vital Signs Recording System
-- PostgreSQL tables for vital signs capture with VistA ^GMR (File #120.5) integration

-- Vital Signs (Main measurements table)
CREATE TABLE IF NOT EXISTS vital_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA ^GMR (File #120.5) integration

    -- Context
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    patient_ien INTEGER NOT NULL,
    encounter_id UUID,
    appointment_id UUID,

    -- Recording information
    recorded_by UUID NOT NULL,
    recorded_by_name VARCHAR(200),
    recorded_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_location VARCHAR(200),

    -- Core Vital Signs
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    temperature DECIMAL(4,1),
    temperature_unit VARCHAR(20) DEFAULT 'fahrenheit',  -- fahrenheit, celsius
    oxygen_saturation INTEGER,  -- SpO2 percentage
    oxygen_delivery_method VARCHAR(100),  -- room_air, nasal_cannula, mask, etc.

    -- Additional Measurements
    weight DECIMAL(6,2),
    weight_unit VARCHAR(20) DEFAULT 'kg',  -- kg, lbs
    height DECIMAL(6,2),
    height_unit VARCHAR(20) DEFAULT 'cm',  -- cm, inches
    bmi DECIMAL(5,2),  -- Auto-calculated from weight and height

    -- Pain Assessment
    pain_score INTEGER,  -- 0-10 scale
    pain_location VARCHAR(200),
    pain_quality VARCHAR(200),  -- sharp, dull, throbbing, etc.

    -- Clinical Context
    position VARCHAR(50),  -- standing, sitting, lying, supine, prone
    blood_pressure_site VARCHAR(50),  -- left_arm, right_arm, left_leg, right_leg
    blood_pressure_method VARCHAR(50),  -- manual, automated
    consciousness_level VARCHAR(50),  -- alert, drowsy, confused, unresponsive

    -- Alerts & Flags
    is_abnormal BOOLEAN DEFAULT FALSE,
    is_critical BOOLEAN DEFAULT FALSE,
    abnormal_flags JSONB,  -- {bp_high: true, temp_high: true, ...}
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_datetime TIMESTAMPTZ,

    -- Notes
    notes TEXT,
    verification_required BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    verified_datetime TIMESTAMPTZ,

    -- VistA sync
    mumps_data JSONB,
    mumps_last_sync TIMESTAMPTZ,

    -- Audit fields
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_blood_pressure CHECK (
        (blood_pressure_systolic IS NULL AND blood_pressure_diastolic IS NULL) OR
        (blood_pressure_systolic > blood_pressure_diastolic AND blood_pressure_systolic > 0)
    ),
    CONSTRAINT valid_heart_rate CHECK (heart_rate IS NULL OR (heart_rate >= 20 AND heart_rate <= 300)),
    CONSTRAINT valid_respiratory_rate CHECK (respiratory_rate IS NULL OR (respiratory_rate >= 4 AND respiratory_rate <= 60)),
    CONSTRAINT valid_temperature_fahrenheit CHECK (
        temperature_unit != 'fahrenheit' OR temperature IS NULL OR (temperature >= 85 AND temperature <= 115)
    ),
    CONSTRAINT valid_temperature_celsius CHECK (
        temperature_unit != 'celsius' OR temperature IS NULL OR (temperature >= 29 AND temperature <= 46)
    ),
    CONSTRAINT valid_oxygen_saturation CHECK (oxygen_saturation IS NULL OR (oxygen_saturation >= 50 AND oxygen_saturation <= 100)),
    CONSTRAINT valid_pain_score CHECK (pain_score IS NULL OR (pain_score >= 0 AND pain_score <= 10)),
    CONSTRAINT valid_bmi CHECK (bmi IS NULL OR (bmi >= 10 AND bmi <= 100))
);

-- Vital Signs Reference Ranges (Normal ranges by age/gender)
CREATE TABLE IF NOT EXISTS vital_signs_reference_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    vital_type VARCHAR(50) NOT NULL,  -- blood_pressure_systolic, heart_rate, temperature, etc.
    age_min_years INTEGER,
    age_max_years INTEGER,
    gender VARCHAR(20),  -- male, female, all

    -- Normal range
    normal_min DECIMAL(6,2),
    normal_max DECIMAL(6,2),
    unit VARCHAR(20),

    -- Critical ranges
    critical_low DECIMAL(6,2),
    critical_high DECIMAL(6,2),

    -- Interpretation
    interpretation TEXT,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vital Signs Templates (Quick entry presets)
CREATE TABLE IF NOT EXISTS vital_signs_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    template_name VARCHAR(200) NOT NULL,
    description TEXT,
    department VARCHAR(100),

    -- Default values
    default_position VARCHAR(50),
    default_oxygen_delivery VARCHAR(100),
    required_fields JSONB,  -- Array of required field names

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id, template_name)
);

-- Indexes for performance
CREATE INDEX idx_vital_signs_organization ON vital_signs(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vital_signs_encounter ON vital_signs(encounter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vital_signs_recorded_datetime ON vital_signs(recorded_datetime DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_vital_signs_patient_datetime ON vital_signs(patient_id, recorded_datetime DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_vital_signs_critical ON vital_signs(is_critical) WHERE is_critical = true AND deleted_at IS NULL;
CREATE INDEX idx_vital_signs_abnormal ON vital_signs(is_abnormal) WHERE is_abnormal = true AND deleted_at IS NULL;
CREATE INDEX idx_vital_signs_ien ON vital_signs(ien) WHERE ien IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_vital_signs_ranges_type ON vital_signs_reference_ranges(vital_type, age_min_years, age_max_years);

-- Trigger: Auto-calculate BMI from weight and height
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
DECLARE
    weight_kg DECIMAL(6,2);
    height_m DECIMAL(4,2);
BEGIN
    -- Convert weight to kg if needed
    IF NEW.weight IS NOT NULL THEN
        IF NEW.weight_unit = 'lbs' THEN
            weight_kg := NEW.weight * 0.453592;
        ELSE
            weight_kg := NEW.weight;
        END IF;

        -- Convert height to meters if needed
        IF NEW.height IS NOT NULL THEN
            IF NEW.height_unit = 'inches' THEN
                height_m := NEW.height * 0.0254;
            ELSE
                height_m := NEW.height / 100;
            END IF;

            -- Calculate BMI: weight(kg) / height(m)^2
            IF height_m > 0 THEN
                NEW.bmi := ROUND((weight_kg / (height_m * height_m))::NUMERIC, 2);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_bmi
    BEFORE INSERT OR UPDATE OF weight, height, weight_unit, height_unit ON vital_signs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bmi();

-- Trigger: Auto-flag abnormal and critical values
CREATE OR REPLACE FUNCTION flag_abnormal_vitals()
RETURNS TRIGGER AS $$
DECLARE
    patient_age INTEGER;
    patient_gender VARCHAR(20);
    abnormal_flags_obj JSONB := '{}'::jsonb;
    is_any_abnormal BOOLEAN := false;
    is_any_critical BOOLEAN := false;
BEGIN
    -- Get patient age and gender for reference ranges
    SELECT
        EXTRACT(YEAR FROM AGE(NOW(), date_of_birth))::INTEGER,
        sex
    INTO patient_age, patient_gender
    FROM ehr_patients
    WHERE id = NEW.patient_id;

    -- Check Blood Pressure
    IF NEW.blood_pressure_systolic IS NOT NULL AND NEW.blood_pressure_diastolic IS NOT NULL THEN
        -- Hypertensive crisis
        IF NEW.blood_pressure_systolic >= 180 OR NEW.blood_pressure_diastolic >= 120 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"bp_critical_high": true}'::jsonb;
            is_any_critical := true;
            is_any_abnormal := true;
        -- Hypotensive
        ELSIF NEW.blood_pressure_systolic < 90 OR NEW.blood_pressure_diastolic < 60 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"bp_low": true}'::jsonb;
            is_any_abnormal := true;
        -- Hypertensive
        ELSIF NEW.blood_pressure_systolic >= 140 OR NEW.blood_pressure_diastolic >= 90 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"bp_high": true}'::jsonb;
            is_any_abnormal := true;
        END IF;
    END IF;

    -- Check Heart Rate
    IF NEW.heart_rate IS NOT NULL THEN
        -- Bradycardia (critical)
        IF NEW.heart_rate < 40 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"hr_critical_low": true}'::jsonb;
            is_any_critical := true;
            is_any_abnormal := true;
        -- Tachycardia (critical)
        ELSIF NEW.heart_rate > 140 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"hr_critical_high": true}'::jsonb;
            is_any_critical := true;
            is_any_abnormal := true;
        -- Bradycardia (abnormal)
        ELSIF NEW.heart_rate < 60 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"hr_low": true}'::jsonb;
            is_any_abnormal := true;
        -- Tachycardia (abnormal)
        ELSIF NEW.heart_rate > 100 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"hr_high": true}'::jsonb;
            is_any_abnormal := true;
        END IF;
    END IF;

    -- Check Temperature (Fahrenheit)
    IF NEW.temperature IS NOT NULL AND NEW.temperature_unit = 'fahrenheit' THEN
        -- Hypothermia
        IF NEW.temperature < 95 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"temp_critical_low": true}'::jsonb;
            is_any_critical := true;
            is_any_abnormal := true;
        -- Fever
        ELSIF NEW.temperature >= 100.4 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"temp_high": true}'::jsonb;
            is_any_abnormal := true;
        -- High fever (critical)
        IF NEW.temperature >= 103 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"temp_critical_high": true}'::jsonb;
            is_any_critical := true;
        END IF;
        END IF;
    END IF;

    -- Check Oxygen Saturation
    IF NEW.oxygen_saturation IS NOT NULL THEN
        -- Critical hypoxia
        IF NEW.oxygen_saturation < 90 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"spo2_critical_low": true}'::jsonb;
            is_any_critical := true;
            is_any_abnormal := true;
        -- Mild hypoxia
        ELSIF NEW.oxygen_saturation < 95 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"spo2_low": true}'::jsonb;
            is_any_abnormal := true;
        END IF;
    END IF;

    -- Check Respiratory Rate
    IF NEW.respiratory_rate IS NOT NULL THEN
        -- Bradypnea
        IF NEW.respiratory_rate < 12 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"rr_low": true}'::jsonb;
            is_any_abnormal := true;
        -- Tachypnea
        ELSIF NEW.respiratory_rate > 20 THEN
            abnormal_flags_obj := abnormal_flags_obj || '{"rr_high": true}'::jsonb;
            is_any_abnormal := true;
        END IF;
    END IF;

    -- Update flags
    NEW.abnormal_flags := abnormal_flags_obj;
    NEW.is_abnormal := is_any_abnormal;
    NEW.is_critical := is_any_critical;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_flag_abnormal_vitals
    BEFORE INSERT OR UPDATE ON vital_signs
    FOR EACH ROW
    EXECUTE FUNCTION flag_abnormal_vitals();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vital_signs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vital_signs_timestamp
    BEFORE UPDATE ON vital_signs
    FOR EACH ROW
    EXECUTE FUNCTION update_vital_signs_timestamp();

-- Seed reference ranges
INSERT INTO vital_signs_reference_ranges (organization_id, vital_type, age_min_years, age_max_years, gender, normal_min, normal_max, unit, critical_low, critical_high, interpretation)
SELECT
    o.id,
    vital_type,
    age_min_years,
    age_max_years,
    gender,
    normal_min,
    normal_max,
    unit,
    critical_low,
    critical_high,
    interpretation
FROM organizations o
CROSS JOIN (VALUES
    -- Blood Pressure (Adult)
    ('blood_pressure_systolic', 18, 120, 'all', 90, 120, 'mmHg', 70, 180, 'Normal BP systolic'),
    ('blood_pressure_diastolic', 18, 120, 'all', 60, 80, 'mmHg', 40, 120, 'Normal BP diastolic'),
    -- Heart Rate (Adult)
    ('heart_rate', 18, 120, 'all', 60, 100, 'bpm', 40, 140, 'Normal resting heart rate'),
    -- Respiratory Rate (Adult)
    ('respiratory_rate', 18, 120, 'all', 12, 20, 'breaths/min', 8, 30, 'Normal respiratory rate'),
    -- Temperature (Fahrenheit)
    ('temperature', 0, 120, 'all', 97.8, 99.1, '°F', 95, 103, 'Normal body temperature'),
    -- Oxygen Saturation
    ('oxygen_saturation', 0, 120, 'all', 95, 100, '%', 90, 100, 'Normal SpO2'),
    -- BMI (Adult)
    ('bmi', 18, 120, 'all', 18.5, 24.9, 'kg/m²', 15, 40, 'Normal weight')
) AS ranges(vital_type, age_min_years, age_max_years, gender, normal_min, normal_max, unit, critical_low, critical_high, interpretation)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE vital_signs IS 'Vital signs recordings with VistA ^GMR integration and automatic abnormal value flagging';
COMMENT ON TABLE vital_signs_reference_ranges IS 'Normal and critical ranges for vital signs by age and gender';
COMMENT ON TABLE vital_signs_templates IS 'Quick entry templates for common vital signs scenarios';

COMMENT ON COLUMN vital_signs.ien IS 'VistA ^GMR (File #120.5) Internal Entry Number';
COMMENT ON COLUMN vital_signs.bmi IS 'Body Mass Index - auto-calculated from weight and height';
COMMENT ON COLUMN vital_signs.abnormal_flags IS 'JSONB object with specific abnormal flags (bp_high, hr_low, temp_critical_high, etc.)';
COMMENT ON COLUMN vital_signs.is_critical IS 'True if any vital sign is in critical range (requires immediate attention)';
