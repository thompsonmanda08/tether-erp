-- Requisition read queries.
-- List queries return only `id`; the handler fetches full data via GORM with Preload
-- to avoid complex pgtype↔model conversions. This keeps mappers unchanged.
-- Three scope variants per list/count pair:
--   All         → scope.CanViewAll
--   Procurement → scope.IsProcurement (workflow_assignments subquery filter)
--   Limited     → default (owner + workflow_tasks involvement filter)

-- name: GetRequisitionByID :one
SELECT * FROM requisitions WHERE id = $1 AND deleted_at IS NULL;

-- name: GetRequisitionByNumber :one
SELECT * FROM requisitions WHERE organization_id = $1 AND document_number = $2 AND deleted_at IS NULL;

-- name: CreateRequisition :one
INSERT INTO requisitions (
    id, organization_id, document_number, requester_id, title, description,
    department, department_id, status, priority, total_amount, currency,
    approval_stage, category_id, preferred_vendor_id, is_estimate, budget_code,
    source_of_funds, required_by_date, cost_center, project_code, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
) RETURNING *;

-- name: UpdateRequisition :one
UPDATE requisitions SET 
    title = COALESCE($2, title),
    description = COALESCE($3, description),
    department = COALESCE($4, department),
    department_id = COALESCE($5, department_id),
    status = COALESCE($6, status),
    priority = COALESCE($7, priority),
    total_amount = COALESCE($8, total_amount),
    currency = COALESCE($9, currency),
    approval_stage = COALESCE($10, approval_stage),
    category_id = COALESCE($11, category_id),
    preferred_vendor_id = COALESCE($12, preferred_vendor_id),
    is_estimate = COALESCE($13, is_estimate),
    budget_code = COALESCE($14, budget_code),
    source_of_funds = COALESCE($15, source_of_funds),
    required_by_date = COALESCE($16, required_by_date),
    cost_center = COALESCE($17, cost_center),
    project_code = COALESCE($18, project_code),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SoftDeleteRequisition :exec
UPDATE requisitions SET deleted_at = NOW() WHERE id = $1;

-- name: CountRequisitionsAll :one
SELECT COUNT(*) FROM requisitions
WHERE organization_id = $1
  AND ($2::text = '' OR UPPER(status)     = UPPER($2))
  AND ($3::text = '' OR department        = $3)
  AND ($4::text = '' OR priority          = $4);

-- name: ListRequisitionIDsAll :many
SELECT id FROM requisitions
WHERE organization_id = $1
  AND ($2::text = '' OR UPPER(status)     = UPPER($2))
  AND ($3::text = '' OR department        = $3)
  AND ($4::text = '' OR priority          = $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountRequisitionsProcurement :one
SELECT COUNT(*) FROM requisitions r
WHERE r.organization_id = $1
  AND ($2::text = '' OR UPPER(r.status)   = UPPER($2))
  AND ($3::text = '' OR r.department      = $3)
  AND ($4::text = '' OR r.priority        = $4)
  AND r.id IN (
      SELECT wa.entity_id
      FROM workflow_assignments wa
      JOIN workflows w ON w.id = wa.workflow_id
      WHERE wa.entity_type     = 'requisition'
        AND wa.organization_id = $1
        AND (
            w.conditions->>'routingType' IS NULL OR
            w.conditions->>'routingType' = ''   OR
            w.conditions->>'routingType' = 'procurement'
        )
  );

-- name: ListRequisitionIDsProcurement :many
SELECT r.id FROM requisitions r
WHERE r.organization_id = $1
  AND ($2::text = '' OR UPPER(r.status)   = UPPER($2))
  AND ($3::text = '' OR r.department      = $3)
  AND ($4::text = '' OR r.priority        = $4)
  AND r.id IN (
      SELECT wa.entity_id
      FROM workflow_assignments wa
      JOIN workflows w ON w.id = wa.workflow_id
      WHERE wa.entity_type     = 'requisition'
        AND wa.organization_id = $1
        AND (
            w.conditions->>'routingType' IS NULL OR
            w.conditions->>'routingType' = ''   OR
            w.conditions->>'routingType' = 'procurement'
        )
  )
ORDER BY r.created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountRequisitionsLimited :one
SELECT COUNT(*) FROM requisitions r
WHERE r.organization_id = $1
  AND ($2::text = '' OR UPPER(r.status)     = UPPER($2))
  AND ($3::text = '' OR r.department        = $3)
  AND ($4::text = '' OR r.priority          = $4)
  AND (
      r.requester_id = $5
      OR r.id IN (
          SELECT wt.entity_id FROM workflow_tasks wt
          WHERE wt.organization_id = $1
            AND wt.entity_type     = 'requisition'
            AND (
                wt.assigned_user_id        = $5
                OR LOWER(wt.assigned_role) = LOWER($6)
                OR wt.assigned_role        = ANY($7::text[])
                OR wt.claimed_by           = $5
            )
      )
  );

-- name: ListRequisitionIDsLimited :many
SELECT r.id FROM requisitions r
WHERE r.organization_id = $1
  AND ($2::text = '' OR UPPER(r.status)     = UPPER($2))
  AND ($3::text = '' OR r.department        = $3)
  AND ($4::text = '' OR r.priority          = $4)
  AND (
      r.requester_id = $5
      OR r.id IN (
          SELECT wt.entity_id FROM workflow_tasks wt
          WHERE wt.organization_id = $1
            AND wt.entity_type     = 'requisition'
            AND (
                wt.assigned_user_id        = $5
                OR LOWER(wt.assigned_role) = LOWER($6)
                OR wt.assigned_role        = ANY($7::text[])
                OR wt.claimed_by           = $5
            )
      )
  )
ORDER BY r.created_at DESC
LIMIT $8 OFFSET $9;

-- name: ListRequisitions :many
SELECT * FROM requisitions
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text       = '' OR UPPER(status) = UPPER($2))
  AND ($3::text       = '' OR requester_id  = $3)
  AND ($4::text       = '' OR department    = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
  AND ($7::text       = '' OR (title ILIKE '%' || $7 || '%' OR description ILIKE '%' || $7 || '%' OR document_number ILIKE '%' || $7 || '%'))
ORDER BY created_at DESC
LIMIT $8 OFFSET $9;

-- name: CountRequisitions :one
SELECT COUNT(*) FROM requisitions
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text       = '' OR UPPER(status) = UPPER($2))
  AND ($3::text       = '' OR requester_id  = $3)
  AND ($4::text       = '' OR department    = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
  AND ($7::text       = '' OR (title ILIKE '%' || $7 || '%' OR description ILIKE '%' || $7 || '%' OR document_number ILIKE '%' || $7 || '%'));

-- name: UpdateRequisitionStatus :one
UPDATE requisitions
SET status         = $2,
    approval_stage = COALESCE($3, approval_stage),
    updated_at     = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SubmitRequisition :one
UPDATE requisitions
SET status         = 'submitted',
    approval_stage = 1,
    updated_at     = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: ListRequisitionsByRequester :many
SELECT * FROM requisitions
WHERE organization_id = $1
  AND requester_id    = $2
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountRequisitionsByRequester :one
SELECT COUNT(*) FROM requisitions
WHERE organization_id = $1
  AND requester_id    = $2
  AND deleted_at IS NULL;
