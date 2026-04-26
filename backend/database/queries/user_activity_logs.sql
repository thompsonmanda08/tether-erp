-- User activity log queries
-- No FK on user_id (intentional, see migration 023) so queries are scope-only.

-- name: CreateActivityLog :one
INSERT INTO user_activity_logs (
    id, user_id, organization_id, action_type, resource_type, resource_id,
    ip_address, user_agent, metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: GetActivityLogByID :one
SELECT * FROM user_activity_logs WHERE id = $1;

-- name: ListActivityLogsByUser :many
SELECT * FROM user_activity_logs
WHERE user_id = $1
  AND ($2::text       = '' OR action_type = $2)
  AND ($3::timestamptz IS NULL OR created_at >= $3)
  AND ($4::timestamptz IS NULL OR created_at <= $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountActivityLogsByUser :one
SELECT COUNT(*) FROM user_activity_logs
WHERE user_id = $1
  AND ($2::text       = '' OR action_type = $2)
  AND ($3::timestamptz IS NULL OR created_at >= $3)
  AND ($4::timestamptz IS NULL OR created_at <= $4);

-- name: ListActivityLogsByOrg :many
SELECT * FROM user_activity_logs
WHERE organization_id = $1
  AND ($2::text       = '' OR action_type = $2)
  AND ($3::text       = '' OR user_id     = $3)
  AND ($4::timestamptz IS NULL OR created_at >= $4)
  AND ($5::timestamptz IS NULL OR created_at <= $5)
ORDER BY created_at DESC
LIMIT $6 OFFSET $7;

-- name: CountActivityLogs :one
SELECT COUNT(*) FROM user_activity_logs
WHERE ($1::text       = '' OR organization_id = $1)
  AND ($2::text       = '' OR user_id         = $2)
  AND ($3::text       = '' OR action_type     = $3)
  AND ($4::timestamptz IS NULL OR created_at >= $4)
  AND ($5::timestamptz IS NULL OR created_at <= $5);

-- name: DeleteOldActivityLogs :exec
DELETE FROM user_activity_logs WHERE created_at < $1;
