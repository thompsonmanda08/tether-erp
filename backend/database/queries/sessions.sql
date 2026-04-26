-- name: CreateSession :one
INSERT INTO sessions (
    user_id, refresh_token, ip_address, user_agent, expires_at
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: GetSessionByRefreshToken :one
SELECT * FROM sessions 
WHERE refresh_token = $1 AND expires_at > NOW();

-- name: GetSessionsByUserID :many
SELECT * FROM sessions 
WHERE user_id = $1 AND expires_at > NOW()
ORDER BY created_at DESC;

-- name: DeleteSession :exec
DELETE FROM sessions WHERE id = $1;

-- name: DeleteSessionByRefreshToken :exec
DELETE FROM sessions WHERE refresh_token = $1;

-- name: DeleteSessionsByUserID :exec
DELETE FROM sessions WHERE user_id = $1;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at <= NOW();

-- name: CountActiveSessions :one
SELECT COUNT(*) FROM sessions WHERE expires_at > NOW();

-- name: CountUserActiveSessions :one
SELECT COUNT(*) FROM sessions 
WHERE user_id = $1 AND expires_at > NOW();

-- name: UpdateSessionRefreshToken :execrows
UPDATE sessions 
SET refresh_token = $2, expires_at = $3, updated_at = NOW()
WHERE id = $1 AND refresh_token = $4;