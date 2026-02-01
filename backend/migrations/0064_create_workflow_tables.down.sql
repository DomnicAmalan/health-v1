-- Drop workflow engine tables

DROP TRIGGER IF EXISTS workflows_updated_at ON workflows;
DROP FUNCTION IF EXISTS update_workflow_updated_at();

DROP TABLE IF EXISTS workflow_execution_steps;
DROP TABLE IF EXISTS workflow_events;
DROP TABLE IF EXISTS workflow_tasks;
DROP TABLE IF EXISTS workflow_instances;
DROP TABLE IF EXISTS workflows;
