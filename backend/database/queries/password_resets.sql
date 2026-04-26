-- name: CreatePasswordReset :one
INSERT INTO password_resets (
    user_id, token, expires_at
) VALUES (
    $1, $2, $3
) RETURNING *;

-- name: GetPasswordResetByToken :one
SELECT * FROM password_resets 
WHERE token = $1 AND used_at IS NULL AND expires_at > NOW();

-- name: MarkPasswordResetAsUsed :exec
UPDATE password_resets SET 
    used_at = NOW()
WHERE id = $1;

-- name: DeletePasswordResetsByUserID :exec
DELETE FROM password_resets WHERE user_id = $1;

-- name: DeleteExpiredPasswordResets :exec
DELETE FROM password_resets WHERE expires_at <= NOW();

-- name: DeleteUsedPasswordResets :exec
DELETE FROM password_resets WHERE used_at IS NOT NULL;