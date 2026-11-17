ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TABLE app_user ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_user ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE audit_log ADD COLUMN details JSONB NOT NULL DEFAULT '{}';
CREATE INDEX app_user_visible_idx ON app_user(id) WHERE deleted_at IS NULL;
