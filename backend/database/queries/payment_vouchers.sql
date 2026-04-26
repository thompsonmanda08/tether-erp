-- Payment voucher read queries.
-- Three scope variants:
--   All         → scope.CanViewAll
--   Procurement → scope.IsProcurement (linked_po != '' filter)
--   Limited     → default (owner + workflow_tasks involvement filter)

-- name: GetPaymentVoucherByID :one
SELECT * FROM payment_vouchers WHERE id = $1 AND deleted_at IS NULL;

-- name: GetPaymentVoucherByNumber :one
SELECT * FROM payment_vouchers WHERE organization_id = $1 AND document_number = $2 AND deleted_at IS NULL;

-- name: CreatePaymentVoucher :one
INSERT INTO payment_vouchers (
    id, organization_id, document_number, vendor_id, invoice_number, status,
    amount, currency, payment_method, gl_code, description, approval_stage,
    linked_po, linked_grn, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
) RETURNING *;

-- name: UpdatePaymentVoucher :one
UPDATE payment_vouchers SET 
    vendor_id = COALESCE($2, vendor_id),
    invoice_number = COALESCE($3, invoice_number),
    status = COALESCE($4, status),
    amount = COALESCE($5, amount),
    payment_method = COALESCE($6, payment_method),
    gl_code = COALESCE($7, gl_code),
    description = COALESCE($8, description),
    approval_stage = COALESCE($9, approval_stage),
    linked_po = COALESCE($10, linked_po),
    linked_grn = COALESCE($11, linked_grn),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SoftDeletePaymentVoucher :exec
UPDATE payment_vouchers SET deleted_at = NOW() WHERE id = $1;

-- name: LinkPOToPaymentVoucher :exec
UPDATE payment_vouchers SET linked_po = $2, updated_at = NOW() WHERE id = $1;

-- name: LinkGRNToPaymentVoucher :exec
UPDATE payment_vouchers SET linked_grn = $2, updated_at = NOW() WHERE id = $1;

-- name: CountPaymentVouchersAll :one
SELECT COUNT(*) FROM payment_vouchers
WHERE organization_id = $1
  AND ($2::text = '' OR UPPER(status) = UPPER($2))
  AND ($3::text = '' OR vendor_id     = $3);

-- name: ListPaymentVoucherIDsAll :many
SELECT id FROM payment_vouchers
WHERE organization_id = $1
  AND ($2::text = '' OR UPPER(status) = UPPER($2))
  AND ($3::text = '' OR vendor_id     = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountPaymentVouchersProcurement :one
SELECT COUNT(*) FROM payment_vouchers pv
WHERE pv.organization_id = $1
  AND pv.linked_po IS NOT NULL
  AND pv.linked_po != ''
  AND ($2::text = '' OR UPPER(pv.status) = UPPER($2))
  AND ($3::text = '' OR pv.vendor_id     = $3);

-- name: ListPaymentVoucherIDsProcurement :many
SELECT pv.id FROM payment_vouchers pv
WHERE pv.organization_id = $1
  AND pv.linked_po IS NOT NULL
  AND pv.linked_po != ''
  AND ($2::text = '' OR UPPER(pv.status) = UPPER($2))
  AND ($3::text = '' OR pv.vendor_id     = $3)
ORDER BY pv.created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountPaymentVouchersLimited :one
SELECT COUNT(*) FROM payment_vouchers pv
WHERE pv.organization_id = $1
  AND ($2::text = '' OR UPPER(pv.status) = UPPER($2))
  AND ($3::text = '' OR pv.vendor_id     = $3)
  AND (
      pv.created_by = $4
      OR pv.id IN (
          SELECT wt.entity_id FROM workflow_tasks wt
          WHERE wt.organization_id = $1
            AND wt.entity_type     = 'payment_voucher'
            AND (
                wt.assigned_user_id        = $4
                OR LOWER(wt.assigned_role) = LOWER($5)
                OR wt.assigned_role        = ANY($6::text[])
                OR wt.claimed_by           = $4
            )
      )
  );

-- name: ListPaymentVoucherIDsLimited :many
SELECT pv.id FROM payment_vouchers pv
WHERE pv.organization_id = $1
  AND ($2::text = '' OR UPPER(pv.status) = UPPER($2))
  AND ($3::text = '' OR pv.vendor_id     = $3)
  AND (
      pv.created_by = $4
      OR pv.id IN (
          SELECT wt.entity_id FROM workflow_tasks wt
          WHERE wt.organization_id = $1
            AND wt.entity_type     = 'payment_voucher'
            AND (
                wt.assigned_user_id        = $4
                OR LOWER(wt.assigned_role) = LOWER($5)
                OR wt.assigned_role        = ANY($6::text[])
                OR wt.claimed_by           = $4
            )
      )
  )
ORDER BY pv.created_at DESC
LIMIT $7 OFFSET $8;

-- name: ListPaymentVouchers :many
SELECT * FROM payment_vouchers
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

-- name: CountPaymentVouchers :one
SELECT COUNT(*) FROM payment_vouchers
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text       = '' OR UPPER(status) = UPPER($2))
  AND ($3::text       = '' OR vendor_id     = $3)
  AND ($4::text       = '' OR department    = $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)
  AND ($7::text       = '' OR (title ILIKE '%' || $7 || '%' OR description ILIKE '%' || $7 || '%' OR document_number ILIKE '%' || $7 || '%'));

-- name: UpdatePVLinkedPO :exec
UPDATE payment_vouchers
SET linked_po                    = $2,
    source_purchase_order_number = COALESCE($3, source_purchase_order_number),
    updated_at                   = NOW()
WHERE id = $1;

-- name: UpdatePVLinkedGRN :exec
UPDATE payment_vouchers
SET linked_grn = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: UpdatePVStatus :one
UPDATE payment_vouchers
SET status         = $2,
    approval_stage = COALESCE($3, approval_stage),
    updated_at     = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeletePV :exec
UPDATE payment_vouchers SET deleted_at = NOW() WHERE id = $1;

-- name: ListPaymentVouchersByVendor :many
SELECT * FROM payment_vouchers
WHERE organization_id = $1
  AND vendor_id       = $2
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountPaymentVouchersByVendor :one
SELECT COUNT(*) FROM payment_vouchers
WHERE organization_id = $1
  AND vendor_id       = $2
  AND deleted_at IS NULL;
