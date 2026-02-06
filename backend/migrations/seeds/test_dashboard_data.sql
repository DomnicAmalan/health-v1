-- Seed Data: Test Dashboard Preferences
-- Sample dashboard configurations for different roles

-- Doctor Dashboard
INSERT INTO user_dashboard_preferences (
    organization_id,
    user_id,
    role,
    enabled_widgets,
    widget_layout,
    default_filters,
    default_time_range,
    refresh_interval_seconds
)
SELECT
    o.id,
    u.id,
    'doctor',
    '["today_appointments", "pending_results", "critical_values", "my_patients", "recent_encounters"]'::jsonb,
    '{
        "today_appointments": {"x": 0, "y": 0, "w": 6, "h": 4},
        "pending_results": {"x": 6, "y": 0, "w": 6, "h": 4},
        "critical_values": {"x": 0, "y": 4, "w": 6, "h": 3},
        "my_patients": {"x": 6, "y": 4, "w": 6, "h": 3},
        "recent_encounters": {"x": 0, "y": 7, "w": 12, "h": 4}
    }'::jsonb,
    '{"show_only_my_patients": true, "departments": []}'::jsonb,
    'today',
    300
FROM organizations o
CROSS JOIN users u
WHERE u.role = 'doctor'
  AND NOT EXISTS (
    SELECT 1 FROM user_dashboard_preferences
    WHERE user_id = u.id AND organization_id = o.id
)
LIMIT 1;

-- Nurse Dashboard
INSERT INTO user_dashboard_preferences (
    organization_id,
    user_id,
    role,
    enabled_widgets,
    widget_layout,
    default_filters,
    default_time_range,
    refresh_interval_seconds
)
SELECT
    o.id,
    u.id,
    'nurse',
    '["my_patients", "vitals_due", "medication_due", "specimen_collection", "task_list"]'::jsonb,
    '{
        "my_patients": {"x": 0, "y": 0, "w": 8, "h": 5},
        "vitals_due": {"x": 8, "y": 0, "w": 4, "h": 5},
        "medication_due": {"x": 0, "y": 5, "w": 6, "h": 4},
        "specimen_collection": {"x": 6, "y": 5, "w": 6, "h": 4},
        "task_list": {"x": 0, "y": 9, "w": 12, "h": 4}
    }'::jsonb,
    '{"show_only_assigned": true}'::jsonb,
    'today',
    180
FROM organizations o
CROSS JOIN users u
WHERE u.role = 'nurse'
  AND NOT EXISTS (
    SELECT 1 FROM user_dashboard_preferences
    WHERE user_id = u.id AND organization_id = o.id
)
LIMIT 1;

-- Lab Tech Dashboard
INSERT INTO user_dashboard_preferences (
    organization_id,
    user_id,
    role,
    enabled_widgets,
    widget_layout,
    default_filters,
    default_time_range,
    refresh_interval_seconds
)
SELECT
    o.id,
    u.id,
    'lab_tech',
    '["collection_queue", "received_specimens", "result_entry_queue", "stat_orders", "turnaround_times"]'::jsonb,
    '{
        "collection_queue": {"x": 0, "y": 0, "w": 6, "h": 5},
        "received_specimens": {"x": 6, "y": 0, "w": 6, "h": 5},
        "result_entry_queue": {"x": 0, "y": 5, "w": 6, "h": 5},
        "stat_orders": {"x": 6, "y": 5, "w": 6, "h": 5},
        "turnaround_times": {"x": 0, "y": 10, "w": 12, "h": 3}
    }'::jsonb,
    '{"priority": ["stat", "urgent"]}'::jsonb,
    'today',
    120
FROM organizations o
CROSS JOIN users u
WHERE u.role = 'lab_tech'
  AND NOT EXISTS (
    SELECT 1 FROM user_dashboard_preferences
    WHERE user_id = u.id AND organization_id = o.id
)
LIMIT 1;

-- Management Dashboard
INSERT INTO user_dashboard_preferences (
    organization_id,
    user_id,
    role,
    enabled_widgets,
    widget_layout,
    default_filters,
    default_time_range,
    refresh_interval_seconds
)
SELECT
    o.id,
    u.id,
    'admin',
    '["revenue_metrics", "appointment_utilization", "lab_turnaround", "outstanding_bills", "staff_productivity"]'::jsonb,
    '{
        "revenue_metrics": {"x": 0, "y": 0, "w": 6, "h": 4},
        "appointment_utilization": {"x": 6, "y": 0, "w": 6, "h": 4},
        "lab_turnaround": {"x": 0, "y": 4, "w": 4, "h": 4},
        "outstanding_bills": {"x": 4, "y": 4, "w": 4, "h": 4},
        "staff_productivity": {"x": 8, "y": 4, "w": 4, "h": 4}
    }'::jsonb,
    '{"time_period": "month"}'::jsonb,
    'this_month',
    600
FROM organizations o
CROSS JOIN users u
WHERE u.role IN ('admin', 'super_admin')
  AND NOT EXISTS (
    SELECT 1 FROM user_dashboard_preferences
    WHERE user_id = u.id AND organization_id = o.id
)
LIMIT 1;
