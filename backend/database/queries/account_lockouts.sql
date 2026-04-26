-- name: CreateAccountLockout :one
INSERT INTO account_lockouts (
    user_id, email, ip_address, reason, unlocks_at
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: GetActiveAccountLockout :one
SELECT * FROM account_lockouts 
WHERE user_id = $1 AND active = true AND unlocks_at > NOW()
ORDER BY locked_at DESC
LIMIT 1;

-- name: GetAccountLockoutByEmail :one
SELECT * FROM account_lockouts 
WHERE email = $1 AND active = true AND unlocks_at > NOW()
ORDER BY locked_at DESC
LIMIT 1;

-- name: UnlockAccount :exec
UPDATE account_lockouts SET 
    active = false
WHERE user_id = $1 AND active = true;

-- name: UnlockAccountByEmail :exec
UPDATE account_lockouts SET 
    active = false
WHERE email = $1 AND active = true;

-- name: GetAccountLockoutHistory :many
SELECT * FROM account_lockouts 
WHERE user_id = $1 
ORDER BY locked_at DESC
LIMIT $2 OFFSET $3;

-- name: CleanupExpiredLockouts :exec
UPDATE account_lockouts SET 
    active = false
WHERE unlocks_at <= NOW() AND active = true;