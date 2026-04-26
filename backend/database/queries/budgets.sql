-- Budget queries
-- Organization-scoped budget CRUD operations

-- name: GetBudgetByID :one
SELECT * FROM budgets WHERE id = $1 AND deleted_at IS NULL;

-- name: GetBudgetByCode :one
SELECT * FROM budgets WHERE organization_id = $1 AND budget_code = $2 AND deleted_at IS NULL;

-- name: CreateBudget :one
INSERT INTO budgets (
    id, organization_id, owner_id, budget_code, department, department_id,
    status, fiscal_year, total_budget, allocated_amount, remaining_amount,
    approval_stage, name, description, currency, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
) RETURNING *;

-- name: UpdateBudget :one
UPDATE budgets SET 
    name = COALESCE($2, name),
    description = COALESCE($3, description),
    department = COALESCE($4, department),
    department_id = COALESCE($5, department_id),
    status = COALESCE($6, status),
    total_budget = COALESCE($7, total_budget),
    allocated_amount = COALESCE($8, allocated_amount),
    remaining_amount = COALESCE($9, remaining_amount),
    approval_stage = COALESCE($10, approval_stage),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SoftDeleteBudget :exec
UPDATE budgets SET deleted_at = NOW() WHERE id = $1;

-- name: ListBudgets :many
SELECT * FROM budgets 
WHERE organization_id = $1 AND deleted_at IS NULL
  AND ($2::text = '' OR UPPER(status) = UPPER($2))
  AND ($3::text = '' OR department = $3)
  AND ($4::text = '' OR fiscal_year = $4)
  AND ($5::text = '' OR budget_code ILIKE $5)
ORDER BY created_at DESC
LIMIT $6 OFFSET $7;

-- name: CountBudgets :one
SELECT COUNT(*) FROM budgets 
WHERE organization_id = $1 AND deleted_at IS NULL
  AND ($2::text = '' OR UPPER(status) = UPPER($2))
  AND ($3::text = '' OR department = $3)
  AND ($4::text = '' OR fiscal_year = $4);

-- name: UpdateBudgetAllocatedAmount :one
UPDATE budgets SET
    allocated_amount = allocated_amount + $2,
    remaining_amount = total_budget - (allocated_amount + $2),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateBudgetRemainingAmount :one
UPDATE budgets SET
    remaining_amount = COALESCE($2, remaining_amount),
    updated_at       = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: ReserveBudget :one
UPDATE budgets SET
    allocated_amount = allocated_amount + $2,
    remaining_amount = remaining_amount - $2,
    updated_at       = NOW()
WHERE id = $1
  AND deleted_at IS NULL
  AND remaining_amount >= $2
RETURNING *;

-- name: ReleaseBudget :one
UPDATE budgets SET
    allocated_amount = GREATEST(allocated_amount - $2, 0),
    remaining_amount = remaining_amount + $2,
    updated_at       = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;