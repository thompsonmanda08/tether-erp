-- Audit log queries
-- Uses empty-string = skip-filter pattern to avoid nullable params.
-- All queries return the full row (no preloads needed for audit logs).

-- name: CountAuditLogs :one
SELECT COUNT(*) FROM audit_logs
WHERE organization_id = $1
  AND ($2::text = '' OR action        = $2)
  AND ($3::text = '' OR document_type = $3)
  AND ($4::text = '' OR user_id       = $4);

-- name: ListAuditLogs :many
SELECT id, organization_id, document_id, document_type,
       user_id, actor_name, actor_role, action, changes, details, created_at
FROM audit_logs
WHERE organization_id = $1
  AND ($2::text = '' OR action        = $2)
  AND ($3::text = '' OR document_type = $3)
  AND ($4::text = '' OR user_id       = $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountDocumentAuditLogs :one
SELECT COUNT(*) FROM audit_logs
WHERE organization_id = $1
  AND document_id = $2;

-- name: ListDocumentAuditLogs :many
SELECT id, organization_id, document_id, document_type,
       user_id, actor_name, actor_role, action, changes, details, created_at
FROM audit_logs
WHERE organization_id = $1
  AND document_id = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountAuditEvents :one
SELECT COUNT(*) FROM audit_logs
WHERE organization_id = $1
  AND document_type = $2
  AND document_id   = $3;

-- name: ListAuditEvents :many
SELECT id, organization_id, document_id, document_type,
       user_id, actor_name, actor_role, action, changes, details, created_at
FROM audit_logs
WHERE organization_id = $1
  AND document_type = $2
  AND document_id   = $3
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;
