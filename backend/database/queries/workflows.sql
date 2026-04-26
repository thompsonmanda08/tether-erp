-- name: CreateWorkflow :one
INSERT INTO workflows (
    id,
    organization_id,
    name,
    description,
    document_type,
    stages,
    is_active,
    created_by,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
)
RETURNING *;

-- name: GetWorkflowByID :one
SELECT * FROM workflows
WHERE id = $1 AND organization_id = $2;

-- name: ListWorkflows :many
SELECT * FROM workflows
WHERE organization_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListActiveWorkflows :many
SELECT * FROM workflows
WHERE organization_id = $1 AND is_active = true
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListWorkflowsByDocumentType :many
SELECT * FROM workflows
WHERE organization_id = $1 AND document_type = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: ListActiveWorkflowsByDocumentType :many
SELECT * FROM workflows
WHERE organization_id = $1 AND document_type = $2 AND is_active = true
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: GetDefaultWorkflowByDocumentType :one
SELECT * FROM workflows
WHERE organization_id = $1 AND document_type = $2 AND is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- name: UpdateWorkflow :one
UPDATE workflows
SET name = $3,
    description = $4,
    stages = $5,
    updated_at = NOW()
WHERE id = $1 AND organization_id = $2
RETURNING *;

-- name: ActivateWorkflow :one
UPDATE workflows
SET is_active = true,
    updated_at = NOW()
WHERE id = $1 AND organization_id = $2
RETURNING *;

-- name: DeactivateWorkflow :one
UPDATE workflows
SET is_active = false,
    updated_at = NOW()
WHERE id = $1 AND organization_id = $2
RETURNING *;

-- name: DeleteWorkflow :exec
DELETE FROM workflows
WHERE id = $1 AND organization_id = $2;

-- name: CountWorkflows :one
SELECT COUNT(*) FROM workflows
WHERE organization_id = $1;

-- name: CountActiveWorkflows :one
SELECT COUNT(*) FROM workflows
WHERE organization_id = $1 AND is_active = true;

-- name: CountWorkflowsByDocumentType :one
SELECT COUNT(*) FROM workflows
WHERE organization_id = $1 AND document_type = $2;

-- name: SoftDeleteWorkflow :exec
UPDATE workflows
SET deleted_at = NOW(),
    is_active  = false,
    updated_at = NOW()
WHERE id = $1 AND organization_id = $2;

-- name: ListWorkflowsByOrg :many
SELECT * FROM workflows
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::bool IS NULL OR is_active     = $2)
  AND ($3::text = ''   OR document_type  = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountWorkflowsByOrg :one
SELECT COUNT(*) FROM workflows
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND ($2::bool IS NULL OR is_active     = $2)
  AND ($3::text = ''   OR document_type  = $3);