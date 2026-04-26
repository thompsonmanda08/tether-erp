-- Documents queries
-- Generic documents table (NOT typed docs like requisitions, POs, etc.)
-- Organization-scoped CRUD with soft-delete via deleted_at IS NULL.

-- name: GetDocumentByID :one
SELECT * FROM documents
WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL;

-- name: GetDocumentByNumber :one
SELECT * FROM documents
WHERE organization_id = $1 AND document_number = $2 AND deleted_at IS NULL;

-- name: CreateDocument :one
INSERT INTO documents (
    id, organization_id, document_type, document_number, title, description,
    status, amount, currency, department, created_by, updated_by, workflow_id,
    data, metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
) RETURNING *;

-- name: UpdateDocument :one
UPDATE documents SET
    title       = COALESCE($2,  title),
    description = COALESCE($3,  description),
    status      = COALESCE($4,  status),
    amount      = COALESCE($5,  amount),
    currency    = COALESCE($6,  currency),
    department  = COALESCE($7,  department),
    updated_by  = COALESCE($8,  updated_by),
    workflow_id = COALESCE($9,  workflow_id),
    data        = COALESCE($10, data),
    metadata    = COALESCE($11, metadata),
    updated_at  = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteDocument :exec
UPDATE documents SET deleted_at = NOW() WHERE id = $1;

-- name: ListDocuments :many
SELECT * FROM documents
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text[]      IS NULL OR document_type = ANY($2::text[]))
  AND ($3::text[]      IS NULL OR status        = ANY($3::text[]))
  AND ($4::text[]      IS NULL OR department    = ANY($4::text[]))
  AND ($5::text[]      IS NULL OR created_by    = ANY($5::text[]))
  AND ($6::timestamptz IS NULL OR created_at >= $6)
  AND ($7::timestamptz IS NULL OR created_at <= $7)
  AND ($8::numeric     IS NULL OR amount     >= $8)
  AND ($9::numeric     IS NULL OR amount     <= $9)
  AND ($10::text       = '' OR (title ILIKE '%' || $10 || '%' OR description ILIKE '%' || $10 || '%'))
ORDER BY created_at DESC
LIMIT $11 OFFSET $12;

-- name: CountDocuments :one
SELECT COUNT(*) FROM documents
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::text[]      IS NULL OR document_type = ANY($2::text[]))
  AND ($3::text[]      IS NULL OR status        = ANY($3::text[]))
  AND ($4::text[]      IS NULL OR department    = ANY($4::text[]))
  AND ($5::text[]      IS NULL OR created_by    = ANY($5::text[]))
  AND ($6::timestamptz IS NULL OR created_at >= $6)
  AND ($7::timestamptz IS NULL OR created_at <= $7)
  AND ($8::numeric     IS NULL OR amount     >= $8)
  AND ($9::numeric     IS NULL OR amount     <= $9)
  AND ($10::text       = '' OR (title ILIKE '%' || $10 || '%' OR description ILIKE '%' || $10 || '%'));

-- name: GetDocumentStatsByType :many
SELECT document_type, COUNT(*) AS count
FROM documents
WHERE organization_id = $1 AND deleted_at IS NULL
GROUP BY document_type
ORDER BY count DESC;

-- name: GetDocumentStatsByStatus :many
SELECT status, COUNT(*) AS count
FROM documents
WHERE organization_id = $1 AND deleted_at IS NULL
GROUP BY status
ORDER BY count DESC;

-- name: GetDocumentStatsByDepartment :many
SELECT department, COUNT(*) AS count
FROM documents
WHERE organization_id = $1 AND deleted_at IS NULL AND department IS NOT NULL
GROUP BY department
ORDER BY count DESC;

-- name: CountPendingApprovalDocuments :one
SELECT COUNT(*) FROM documents
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND UPPER(status) IN ('PENDING','PENDING_APPROVAL','IN_REVIEW','SUBMITTED');

-- name: ListRecentDocuments :many
SELECT * FROM documents
WHERE organization_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2;
