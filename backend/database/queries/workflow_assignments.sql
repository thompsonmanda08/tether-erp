-- Workflow assignment queries
-- An assignment binds an entity (e.g. a requisition) to a specific workflow version.

-- name: CreateAssignment :one
INSERT INTO workflow_assignments (
    id, organization_id, entity_id, entity_type, workflow_id, workflow_version,
    current_stage, status, stage_history, assigned_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: GetAssignmentByID :one
SELECT * FROM workflow_assignments WHERE id = $1;

-- name: GetAssignmentByEntity :one
SELECT * FROM workflow_assignments
WHERE organization_id = $1
  AND entity_id       = $2
  AND entity_type     = $3
ORDER BY created_at DESC
LIMIT 1;

-- name: UpdateAssignmentStatus :one
UPDATE workflow_assignments
SET status        = $2,
    current_stage = COALESCE($3, current_stage),
    stage_history = COALESCE($4, stage_history),
    completed_at  = CASE WHEN $2 IN ('completed','approved','rejected','cancelled') THEN NOW() ELSE completed_at END,
    updated_at    = NOW()
WHERE id = $1
RETURNING *;

-- name: ListAssignmentsByWorkflow :many
SELECT * FROM workflow_assignments
WHERE organization_id = $1 AND workflow_id = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountAssignmentsByWorkflow :one
SELECT COUNT(*) FROM workflow_assignments
WHERE organization_id = $1 AND workflow_id = $2;

-- name: ListAssignmentsByEntity :many
SELECT * FROM workflow_assignments
WHERE organization_id = $1
  AND entity_id       = $2
  AND entity_type     = $3
ORDER BY created_at DESC;
