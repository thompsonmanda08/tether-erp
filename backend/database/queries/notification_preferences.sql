-- Notification preferences queries
-- Per-user notification settings (one row per user; user_id is UNIQUE).

-- name: GetNotificationPreferencesByUser :one
SELECT * FROM notification_preferences
WHERE user_id = $1 AND organization_id = $2;

-- name: UpsertNotificationPreferences :one
INSERT INTO notification_preferences (
    user_id, organization_id,
    email_enabled, push_enabled, in_app_enabled,
    notify_task_assigned, notify_task_reassigned, notify_task_approved,
    notify_task_rejected, notify_workflow_complete, notify_approval_overdue,
    notify_comments_added,
    quiet_hours_enabled, quiet_hours_start, quiet_hours_end
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
)
ON CONFLICT (user_id) DO UPDATE SET
    organization_id          = EXCLUDED.organization_id,
    email_enabled            = EXCLUDED.email_enabled,
    push_enabled             = EXCLUDED.push_enabled,
    in_app_enabled           = EXCLUDED.in_app_enabled,
    notify_task_assigned     = EXCLUDED.notify_task_assigned,
    notify_task_reassigned   = EXCLUDED.notify_task_reassigned,
    notify_task_approved     = EXCLUDED.notify_task_approved,
    notify_task_rejected     = EXCLUDED.notify_task_rejected,
    notify_workflow_complete = EXCLUDED.notify_workflow_complete,
    notify_approval_overdue  = EXCLUDED.notify_approval_overdue,
    notify_comments_added    = EXCLUDED.notify_comments_added,
    quiet_hours_enabled      = EXCLUDED.quiet_hours_enabled,
    quiet_hours_start        = EXCLUDED.quiet_hours_start,
    quiet_hours_end          = EXCLUDED.quiet_hours_end,
    updated_at               = NOW()
RETURNING *;

-- name: DeleteNotificationPreferences :exec
DELETE FROM notification_preferences WHERE user_id = $1;
