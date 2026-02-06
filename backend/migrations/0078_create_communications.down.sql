-- Rollback Phase 0.5: Internal Communications

DROP TRIGGER IF EXISTS trigger_auto_dismiss_notifications ON notifications;
DROP FUNCTION IF EXISTS auto_dismiss_notifications();

DROP TRIGGER IF EXISTS trigger_set_message_thread_root ON internal_messages;
DROP FUNCTION IF EXISTS set_message_thread_root();

DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS internal_messages CASCADE;
