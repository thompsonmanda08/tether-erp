-- Workflow task queries
-- Tasks emitted per workflow stage. Optimistic-locking via version column on update.

-- name: CreateTask :one
INSERT INTO workflow_tasks (
    id, organization_id, workflow_assignment_id, entity_id, entity_type,
    stage_number, stage_name, assignment_type, assigned_role, assigned_user_id,
    status, priority, due_date, version, updated_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1, $14
) RETURNING *;

-- name: GetTaskByID :one
SELECT * FROM workflow_tasks WHERE id = $1;

-- name: GetTaskByAssignment :one
SELECT * FROM workflow_tasks
WHERE workflow_assignment_id = $1 AND stage_number = $2
ORDER BY created_at DESC
LIMIT 1;

-- name: ListTasksByEntity :many
SELECT * FROM workflow_tasks
WHERE organization_id = $1
  AND entity_id   = $2
  AND entity_type = $3
ORDER BY stage_number ASC, created_at DESC;

-- name: ListTasksByAssignee :many
SELECT * FROM workflow_tasks
WHERE organization_id = $1
  AND (assigned_user_id = $2 OR claimed_by = $2)
  AND ($3::text[] IS NULL OR status = ANY($3::text[]))
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountTasksByAssignee :one
SELECT COUNT(*) FROM workflow_tasks
WHERE organization_id = $1
  AND (assigned_user_id = $2 OR claimed_by = $2)
  AND ($3::text[] IS NULL OR status = ANY($3::text[]));

-- name: UpdateTaskStatus :one
UPDATE workflow_tasks
SET status       = $2,
    completed_at = CASE WHEN $2 IN ('approved','rejected','completed') THEN NOW() ELSE completed_at END,
    updated_by   = $3,
    version      = version + 1,
    updated_at   = NOW()
WHERE id = $1
RETURNING *;

-- name: ClaimTask :one
UPDATE workflow_tasks
SET claimed_by   = $2,
    claimed_at   = NOW(),
    claim_expiry = $3,
    updated_by   = $2,
    version      = version + 1,
    updated_at   = NOW()
WHERE id = $1
  AND (claimed_by IS NULL OR claim_expiry < NOW())
RETURNING *;

-- name: ReleaseTaskClaim :exec
UPDATE workflow_tasks
SET claimed_by   = NULL,
    claimed_at   = NULL,
    claim_expiry = NULL,
    updated_at   = NOW()
WHERE id = $1;

-- name: ExpireStaleClaims :exec
UPDATE workflow_tasks
SET claimed_by   = NULL,
    claimed_at   = NULL,
    claim_expiry = NULL,
    updated_at   = NOW()
WHERE claimed_by IS NOT NULL
  AND claim_expiry IS NOT NULL
  AND claim_expiry < NOW();
