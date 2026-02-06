-- Phase 0.5: Internal Communications
-- Messages and notifications for clinical staff collaboration

-- Internal Messages (Staff-to-Staff Communication)
CREATE TABLE IF NOT EXISTS internal_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Message details
    subject VARCHAR(500) NOT NULL,
    message_body TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'general',  -- general, consult, handoff, alert, urgent

    -- Sender & Recipient
    sender_id UUID NOT NULL,
    sender_name VARCHAR(200),
    sender_role VARCHAR(50),
    recipient_id UUID NOT NULL,
    recipient_name VARCHAR(200),
    recipient_role VARCHAR(50),

    -- Patient context (if message relates to specific patient)
    patient_id UUID,
    patient_name VARCHAR(200),
    encounter_id UUID,

    -- Priority
    priority VARCHAR(50) DEFAULT 'normal',  -- stat, urgent, normal, low

    -- Status tracking
    read BOOLEAN DEFAULT FALSE,
    read_datetime TIMESTAMPTZ,
    archived BOOLEAN DEFAULT FALSE,
    archived_datetime TIMESTAMPTZ,

    -- Reply thread
    reply_to_message_id UUID REFERENCES internal_messages(id),
    thread_root_id UUID,  -- Root message of thread for grouping

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_message_priority CHECK (priority IN ('stat', 'urgent', 'normal', 'low')),
    CONSTRAINT valid_message_type CHECK (message_type IN ('general', 'consult', 'handoff', 'alert', 'urgent'))
);

-- Notifications (System-Generated Alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient
    user_id UUID NOT NULL,
    user_name VARCHAR(200),

    -- Notification details
    notification_type VARCHAR(100) NOT NULL,  -- task_assigned, result_ready, critical_value, appointment_reminder, etc.
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,

    -- Action link (deep link to relevant entity)
    action_url VARCHAR(500),

    -- Related entity
    entity_type VARCHAR(100),  -- appointment, lab_order, imaging_order, task, alert, etc.
    entity_id UUID,

    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_datetime TIMESTAMPTZ,

    -- Delivery channels
    shown_in_app BOOLEAN DEFAULT TRUE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    email_sent_datetime TIMESTAMPTZ,
    sent_via_sms BOOLEAN DEFAULT FALSE,
    sms_sent_datetime TIMESTAMPTZ,

    -- Priority
    priority VARCHAR(50) DEFAULT 'normal',  -- stat, urgent, normal, low

    -- Auto-dismiss configuration
    auto_dismiss_after_hours INTEGER,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_datetime TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_notification_priority CHECK (priority IN ('stat', 'urgent', 'normal', 'low'))
);

-- Notification Preferences
-- User preferences for notification delivery
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Channel preferences
    enable_email BOOLEAN DEFAULT TRUE,
    enable_sms BOOLEAN DEFAULT FALSE,
    enable_in_app BOOLEAN DEFAULT TRUE,

    -- Notification type preferences (JSONB for flexibility)
    -- Example: {"critical_value": {"email": true, "sms": true}, "task_assigned": {"email": false}}
    type_preferences JSONB DEFAULT '{}'::jsonb,

    -- Quiet hours
    enable_quiet_hours BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,  -- e.g., 22:00
    quiet_hours_end TIME,    -- e.g., 07:00
    quiet_hours_priority_threshold VARCHAR(50) DEFAULT 'urgent',  -- Only urgent+ during quiet hours

    -- Contact information
    email_address VARCHAR(200),
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Indexes for message queries
CREATE INDEX idx_internal_messages_recipient_read ON internal_messages(recipient_id, read, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_internal_messages_sender ON internal_messages(sender_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_internal_messages_patient ON internal_messages(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_internal_messages_organization ON internal_messages(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_internal_messages_thread ON internal_messages(thread_root_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_internal_messages_type_priority ON internal_messages(message_type, priority) WHERE read = FALSE AND deleted_at IS NULL;

-- Indexes for notification queries
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX idx_notifications_priority_read ON notifications(priority, read, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read = FALSE;

-- Indexes for notification preferences
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Trigger to set thread_root_id
CREATE OR REPLACE FUNCTION set_message_thread_root()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a reply, set thread_root_id to parent's root (or parent if parent is root)
    IF NEW.reply_to_message_id IS NOT NULL THEN
        SELECT COALESCE(thread_root_id, id) INTO NEW.thread_root_id
        FROM internal_messages
        WHERE id = NEW.reply_to_message_id;
    ELSE
        -- This is a new thread, it is its own root
        NEW.thread_root_id := NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_message_thread_root
    BEFORE INSERT ON internal_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_message_thread_root();

-- Trigger to auto-dismiss old notifications
CREATE OR REPLACE FUNCTION auto_dismiss_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-dismiss if configured and time has passed
    IF NEW.auto_dismiss_after_hours IS NOT NULL THEN
        IF NOW() > NEW.created_at + (NEW.auto_dismiss_after_hours || ' hours')::INTERVAL THEN
            NEW.dismissed := TRUE;
            NEW.dismissed_datetime := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_dismiss_notifications
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    WHEN (OLD.dismissed = FALSE AND NEW.dismissed = FALSE)
    EXECUTE FUNCTION auto_dismiss_notifications();

COMMENT ON TABLE internal_messages IS 'Internal messages between clinical staff for consults, handoffs, and collaboration';
COMMENT ON COLUMN internal_messages.message_type IS 'Message type: general (routine), consult (request opinion), handoff (shift change), alert (clinical alert), urgent (immediate attention)';
COMMENT ON COLUMN internal_messages.thread_root_id IS 'Root message ID for threading replies into conversation groups';
COMMENT ON COLUMN internal_messages.patient_id IS 'Patient context if message relates to specific patient care';

COMMENT ON TABLE notifications IS 'System-generated notifications for clinical events, task assignments, and alerts';
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification determining display, urgency, and routing';
COMMENT ON COLUMN notifications.action_url IS 'Deep link to relevant entity (e.g., /appointments/{id} or /lab-orders/{id})';
COMMENT ON COLUMN notifications.shown_in_app IS 'Whether notification appears in in-app notification center';
COMMENT ON COLUMN notifications.auto_dismiss_after_hours IS 'Automatically dismiss notification after N hours if not read';

COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery channels and quiet hours';
COMMENT ON COLUMN notification_preferences.type_preferences IS 'Per-notification-type channel preferences (JSONB for flexibility)';
COMMENT ON COLUMN notification_preferences.quiet_hours_priority_threshold IS 'Minimum priority to deliver during quiet hours (only urgent+ during sleep)';
