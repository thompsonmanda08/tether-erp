-- Impersonation log queries
-- Tracks platform/admin user impersonation events. id is TEXT not UUID.

-- name: CreateImpersonationLog :one
INSERT INTO impersonation_logs (
    id, impersonator_id, impersonator_email, target_id, target_email,
    impersonation_type, token_jti, reason, expires_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: GetImpersonationLogByID :one
SELECT * FROM impersonation_logs WHERE id = $1;

-- name: GetImpersonationLogByJTI :one
SELECT * FROM impersonation_logs WHERE token_jti = $1;

-- name: ListImpersonationLogs :many
SELECT * FROM impersonation_logs
WHERE ($1::text       = '' OR impersonator_id    = $1)
  AND ($2::text       = '' OR target_id          = $2)
  AND ($3::text       = '' OR impersonation_type = $3)
  AND ($4::bool       IS NULL OR revoked         = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
ORDER BY created_at DESC
LIMIT $7 OFFSET $8;

-- name: CountImpersonationLogs :one
SELECT COUNT(*) FROM impersonation_logs
WHERE ($1::text       = '' OR impersonator_id    = $1)
  AND ($2::text       = '' OR target_id          = $2)
  AND ($3::text       = '' OR impersonation_type = $3)
  AND ($4::bool       IS NULL OR revoked         = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6);

-- name: RevokeImpersonationLog :exec
UPDATE impersonation_logs
SET revoked    = true,
    revoked_at = NOW(),
    revoked_by = $2
WHERE id = $1;

-- name: ListActiveImpersonations :many
SELECT * FROM impersonation_logs
WHERE revoked = false AND expires_at > NOW()
ORDER BY created_at DESC;
