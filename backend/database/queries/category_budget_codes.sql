-- Category budget code queries
-- Many-to-one mapping of GL/budget codes per category. No deleted_at column.

-- name: CreateCategoryBudgetCode :one
INSERT INTO category_budget_codes (
    id, category_id, budget_code, active
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetCategoryBudgetCodeByID :one
SELECT * FROM category_budget_codes WHERE id = $1;

-- name: UpdateCategoryBudgetCode :one
UPDATE category_budget_codes SET
    budget_code = COALESCE($2, budget_code),
    active      = COALESCE($3, active),
    updated_at  = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteCategoryBudgetCode :exec
DELETE FROM category_budget_codes WHERE id = $1;

-- name: ListCategoryBudgetCodesByCategory :many
SELECT * FROM category_budget_codes
WHERE category_id = $1
  AND ($2::bool IS NULL OR active = $2)
ORDER BY budget_code ASC;

-- name: CountCategoryBudgetCodes :one
SELECT COUNT(*) FROM category_budget_codes
WHERE category_id = $1
  AND ($2::bool IS NULL OR active = $2);
