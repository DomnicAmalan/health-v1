-- Rollback: Problem List/Diagnoses Management System

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_problem_timestamp ON problem_list;
DROP TRIGGER IF EXISTS trigger_record_problem_status_change ON problem_list;
DROP TRIGGER IF EXISTS trigger_set_resolved_date ON problem_list;

-- Drop functions
DROP FUNCTION IF EXISTS update_problem_timestamp();
DROP FUNCTION IF EXISTS record_problem_status_change();
DROP FUNCTION IF EXISTS set_resolved_date();

-- Drop tables (cascade to handle foreign keys)
DROP TABLE IF EXISTS problem_comments CASCADE;
DROP TABLE IF EXISTS problem_history CASCADE;
DROP TABLE IF EXISTS problem_list CASCADE;
