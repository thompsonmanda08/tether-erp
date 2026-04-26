-- Stage approval record queries
-- Audit-trail rows for approve/reject/return decisions on workflow tasks.

-- name: CreateApprovalRecord :one
INSERT INTO stage_approval_records (
    id, organization_id, workflow_task_id, stage_number, approver_id,
    approver_name, approver_role, man_number, position, action, comments,
    signature, approved_at, ip_address, user_agent
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
) RETURNING *;

-- name: GetApprovalRecordByID :one
SELECT * FROM stage_approval_records WHERE id = $1;

-- name: ListApprovalRecordsByTask :many
SELECT * FROM stage_approval_records
WHERE workflow_task_id = $1
ORDER BY approved_at DESC;

-- name: ListApprovalRecordsByAssignment :many
SELECT sar.*
FROM stage_approval_records sar
INNER JOIN workflow_tasks wt ON wt.id = sar.workflow_task_id
WHERE wt.workflow_assignment_id = $1
ORDER BY sar.approved_at DESC;

-- name: ListApprovalRecordsByApprover :many
SELECT * FROM stage_approval_records
WHERE organization_id = $1 AND approver_id = $2
ORDER BY approved_at DESC
LIMIT $3 OFFSET $4;
