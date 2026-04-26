-- Batch enrichment queries for document cross-linking.
-- These replace the existing config.DB.Raw(DISTINCT ON...) calls in the list handlers.
-- pgx/v5 encodes []string natively for the ANY($n::text[]) array parameter.

-- name: GetLinkedPOsForRequisitions :many
SELECT DISTINCT ON (source_requisition_id)
    source_requisition_id,
    id,
    document_number,
    status
FROM purchase_orders
WHERE source_requisition_id = ANY($1::text[])
  AND organization_id = $2
  AND UPPER(status) != 'CANCELLED'
ORDER BY source_requisition_id, created_at DESC;

-- name: GetLinkedPVsForPurchaseOrders :many
SELECT DISTINCT ON (linked_po)
    linked_po,
    id,
    document_number,
    status
FROM payment_vouchers
WHERE linked_po = ANY($1::text[])
  AND organization_id = $2
  AND UPPER(status) != 'CANCELLED'
ORDER BY linked_po, created_at DESC;
