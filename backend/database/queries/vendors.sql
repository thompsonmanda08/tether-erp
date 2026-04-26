-- Vendor queries
-- Organization-scoped vendor CRUD operations

-- name: GetVendorByID :one
SELECT * FROM vendors WHERE id = $1 AND deleted_at IS NULL;

-- name: GetVendorByCode :one
SELECT * FROM vendors WHERE organization_id = $1 AND vendor_code = $2 AND deleted_at IS NULL;

-- name: CreateVendor :one
INSERT INTO vendors (
    id, organization_id, name, vendor_code, email, phone, country, city,
    bank_account, bank_name, account_name, account_number, branch_code,
    swift_code, contact_person, physical_address, tax_id, active, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
) RETURNING *;

-- name: UpdateVendor :one
UPDATE vendors SET 
    name = COALESCE($2, name),
    vendor_code = COALESCE($3, vendor_code),
    email = COALESCE($4, email),
    phone = COALESCE($5, phone),
    country = COALESCE($6, country),
    city = COALESCE($7, city),
    bank_account = COALESCE($8, bank_account),
    bank_name = COALESCE($9, bank_name),
    account_name = COALESCE($10, account_name),
    account_number = COALESCE($11, account_number),
    branch_code = COALESCE($12, branch_code),
    swift_code = COALESCE($13, swift_code),
    contact_person = COALESCE($14, contact_person),
    physical_address = COALESCE($15, physical_address),
    tax_id = COALESCE($16, tax_id),
    active = COALESCE($17, active),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SoftDeleteVendor :exec
UPDATE vendors SET deleted_at = NOW() WHERE id = $1;

-- name: ListVendors :many
SELECT * FROM vendors 
WHERE organization_id = $1 AND deleted_at IS NULL
  AND ($2::text = '' OR name ILIKE $2)
  AND ($3::text = '' OR UPPER(active) = UPPER($3))
ORDER BY name ASC
LIMIT $4 OFFSET $5;

-- name: CountVendors :one
SELECT COUNT(*) FROM vendors 
WHERE organization_id = $1 AND deleted_at IS NULL
  AND ($2::text = '' OR name ILIKE $2)
  AND ($3::text = '' OR UPPER(active) = UPPER($3));

-- name: ListActiveVendors :many
SELECT * FROM vendors 
WHERE organization_id = $1 AND deleted_at IS NULL AND active = true
ORDER BY name ASC;