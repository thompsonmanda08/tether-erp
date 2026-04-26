-- Organization branches queries
-- Branches associated with an organization (province_id/town_id/manager_id).

-- name: CreateBranch :one
INSERT INTO organization_branches (
    id, organization_id, name, code, province_id, town_id, address, manager_id, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: GetBranchByID :one
SELECT * FROM organization_branches WHERE id = $1;

-- name: GetBranchByCode :one
SELECT * FROM organization_branches
WHERE organization_id = $1 AND code = $2;

-- name: UpdateBranch :one
UPDATE organization_branches SET
    name        = COALESCE($2, name),
    code        = COALESCE($3, code),
    province_id = COALESCE($4, province_id),
    town_id     = COALESCE($5, town_id),
    address     = COALESCE($6, address),
    manager_id  = COALESCE($7, manager_id),
    is_active   = COALESCE($8, is_active),
    updated_at  = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteBranch :exec
DELETE FROM organization_branches WHERE id = $1;

-- name: ListBranches :many
SELECT * FROM organization_branches
WHERE organization_id = $1
  AND ($2::bool IS NULL OR is_active = $2)
ORDER BY name ASC
LIMIT $3 OFFSET $4;

-- name: CountBranches :one
SELECT COUNT(*) FROM organization_branches
WHERE organization_id = $1
  AND ($2::bool IS NULL OR is_active = $2);

-- name: ListActiveBranches :many
SELECT * FROM organization_branches
WHERE organization_id = $1 AND is_active = true
ORDER BY name ASC;
