-- Purchase order read queries.
-- Both CanViewAll and IsProcurement return all POs (ApplyToQuery passes through for both).
-- Only two scope variants needed: All and Limited.

-- name: GetPurchaseOrderByID :one
SELECT * FROM purchase_orders WHERE id = $1 AND deleted_at IS NULL;

-- name: GetPurchaseOrderByNumber :one
SELECT * FROM purchase_orders WHERE organization_id = $1 AND document_number = $2 AND deleted_at IS NULL;

-- name: CreatePurchaseOrder :one
INSERT INTO purchase_orders (
    id, organization_id, document_number, vendor_id, status, items, total_amount,
    currency, delivery_date, approval_stage, approval_history, linked_requisition,
    description, department, department_id, gl_code, title, priority, subtotal,
    tax, total, budget_code, cost_center, project_code, required_by_date,
    source_requisition_number, source_requisition_id, created_by, owner_id,
    action_history, metadata, estimated_cost, quotation_gate_overridden,
    bypass_justification, automation_used, auto_created_grn, procurement_flow
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
    $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
    $33, $34, $35, $36, $37
) RETURNING *;

-- name: UpdatePurchaseOrder :one
UPDATE purchase_orders SET 
    vendor_id = COALESCE($2, vendor_id),
    status = COALESCE($3, status),
    total_amount = COALESCE($4, total_amount),
    currency = COALESCE($5, currency),
    delivery_date = COALESCE($6, delivery_date),
    approval_stage = COALESCE($7, approval_stage),
    linked_requisition = COALESCE($8, linked_requisition),
    department = COALESCE($9, department),
    department_id = COALESCE($10, department_id),
    gl_code = COALESCE($11, gl_code),
    title = COALESCE($12, title),
    description = COALESCE($13, description),
    priority = COALESCE($14, priority),
    budget_code = COALESCE($15, budget_code),
    cost_center = COALESCE($16, cost_center),
    project_code = COALESCE($17, project_code),
    procurement_flow = COALESCE($18, procurement_flow),
    estimated_cost = COALESCE($19, estimated_cost),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SoftDeletePurchaseOrder :exec
UPDATE purchase_orders SET deleted_at = NOW() WHERE id = $1;

-- name: LinkRequisitionToPO :exec
UPDATE purchase_orders SET linked_requisition = $2, updated_at = NOW() WHERE id = $1;

-- name: CountPurchaseOrdersAll :one
SELECT COUNT(*) FROM purchase_orders
WHERE organization_id = $1
  AND ($2::text = '' OR UPPER(status)    = UPPER($2))
  AND ($3::text = '' OR vendor_id        = $3);

-- name: ListPurchaseOrderIDsAll :many
SELECT id FROM purchase_orders
WHERE organization_id = $1
  AND ($2::text = '' OR UPPER(status)    = UPPER($2))
  AND ($3::text = '' OR vendor_id        = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountPurchaseOrdersLimited :one
SELECT COUNT(*) FROM purchase_orders po
WHERE po.organization_id = $1
  AND ($2::text = '' OR UPPER(po.status) = UPPER($2))
  AND ($3::text = '' OR po.vendor_id     = $3)
  AND (
      po.created_by = $4
      OR po.id IN (
          SELECT wt.entity_id FROM workflow_tasks wt
          WHERE wt.organization_id = $1
            AND wt.entity_type     = 'purchase_order'
            AND (
                wt.assigned_user_id        = $4
                OR LOWER(wt.assigned_role) = LOWER($5)
                OR wt.assigned_role        = ANY($6::text[])
                OR wt.claimed_by           = $4
            )
      )
  );

-- name: ListPurchaseOrderIDsLimited :many
SELECT po.id FROM purchase_orders po
WHERE po.organization_id = $1
  AND ($2::text = '' OR UPPER(po.status) = UPPER($2))
  AND ($3::text = '' OR po.vendor_id     = $3)
  AND (
      po.created_by = $4
      OR po.id IN (
          SELECT wt.entity_id FROM workflow_tasks wt
          WHERE wt.organization_id = $1
            AND wt.entity_type     = 'purchase_order'
            AND (
                wt.assigned_user_id        = $4
                OR LOWER(wt.assigned_role) = LOWER($5)
                OR wt.assigned_role        = ANY($6::text[])
                OR wt.claimed_by           = $4
            )
      )
  )
ORDER BY po.created_at DESC
LIMIT $7 OFFSET $8;

-- name: ListPurchaseOrders :many
SELECT * FROM purchase_orders
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text       = '' OR UPPER(status) = UPPER($2))
  AND ($3::text       = '' OR vendor_id     = $3)
  AND ($4::text       = '' OR department    = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
  AND ($7::text       = '' OR (title ILIKE '%' || $7 || '%' OR description ILIKE '%' || $7 || '%' OR document_number ILIKE '%' || $7 || '%'))
ORDER BY created_at DESC
LIMIT $8 OFFSET $9;

-- name: CountPurchaseOrders :one
SELECT COUNT(*) FROM purchase_orders
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text       = '' OR UPPER(status) = UPPER($2))
  AND ($3::text       = '' OR vendor_id     = $3)
  AND ($4::text       = '' OR department    = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
  AND ($7::text       = '' OR (title ILIKE '%' || $7 || '%' OR description ILIKE '%' || $7 || '%' OR document_number ILIKE '%' || $7 || '%'));

-- name: UpdatePOLinkedRequisition :exec
UPDATE purchase_orders
SET linked_requisition       = $2,
    source_requisition_id     = COALESCE($3, source_requisition_id),
    source_requisition_number = COALESCE($4, source_requisition_number),
    updated_at                = NOW()
WHERE id = $1;

-- name: UpdatePOLinkedGRN :exec
UPDATE purchase_orders
SET auto_created_grn = $2,
    updated_at       = NOW()
WHERE id = $1;

-- name: UpdatePOStatus :one
UPDATE purchase_orders
SET status         = $2,
    approval_stage = COALESCE($3, approval_stage),
    updated_at     = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeletePO :exec
UPDATE purchase_orders SET deleted_at = NOW() WHERE id = $1;

-- name: ListPurchaseOrdersByVendor :many
SELECT * FROM purchase_orders
WHERE organization_id = $1
  AND vendor_id       = $2
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountPurchaseOrdersByVendor :one
SELECT COUNT(*) FROM purchase_orders
WHERE organization_id = $1
  AND vendor_id       = $2
  AND deleted_at IS NULL;
