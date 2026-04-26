-- Organization departments queries
-- Tree-structured departments scoped to an organization. No deleted_at column.

-- name: CreateDepartment :one
INSERT INTO organization_departments (
    id, organization_id, name, code, description, parent_id, manager_name, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: GetDepartmentByID :one
SELECT * FROM organization_departments WHERE id = $1;

-- name: GetDepartmentByCode :one
SELECT * FROM organization_departments
WHERE organization_id = $1 AND code = $2;

-- name: UpdateDepartment :one
UPDATE organization_departments SET
    name         = COALESCE($2, name),
    code         = COALESCE($3, code),
    description  = COALESCE($4, description),
    parent_id    = COALESCE($5, parent_id),
    manager_name = COALESCE($6, manager_name),
    is_active    = COALESCE($7, is_active),
    updated_at   = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteDepartment :exec
DELETE FROM organization_departments WHERE id = $1;

-- name: ListDepartments :many
SELECT * FROM organization_departments
WHERE organization_id = $1
  AND ($2::bool IS NULL OR is_active = $2)
ORDER BY name ASC
LIMIT $3 OFFSET $4;

-- name: CountDepartments :one
SELECT COUNT(*) FROM organization_departments
WHERE organization_id = $1
  AND ($2::bool IS NULL OR is_active = $2);

-- name: ListActiveDepartments :many
SELECT * FROM organization_departments
WHERE organization_id = $1 AND is_active = true
ORDER BY name ASC;
