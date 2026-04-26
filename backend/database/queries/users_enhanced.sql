-- Enhanced user queries with security features

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL;

-- name: CreateUser :one
INSERT INTO users (
    id, email, name, password, role, active, current_organization_id, is_super_admin,
    must_change_password, position, man_number, nrc_number, contact
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING *;

-- name: UpdateUser :one
UPDATE users SET 
    name = COALESCE($2, name),
    email = COALESCE($3, email),
    role = COALESCE($4, role),
    active = COALESCE($5, active),
    current_organization_id = COALESCE($6, current_organization_id),
    is_super_admin = COALESCE($7, is_super_admin),
    must_change_password = COALESCE($8, must_change_password),
    position = COALESCE($9, position),
    man_number = COALESCE($10, man_number),
    nrc_number = COALESCE($11, nrc_number),
    contact = COALESCE($12, contact),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserPassword :exec
UPDATE users SET 
    password = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserLastLogin :exec
UPDATE users SET 
    last_login = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: DeactivateUser :exec
UPDATE users SET 
    active = false,
    updated_at = NOW()
WHERE id = $1;

-- name: ActivateUser :exec
UPDATE users SET 
    active = true,
    updated_at = NOW()
WHERE id = $1;

-- name: SoftDeleteUser :exec
UPDATE users SET deleted_at = NOW() WHERE id = $1;

-- name: ListUsers :many
SELECT * FROM users 
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListUsersByOrganization :many
SELECT u.* FROM users u
INNER JOIN organization_members om ON u.id = om.user_id
WHERE om.organization_id = $1 AND om.active = true AND u.deleted_at IS NULL
ORDER BY u.name
LIMIT $2 OFFSET $3;

-- name: CountUsers :one
SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;

-- name: CountActiveUsers :one
SELECT COUNT(*) FROM users WHERE active = true AND deleted_at IS NULL;

-- name: ListUsersWithDeleted :many
SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2;