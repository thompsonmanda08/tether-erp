-- Documents extra: cross-document link lookups
-- Used to fetch the related typed-document for a given document number/id.

-- name: GetLinkedPOByRequisition :one
SELECT * FROM purchase_orders
WHERE source_requisition_id = $1
  AND organization_id = $2
  AND deleted_at IS NULL
  AND UPPER(status) != 'CANCELLED'
ORDER BY created_at DESC
LIMIT 1;

-- name: GetLinkedPOByRequisitionNumber :one
SELECT * FROM purchase_orders
WHERE source_requisition_number = $1
  AND organization_id = $2
  AND deleted_at IS NULL
  AND UPPER(status) != 'CANCELLED'
ORDER BY created_at DESC
LIMIT 1;

-- name: GetLinkedGRNByPONumber :one
SELECT * FROM goods_received_notes
WHERE po_document_number = $1
  AND organization_id = $2
  AND deleted_at IS NULL
  AND UPPER(status) != 'CANCELLED'
ORDER BY created_at DESC
LIMIT 1;

-- name: GetLinkedPVByPONumber :one
SELECT * FROM payment_vouchers
WHERE linked_po = $1
  AND organization_id = $2
  AND deleted_at IS NULL
  AND UPPER(status) != 'CANCELLED'
ORDER BY created_at DESC
LIMIT 1;

-- name: GetLinkedPVByGRNNumber :one
SELECT * FROM payment_vouchers
WHERE linked_grn = $1
  AND organization_id = $2
  AND deleted_at IS NULL
  AND UPPER(status) != 'CANCELLED'
ORDER BY created_at DESC
LIMIT 1;

-- name: GetRequisitionByPONumber :one
SELECT r.* FROM requisitions r
INNER JOIN purchase_orders po
        ON po.source_requisition_id = r.id
       AND po.organization_id = r.organization_id
WHERE po.document_number = $1
  AND r.organization_id = $2
  AND r.deleted_at  IS NULL
  AND po.deleted_at IS NULL
ORDER BY po.created_at DESC
LIMIT 1;
