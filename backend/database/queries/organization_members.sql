-- Organization members queries
-- Composite uniqueness on (organization_id, user_id) — see uk_org_user.

-- name: AddMember :one
INSERT INTO organization_members (
    id, organization_id, user_id, role, department, department_id, title,
    branch_id, active, invited_at, joined_at, invited_by, custom_permissions
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING *;

-- name: GetMember :one
SELECT * FROM organization_members
WHERE organization_id = $1 AND user_id = $2;

-- name: GetMemberByID :one
SELECT * FROM organization_members WHERE id = $1;

-- name: ListMembers :many
SELECT * FROM organization_members
WHERE organization_id = $1
  AND ($2::bool IS NULL OR active = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountMembers :one
SELECT COUNT(*) FROM organization_members
WHERE organization_id = $1
  AND ($2::bool IS NULL OR active = $2);

-- name: ListOrganizationsForUser :many
SELECT om.* FROM organization_members om
WHERE om.user_id = $1 AND om.active = true
ORDER BY om.created_at DESC;

-- name: UpdateMemberStatus :one
UPDATE organization_members
SET active = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateMember :one
UPDATE organization_members SET
    role               = COALESCE($2, role),
    department         = COALESCE($3, department),
    department_id      = COALESCE($4, department_id),
    title              = COALESCE($5, title),
    branch_id          = COALESCE($6, branch_id),
    active             = COALESCE($7, active),
    custom_permissions = COALESCE($8, custom_permissions),
    updated_at         = NOW()
WHERE id = $1
RETURNING *;

-- name: RemoveMember :exec
DELETE FROM organization_members WHERE id = $1;

-- name: RemoveMemberByUserOrg :exec
DELETE FROM organization_members
WHERE organization_id = $1 AND user_id = $2;
