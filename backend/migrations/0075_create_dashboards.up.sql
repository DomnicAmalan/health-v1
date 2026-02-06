-- Phase 0.1: User Dashboard Preferences
-- Role-based dashboards for different stakeholders

CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,

    -- Widget configuration
    enabled_widgets JSONB NOT NULL DEFAULT '[]',
    widget_layout JSONB,  -- Grid layout configuration

    -- Filters & defaults
    default_filters JSONB,
    default_time_range VARCHAR(50) DEFAULT 'today',  -- today, week, month

    -- Preferences
    refresh_interval_seconds INTEGER DEFAULT 300,  -- Auto-refresh every 5 minutes
    theme VARCHAR(50) DEFAULT 'light',

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_user_dashboard_preferences_user ON user_dashboard_preferences(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_dashboard_preferences_role ON user_dashboard_preferences(role) WHERE deleted_at IS NULL;

-- Dashboard Metrics Cache
-- Pre-computed metrics for dashboard performance
CREATE TABLE IF NOT EXISTS dashboard_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Metric identification
    metric_key VARCHAR(200) NOT NULL,  -- revenue_today, appointments_pending, etc.
    metric_category VARCHAR(100) NOT NULL,  -- financial, clinical, operational

    -- Metric value
    metric_value JSONB NOT NULL,  -- Can store numbers, arrays, objects
    metric_unit VARCHAR(50),

    -- Time range
    time_period VARCHAR(50) NOT NULL,  -- today, yesterday, this_week, this_month
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,

    -- Cache metadata
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    computation_duration_ms INTEGER,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id, metric_key, time_period)
);

CREATE INDEX idx_dashboard_metrics_cache_org ON dashboard_metrics_cache(organization_id, metric_category);
CREATE INDEX idx_dashboard_metrics_cache_expires ON dashboard_metrics_cache(expires_at);

COMMENT ON TABLE user_dashboard_preferences IS 'User-specific dashboard configuration and widget preferences';
COMMENT ON TABLE dashboard_metrics_cache IS 'Pre-computed dashboard metrics for performance optimization';
