-- Seed Data: Common Task Templates
-- Pre-defined task templates for common clinical workflows

-- Lab Collection Tasks
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Lab Specimen Collection',
    'lab_collection',
    'Collect {{specimen_type}} specimen for {{patient_name}}',
    'Collect specimen for lab order {{order_number}}. Tests: {{test_names}}',
    'laboratory',
    'lab_tech',
    'normal',
    30,  -- 30 minutes to collect
    'lab_order_created',
    '{"order_priority": ["routine", "urgent"]}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Lab Specimen Collection'
      AND organization_id = o.id
);

-- STAT Lab Collection
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'STAT Lab Specimen Collection',
    'lab_collection_stat',
    'STAT: Collect {{specimen_type}} for {{patient_name}}',
    'URGENT: Immediate collection required for STAT lab order {{order_number}}',
    'laboratory',
    'lab_tech',
    'stat',
    5,  -- 5 minutes for STAT
    'lab_order_created',
    '{"order_priority": ["stat"]}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'STAT Lab Specimen Collection'
      AND organization_id = o.id
);

-- Lab Result Entry
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Lab Result Entry',
    'result_entry',
    'Enter results for {{patient_name}} - {{test_names}}',
    'Enter laboratory results for order {{order_number}}',
    'laboratory',
    'lab_tech',
    'normal',
    240,  -- 4 hours turnaround
    'specimen_received',
    '{}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Lab Result Entry'
      AND organization_id = o.id
);

-- Lab Result Verification
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Lab Result Verification',
    'result_verification',
    'Verify results for {{patient_name}} - {{test_names}}',
    'Verify and approve laboratory results for order {{order_number}}',
    'laboratory',
    'pathologist',
    'normal',
    60,  -- 1 hour to verify
    'results_entered',
    '{}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Lab Result Verification'
      AND organization_id = o.id
);

-- Appointment Check-in
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Appointment Check-in',
    'appointment_checkin',
    'Check in {{patient_name}} for {{appointment_time}} appointment',
    'Patient arrival check-in for appointment with {{provider_name}}',
    'administrative',
    'receptionist',
    'normal',
    15,  -- 15 minutes before appointment
    'patient_arrived',
    '{}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Appointment Check-in'
      AND organization_id = o.id
);

-- Vital Signs Recording
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Record Vital Signs',
    'vitals_recording',
    'Record vitals for {{patient_name}}',
    'Record patient vital signs (BP, HR, RR, Temp, SpO2)',
    'clinical',
    'nurse',
    'normal',
    10,  -- 10 minutes after check-in
    'patient_checked_in',
    '{}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Record Vital Signs'
      AND organization_id = o.id
);

-- Critical Value Notification
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Notify Critical Lab Value',
    'critical_value_notification',
    'CRITICAL: {{test_name}} = {{value}} for {{patient_name}}',
    'Immediately notify ordering provider of critical lab value',
    'clinical',
    'nurse',
    'stat',
    5,  -- 5 minutes to notify
    'critical_result_verified',
    '{}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Notify Critical Lab Value'
      AND organization_id = o.id
);

-- Medication Administration
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Administer Medication',
    'medication_administration',
    'Administer {{medication_name}} to {{patient_name}}',
    'Due: {{scheduled_time}}. Route: {{route}}. Dose: {{dose}}',
    'clinical',
    'nurse',
    'normal',
    30,  -- 30 minutes window
    'medication_scheduled',
    '{}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Administer Medication'
      AND organization_id = o.id
);

-- Imaging Study Scheduling
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Schedule Imaging Study',
    'imaging_scheduling',
    'Schedule {{study_type}} for {{patient_name}}',
    'Schedule imaging study: {{study_type}}. Order: {{order_number}}',
    'radiology',
    'radiology_scheduler',
    'normal',
    120,  -- 2 hours to schedule
    'imaging_order_created',
    '{"priority": ["routine"]}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Schedule Imaging Study'
      AND organization_id = o.id
);

-- Discharge Planning
INSERT INTO task_templates (
    organization_id,
    template_name,
    task_type,
    task_title_template,
    task_description_template,
    task_category,
    default_assigned_to_role,
    default_priority,
    default_due_duration_minutes,
    trigger_on_event,
    trigger_conditions,
    is_active
)
SELECT
    o.id,
    'Discharge Planning',
    'discharge_planning',
    'Prepare discharge for {{patient_name}}',
    'Complete discharge instructions, medication reconciliation, and follow-up scheduling',
    'clinical',
    'nurse',
    'normal',
    60,  -- 1 hour before discharge
    'discharge_ordered',
    '{}'::jsonb,
    TRUE
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE template_name = 'Discharge Planning'
      AND organization_id = o.id
);
