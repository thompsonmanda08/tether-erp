-- Notification queries
-- User-scoped notification CRUD operations and bulk-update helpers.

-- name: CreateNotification :one
INSERT INTO notifications (
    id, organization_id, recipient_id, type, document_id, document_type,
    subject, body, sent, sent_at, entity_id, entity_type, entity_number,
    related_user_id, related_user_name, is_read, importance, quick_action,
    reassignment_reason, message
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
) RETURNING *;

-- name: GetNotificationByID :one
SELECT * FROM notifications WHERE id = $1;

-- name: ListNotifications :many
SELECT * FROM notifications
WHERE recipient_id = $1
  AND ($2::text       = '' OR organization_id = $2)
  AND ($3::text       = '' OR type            = $3)
  AND ($4::bool       IS NULL OR is_read      = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
ORDER BY created_at DESC
LIMIT $7 OFFSET $8;

-- name: CountNotifications :one
SELECT COUNT(*) FROM notifications
WHERE recipient_id = $1
  AND ($2::text       = '' OR organization_id = $2)
  AND ($3::text       = '' OR type            = $3)
  AND ($4::bool       IS NULL OR is_read      = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6);

-- name: MarkNotificationRead :exec
UPDATE notifications
SET is_read = true,
    read_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: MarkNotificationsReadBulk :exec
UPDATE notifications
SET is_read = true,
    read_at = NOW(),
    updated_at = NOW()
WHERE id::text = ANY($1::text[]);

-- name: MarkNotificationSent :exec
UPDATE notifications
SET sent = true,
    sent_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateNotificationActionTaken :exec
UPDATE notifications
SET action_taken = true,
    action_taken_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: DeleteNotification :exec
DELETE FROM notifications WHERE id = $1;

-- name: DeleteOldNotifications :exec
DELETE FROM notifications WHERE created_at < $1;

-- name: CountUnreadNotifications :one
SELECT COUNT(*) FROM notifications
WHERE recipient_id = $1 AND is_read = false;

-- name: ListUnsentNotifications :many
SELECT * FROM notifications
WHERE sent = false
ORDER BY created_at ASC
LIMIT $1;
