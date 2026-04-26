-- Organization queries
-- The organizations table has no deleted_at column; soft-delete uses active = false.

-- name: CreateOrganization :one
INSERT INTO organizations (
    id, name, slug, description, logo_url, primary_color, active, tagline, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: GetOrganizationByID :one
SELECT * FROM organizations WHERE id = $1;

-- name: GetOrganizationBySlug :one
SELECT * FROM organizations WHERE slug = $1;

-- name: UpdateOrganization :one
UPDATE organizations SET
    name          = COALESCE($2, name),
    slug          = COALESCE($3, slug),
    description   = COALESCE($4, description),
    logo_url      = COALESCE($5, logo_url),
    primary_color = COALESCE($6, primary_color),
    tagline       = COALESCE($7, tagline),
    active        = COALESCE($8, active),
    updated_at    = NOW()
WHERE id = $1
RETURNING *;

-- name: SoftDeleteOrganization :exec
UPDATE organizations SET active = false, updated_at = NOW() WHERE id = $1;

-- name: ListOrganizations :many
SELECT * FROM organizations
WHERE ($1::bool IS NULL OR active = $1)
  AND ($2::text = '' OR (name ILIKE '%' || $2 || '%' OR slug ILIKE '%' || $2 || '%'))
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountOrganizations :one
SELECT COUNT(*) FROM organizations
WHERE ($1::bool IS NULL OR active = $1)
  AND ($2::text = '' OR (name ILIKE '%' || $2 || '%' OR slug ILIKE '%' || $2 || '%'));
