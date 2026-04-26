-- name: CreateLoginAttempt :one
INSERT INTO login_attempts (
    user_id, email, ip_address, user_agent, success, failure_reason
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetRecentFailedAttempts :one
SELECT COUNT(*) FROM login_attempts 
WHERE email = $1 AND success = false AND attempted_at > $2;

-- name: GetRecentFailedAttemptsByIP :one
SELECT COUNT(*) FROM login_attempts 
WHERE ip_address = $1 AND success = false AND attempted_at > $2;

-- name: GetLoginAttemptsByUser :many
SELECT * FROM login_attempts 
WHERE user_id = $1 
ORDER BY attempted_at DESC
LIMIT $2 OFFSET $3;

-- name: GetLoginAttemptsByEmail :many
SELECT * FROM login_attempts 
WHERE email = $1 
ORDER BY attempted_at DESC
LIMIT $2 OFFSET $3;

-- name: DeleteOldLoginAttempts :exec
DELETE FROM login_attempts WHERE attempted_at < $1;