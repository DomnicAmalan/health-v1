-- Migration: Create training/LMS tables
-- Description: Learning Management System with role-based training requirements
-- Related Entities:
--   - src/domain/entities/training_course.rs
--   - src/domain/entities/regulation_training_requirement.rs
--   - src/domain/entities/user_training_progress.rs
--
-- Tables Created:
--   - training_courses
--   - course_content
--   - regulation_training_requirements
--   - user_training_progress
--   - certificates

CREATE TYPE content_type AS ENUM (
    'video',
    'document',
    'quiz',
    'interactive',
    'scorm',
    'link',
    'other'
);

CREATE TYPE training_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'expired',
    'failed'
);

CREATE TYPE training_frequency AS ENUM (
    'once',
    'annual',
    'biannual',
    'quarterly',
    'on_change',
    'custom'
);

-- Training courses
CREATE TABLE IF NOT EXISTS training_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type content_type NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    passing_score INTEGER, -- NULL means no passing score required
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    metadata JSONB DEFAULT '{}'::jsonb, -- SCORM data, external links, etc.
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version_number BIGINT DEFAULT 1 NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- Course content (lessons, modules, etc.)
CREATE TABLE IF NOT EXISTS course_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    parent_content_id UUID REFERENCES course_content(id) ON DELETE CASCADE, -- nested content
    title VARCHAR(255) NOT NULL,
    content_type content_type NOT NULL,
    content_data JSONB NOT NULL, -- actual content (video URL, document path, quiz questions, etc.)
    order_index INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL
);

-- Link regulations to training requirements by role
CREATE TABLE IF NOT EXISTS regulation_training_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    section_id UUID REFERENCES regulation_sections(id), -- NULL means whole regulation
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    frequency training_frequency NOT NULL DEFAULT 'annual',
    grace_period_days INTEGER NOT NULL DEFAULT 30, -- days after expiration before non-compliance
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ, -- NULL means currently active
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL
);

-- User training progress and completion tracking
CREATE TABLE IF NOT EXISTS user_training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES regulation_training_requirements(id), -- which requirement triggered this
    status training_status NOT NULL DEFAULT 'not_started',
    score INTEGER, -- final score if quiz/exam
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- when this training expires (based on frequency)
    certificate_id UUID, -- reference to certificate if issued
    progress_data JSONB DEFAULT '{}'::jsonb, -- detailed progress (completed modules, time spent, etc.)
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL,
    UNIQUE(user_id, course_id, requirement_id) -- one progress record per user-course-requirement
);

-- Certificates issued for completed training
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    training_progress_id UUID NOT NULL REFERENCES user_training_progress(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    certificate_data JSONB NOT NULL, -- PDF path, verification code, etc.
    -- Audit fields
    request_id VARCHAR(255),
    created_by UUID REFERENCES users(id),
    system_id VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_training_courses_code ON training_courses(code);
CREATE INDEX IF NOT EXISTS idx_training_courses_content_type ON training_courses(content_type);
CREATE INDEX IF NOT EXISTS idx_training_courses_deleted_at ON training_courses(deleted_at);

CREATE INDEX IF NOT EXISTS idx_course_content_course_id ON course_content(course_id);
CREATE INDEX IF NOT EXISTS idx_course_content_parent_id ON course_content(parent_content_id);
CREATE INDEX IF NOT EXISTS idx_course_content_order ON course_content(course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_regulation_training_regulation_id ON regulation_training_requirements(regulation_id);
CREATE INDEX IF NOT EXISTS idx_regulation_training_section_id ON regulation_training_requirements(section_id);
CREATE INDEX IF NOT EXISTS idx_regulation_training_course_id ON regulation_training_requirements(course_id);
CREATE INDEX IF NOT EXISTS idx_regulation_training_role_id ON regulation_training_requirements(role_id);
CREATE INDEX IF NOT EXISTS idx_regulation_training_effective ON regulation_training_requirements(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_user_training_user_id ON user_training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_training_course_id ON user_training_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_training_requirement_id ON user_training_progress(requirement_id);
CREATE INDEX IF NOT EXISTS idx_user_training_status ON user_training_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_training_expires_at ON user_training_progress(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_training_completed_at ON user_training_progress(completed_at);

CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_expires_at ON certificates(expires_at);

-- Indexes for audit fields
CREATE INDEX IF NOT EXISTS idx_training_courses_request_id ON training_courses(request_id);
CREATE INDEX IF NOT EXISTS idx_course_content_request_id ON course_content(request_id);
CREATE INDEX IF NOT EXISTS idx_regulation_training_request_id ON regulation_training_requirements(request_id);
CREATE INDEX IF NOT EXISTS idx_user_training_request_id ON user_training_progress(request_id);

-- Add triggers
CREATE TRIGGER update_training_courses_updated_at BEFORE UPDATE ON training_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_content_updated_at BEFORE UPDATE ON course_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulation_training_updated_at BEFORE UPDATE ON regulation_training_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_training_updated_at BEFORE UPDATE ON user_training_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

