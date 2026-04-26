-- Category queries
-- Organization-scoped category CRUD operations

-- name: GetCategoryByID :one
SELECT * FROM categories WHERE id = $1 AND deleted_at IS NULL;

-- name: GetCategoryByName :one
SELECT * FROM categories WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL;

-- name: CreateCategory :one
INSERT INTO categories (
    id, organization_id, name, description, active
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: UpdateCategory :one
UPDATE categories SET 
    name = COALESCE($2, name),
    description = COALESCE($3, description),
    active = COALESCE($4, active),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SoftDeleteCategory :exec
UPDATE categories SET deleted_at = NOW() WHERE id = $1;

-- name: ListCategories :many
SELECT * FROM categories 
WHERE organization_id = $1 AND deleted_at IS NULL
  AND ($2::text = '' OR name ILIKE $2)
  AND ($3::text = '' OR UPPER(active) = UPPER($3))
ORDER BY name ASC
LIMIT $4 OFFSET $5;

-- name: CountCategories :one
SELECT COUNT(*) FROM categories 
WHERE organization_id = $1 AND deleted_at IS NULL
  AND ($2::text = '' OR name ILIKE $2)
  AND ($3::text = '' OR UPPER(active) = UPPER($3));

-- name: ListActiveCategories :many
SELECT * FROM categories 
WHERE organization_id = $1 AND deleted_at IS NULL AND active = true
ORDER BY name ASC;