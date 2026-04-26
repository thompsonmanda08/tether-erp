-- Enhanced RBAC with global system roles + org custom roles

-- name: CreateOrganizationRole :one
INSERT INTO organization_roles (
    organization_id, name, description, is_system_role, permissions, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetOrganizationRoleByID :one
SELECT * FROM organization_roles WHERE id = $1 AND active = true;

-- name: GetOrganizationRoleByName :one
SELECT * FROM organization_roles
WHERE ((organization_id = $1 AND name = $2) OR (organization_id IS NULL AND is_system_role = true AND name = $2))
AND active = true
LIMIT 1;

-- name: ListOrganizationRoles :many
SELECT * FROM organization_roles
WHERE (
    (organization_id = $1 AND active = true)
    OR
    (organization_id IS NULL AND is_system_role = true AND active = true)
)
ORDER BY is_system_role DESC, name ASC
LIMIT $2 OFFSET $3;

-- name: ListSystemRoles :many
SELECT * FROM organization_roles
WHERE organization_id IS NULL AND is_system_role = true AND active = true
ORDER BY name ASC;

-- name: ListCustomRoles :many
SELECT * FROM organization_roles
WHERE organization_id = $1 AND is_system_role = false AND active = true
ORDER BY name ASC
LIMIT $2 OFFSET $3;

-- name: UpdateOrganizationRole :one
UPDATE organization_roles SET
    name = COALESCE($2, name),
    description = COALESCE($3, description),
    permissions = COALESCE($4, permissions),
    updated_at = NOW()
WHERE id = $1 AND is_system_role = false
RETURNING *;

-- name: DeactivateOrganizationRole :exec
UPDATE organization_roles SET
    active = false,
    updated_at = NOW()
WHERE id = $1 AND is_system_role = false;

-- name: CountOrganizationRoles :one
SELECT COUNT(*) FROM organization_roles
WHERE ((organization_id = $1 AND active = true) OR (organization_id IS NULL AND is_system_role = true AND active = true));

-- name: CountCustomRoles :one
SELECT COUNT(*) FROM organization_roles
WHERE organization_id = $1 AND is_system_role = false AND active = true;

-- User role assignments
-- name: AssignUserRole :one
INSERT INTO user_organization_roles (
    user_id, organization_id, role_id, assigned_by
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetUserRoles :many
SELECT org_roles.* FROM organization_roles org_roles
INNER JOIN user_organization_roles uor ON org_roles.id = uor.role_id
WHERE uor.user_id = $1 AND uor.organization_id = $2 AND uor.active = true AND org_roles.active = true;

-- name: GetUserRoleAssignments :many
SELECT uor.*, org_roles.name as role_name, org_roles.description as role_description
FROM user_organization_roles uor
INNER JOIN organization_roles org_roles ON uor.role_id = org_roles.id
WHERE uor.user_id = $1 AND uor.organization_id = $2 AND uor.active = true;

-- name: RemoveUserRole :exec
UPDATE user_organization_roles SET
    active = false
WHERE user_id = $1 AND organization_id = $2 AND role_id = $3;

-- name: RemoveAllUserRoles :exec
UPDATE user_organization_roles SET
    active = false
WHERE user_id = $1 AND organization_id = $2;

-- name: ListUsersWithRole :many
SELECT u.*, uor.assigned_at FROM users u
INNER JOIN user_organization_roles uor ON u.id = uor.user_id
WHERE uor.organization_id = $1 AND uor.role_id = $2 AND uor.active = true
ORDER BY u.name
LIMIT $3 OFFSET $4;
