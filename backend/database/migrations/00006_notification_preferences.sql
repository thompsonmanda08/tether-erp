-- +goose Up
-- Migration: Create notification_preferences table
-- Version: 006
-- Description: Creates table for user notification preferences

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    organization_id VARCHAR(255) NOT NULL,
    email_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    notify_task_assigned BOOLEAN DEFAULT true,
    notify_task_reassigned BOOLEAN DEFAULT true,
    notify_task_approved BOOLEAN DEFAULT true,
    notify_task_rejected BOOLEAN DEFAULT true,
    notify_workflow_complete BOOLEAN DEFAULT true,
    notify_approval_overdue BOOLEAN DEFAULT true,
    notify_comments_added BOOLEAN DEFAULT false,
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start INTEGER DEFAULT 22,
    quiet_hours_end INTEGER DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_preferences_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_org_id ON notification_preferences(organization_id);
CREATE INDEX idx_notification_preferences_user_org ON notification_preferences(user_id, organization_id);

-- Create trigger to update updated_at timestamp
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER notification_preferences_updated_at_trigger
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Insert default preferences for existing users
INSERT INTO notification_preferences (user_id, organization_id)
SELECT
    u.id as user_id,
    u.current_organization_id as organization_id
FROM users u
WHERE u.active = true
  AND u.current_organization_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- +goose Down
-- Migration: Drop notification_preferences table
-- Version: 006
-- Description: Drops the notification_preferences table

-- Drop trigger first
DROP TRIGGER IF EXISTS notification_preferences_updated_at_trigger ON notification_preferences;

-- Drop function
DROP FUNCTION IF EXISTS update_notification_preferences_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_notification_preferences_user_org;
DROP INDEX IF EXISTS idx_notification_preferences_org_id;
DROP INDEX IF EXISTS idx_notification_preferences_user_id;

-- Drop table
DROP TABLE IF EXISTS notification_preferences;
