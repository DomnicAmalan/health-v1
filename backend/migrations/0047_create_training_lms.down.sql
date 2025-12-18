-- Rollback: Drop training/LMS tables

DROP TRIGGER IF EXISTS update_user_training_updated_at ON user_training_progress;
DROP TRIGGER IF EXISTS update_regulation_training_updated_at ON regulation_training_requirements;
DROP TRIGGER IF EXISTS update_course_content_updated_at ON course_content;
DROP TRIGGER IF EXISTS update_training_courses_updated_at ON training_courses;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS user_training_progress;
DROP TABLE IF EXISTS regulation_training_requirements;
DROP TABLE IF EXISTS course_content;
DROP TABLE IF EXISTS training_courses;
DROP TYPE IF EXISTS training_frequency;
DROP TYPE IF EXISTS training_status;
DROP TYPE IF EXISTS content_type;

