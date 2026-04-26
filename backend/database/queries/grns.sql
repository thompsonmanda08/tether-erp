-- Goods received note read queries.
-- Both CanViewAll and IsProcurement use the unfiltered path (ApplyToQuery passes through).
-- Limited adds owner (created_by OR received_by) + workflow_tasks involvement.

-- name: GetGRNByID :one
SELECT * FROM goods_received_notes WHERE id = $1 AND deleted_at IS NULL;

-- name: GetGRNByDocumentNumber :one
SELECT * FROM goods_received_notes WHERE organization_id = $1 AND document_number = $2 AND deleted_at IS NULL;

-- name: CreateGRN :one
INSERT INTO goods_received_notes (
    id, organization_id, document_number, po_document_number, status,
    received_date, received_by, created_by, warehouse_location, notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: UpdateGRN :one
UPDATE goods_received_notes SET 
    status = COALESCE($2, status),
    received_date = COALESCE($3, received_date),
    received_by = COALESCE($4, received_by),
    warehouse_location = COALESCE($5, warehouse_location),
    notes = COALESCE($6, notes),
    approval_stage = COALESCE($7, approval_stage),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SoftDeleteGRN :exec
UPDATE goods_received_notes SET deleted_at = NOW() WHERE id = $1;

-- name: LinkPVToGRN :exec
UPDATE goods_received_notes SET linked_pv = $2, updated_at = NOW() WHERE id = $1;

-- name: CountGRNsAll :one
SELECT COUNT(*) FROM goods_received_notes
WHERE organization_id = $1
  AND ($2::text = '' OR UPPER(status)           = UPPER($2))
  AND ($3::text = '' OR po_document_number      = $3);

-- name: ListGRNIDsAll :many
SELECT id FROM goods_received_notes
WHERE organization_id = $1
  AND ($2::text = '' OR UPPER(status)           = UPPER($2))
  AND ($3::text = '' OR po_document_number      = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountGRNsLimited :one
SELECT COUNT(*) FROM goods_received_notes g
WHERE g.organization_id = $1
  AND ($2::text = '' OR UPPER(g.status)          = UPPER($2))
  AND ($3::text = '' OR g.po_document_number     = $3)
  AND (
      g.created_by  = $4
      OR g.received_by = $4
      OR g.id IN (
          SELECT wt.entity_id FROM workflow_tasks wt
          WHERE wt.organization_id = $1
            AND wt.entity_type     = 'grn'
            AND (
                wt.assigned_user_id        = $4
                OR LOWER(wt.assigned_role) = LOWER($5)
                OR wt.assigned_role        = ANY($6::text[])
                OR wt.claimed_by           = $4
            )
      )
  );

-- name: ListGRNIDsLimited :many
SELECT g.id FROM goods_received_notes g
WHERE g.organization_id = $1
  AND ($2::text = '' OR UPPER(g.status)          = UPPER($2))
  AND ($3::text = '' OR g.po_document_number     = $3)
  AND (
      g.created_by  = $4
      OR g.received_by = $4
      OR g.id IN (
          SELECT wt.entity_id FROM workflow_tasks wt
          WHERE wt.organization_id = $1
            AND wt.entity_type     = 'grn'
            AND (
                wt.assigned_user_id        = $4
                OR LOWER(wt.assigned_role) = LOWER($5)
                OR wt.assigned_role        = ANY($6::text[])
                OR wt.claimed_by           = $4
            )
      )
  )
ORDER BY g.created_at DESC
LIMIT $7 OFFSET $8;

-- name: ListGRNs :many
SELECT * FROM goods_received_notes
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text       = '' OR UPPER(status)         = UPPER($2))
  AND ($3::text       = '' OR po_document_number    = $3)
  AND ($4::text       = '' OR received_by           = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
  AND ($7::text       = '' OR (document_number ILIKE '%' || $7 || '%' OR notes ILIKE '%' || $7 || '%'))
ORDER BY created_at DESC
LIMIT $8 OFFSET $9;

-- name: CountGRNs :one
SELECT COUNT(*) FROM goods_received_notes
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text       = '' OR UPPER(status)         = UPPER($2))
  AND ($3::text       = '' OR po_document_number    = $3)
  AND ($4::text       = '' OR received_by           = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
  AND ($7::text       = '' OR (document_number ILIKE '%' || $7 || '%' OR notes ILIKE '%' || $7 || '%'));

-- name: UpdateGRNLinkedPV :exec
UPDATE goods_received_notes
SET linked_pv  = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateGRNStatus :one
UPDATE goods_received_notes
SET status         = $2,
    approval_stage = COALESCE($3, approval_stage),
    updated_at     = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: ListGRNsByPO :many
SELECT * FROM goods_received_notes
WHERE organization_id    = $1
  AND po_document_number = $2
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- name: CountGRNsByPO :one
SELECT COUNT(*) FROM goods_received_notes
WHERE organization_id    = $1
  AND po_document_number = $2
  AND deleted_at IS NULL;
