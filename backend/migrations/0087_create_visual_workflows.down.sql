-- ============================================================================
-- Rollback: Visual Workflow Designer System
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_workflow_execution_logs_node;
DROP INDEX IF EXISTS idx_workflow_execution_logs_instance;
DROP INDEX IF EXISTS idx_human_tasks_due;
DROP INDEX IF EXISTS idx_human_tasks_status;
DROP INDEX IF EXISTS idx_human_tasks_assignee_status;
DROP INDEX IF EXISTS idx_human_tasks_instance;
DROP INDEX IF EXISTS idx_workflow_instances_started;
DROP INDEX IF EXISTS idx_workflow_instances_correlation;
DROP INDEX IF EXISTS idx_workflow_instances_status;
DROP INDEX IF EXISTS idx_workflow_instances_workflow;
DROP INDEX IF EXISTS idx_visual_workflows_category;
DROP INDEX IF EXISTS idx_visual_workflows_active;
DROP INDEX IF EXISTS idx_visual_workflows_org;

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS workflow_execution_logs;
DROP TABLE IF EXISTS human_tasks;
DROP TABLE IF EXISTS workflow_instances;
DROP TABLE IF EXISTS visual_workflows;
