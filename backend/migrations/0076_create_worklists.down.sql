-- Rollback Phase 0.2: Worklists & Task Management

DROP TRIGGER IF EXISTS trigger_task_queue_capacity ON task_queue;
DROP FUNCTION IF EXISTS check_task_queue_capacity();

DROP TABLE IF EXISTS task_templates CASCADE;
DROP TABLE IF EXISTS task_queue CASCADE;
