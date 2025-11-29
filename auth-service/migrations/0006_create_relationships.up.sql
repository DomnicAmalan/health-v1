-- Migration: Create relationships table for Zanzibar-style authorization
-- Description: Store relationship tuples for relationship-based access control

CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user VARCHAR(255) NOT NULL,
    relation VARCHAR(255) NOT NULL,
    object VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user, relation, object)
);

-- Create indexes for efficient Zanzibar queries
CREATE INDEX IF NOT EXISTS idx_relationships_user ON relationships(user);
CREATE INDEX IF NOT EXISTS idx_relationships_relation ON relationships(relation);
CREATE INDEX IF NOT EXISTS idx_relationships_object ON relationships(object);
CREATE INDEX IF NOT EXISTS idx_relationships_user_relation ON relationships(user, relation);
CREATE INDEX IF NOT EXISTS idx_relationships_object_relation ON relationships(object, relation);
CREATE INDEX IF NOT EXISTS idx_relationships_composite ON relationships(user, relation, object);

