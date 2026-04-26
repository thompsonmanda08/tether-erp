package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
	"github.com/tether-erp/types"
)

// WorkflowExecutionService handles workflow assignment and execution.
//
// Migrated off GORM: all DB access uses the package-global pgx pool
// (config.PgxDB) plus sqlc-generated queries (config.Queries). The previous
// *gorm.DB constructor parameter has been removed — see NewWorkflowExecutionService.
type WorkflowExecutionService struct {
	workflowService     *WorkflowService
	auditService        *AuditService
	automationService   *DocumentAutomationService
	notificationService *NotificationService
}

// NewWorkflowExecutionService creates a new workflow execution service.
//
// The previous *gorm.DB parameter has been removed; the inner notification
// service is constructed via the legacy GORM constructor for now (the
// notification service migration is a separate work item — see TODO).
func NewWorkflowExecutionService(workflowService *WorkflowService, auditService *AuditService, automationService *DocumentAutomationService) *WorkflowExecutionService {
	return &WorkflowExecutionService{
		workflowService:     workflowService,
		auditService:        auditService,
		automationService:   automationService,
		notificationService: NewNotificationService(),
	}
}

// StartClaimExpiryWorker runs a background goroutine that periodically resets
// expired claimed tasks back to pending status so other users can claim them.
func (s *WorkflowExecutionService) StartClaimExpiryWorker(ctx context.Context) {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	log.Println("[ClaimExpiry] Background claim expiry worker started (interval: 60s)")
	for {
		select {
		case <-ctx.Done():
			log.Println("[ClaimExpiry] Background claim expiry worker stopped")
			return
		case <-ticker.C:
			if config.PgxDB == nil {
				continue
			}
			// Reset stale claims AND flip status back to PENDING. (sqlc.ExpireStaleClaims
			// only NULLs the claim columns; it doesn't change status.)
			tag, err := config.PgxDB.Exec(ctx, `
				UPDATE workflow_tasks
				SET claimed_by   = NULL,
				    claimed_at   = NULL,
				    claim_expiry = NULL,
				    status       = 'PENDING',
				    updated_at   = NOW()
				WHERE UPPER(status) = 'CLAIMED'
				  AND claim_expiry IS NOT NULL
				  AND claim_expiry < NOW()
			`)
			if err != nil {
				log.Printf("[ClaimExpiry] Error expiring stale claims: %v", err)
			} else if rows := tag.RowsAffected(); rows > 0 {
				log.Printf("[ClaimExpiry] Auto-expired %d stale claim(s)", rows)
			}
		}
	}
}

// AssignWorkflowToDocument assigns a workflow to a document and creates initial tasks
func (s *WorkflowExecutionService) AssignWorkflowToDocument(ctx context.Context, organizationID, entityID, entityType, userID string) (*models.WorkflowAssignment, error) {
	workflow, err := s.workflowService.GetDefaultWorkflow(ctx, organizationID, entityType)
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: get default workflow: %w", err)
	}
	return s.assignWorkflow(ctx, organizationID, entityID, entityType, userID, workflow)
}

// AssignWorkflowToDocumentWithID assigns a user-selected workflow to a document.
func (s *WorkflowExecutionService) AssignWorkflowToDocumentWithID(
	ctx context.Context,
	organizationID, entityID, entityType, workflowID, userID string,
) (*models.WorkflowAssignment, error) {
	workflowUUID, err := uuid.Parse(workflowID)
	if err != nil {
		return nil, fmt.Errorf("invalid workflow ID format")
	}

	workflow, err := s.workflowService.GetWorkflow(ctx, workflowUUID, organizationID)
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: get selected workflow: %w", err)
	}

	if !workflow.IsActive {
		return nil, fmt.Errorf("selected workflow is inactive")
	}

	if !strings.EqualFold(workflow.EntityType, entityType) {
		return nil, fmt.Errorf("workflow entity type mismatch")
	}

	return s.assignWorkflow(ctx, organizationID, entityID, entityType, userID, workflow)
}

// SubmitRoutingResult contains the result of a routing-aware requisition submission.
type SubmitRoutingResult struct {
	RoutingPath     string                     `json:"routingPath"` // "accounting" or "procurement"
	AutoApproved    bool                       `json:"autoApproved"`
	Assignment      *models.WorkflowAssignment `json:"assignment,omitempty"`
	AutoCreatedPO   *AutomationResult          `json:"autoCreatedPO,omitempty"`
	AutoCreatedPOID string                     `json:"autoCreatedPoId,omitempty"`
}

// SubmitRequisitionWithRouting handles requisition submission with conditional routing.
func (s *WorkflowExecutionService) SubmitRequisitionWithRouting(
	ctx context.Context,
	organizationID, entityID, workflowID, userID string,
	requisition *models.Requisition,
) (*SubmitRoutingResult, error) {
	workflowUUID, err := uuid.Parse(workflowID)
	if err != nil {
		return nil, fmt.Errorf("invalid workflow ID format")
	}

	workflow, err := s.workflowService.GetWorkflow(ctx, workflowUUID, organizationID)
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: get workflow: %w", err)
	}

	if !workflow.IsActive {
		return nil, fmt.Errorf("selected workflow is inactive")
	}

	if !strings.EqualFold(workflow.EntityType, "requisition") {
		return nil, fmt.Errorf("workflow entity type mismatch: expected requisition")
	}

	conditions, _ := workflow.GetConditions()
	isAccountingPath := conditions != nil && strings.EqualFold(conditions.RoutingType, "accounting")

	if !isAccountingPath {
		assignment, err := s.assignWorkflow(ctx, organizationID, entityID, "requisition", userID, workflow)
		if err != nil {
			return nil, err
		}
		return &SubmitRoutingResult{
			RoutingPath:  "procurement",
			AutoApproved: false,
			Assignment:   assignment,
		}, nil
	}

	stages, _ := workflow.GetStages()
	categoryID := ""
	if requisition.CategoryID != nil {
		categoryID = *requisition.CategoryID
	}

	shouldAutoApprove := conditions.MeetsAutoApprovalCriteria(requisition.TotalAmount, categoryID) && len(stages) == 0

	if !shouldAutoApprove {
		assignment, err := s.assignWorkflow(ctx, organizationID, entityID, "requisition", userID, workflow)
		if err != nil {
			return nil, err
		}
		return &SubmitRoutingResult{
			RoutingPath:  "accounting",
			AutoApproved: false,
			Assignment:   assignment,
		}, nil
	}

	return s.autoApproveAndGeneratePO(ctx, organizationID, entityID, userID, requisition, workflow, conditions)
}

// autoApproveAndGeneratePO handles instant auto-approval of a requisition and optional PO generation.
func (s *WorkflowExecutionService) autoApproveAndGeneratePO(
	ctx context.Context,
	organizationID, entityID, userID string,
	requisition *models.Requisition,
	workflow *models.Workflow,
	conditions *models.WorkflowConditions,
) (*SubmitRoutingResult, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_execution: pgx pool not initialized")
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)
	q := config.Queries.WithTx(tx)

	now := time.Now()

	// Build stage history with the auto-approval execution.
	autoExecution := models.StageExecution{
		StageNumber:  0,
		StageName:    "Auto-Approval",
		ApproverID:   "system",
		ApproverName: "System Auto-Approval",
		ApproverRole: "system",
		Action:       "auto_approved",
		Comments:     "Automatically approved based on workflow conditions",
		ExecutedAt:   now,
	}
	stageHistoryJSON, err := json.Marshal([]models.StageExecution{autoExecution})
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: marshal stage history: %w", err)
	}

	assignmentID := uuid.New().String()
	currentStage := int32(0)
	completedStatus := "COMPLETED"

	asgnRow, err := q.CreateAssignment(ctx, sqlc.CreateAssignmentParams{
		ID:              assignmentID,
		OrganizationID:  organizationID,
		EntityID:        entityID,
		EntityType:      "requisition",
		WorkflowID:      pgtype.UUID{Bytes: workflow.ID, Valid: true},
		WorkflowVersion: int32(workflow.Version),
		CurrentStage:    &currentStage,
		Status:          &completedStatus,
		StageHistory:    stageHistoryJSON,
		AssignedBy:      userID,
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: create auto-approval assignment: %w", err)
	}

	// Mark assignment as completed (sqlc CreateAssignment doesn't set completed_at).
	if _, err := tx.Exec(ctx,
		`UPDATE workflow_assignments SET completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
		assignmentID,
	); err != nil {
		return nil, fmt.Errorf("workflow_execution: set completed_at: %w", err)
	}

	if err := updateDocumentStatusTx(ctx, tx, "requisition", entityID, "APPROVED"); err != nil {
		return nil, fmt.Errorf("workflow_execution: update requisition status: %w", err)
	}

	if err := addActionHistoryEntryTx(ctx, tx, "requisition", entityID, "system", "AUTO_APPROVED",
		"Requisition auto-approved via accounting workflow"); err != nil {
		log.Printf("Warning: failed to add action history: %v", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("workflow_execution: commit auto-approval: %w", err)
	}

	assignment := assignmentRowToModel(asgnRow)
	completedAt := now
	assignment.CompletedAt = &completedAt
	assignment.StageHistory = json.RawMessage(stageHistoryJSON)

	result := &SubmitRoutingResult{
		RoutingPath:  "accounting",
		AutoApproved: true,
		Assignment:   assignment,
	}

	// Auto-generate PO if configured
	if conditions.AutoGeneratePO && s.automationService != nil {
		requisition.Status = "APPROVED"

		targetStatus := "DRAFT"
		if conditions.AutoApprovePO {
			targetStatus = "APPROVED"
		}

		poResult, err := s.automationService.CreatePurchaseOrderFromRequisitionWithStatus(
			ctx, requisition, targetStatus,
		)
		if err != nil {
			log.Printf("Warning: auto-PO generation failed: %v", err)
		} else if poResult != nil && poResult.Success {
			result.AutoCreatedPO = poResult
			result.AutoCreatedPOID = poResult.DocumentID

			autoCreatedPO := map[string]interface{}{
				"id":      poResult.DocumentID,
				"created": true,
			}
			if po, ok := poResult.CreatedDocument.(models.PurchaseOrder); ok {
				autoCreatedPO["documentNumber"] = po.DocumentNumber
				autoCreatedPO["amount"] = po.TotalAmount
			}
			autoCreatedJSON, _ := json.Marshal(autoCreatedPO)
			if _, err := config.PgxDB.Exec(ctx,
				`UPDATE requisitions SET automation_used = true, auto_created_po = $1, updated_at = NOW() WHERE id = $2`,
				autoCreatedJSON, entityID,
			); err != nil {
				log.Printf("Warning: failed to update requisition with auto-created PO: %v", err)
			}
		}
	}

	if s.notificationService != nil {
		event := NotificationEvent{
			Type:           "document_auto_approved",
			DocumentID:     entityID,
			DocumentType:   "requisition",
			OrganizationID: organizationID,
			Action:         "auto_approved",
			ActorID:        "system",
			Details:        "Requisition auto-approved via accounting workflow",
			Timestamp:      now,
		}
		go func(e NotificationEvent) {
			notifyCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			select {
			case <-notifyCtx.Done():
				return
			default:
				s.notificationService.HandleWorkflowEvent(e)
			}
		}(event)
	}

	return result, nil
}

func (s *WorkflowExecutionService) assignWorkflow(
	ctx context.Context,
	organizationID, entityID, entityType, userID string,
	workflow *models.Workflow,
) (*models.WorkflowAssignment, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_execution: pgx pool not initialized")
	}

	stages, err := workflow.GetStages()
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: get workflow stages: %w", err)
	}

	if len(stages) == 0 {
		return nil, fmt.Errorf("workflow has no stages")
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)
	q := config.Queries.WithTx(tx)

	assignmentID := uuid.New().String()
	currentStage := int32(1)
	inProgress := "IN_PROGRESS"

	asgnRow, err := q.CreateAssignment(ctx, sqlc.CreateAssignmentParams{
		ID:              assignmentID,
		OrganizationID:  organizationID,
		EntityID:        entityID,
		EntityType:      entityType,
		WorkflowID:      pgtype.UUID{Bytes: workflow.ID, Valid: true},
		WorkflowVersion: int32(workflow.Version),
		CurrentStage:    &currentStage,
		Status:          &inProgress,
		StageHistory:    []byte("[]"),
		AssignedBy:      userID,
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: create workflow assignment: %w", err)
	}

	firstStage := stages[0]
	priority := getDocumentPriorityTx(ctx, tx, entityID, entityType)
	dueDate := computeTaskDueDate(ctx, tx, firstStage.TimeoutHours, entityID, entityType)

	taskID := uuid.New().String()
	pendingStatus := "PENDING"
	assignmentType := "role"
	assignedRole := firstStage.RequiredRole

	if _, err := q.CreateTask(ctx, sqlc.CreateTaskParams{
		ID:                   taskID,
		OrganizationID:       organizationID,
		WorkflowAssignmentID: assignmentID,
		EntityID:             entityID,
		EntityType:           entityType,
		StageNumber:          int32(firstStage.StageNumber),
		StageName:            firstStage.StageName,
		AssignmentType:       &assignmentType,
		AssignedRole:         &assignedRole,
		AssignedUserID:       nil,
		Status:               &pendingStatus,
		Priority:             &priority,
		DueDate:              timeToPgTimestamptz(dueDate),
		UpdatedBy:            &userID,
	}); err != nil {
		return nil, fmt.Errorf("workflow_execution: create workflow task: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("workflow_execution: commit workflow assignment: %w", err)
	}

	assignment := assignmentRowToModel(asgnRow)

	if s.notificationService != nil {
		notificationEvent := NotificationEvent{
			Type:           "approval_required",
			DocumentID:     entityID,
			DocumentType:   entityType,
			OrganizationID: organizationID,
			Action:         "workflow_assigned",
			ActorID:        userID,
			Details:        fmt.Sprintf("Workflow assigned for %s approval", entityType),
			Timestamp:      time.Now(),
		}
		go func(event NotificationEvent) {
			notifyCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			select {
			case <-notifyCtx.Done():
				log.Printf("Notification timed out for %s", event.DocumentID)
				return
			default:
				if err := s.notificationService.HandleWorkflowEvent(event); err != nil {
					log.Printf("Failed to send approval required notification: %v", err)
				}
			}
		}(notificationEvent)
	}

	return assignment, nil
}

// GetWorkflowAssignment retrieves the most recent workflow assignment for an entity.
//
// Note: callers may rely on assignment.Workflow being populated (preloaded
// in the previous GORM implementation). We mimic this by issuing a follow-up
// GetWorkflowByID after the assignment lookup.
func (s *WorkflowExecutionService) GetWorkflowAssignment(ctx context.Context, organizationID, entityID string) (*models.WorkflowAssignment, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_execution: pgx pool not initialized")
	}

	// Look up the most recent assignment for any entity_type matching this entityID
	// in the org. The original GORM query did not filter on entity_type, so we
	// match that behaviour here with a raw query.
	var (
		row sqlc.WorkflowAssignment
	)
	err := config.PgxDB.QueryRow(ctx, `
		SELECT id, organization_id, entity_id, entity_type, workflow_id, workflow_version,
		       current_stage, status, stage_history, assigned_at, assigned_by, completed_at,
		       created_at, updated_at
		FROM workflow_assignments
		WHERE organization_id = $1 AND entity_id = $2
		ORDER BY created_at DESC
		LIMIT 1`,
		organizationID, entityID,
	).Scan(
		&row.ID, &row.OrganizationID, &row.EntityID, &row.EntityType, &row.WorkflowID,
		&row.WorkflowVersion, &row.CurrentStage, &row.Status, &row.StageHistory,
		&row.AssignedAt, &row.AssignedBy, &row.CompletedAt, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No workflow assigned
		}
		return nil, fmt.Errorf("workflow_execution: get workflow assignment: %w", err)
	}

	assignment := assignmentRowToModel(row)

	// Preload Workflow (was Preload("Workflow") in the GORM version).
	if row.WorkflowID.Valid {
		wf, err := s.workflowService.GetWorkflow(ctx, uuid.UUID(row.WorkflowID.Bytes), organizationID)
		if err == nil {
			assignment.Workflow = wf
		}
	}

	return assignment, nil
}

// GetPendingWorkflowTasks retrieves pending workflow tasks for an entity.
func (s *WorkflowExecutionService) GetPendingWorkflowTasks(ctx context.Context, organizationID, entityID string) ([]models.WorkflowTask, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_execution: pgx pool not initialized")
	}

	rows, err := config.PgxDB.Query(ctx, `
		SELECT id, organization_id, workflow_assignment_id, entity_id, entity_type,
		       stage_number, stage_name, assignment_type, assigned_role, assigned_user_id,
		       status, priority, claimed_at, claimed_by, claim_expiry, completed_at,
		       due_date, version, updated_by, created_at, updated_at
		FROM workflow_tasks
		WHERE organization_id = $1 AND entity_id = $2 AND UPPER(status) = 'PENDING'
		ORDER BY stage_number ASC`,
		organizationID, entityID,
	)
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: get pending workflow tasks: %w", err)
	}
	defer rows.Close()

	var tasks []models.WorkflowTask
	for rows.Next() {
		var t sqlc.WorkflowTask
		if err := rows.Scan(
			&t.ID, &t.OrganizationID, &t.WorkflowAssignmentID, &t.EntityID, &t.EntityType,
			&t.StageNumber, &t.StageName, &t.AssignmentType, &t.AssignedRole, &t.AssignedUserID,
			&t.Status, &t.Priority, &t.ClaimedAt, &t.ClaimedBy, &t.ClaimExpiry, &t.CompletedAt,
			&t.DueDate, &t.Version, &t.UpdatedBy, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("workflow_execution: scan task: %w", err)
		}
		tasks = append(tasks, *taskRowToModel(t))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("workflow_execution: iterate tasks: %w", err)
	}
	return tasks, nil
}

// canUserActOnTask checks whether the given user is authorised to act on a workflow task.
//
// Runs against the supplied pgx transaction so that authorisation reads see
// the same state as subsequent writes inside the same tx.
func (s *WorkflowExecutionService) canUserActOnTask(ctx context.Context, tx pgx.Tx, task *models.WorkflowTask, user *models.User) error {
	approverRoles := []string{"admin", "approver", "finance", "manager", "supervisor", "department_head"}
	approvalPermissions := []string{
		"requisition.approve", "approval.approve", "budget.approve",
		"purchase_order.approve", "payment_voucher.approve", "grn.approve",
	}

	// PRIORITY 1: specific user assignment
	if task.AssignedUserID != nil && *task.AssignedUserID != "" {
		if *task.AssignedUserID != user.ID {
			return fmt.Errorf("insufficient permissions: this task has been assigned to a specific user and only they can act on it")
		}
		return nil
	}

	// PRIORITY 2: role-based assignment
	if task.AssignedRole == nil || *task.AssignedRole == "" {
		for _, r := range approverRoles {
			if strings.EqualFold(user.Role, r) {
				return nil
			}
		}
		return fmt.Errorf("insufficient permissions: no approver role")
	}

	assignedRole := *task.AssignedRole
	hasPermission := false

	if parsed, parseErr := uuid.Parse(assignedRole); parseErr == nil {
		// It's a UUID — resolve the org role record.
		var (
			roleName     string
			isSystemRole bool
		)
		err := tx.QueryRow(ctx,
			`SELECT name, COALESCE(is_system_role, false) FROM organization_roles WHERE id = $1`,
			parsed,
		).Scan(&roleName, &isSystemRole)
		if err == nil {
			if isSystemRole {
				hasPermission = strings.EqualFold(user.Role, roleName)
			} else {
				// Custom org role UUID: check user_organization_roles membership.
				var n int
				err := tx.QueryRow(ctx,
					`SELECT 1 FROM user_organization_roles
					 WHERE user_id = $1 AND organization_id = $2 AND role_id = $3 AND active = true LIMIT 1`,
					user.ID, task.OrganizationID, parsed,
				).Scan(&n)
				hasPermission = err == nil
			}
		}
		if !hasPermission {
			for _, r := range approverRoles {
				if strings.EqualFold(user.Role, r) {
					hasPermission = true
					break
				}
			}
		}
	} else {
		// Plain role name
		hasPermission = strings.EqualFold(user.Role, assignedRole)
		if !hasPermission {
			for _, r := range approverRoles {
				if strings.EqualFold(user.Role, r) {
					hasPermission = true
					break
				}
			}
		}
	}

	// Final fallback: custom org role with any approval permission
	if !hasPermission {
		rows, err := tx.Query(ctx, `
			SELECT org_roles.permissions
			FROM user_organization_roles uor
			INNER JOIN organization_roles org_roles ON org_roles.id = uor.role_id
			WHERE uor.user_id = $1 AND uor.organization_id = $2 AND uor.active = true
			  AND COALESCE(org_roles.active, true) = true`,
			user.ID, task.OrganizationID,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var permsRaw []byte
				if err := rows.Scan(&permsRaw); err != nil {
					continue
				}
				var perms []string
				if json.Unmarshal(permsRaw, &perms) != nil {
					continue
				}
				for _, p := range perms {
					for _, ap := range approvalPermissions {
						if strings.EqualFold(p, ap) {
							hasPermission = true
							break
						}
					}
					if hasPermission {
						break
					}
				}
				if hasPermission {
					break
				}
			}
		}
	}

	if !hasPermission {
		return fmt.Errorf("insufficient permissions: user does not have the required role '%s'", assignedRole)
	}
	return nil
}

func (s *WorkflowExecutionService) ApproveWorkflowTask(ctx context.Context, taskID, userID, signature, comments string) error {
	return s.ApproveWorkflowTaskWithVersion(ctx, taskID, userID, signature, comments, 0)
}

// ApproveWorkflowTaskWithVersion approves a workflow task with version control for optimistic locking.
func (s *WorkflowExecutionService) ApproveWorkflowTaskWithVersion(ctx context.Context, taskID, userID, signature, comments string, expectedVersion int) error {
	if config.PgxDB == nil {
		return errors.New("workflow_execution: pgx pool not initialized")
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("workflow_execution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	task, err := readTaskTx(ctx, tx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	// Check optimistic locking if version is provided
	if expectedVersion > 0 && task.Version != expectedVersion {
		return fmt.Errorf("task was modified by another user (expected version %d, current version %d). Please refresh and try again", expectedVersion, task.Version)
	}

	// Check task status
	if strings.ToUpper(task.Status) != "PENDING" && strings.ToUpper(task.Status) != "CLAIMED" {
		return fmt.Errorf("task is not in pending or claimed status (current: %s)", task.Status)
	}

	// Check task is claimed by this user (if claiming is enabled)
	if task.ClaimedBy != nil && *task.ClaimedBy != userID {
		return fmt.Errorf("task is claimed by another user, please wait for them to complete or unclaim it")
	}

	// Check claim hasn't expired
	if task.ClaimExpiry != nil && time.Now().After(*task.ClaimExpiry) {
		return fmt.Errorf("task claim has expired, please reclaim the task")
	}

	user, err := readUserTx(ctx, tx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	log.Printf("[DEBUG] Checking approval permission - User: %s, UserRole: %s, AssignedRole: %v",
		userID, user.Role, task.AssignedRole)

	if err := s.canUserActOnTask(ctx, tx, task, user); err != nil {
		return err
	}

	assignment, err := readAssignmentTx(ctx, tx, task.WorkflowAssignmentID)
	if err != nil {
		return fmt.Errorf("workflow assignment not found: %w", err)
	}

	// Load the workflow definition (in this tx) to walk the stages list.
	workflow, err := readWorkflowTx(ctx, tx, assignment.WorkflowID, assignment.OrganizationID)
	if err != nil {
		return fmt.Errorf("workflow_execution: load workflow: %w", err)
	}
	stages, err := workflow.GetStages()
	if err != nil {
		return fmt.Errorf("workflow_execution: get workflow stages: %w", err)
	}
	if task.StageNumber < 1 || task.StageNumber > len(stages) {
		return fmt.Errorf("workflow_execution: invalid stage number %d", task.StageNumber)
	}
	currentStage := stages[task.StageNumber-1]

	// Record this approval in stage_approval_records.
	now := time.Now()
	if err := createApprovalRecordTx(ctx, tx, &models.StageApprovalRecord{
		ID:             uuid.New().String(),
		OrganizationID: assignment.OrganizationID,
		WorkflowTaskID: taskID,
		StageNumber:    task.StageNumber,
		ApproverID:     userID,
		ApproverName:   user.Name,
		ApproverRole:   user.Role,
		ManNumber:      user.ManNumber,
		Position:       user.Position,
		Action:         "approved",
		Comments:       comments,
		Signature:      signature,
		ApprovedAt:     now,
		CreatedAt:      now,
	}); err != nil {
		return fmt.Errorf("workflow_execution: record approval: %w", err)
	}

	go LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: assignment.OrganizationID,
		DocumentID:     assignment.EntityID,
		DocumentType:   strings.ToLower(assignment.EntityType),
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "approved",
		Details:        map[string]interface{}{"stageNumber": task.StageNumber, "stageName": task.StageName},
	})

	stageComplete, err := s.checkStageCompletionCriteria(ctx, tx, taskID, currentStage, assignment.OrganizationID)
	if err != nil {
		return fmt.Errorf("workflow_execution: check stage completion: %w", err)
	}

	if stageComplete {
		// Update task: completed + version increment with optimistic-lock guard.
		tag, err := tx.Exec(ctx, `
			UPDATE workflow_tasks
			SET status       = 'COMPLETED',
			    completed_at = $2,
			    updated_by   = $3,
			    version      = version + 1,
			    updated_at   = NOW()
			WHERE id = $1 AND version = $4`,
			taskID, now, userID, task.Version,
		)
		if err != nil {
			return fmt.Errorf("workflow_execution: update task: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("task was modified by another user, please refresh and try again")
		}

		// Add stage execution to history.
		stageExecution := models.StageExecution{
			StageNumber:  task.StageNumber,
			StageName:    task.StageName,
			ApproverID:   userID,
			ApproverName: user.Name,
			ApproverRole: user.Role,
			Action:       "approved",
			Comments:     comments,
			Signature:    signature,
			ExecutedAt:   now,
		}
		if err := assignment.AddStageExecution(stageExecution); err != nil {
			return fmt.Errorf("workflow_execution: update stage history: %w", err)
		}

		actionMessage := fmt.Sprintf("Stage %d (%s) approved by %s", task.StageNumber, task.StageName, user.Name)
		if err := addActionHistoryEntryTx(ctx, tx, assignment.EntityType, assignment.EntityID, userID, "STAGE_APPROVED", actionMessage); err != nil {
			log.Printf("Warning: failed to add action history entry for stage approval: %v", err)
		}

		workflowCompleted := task.StageNumber >= len(stages)

		if workflowCompleted {
			assignment.Status = "COMPLETED"
			assignment.CompletedAt = &now
			assignment.CurrentStage = len(stages)

			if err := updateDocumentStatusTx(ctx, tx, assignment.EntityType, assignment.EntityID, "APPROVED"); err != nil {
				return fmt.Errorf("workflow_execution: update document status: %w", err)
			}

			if err := addActionHistoryEntryTx(ctx, tx, assignment.EntityType, assignment.EntityID, userID, "WORKFLOW_COMPLETED", "Document approved through workflow system"); err != nil {
				log.Printf("Warning: failed to add action history entry: %v", err)
			}
		} else {
			nextStageNumber := task.StageNumber + 1
			nextStage := stages[nextStageNumber-1]

			assignment.CurrentStage = nextStageNumber

			nextTaskPriority := getDocumentPriorityTx(ctx, tx, assignment.EntityID, assignment.EntityType)
			nextDueDate := computeTaskDueDate(ctx, tx, nextStage.TimeoutHours, assignment.EntityID, assignment.EntityType)

			nextTaskID := uuid.New().String()
			pendingStatus := "PENDING"
			assignmentType := "role"
			roleStr := nextStage.RequiredRole
			q := config.Queries.WithTx(tx)
			if _, err := q.CreateTask(ctx, sqlc.CreateTaskParams{
				ID:                   nextTaskID,
				OrganizationID:       assignment.OrganizationID,
				WorkflowAssignmentID: assignment.ID,
				EntityID:             assignment.EntityID,
				EntityType:           assignment.EntityType,
				StageNumber:          int32(nextStage.StageNumber),
				StageName:            nextStage.StageName,
				AssignmentType:       &assignmentType,
				AssignedRole:         &roleStr,
				Status:               &pendingStatus,
				Priority:             &nextTaskPriority,
				DueDate:              timeToPgTimestamptz(nextDueDate),
				UpdatedBy:            &userID,
			}); err != nil {
				return fmt.Errorf("workflow_execution: create next workflow task: %w", err)
			}
		}

		if err := saveAssignmentTx(ctx, tx, assignment); err != nil {
			return fmt.Errorf("workflow_execution: update workflow assignment: %w", err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("workflow_execution: commit workflow approval: %w", err)
		}

		if workflowCompleted {
			s.handleWorkflowCompletion(ctx, *assignment, userID)
		} else {
			s.handleStageProgression(ctx, *assignment, userID)
		}
	} else {
		// Stage not complete yet — partially_approved.
		tag, err := tx.Exec(ctx, `
			UPDATE workflow_tasks
			SET status     = 'partially_approved',
			    updated_by = $2,
			    version    = version + 1,
			    updated_at = NOW()
			WHERE id = $1 AND version = $3`,
			taskID, userID, task.Version,
		)
		if err != nil {
			return fmt.Errorf("workflow_execution: update task status: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("task was modified by another user, please refresh and try again")
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("workflow_execution: commit partial approval: %w", err)
		}

		s.handlePartialApproval(ctx, *assignment, userID, currentStage)
	}

	return nil
}

// Helper methods for handling workflow events
func (s *WorkflowExecutionService) handleWorkflowCompletion(ctx context.Context, assignment models.WorkflowAssignment, userID string) {
	if s.notificationService != nil {
		notificationEvent := NotificationEvent{
			Type:           "document_approved",
			DocumentID:     assignment.EntityID,
			DocumentType:   assignment.EntityType,
			OrganizationID: assignment.OrganizationID,
			Action:         "workflow_completed",
			ActorID:        userID,
			Details:        "Document has been fully approved through workflow",
			Timestamp:      time.Now(),
		}
		go func(event NotificationEvent) {
			notifyCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			select {
			case <-notifyCtx.Done():
				return
			default:
				if err := s.notificationService.HandleWorkflowEvent(event); err != nil {
					log.Printf("Failed to send approval notification: %v", err)
				}
			}
		}(notificationEvent)
	}

	if err := s.triggerPostApprovalAutomation(ctx, assignment.EntityType, assignment.EntityID); err != nil {
		log.Printf("Post-approval automation failed for %s %s: %v", assignment.EntityType, assignment.EntityID, err)
	}
}

func (s *WorkflowExecutionService) handleStageProgression(ctx context.Context, assignment models.WorkflowAssignment, userID string) {
	if s.notificationService != nil {
		notificationEvent := NotificationEvent{
			Type:           "approval_required",
			DocumentID:     assignment.EntityID,
			DocumentType:   assignment.EntityType,
			OrganizationID: assignment.OrganizationID,
			Action:         "next_stage_approval",
			ActorID:        userID,
			Details:        fmt.Sprintf("Document moved to next approval stage (%d)", assignment.CurrentStage),
			Timestamp:      time.Now(),
		}
		go func(event NotificationEvent) {
			notifyCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			select {
			case <-notifyCtx.Done():
				return
			default:
				if err := s.notificationService.HandleWorkflowEvent(event); err != nil {
					log.Printf("Failed to send next stage approval notification: %v", err)
				}
			}
		}(notificationEvent)
	}
}

func (s *WorkflowExecutionService) handlePartialApproval(ctx context.Context, assignment models.WorkflowAssignment, userID string, stage models.WorkflowStage) {
	if s.notificationService != nil {
		notificationEvent := NotificationEvent{
			Type:           "partial_approval",
			DocumentID:     assignment.EntityID,
			DocumentType:   assignment.EntityType,
			OrganizationID: assignment.OrganizationID,
			Action:         "partial_stage_approval",
			ActorID:        userID,
			Details:        fmt.Sprintf("Partial approval received for stage %d (%s)", stage.StageNumber, stage.StageName),
			Timestamp:      time.Now(),
		}
		go func(event NotificationEvent) {
			notifyCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			select {
			case <-notifyCtx.Done():
				return
			default:
				if err := s.notificationService.HandleWorkflowEvent(event); err != nil {
					log.Printf("Failed to send partial approval notification: %v", err)
				}
			}
		}(notificationEvent)
	}
}

// RejectWorkflowTask rejects a workflow task and marks the workflow as rejected
func (s *WorkflowExecutionService) RejectWorkflowTask(ctx context.Context, taskID, userID, signature, reason, rejectionType string, returnToStage int) error {
	return s.RejectWorkflowTaskWithVersion(ctx, taskID, userID, signature, reason, 0, rejectionType, returnToStage)
}

// RejectWorkflowTaskWithVersion rejects a workflow task with version control for optimistic locking
func (s *WorkflowExecutionService) RejectWorkflowTaskWithVersion(ctx context.Context, taskID, userID, signature, reason string, expectedVersion int, rejectionType string, returnToStage int) error {
	if config.PgxDB == nil {
		return errors.New("workflow_execution: pgx pool not initialized")
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("workflow_execution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	task, err := readTaskTx(ctx, tx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	if expectedVersion > 0 && task.Version != expectedVersion {
		return fmt.Errorf("task was modified by another user (expected version %d, current version %d). Please refresh and try again", expectedVersion, task.Version)
	}

	if strings.ToUpper(task.Status) != "PENDING" && strings.ToUpper(task.Status) != "CLAIMED" {
		return fmt.Errorf("task is not in pending or claimed status (current: %s)", task.Status)
	}

	if task.ClaimedBy != nil && *task.ClaimedBy != userID {
		return fmt.Errorf("task is claimed by another user, please wait for them to complete or unclaim it")
	}

	if task.ClaimExpiry != nil && time.Now().After(*task.ClaimExpiry) {
		return fmt.Errorf("task claim has expired, please reclaim the task")
	}

	user, err := readUserTx(ctx, tx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	log.Printf("[DEBUG] Checking rejection permission - User: %s, UserRole: %s, AssignedRole: %v",
		userID, user.Role, task.AssignedRole)

	if err := s.canUserActOnTask(ctx, tx, task, user); err != nil {
		return err
	}

	assignment, err := readAssignmentTx(ctx, tx, task.WorkflowAssignmentID)
	if err != nil {
		return fmt.Errorf("workflow assignment not found: %w", err)
	}

	// Update task with version increment.
	now := time.Now()
	tag, err := tx.Exec(ctx, `
		UPDATE workflow_tasks
		SET status       = 'COMPLETED',
		    completed_at = $2,
		    updated_by   = $3,
		    version      = version + 1,
		    updated_at   = NOW()
		WHERE id = $1 AND version = $4`,
		taskID, now, userID, task.Version,
	)
	if err != nil {
		return fmt.Errorf("workflow_execution: update task: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("task was modified by another user, please refresh and try again")
	}

	isReturnToDraft := rejectionType == "return_to_draft"
	isReturnToPrevStage := rejectionType == "return_to_previous_stage"
	actionLabel := "rejected"
	if isReturnToDraft {
		actionLabel = "returned_to_draft"
	} else if isReturnToPrevStage {
		actionLabel = "returned_for_revision"
	}

	if err := createApprovalRecordTx(ctx, tx, &models.StageApprovalRecord{
		ID:             uuid.New().String(),
		OrganizationID: assignment.OrganizationID,
		WorkflowTaskID: taskID,
		StageNumber:    task.StageNumber,
		ApproverID:     userID,
		ApproverName:   user.Name,
		ApproverRole:   user.Role,
		ManNumber:      user.ManNumber,
		Position:       user.Position,
		Action:         actionLabel,
		Comments:       reason,
		Signature:      signature,
		ApprovedAt:     now,
		CreatedAt:      now,
	}); err != nil {
		return fmt.Errorf("workflow_execution: record rejection: %w", err)
	}

	go LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: assignment.OrganizationID,
		DocumentID:     assignment.EntityID,
		DocumentType:   strings.ToLower(assignment.EntityType),
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         actionLabel,
		Details:        map[string]interface{}{"stageNumber": task.StageNumber, "stageName": task.StageName, "reason": reason},
	})

	stageExecution := models.StageExecution{
		StageNumber:  task.StageNumber,
		StageName:    task.StageName,
		ApproverID:   userID,
		ApproverName: user.Name,
		ApproverRole: user.Role,
		Action:       actionLabel,
		Comments:     reason,
		Signature:    signature,
		ExecutedAt:   now,
	}
	if err := assignment.AddStageExecution(stageExecution); err != nil {
		return fmt.Errorf("workflow_execution: update stage history: %w", err)
	}

	notificationType := "document_rejected"
	notificationAction := "workflow_rejected"

	if isReturnToPrevStage && task.StageNumber <= 1 {
		return fmt.Errorf("cannot return to previous stage: task is already at stage 1")
	}

	if isReturnToPrevStage {
		prevStageNumber := task.StageNumber - 1

		workflow, err := readWorkflowTx(ctx, tx, assignment.WorkflowID, assignment.OrganizationID)
		if err != nil {
			return fmt.Errorf("workflow not found: %w", err)
		}
		stages, err := workflow.GetStages()
		if err != nil || prevStageNumber < 1 || prevStageNumber > len(stages) {
			return fmt.Errorf("failed to get previous stage definition")
		}
		prevStage := stages[prevStageNumber-1]

		assignment.CurrentStage = prevStageNumber
		assignment.Status = "IN_PROGRESS"
		assignment.UpdatedAt = time.Now()

		if err := updateDocumentStatusTx(ctx, tx, assignment.EntityType, assignment.EntityID, "REVISION"); err != nil {
			return fmt.Errorf("workflow_execution: update document status: %w", err)
		}

		nextTaskPriority := getDocumentPriorityTx(ctx, tx, assignment.EntityID, assignment.EntityType)
		prevDueDate := computeTaskDueDate(ctx, tx, prevStage.TimeoutHours, assignment.EntityID, assignment.EntityType)

		pendingStatus := "PENDING"
		assignmentType := "role"
		roleStr := prevStage.RequiredRole
		q := config.Queries.WithTx(tx)
		if _, err := q.CreateTask(ctx, sqlc.CreateTaskParams{
			ID:                   uuid.New().String(),
			OrganizationID:       assignment.OrganizationID,
			WorkflowAssignmentID: assignment.ID,
			EntityID:             assignment.EntityID,
			EntityType:           assignment.EntityType,
			StageNumber:          int32(prevStage.StageNumber),
			StageName:            prevStage.StageName,
			AssignmentType:       &assignmentType,
			AssignedRole:         &roleStr,
			Status:               &pendingStatus,
			Priority:             &nextTaskPriority,
			DueDate:              timeToPgTimestamptz(prevDueDate),
			UpdatedBy:            &userID,
		}); err != nil {
			return fmt.Errorf("workflow_execution: create task for previous stage: %w", err)
		}

		actionMessage := fmt.Sprintf("Returned to %s (Stage %d) for revision by %s: %s", prevStage.StageName, prevStageNumber, user.Name, reason)
		if err := addActionHistoryEntryTx(ctx, tx, assignment.EntityType, assignment.EntityID, userID, "RETURNED_FOR_REVISION", actionMessage); err != nil {
			log.Printf("Warning: failed to add action history entry: %v", err)
		}

		log.Printf("[Workflow] Task %s returned to stage %d (%s) by user %s: %s", taskID, prevStageNumber, prevStage.StageName, userID, reason)
		notificationType = "document_returned_for_revision"
		notificationAction = "workflow_returned_for_revision"
	} else if isReturnToDraft {
		assignment.Status = "RETURNED"
		assignment.CompletedAt = &now
		assignment.UpdatedAt = time.Now()

		if err := updateDocumentStatusTx(ctx, tx, assignment.EntityType, assignment.EntityID, "DRAFT"); err != nil {
			return fmt.Errorf("workflow_execution: update document status: %w", err)
		}

		actionMessage := fmt.Sprintf("Returned to draft by %s: %s", user.Name, reason)
		if err := addActionHistoryEntryTx(ctx, tx, assignment.EntityType, assignment.EntityID, userID, "RETURNED_TO_DRAFT", actionMessage); err != nil {
			log.Printf("Warning: failed to add action history entry: %v", err)
		}

		log.Printf("[Workflow] Task %s returned to draft by user %s: %s", taskID, userID, reason)
		notificationType = "document_returned_to_draft"
		notificationAction = "workflow_returned_to_draft"
	} else {
		// FULL REJECTION
		assignment.Status = "REJECTED"
		assignment.CompletedAt = &now
		assignment.UpdatedAt = time.Now()

		switch {
		case strings.EqualFold(assignment.EntityType, "purchase_order"):
			// PO: revert to DRAFT (not permanently rejected); linked REQ also reverts.
			po, err := loadPurchaseOrderTx(ctx, tx, assignment.EntityID)
			if err != nil {
				return fmt.Errorf("workflow_execution: load purchase order: %w", err)
			}
			prevStatus := po.Status
			if err := updateDocumentStatusTx(ctx, tx, "purchase_order", assignment.EntityID, "DRAFT"); err != nil {
				return fmt.Errorf("workflow_execution: update document status: %w", err)
			}
			if err := addActionHistoryEntryWithMetaTx(ctx, tx, "purchase_order", assignment.EntityID, userID,
				"WORKFLOW_REJECTED_REVERTED_TO_DRAFT", reason,
				prevStatus, "DRAFT",
				map[string]interface{}{"approvalStage": map[string]interface{}{"from": task.StageNumber, "to": 0}},
			); err != nil {
				log.Printf("Warning: failed to add PO action history entry: %v", err)
			}

			if po.SourceRequisitionId != nil {
				reqID := *po.SourceRequisitionId
				req, err := loadRequisitionTx(ctx, tx, reqID)
				if err == nil {
					prevReqStatus := req.Status
					if err := updateDocumentStatusTx(ctx, tx, "requisition", reqID, "DRAFT"); err != nil {
						return fmt.Errorf("workflow_execution: revert linked requisition: %w", err)
					}
					_, _ = tx.Exec(ctx,
						`UPDATE workflow_assignments
						 SET status = 'RETURNED', completed_at = $1, updated_at = NOW()
						 WHERE entity_id = $2 AND UPPER(status) = 'IN_PROGRESS'`,
						now, reqID)
					_, _ = tx.Exec(ctx,
						`UPDATE workflow_tasks
						 SET status = 'CANCELLED', updated_at = NOW()
						 WHERE entity_id = $1 AND UPPER(status) IN ('PENDING', 'CLAIMED')`,
						reqID)
					if err := addActionHistoryEntryWithMetaTx(ctx, tx, "requisition", reqID, userID,
						"REVERTED_TO_DRAFT_BY_PO_REJECTION",
						fmt.Sprintf("Linked PO %s was rejected. Requisition returned to DRAFT for revision.", po.DocumentNumber),
						prevReqStatus, "DRAFT",
						map[string]interface{}{"triggeredBy": map[string]interface{}{"type": "purchase_order", "id": po.ID, "documentNumber": po.DocumentNumber}},
					); err != nil {
						log.Printf("Warning: failed to add REQ action history entry: %v", err)
					}
				}
			}
		case strings.EqualFold(assignment.EntityType, "payment_voucher"):
			pv, err := loadPaymentVoucherTx(ctx, tx, assignment.EntityID)
			if err != nil {
				return fmt.Errorf("workflow_execution: load payment voucher: %w", err)
			}
			prevStatus := pv.Status
			if err := updateDocumentStatusTx(ctx, tx, "payment_voucher", assignment.EntityID, "DRAFT"); err != nil {
				return fmt.Errorf("workflow_execution: update document status: %w", err)
			}
			if err := addActionHistoryEntryWithMetaTx(ctx, tx, "payment_voucher", assignment.EntityID, userID,
				"WORKFLOW_REJECTED_REVERTED_TO_DRAFT", reason,
				prevStatus, "DRAFT",
				map[string]interface{}{"approvalStage": map[string]interface{}{"from": task.StageNumber, "to": 0}},
			); err != nil {
				log.Printf("Warning: failed to add PV action history entry: %v", err)
			}

			if pv.LinkedGRN != "" {
				grn, err := loadGRNByDocumentNumberTx(ctx, tx, pv.LinkedGRN, assignment.OrganizationID)
				if err == nil {
					prevGRNStatus := grn.Status
					if err := updateDocumentStatusTx(ctx, tx, "grn", grn.ID, "DRAFT"); err != nil {
						return fmt.Errorf("workflow_execution: revert linked GRN: %w", err)
					}
					_, _ = tx.Exec(ctx,
						`UPDATE workflow_assignments
						 SET status = 'RETURNED', completed_at = $1, updated_at = NOW()
						 WHERE entity_id = $2 AND UPPER(status) = 'IN_PROGRESS'`,
						now, grn.ID)
					_, _ = tx.Exec(ctx,
						`UPDATE workflow_tasks
						 SET status = 'CANCELLED', updated_at = NOW()
						 WHERE entity_id = $1 AND UPPER(status) IN ('PENDING', 'CLAIMED')`,
						grn.ID)
					if err := addActionHistoryEntryWithMetaTx(ctx, tx, "grn", grn.ID, userID,
						"REVERTED_TO_DRAFT_BY_PV_REJECTION",
						fmt.Sprintf("Linked PV %s was rejected. GRN returned to DRAFT for correction.", pv.DocumentNumber),
						prevGRNStatus, "DRAFT",
						map[string]interface{}{"triggeredBy": map[string]interface{}{"type": "payment_voucher", "id": pv.ID, "documentNumber": pv.DocumentNumber}},
					); err != nil {
						log.Printf("Warning: failed to add GRN action history entry: %v", err)
					}
				}
			}
		case strings.EqualFold(assignment.EntityType, "grn"):
			grn, err := loadGRNTx(ctx, tx, assignment.EntityID)
			if err != nil {
				return fmt.Errorf("workflow_execution: load GRN: %w", err)
			}
			prevStatus := grn.Status
			if err := updateDocumentStatusTx(ctx, tx, "grn", assignment.EntityID, "DRAFT"); err != nil {
				return fmt.Errorf("workflow_execution: update GRN status: %w", err)
			}
			if err := addActionHistoryEntryWithMetaTx(ctx, tx, "grn", assignment.EntityID, userID,
				"WORKFLOW_REJECTED_REVERTED_TO_DRAFT", reason,
				prevStatus, "DRAFT",
				map[string]interface{}{"approvalStage": map[string]interface{}{"from": task.StageNumber, "to": 0}},
			); err != nil {
				log.Printf("Warning: failed to add GRN action history entry: %v", err)
			}
		case strings.EqualFold(assignment.EntityType, "requisition"):
			req, err := loadRequisitionTx(ctx, tx, assignment.EntityID)
			if err != nil {
				return fmt.Errorf("workflow_execution: load requisition: %w", err)
			}
			prevStatus := req.Status
			if err := updateDocumentStatusTx(ctx, tx, "requisition", assignment.EntityID, "DRAFT"); err != nil {
				return fmt.Errorf("workflow_execution: update requisition status: %w", err)
			}
			if err := addActionHistoryEntryWithMetaTx(ctx, tx, "requisition", assignment.EntityID, userID,
				"WORKFLOW_REJECTED_REVERTED_TO_DRAFT", reason,
				prevStatus, "DRAFT",
				map[string]interface{}{"approvalStage": map[string]interface{}{"from": task.StageNumber, "to": 0}},
			); err != nil {
				log.Printf("Warning: failed to add REQ action history entry: %v", err)
			}
		default:
			if err := updateDocumentStatusTx(ctx, tx, assignment.EntityType, assignment.EntityID, "REJECTED"); err != nil {
				return fmt.Errorf("workflow_execution: update document status: %w", err)
			}
			if err := addActionHistoryEntryTx(ctx, tx, assignment.EntityType, assignment.EntityID, userID, "WORKFLOW_REJECTED", reason); err != nil {
				log.Printf("Warning: failed to add action history entry: %v", err)
			}
		}
	}

	if err := saveAssignmentTx(ctx, tx, assignment); err != nil {
		return fmt.Errorf("workflow_execution: update workflow assignment: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("workflow_execution: commit workflow rejection: %w", err)
	}

	if s.notificationService != nil {
		notificationEvent := NotificationEvent{
			Type:           notificationType,
			DocumentID:     assignment.EntityID,
			DocumentType:   assignment.EntityType,
			OrganizationID: assignment.OrganizationID,
			Action:         notificationAction,
			ActorID:        userID,
			Details:        reason,
			Timestamp:      time.Now(),
		}
		go func(event NotificationEvent) {
			notifyCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			select {
			case <-notifyCtx.Done():
				return
			default:
				if err := s.notificationService.HandleWorkflowEvent(event); err != nil {
					log.Printf("Failed to send rejection notification: %v", err)
				}
			}
		}(notificationEvent)
	}

	return nil
}

// GetWorkflowStatus returns the current workflow status for an entity
func (s *WorkflowExecutionService) GetWorkflowStatus(ctx context.Context, organizationID, entityID string) (*WorkflowStatusResponse, error) {
	assignment, err := s.GetWorkflowAssignment(ctx, organizationID, entityID)
	if err != nil {
		return nil, err
	}

	if assignment == nil {
		return &WorkflowStatusResponse{
			CurrentStage: 0,
			TotalStages:  0,
			Status:       "no_workflow",
			CanApprove:   false,
			CanReject:    false,
		}, nil
	}

	if assignment.Workflow == nil {
		return nil, fmt.Errorf("workflow_execution: assignment workflow not loaded")
	}

	stages, err := assignment.Workflow.GetStages()
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: get workflow stages: %w", err)
	}

	pendingTasks, err := s.GetPendingWorkflowTasks(ctx, organizationID, entityID)
	if err != nil {
		return nil, fmt.Errorf("workflow_execution: get pending tasks: %w", err)
	}

	stageHistory, err := assignment.GetStageHistory()
	if err != nil {
		stageHistory = []models.StageExecution{}
	}

	response := &WorkflowStatusResponse{
		CurrentStage:  assignment.CurrentStage,
		TotalStages:   len(stages),
		Status:        assignment.Status,
		CanApprove:    false,
		CanReject:     false,
		StageProgress: make([]StageProgressInfo, len(stages)),
	}

	for i, stage := range stages {
		requiredRoleDisplay := stage.RequiredRole
		if parsed, parseErr := uuid.Parse(stage.RequiredRole); parseErr == nil && config.Queries != nil {
			role, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
				ID: pgtype.UUID{Bytes: parsed, Valid: true},
			})
			if err == nil {
				requiredRoleDisplay = role.Name
			}
		}

		stageInfo := StageProgressInfo{
			StageNumber:    stage.StageNumber,
			StageName:      stage.StageName,
			RequiredRole:   requiredRoleDisplay,
			Status:         "PENDING",
			IsCurrentStage: stage.StageNumber == assignment.CurrentStage,
		}

		for _, execution := range stageHistory {
			if execution.StageNumber == stage.StageNumber {
				stageInfo.Status = execution.Action
				stageInfo.ApproverID = execution.ApproverID
				stageInfo.ApproverName = execution.ApproverName
				stageInfo.ApproverRole = execution.ApproverRole
				stageInfo.CompletedAt = &execution.ExecutedAt
				stageInfo.Comments = execution.Comments
				break
			}
		}

		if stage.StageNumber < assignment.CurrentStage && strings.ToUpper(stageInfo.Status) == "PENDING" {
			stageInfo.Status = "COMPLETED"
		}

		response.StageProgress[i] = stageInfo
	}

	if len(pendingTasks) > 0 {
		currentTask := pendingTasks[0]
		if currentTask.AssignedRole != nil {
			assignedRole := *currentTask.AssignedRole
			roleDisplayName := assignedRole

			if parsed, parseErr := uuid.Parse(assignedRole); parseErr == nil && config.Queries != nil {
				role, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
					ID: pgtype.UUID{Bytes: parsed, Valid: true},
				})
				if err == nil {
					roleDisplayName = role.Name
				}
			}

			response.NextApprover = fmt.Sprintf("Required Role: %s", roleDisplayName)
		}
	}

	return response, nil
}

// WorkflowStatusResponse represents the workflow status
type WorkflowStatusResponse struct {
	CurrentStage  int                 `json:"currentStage"`
	TotalStages   int                 `json:"totalStages"`
	Status        string              `json:"status"`
	NextApprover  string              `json:"nextApprover,omitempty"`
	CanApprove    bool                `json:"canApprove"`
	CanReject     bool                `json:"canReject"`
	StageProgress []StageProgressInfo `json:"stageProgress"`
}

// StageProgressInfo represents detailed information about each workflow stage
type StageProgressInfo struct {
	StageNumber    int        `json:"stageNumber"`
	StageName      string     `json:"stageName"`
	RequiredRole   string     `json:"requiredRole"`
	Status         string     `json:"status"`
	IsCurrentStage bool       `json:"isCurrentStage"`
	ApproverID     string     `json:"approverId,omitempty"`
	ApproverName   string     `json:"approverName,omitempty"`
	ApproverRole   string     `json:"approverRole,omitempty"`
	CompletedAt    *time.Time `json:"completedAt,omitempty"`
	Comments       string     `json:"comments,omitempty"`
}

// GetAvailableApproversForWorkflow returns available approvers for the current workflow stage.
func (s *WorkflowExecutionService) GetAvailableApproversForWorkflow(ctx context.Context, organizationID, entityID string) ([]ApproverInfo, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_execution: pgx pool not initialized")
	}

	pendingTasks, err := s.GetPendingWorkflowTasks(ctx, organizationID, entityID)
	if err != nil {
		return nil, err
	}
	if len(pendingTasks) == 0 {
		return []ApproverInfo{}, nil
	}

	currentTask := pendingTasks[0]
	if currentTask.AssignedRole == nil {
		return []ApproverInfo{}, nil
	}

	assignedRole := *currentTask.AssignedRole
	var approvers []ApproverInfo

	if parsed, parseErr := uuid.Parse(assignedRole); parseErr == nil {
		// UUID — look up the org role record
		var (
			roleName     string
			isSystemRole bool
		)
		err := config.PgxDB.QueryRow(ctx,
			`SELECT name, COALESCE(is_system_role, false) FROM organization_roles WHERE id = $1`,
			parsed,
		).Scan(&roleName, &isSystemRole)
		if err != nil {
			return []ApproverInfo{}, nil // role not found, no approvers
		}

		if isSystemRole {
			approvers, err = queryApproversByRoleName(ctx, organizationID, roleName)
		} else {
			approvers, err = queryApproversByCustomRole(ctx, organizationID, parsed)
		}
		if err != nil {
			return nil, fmt.Errorf("workflow_execution: get available approvers: %w", err)
		}
	} else {
		// Plain role name
		approvers, err = queryApproversByRoleName(ctx, organizationID, assignedRole)
		if err != nil {
			return nil, fmt.Errorf("workflow_execution: get available approvers: %w", err)
		}
	}

	return approvers, nil
}

// ClaimWorkflowTask claims a workflow task for exclusive access.
func (s *WorkflowExecutionService) ClaimWorkflowTask(ctx context.Context, taskID, userID string) error {
	if config.PgxDB == nil {
		return errors.New("workflow_execution: pgx pool not initialized")
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("workflow_execution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	task, err := readTaskTx(ctx, tx, taskID)
	if err != nil {
		return fmt.Errorf("task not found or not available: %w", err)
	}
	if strings.ToUpper(task.Status) != "PENDING" {
		return fmt.Errorf("task not found or not available")
	}

	user, err := readUserTx(ctx, tx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if err := s.canUserActOnTask(ctx, tx, task, user); err != nil {
		return err
	}

	// Atomic claim with optimistic locking + flip status to CLAIMED.
	tag, err := tx.Exec(ctx, `
		UPDATE workflow_tasks
		SET claimed_by   = $2,
		    claimed_at   = NOW(),
		    claim_expiry = $3,
		    status       = 'CLAIMED',
		    version      = version + 1,
		    updated_at   = NOW()
		WHERE id = $1
		  AND UPPER(status) = 'PENDING'
		  AND (claimed_by IS NULL OR claim_expiry < NOW())`,
		taskID, userID, time.Now().Add(30*time.Minute),
	)
	if err != nil {
		return fmt.Errorf("workflow_execution: claim task: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("task is not available for claiming (already claimed or completed)")
	}

	return tx.Commit(ctx)
}

// UnclaimWorkflowTask releases a claimed task.
func (s *WorkflowExecutionService) UnclaimWorkflowTask(ctx context.Context, taskID, userID string) error {
	if config.PgxDB == nil {
		return errors.New("workflow_execution: pgx pool not initialized")
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("workflow_execution: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	task, err := readTaskTx(ctx, tx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	if task.ClaimedBy == nil || *task.ClaimedBy != userID {
		return fmt.Errorf("task is not claimed by you or is not claimed at all")
	}

	tag, err := tx.Exec(ctx, `
		UPDATE workflow_tasks
		SET claimed_by   = NULL,
		    claimed_at   = NULL,
		    claim_expiry = NULL,
		    status       = 'PENDING',
		    version      = version + 1,
		    updated_at   = NOW()
		WHERE id = $1 AND claimed_by = $2`,
		taskID, userID,
	)
	if err != nil {
		return fmt.Errorf("workflow_execution: unclaim task: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("task was not found or not claimed by you")
	}

	return tx.Commit(ctx)
}

// checkStageCompletionCriteria checks if a workflow stage has met its completion criteria.
func (s *WorkflowExecutionService) checkStageCompletionCriteria(ctx context.Context, tx pgx.Tx, taskID string, stage models.WorkflowStage, organizationID string) (bool, error) {
	var approvalCount int
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM stage_approval_records
		 WHERE workflow_task_id = $1 AND stage_number = $2 AND action = 'approved'`,
		taskID, stage.StageNumber,
	).Scan(&approvalCount); err != nil {
		return false, err
	}

	approvalType := stage.ApprovalType
	if approvalType == "" {
		return approvalCount >= 1, nil
	}

	switch approvalType {
	case "any":
		return approvalCount >= 1, nil
	case "all":
		var total int
		if err := tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM users WHERE current_organization_id = $1 AND role = $2 AND active = true`,
			organizationID, stage.RequiredRole,
		).Scan(&total); err != nil {
			return false, err
		}
		return approvalCount >= total, nil
	case "majority":
		var total int
		if err := tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM users WHERE current_organization_id = $1 AND role = $2 AND active = true`,
			organizationID, stage.RequiredRole,
		).Scan(&total); err != nil {
			return false, err
		}
		required := total/2 + 1
		return approvalCount >= required, nil
	case "quorum":
		if stage.QuorumCount == nil {
			return false, fmt.Errorf("quorum count not specified for quorum-based approval")
		}
		return approvalCount >= *stage.QuorumCount, nil
	default:
		requiredCount := stage.RequiredApprovalCount
		if requiredCount <= 0 {
			requiredCount = 1
		}
		return approvalCount >= requiredCount, nil
	}
}

// ApproverInfo represents an approver
type ApproverInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// UpdateDocumentStatus updates the status of the actual document when workflow completes (public for testing).
//
// NOTE: previously took *gorm.DB; now takes pgx.Tx. Callers using
// *gorm.DB must update — see TODO at end of file for full caller list.
func (s *WorkflowExecutionService) UpdateDocumentStatus(ctx context.Context, tx pgx.Tx, entityType, entityID, newStatus string) error {
	return updateDocumentStatusTx(ctx, tx, entityType, entityID, newStatus)
}

// AddActionHistoryEntry adds an action history entry to the document (public for testing).
//
// NOTE: previously took *gorm.DB; now takes pgx.Tx. Callers using
// *gorm.DB must update.
func (s *WorkflowExecutionService) AddActionHistoryEntry(ctx context.Context, tx pgx.Tx, entityType, entityID, userID, action, comments string) error {
	return addActionHistoryEntryTx(ctx, tx, entityType, entityID, userID, action, comments)
}

// triggerPostApprovalAutomation triggers automation after document approval.
//
// All document loads previously used `s.db.Where(...).First(...)`; we now
// hit the pgx pool directly via small loader helpers below.
func (s *WorkflowExecutionService) triggerPostApprovalAutomation(ctx context.Context, entityType, entityID string) error {
	if s.automationService == nil {
		return nil
	}

	autoCfg := s.automationService.GetDefaultAutomationConfig()

	switch entityType {
	case "REQUISITION", "requisition":
		// First, check the workflow's own conditions for auto-PO generation.
		assignment, err := s.GetWorkflowAssignment(ctx, "", entityID)
		// We don't have organizationID here, so re-query without org filter.
		if err == nil && assignment != nil && assignment.Workflow != nil {
			conditions, _ := assignment.Workflow.GetConditions()
			if conditions != nil && conditions.AutoGeneratePO {
				requisition, err := loadRequisitionByID(ctx, entityID)
				if err != nil {
					return fmt.Errorf("workflow_execution: failed to get requisition for auto-PO: %w", err)
				}

				targetStatus := "DRAFT"
				if conditions.AutoApprovePO {
					targetStatus = "APPROVED"
				}

				result, err := s.automationService.CreatePurchaseOrderFromRequisitionWithStatus(
					ctx, requisition, targetStatus,
				)
				if err != nil {
					return fmt.Errorf("workflow_execution: auto-create PO from workflow config: %w", err)
				}

				if result != nil && result.Success {
					autoCreatedPO := map[string]interface{}{
						"id":      result.DocumentID,
						"created": true,
					}
					if result.CreatedDocument != nil {
						if po, ok := result.CreatedDocument.(models.PurchaseOrder); ok {
							autoCreatedPO["documentNumber"] = po.DocumentNumber
							autoCreatedPO["amount"] = po.TotalAmount
						}
					}
					autoCreatedJSON, _ := json.Marshal(autoCreatedPO)
					if _, err := config.PgxDB.Exec(ctx,
						`UPDATE requisitions SET automation_used = true, auto_created_po = $1, updated_at = NOW() WHERE id = $2`,
						autoCreatedJSON, entityID,
					); err != nil {
						log.Printf("Warning: failed to update requisition with auto-created PO: %v", err)
					}
				}
				return nil
			}
		}

		if !autoCfg.AutoCreatePOFromRequisition {
			return nil
		}

		requisition, err := loadRequisitionByID(ctx, entityID)
		if err != nil {
			return fmt.Errorf("workflow_execution: get requisition: %w", err)
		}

		if err := s.automationService.ValidateAutomationPrerequisites("requisition", requisition); err != nil {
			return fmt.Errorf("workflow_execution: automation prerequisites not met: %w", err)
		}

		result, err := s.automationService.CreatePurchaseOrderFromRequisition(ctx, requisition, autoCfg)
		if err != nil {
			return fmt.Errorf("workflow_execution: create purchase order: %w", err)
		}
		if !result.Success {
			return fmt.Errorf("purchase order creation failed: %s", result.Error)
		}

		autoCreatedPO := map[string]interface{}{
			"id":      result.DocumentID,
			"created": true,
		}
		if result.CreatedDocument != nil {
			if po, ok := result.CreatedDocument.(models.PurchaseOrder); ok {
				autoCreatedPO["documentNumber"] = po.DocumentNumber
				autoCreatedPO["amount"] = po.TotalAmount
			}
		}
		autoCreatedJSON, _ := json.Marshal(autoCreatedPO)
		if _, err := config.PgxDB.Exec(ctx,
			`UPDATE requisitions SET automation_used = true, auto_created_po = $1, updated_at = NOW() WHERE id = $2`,
			autoCreatedJSON, entityID,
		); err != nil {
			log.Printf("Warning: failed to update requisition automation fields: %v", err)
		}

	case "PURCHASE_ORDER", "purchase_order":
		if !autoCfg.AutoCreateGRNFromPO {
			return nil
		}

		po, err := loadPurchaseOrderByID(ctx, entityID)
		if err != nil {
			return fmt.Errorf("workflow_execution: get purchase order: %w", err)
		}

		if err := s.automationService.ValidateAutomationPrerequisites("purchase_order", po); err != nil {
			return fmt.Errorf("workflow_execution: automation prerequisites not met: %w", err)
		}

		result, err := s.automationService.CreateGRNFromPurchaseOrder(ctx, po, autoCfg)
		if err != nil {
			return fmt.Errorf("workflow_execution: create GRN: %w", err)
		}
		if !result.Success {
			return fmt.Errorf("GRN creation failed: %s", result.Error)
		}

		autoCreatedGRN := map[string]interface{}{
			"id":      result.DocumentID,
			"created": true,
		}
		if result.CreatedDocument != nil {
			if grn, ok := result.CreatedDocument.(*models.GoodsReceivedNote); ok {
				autoCreatedGRN["documentNumber"] = grn.DocumentNumber
			}
		}
		autoCreatedJSON, _ := json.Marshal(autoCreatedGRN)
		if _, err := config.PgxDB.Exec(ctx,
			`UPDATE purchase_orders SET automation_used = true, auto_created_grn = $1, updated_at = NOW() WHERE id = $2`,
			autoCreatedJSON, entityID,
		); err != nil {
			log.Printf("Warning: failed to update PO automation fields: %v", err)
		}

	case "GRN", "grn":
		if !autoCfg.AutoCreatePVFromGRN {
			return nil
		}

		grn, err := loadGRNByID(ctx, entityID)
		if err != nil {
			return fmt.Errorf("workflow_execution: get GRN: %w", err)
		}

		if err := s.automationService.ValidateAutomationPrerequisites("grn", grn); err != nil {
			return fmt.Errorf("workflow_execution: automation prerequisites not met: %w", err)
		}

		result, err := s.automationService.CreatePaymentVoucherFromGRN(ctx, grn, autoCfg)
		if err != nil {
			return fmt.Errorf("workflow_execution: create payment voucher: %w", err)
		}
		if !result.Success {
			return fmt.Errorf("payment voucher creation failed: %s", result.Error)
		}

		autoCreatedPV := map[string]interface{}{
			"id":      result.DocumentID,
			"created": true,
		}
		if result.CreatedDocument != nil {
			if pv, ok := result.CreatedDocument.(*models.PaymentVoucher); ok {
				autoCreatedPV["documentNumber"] = pv.DocumentNumber
				autoCreatedPV["amount"] = pv.Amount
			}
		}
		autoCreatedJSON, _ := json.Marshal(autoCreatedPV)
		if _, err := config.PgxDB.Exec(ctx,
			`UPDATE goods_received_notes SET automation_used = true, auto_created_pv = $1, updated_at = NOW() WHERE id = $2`,
			autoCreatedJSON, entityID,
		); err != nil {
			log.Printf("Warning: failed to update GRN automation fields: %v", err)
		}
	}

	return nil
}

// ===========================================================================
// Helper functions (free functions — no receiver) used by the methods above.
// ===========================================================================

// timeToPgTimestamptz converts a *time.Time to pgtype.Timestamptz.
func timeToPgTimestamptz(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

// computeTaskDueDate returns a due date capped at the document's required-by date.
func computeTaskDueDate(ctx context.Context, tx pgx.Tx, timeoutHours *int, entityID, entityType string) *time.Time {
	var calculated time.Time
	if timeoutHours != nil && *timeoutHours > 0 {
		calculated = time.Now().Add(time.Duration(*timeoutHours) * time.Hour)
	} else {
		calculated = time.Now().Add(7 * 24 * time.Hour)
	}
	docDue := getDocumentDueDateTx(ctx, tx, entityID, entityType)
	if docDue != nil && docDue.Before(calculated) {
		return docDue
	}
	return &calculated
}

// readTaskTx loads a workflow task in the given tx.
func readTaskTx(ctx context.Context, tx pgx.Tx, taskID string) (*models.WorkflowTask, error) {
	var t sqlc.WorkflowTask
	err := tx.QueryRow(ctx, `
		SELECT id, organization_id, workflow_assignment_id, entity_id, entity_type,
		       stage_number, stage_name, assignment_type, assigned_role, assigned_user_id,
		       status, priority, claimed_at, claimed_by, claim_expiry, completed_at,
		       due_date, version, updated_by, created_at, updated_at
		FROM workflow_tasks WHERE id = $1`,
		taskID,
	).Scan(
		&t.ID, &t.OrganizationID, &t.WorkflowAssignmentID, &t.EntityID, &t.EntityType,
		&t.StageNumber, &t.StageName, &t.AssignmentType, &t.AssignedRole, &t.AssignedUserID,
		&t.Status, &t.Priority, &t.ClaimedAt, &t.ClaimedBy, &t.ClaimExpiry, &t.CompletedAt,
		&t.DueDate, &t.Version, &t.UpdatedBy, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return taskRowToModel(t), nil
}

// readUserTx loads a user record in the given tx.
func readUserTx(ctx context.Context, tx pgx.Tx, userID string) (*models.User, error) {
	var u sqlc.User
	err := tx.QueryRow(ctx, `
		SELECT id, email, name, password, role, active, last_login, current_organization_id,
		       is_super_admin, preferences, deleted_at, position, man_number, nrc_number,
		       contact, mfa_enabled, is_ldap_user, must_change_password, created_at, updated_at
		FROM users WHERE id = $1`,
		userID,
	).Scan(
		&u.ID, &u.Email, &u.Name, &u.Password, &u.Role, &u.Active, &u.LastLogin,
		&u.CurrentOrganizationID, &u.IsSuperAdmin, &u.Preferences, &u.DeletedAt,
		&u.Position, &u.ManNumber, &u.NrcNumber, &u.Contact, &u.MfaEnabled, &u.IsLdapUser,
		&u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return userRowToModel(u), nil
}

// readAssignmentTx loads a workflow assignment in the given tx.
func readAssignmentTx(ctx context.Context, tx pgx.Tx, assignmentID string) (*models.WorkflowAssignment, error) {
	var a sqlc.WorkflowAssignment
	err := tx.QueryRow(ctx, `
		SELECT id, organization_id, entity_id, entity_type, workflow_id, workflow_version,
		       current_stage, status, stage_history, assigned_at, assigned_by, completed_at,
		       created_at, updated_at
		FROM workflow_assignments WHERE id = $1`,
		assignmentID,
	).Scan(
		&a.ID, &a.OrganizationID, &a.EntityID, &a.EntityType, &a.WorkflowID,
		&a.WorkflowVersion, &a.CurrentStage, &a.Status, &a.StageHistory,
		&a.AssignedAt, &a.AssignedBy, &a.CompletedAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return assignmentRowToModel(a), nil
}

// readWorkflowTx fetches a workflow row inside the given transaction.
func readWorkflowTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, organizationID string) (*models.Workflow, error) {
	var r sqlc.Workflow
	err := tx.QueryRow(ctx,
		`SELECT id, organization_id, name, description, document_type, entity_type, version, stages, conditions, is_active, is_default, created_by, deleted_at, created_at, updated_at
		 FROM workflows WHERE id = $1 AND organization_id = $2`,
		id, organizationID,
	).Scan(
		&r.ID, &r.OrganizationID, &r.Name, &r.Description, &r.DocumentType, &r.EntityType,
		&r.Version, &r.Stages, &r.Conditions, &r.IsActive, &r.IsDefault, &r.CreatedBy,
		&r.DeletedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return sqlcWorkflowToModel(r), nil
}

// saveAssignmentTx writes the mutable fields of a WorkflowAssignment.
func saveAssignmentTx(ctx context.Context, tx pgx.Tx, a *models.WorkflowAssignment) error {
	stageHistory, err := json.Marshal(json.RawMessage(a.StageHistory))
	if err != nil {
		return fmt.Errorf("workflow_execution: marshal stage history: %w", err)
	}
	// json.Marshal on RawMessage just returns the underlying bytes if valid;
	// fall back to the field directly when StageHistory is nil/empty.
	if len(a.StageHistory) > 0 {
		stageHistory = []byte(a.StageHistory)
	}

	_, err = tx.Exec(ctx, `
		UPDATE workflow_assignments
		SET status        = $2,
		    current_stage = $3,
		    stage_history = $4,
		    completed_at  = $5,
		    updated_at    = NOW()
		WHERE id = $1`,
		a.ID, a.Status, int32(a.CurrentStage), stageHistory, a.CompletedAt,
	)
	return err
}

// createApprovalRecordTx inserts a stage_approval_records row inside the given tx.
func createApprovalRecordTx(ctx context.Context, tx pgx.Tx, r *models.StageApprovalRecord) error {
	q := config.Queries.WithTx(tx)
	commentsPtr := (*string)(nil)
	if r.Comments != "" {
		commentsPtr = &r.Comments
	}
	signaturePtr := (*string)(nil)
	if r.Signature != "" {
		signaturePtr = &r.Signature
	}
	ipPtr := (*string)(nil)
	if r.IPAddress != "" {
		ipPtr = &r.IPAddress
	}
	uaPtr := (*string)(nil)
	if r.UserAgent != "" {
		uaPtr = &r.UserAgent
	}
	_, err := q.CreateApprovalRecord(ctx, sqlc.CreateApprovalRecordParams{
		ID:             r.ID,
		OrganizationID: r.OrganizationID,
		WorkflowTaskID: r.WorkflowTaskID,
		StageNumber:    int32(r.StageNumber),
		ApproverID:     r.ApproverID,
		ApproverName:   r.ApproverName,
		ApproverRole:   r.ApproverRole,
		ManNumber:      r.ManNumber,
		Position:       r.Position,
		Action:         r.Action,
		Comments:       commentsPtr,
		Signature:      signaturePtr,
		ApprovedAt:     pgtype.Timestamptz{Time: r.ApprovedAt, Valid: true},
		IpAddress:      ipPtr,
		UserAgent:      uaPtr,
	})
	return err
}

// updateDocumentStatusTx updates the status of the actual document. Mirrors
// the previous GORM-based implementation but issues a single UPDATE per
// supported entity type via the supplied tx.
func updateDocumentStatusTx(ctx context.Context, tx pgx.Tx, entityType, entityID, newStatus string) error {
	var table string
	switch entityType {
	case "REQUISITION", "requisition":
		table = "requisitions"
	case "BUDGET", "budget":
		table = "budgets"
	case "PURCHASE_ORDER", "purchase_order":
		table = "purchase_orders"
	case "PAYMENT_VOUCHER", "payment_voucher":
		table = "payment_vouchers"
	case "GRN", "grn":
		table = "goods_received_notes"
	default:
		return fmt.Errorf("unsupported entity type: %s", entityType)
	}
	if _, err := tx.Exec(ctx,
		fmt.Sprintf(`UPDATE %s SET status = $1, updated_at = NOW() WHERE id = $2`, table),
		newStatus, entityID,
	); err != nil {
		return err
	}

	// TODO: utils.SyncDocument is still GORM-only. Re-enable the sync once
	// that helper is migrated. The previous implementation invoked it as
	// `go utils.SyncDocument(s.db, entityType, entityID)`.

	return nil
}

// addActionHistoryEntryTx adds an action history entry to the document.
//
// Implementation: the action_history column is JSONB on each entity. We
// append using `jsonb_set` style logic via a single UPDATE per entity type.
func addActionHistoryEntryTx(ctx context.Context, tx pgx.Tx, entityType, entityID, userID, action, comments string) error {
	now := time.Now()
	actionEntry := types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          action,
		ActionType:      action,
		PerformedBy:     userID,
		Timestamp:       now,
		PerformedAt:     now,
		Comments:        comments,
		PreviousStatus:  "",
		NewStatus:       "APPROVED",
	}
	entryJSON, err := json.Marshal(actionEntry)
	if err != nil {
		return fmt.Errorf("workflow_execution: marshal action entry: %w", err)
	}

	table, err := actionHistoryTableFor(entityType)
	if err != nil {
		return err
	}

	// COALESCE guards against NULL action_history columns. We append by
	// concatenating into the JSONB array.
	_, err = tx.Exec(ctx,
		fmt.Sprintf(`
			UPDATE %s
			SET action_history = COALESCE(action_history, '[]'::jsonb) || $1::jsonb,
			    updated_at = NOW()
			WHERE id = $2`, table),
		entryJSON, entityID,
	)
	return err
}

// addActionHistoryEntryWithMetaTx is like addActionHistoryEntryTx but also
// records previousStatus, newStatus, and changedFields.
func addActionHistoryEntryWithMetaTx(
	ctx context.Context, tx pgx.Tx, entityType, entityID, userID, action, comments,
	previousStatus, newStatus string, changedFields map[string]interface{},
) error {
	now := time.Now()
	actionEntry := types.ActionHistoryEntry{
		ID:             uuid.New().String(),
		Action:         action,
		ActionType:     action,
		PerformedBy:    userID,
		Timestamp:      now,
		PerformedAt:    now,
		Comments:       comments,
		PreviousStatus: previousStatus,
		NewStatus:      newStatus,
		ChangedFields:  changedFields,
	}
	entryJSON, err := json.Marshal(actionEntry)
	if err != nil {
		return fmt.Errorf("workflow_execution: marshal action entry: %w", err)
	}

	table, err := actionHistoryTableFor(entityType)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx,
		fmt.Sprintf(`
			UPDATE %s
			SET action_history = COALESCE(action_history, '[]'::jsonb) || $1::jsonb,
			    updated_at = NOW()
			WHERE id = $2`, table),
		entryJSON, entityID,
	)
	return err
}

// actionHistoryTableFor returns the table name for action_history updates.
func actionHistoryTableFor(entityType string) (string, error) {
	switch entityType {
	case "REQUISITION", "requisition":
		return "requisitions", nil
	case "BUDGET", "budget":
		return "budgets", nil
	case "PURCHASE_ORDER", "purchase_order":
		return "purchase_orders", nil
	case "PAYMENT_VOUCHER", "payment_voucher":
		return "payment_vouchers", nil
	case "GRN", "grn":
		return "goods_received_notes", nil
	default:
		return "", fmt.Errorf("unsupported entity type for action history: %s", entityType)
	}
}

// getDocumentPriorityTx fetches the priority from the document.
func getDocumentPriorityTx(ctx context.Context, tx pgx.Tx, entityID, entityType string) string {
	defaultPriority := "medium"

	var (
		priority *string
	)
	switch strings.ToLower(entityType) {
	case "requisition":
		_ = tx.QueryRow(ctx, `SELECT priority FROM requisitions WHERE id = $1`, entityID).Scan(&priority)
	case "purchase_order":
		_ = tx.QueryRow(ctx, `SELECT priority FROM purchase_orders WHERE id = $1`, entityID).Scan(&priority)
	case "payment_voucher":
		_ = tx.QueryRow(ctx, `SELECT priority FROM payment_vouchers WHERE id = $1`, entityID).Scan(&priority)
	default:
		// budget and goods_received_note don't have priority — use default
		return defaultPriority
	}

	if priority != nil && *priority != "" {
		return strings.ToLower(*priority)
	}
	return defaultPriority
}

// getDocumentDueDateTx fetches the due date from the document.
func getDocumentDueDateTx(ctx context.Context, tx pgx.Tx, entityID, entityType string) *time.Time {
	switch strings.ToLower(entityType) {
	case "requisition":
		var due pgtype.Timestamptz
		if err := tx.QueryRow(ctx, `SELECT required_by_date FROM requisitions WHERE id = $1`, entityID).Scan(&due); err == nil {
			if due.Valid && !due.Time.IsZero() {
				t := due.Time
				return &t
			}
		}
	case "purchase_order":
		var (
			required pgtype.Timestamptz
			delivery pgtype.Timestamptz
		)
		if err := tx.QueryRow(ctx, `SELECT required_by_date, delivery_date FROM purchase_orders WHERE id = $1`, entityID).Scan(&required, &delivery); err == nil {
			if required.Valid && !required.Time.IsZero() {
				t := required.Time
				return &t
			}
			if delivery.Valid && !delivery.Time.IsZero() {
				t := delivery.Time
				return &t
			}
		}
	case "payment_voucher":
		var due pgtype.Timestamptz
		if err := tx.QueryRow(ctx, `SELECT payment_due_date FROM payment_vouchers WHERE id = $1`, entityID).Scan(&due); err == nil {
			if due.Valid && !due.Time.IsZero() {
				t := due.Time
				return &t
			}
		}
	}
	return nil
}

// queryApproversByRoleName returns active users whose role name matches.
func queryApproversByRoleName(ctx context.Context, organizationID, roleName string) ([]ApproverInfo, error) {
	rows, err := config.PgxDB.Query(ctx, `
		SELECT id, name, email, role
		FROM users
		WHERE current_organization_id = $1 AND active = true AND LOWER(role) = LOWER($2)`,
		organizationID, roleName,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	approvers := []ApproverInfo{}
	for rows.Next() {
		var a ApproverInfo
		if err := rows.Scan(&a.ID, &a.Name, &a.Email, &a.Role); err != nil {
			return nil, err
		}
		approvers = append(approvers, a)
	}
	return approvers, rows.Err()
}

// queryApproversByCustomRole returns active users assigned to a custom org role.
func queryApproversByCustomRole(ctx context.Context, organizationID string, roleID uuid.UUID) ([]ApproverInfo, error) {
	rows, err := config.PgxDB.Query(ctx, `
		SELECT u.id, u.name, u.email, u.role
		FROM users u
		INNER JOIN user_organization_roles uor ON uor.user_id = u.id
		WHERE u.current_organization_id = $1 AND u.active = true
		  AND uor.role_id = $2 AND uor.organization_id = $1 AND uor.active = true`,
		organizationID, roleID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	approvers := []ApproverInfo{}
	for rows.Next() {
		var a ApproverInfo
		if err := rows.Scan(&a.ID, &a.Name, &a.Email, &a.Role); err != nil {
			return nil, err
		}
		approvers = append(approvers, a)
	}
	return approvers, rows.Err()
}

// ===========================================================================
// Document loaders — minimally populated for the call sites in this file.
// ===========================================================================

func loadRequisitionByID(ctx context.Context, id string) (*models.Requisition, error) {
	return loadRequisitionWith(ctx, config.PgxDB, id)
}
func loadRequisitionTx(ctx context.Context, tx pgx.Tx, id string) (*models.Requisition, error) {
	return loadRequisitionWith(ctx, tx, id)
}

// requisitionScanner abstracts pgx pool vs tx for read calls.
type requisitionScanner interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

func loadRequisitionWith(ctx context.Context, src requisitionScanner, id string) (*models.Requisition, error) {
	row := src.QueryRow(ctx, `
		SELECT id, organization_id, document_number, COALESCE(status,''), COALESCE(priority,''),
		       COALESCE(total_amount::text,'0'), category_id, preferred_vendor_id, COALESCE(currency,'')
		FROM requisitions WHERE id = $1`, id)

	var (
		idStr, orgID, docNum, status, priority, totalStr, currency string
		catID, prefVendor                                          *string
	)
	if err := row.Scan(&idStr, &orgID, &docNum, &status, &priority, &totalStr, &catID, &prefVendor, &currency); err != nil {
		return nil, err
	}
	r := &models.Requisition{
		ID:                idStr,
		OrganizationID:    orgID,
		DocumentNumber:    docNum,
		Status:            status,
		Priority:          priority,
		CategoryID:        catID,
		PreferredVendorID: prefVendor,
		Currency:          currency,
	}
	if totalStr != "" {
		fmt.Sscanf(totalStr, "%f", &r.TotalAmount)
	}
	return r, nil
}

func loadPurchaseOrderByID(ctx context.Context, id string) (*models.PurchaseOrder, error) {
	return loadPurchaseOrderWith(ctx, config.PgxDB, id)
}
func loadPurchaseOrderTx(ctx context.Context, tx pgx.Tx, id string) (*models.PurchaseOrder, error) {
	return loadPurchaseOrderWith(ctx, tx, id)
}

func loadPurchaseOrderWith(ctx context.Context, src requisitionScanner, id string) (*models.PurchaseOrder, error) {
	row := src.QueryRow(ctx, `
		SELECT id, organization_id, document_number, COALESCE(status,''), COALESCE(priority,''),
		       COALESCE(total_amount::text,'0'), source_requisition_id, COALESCE(currency,'')
		FROM purchase_orders WHERE id = $1`, id)

	var (
		idStr, orgID, docNum, status, priority, totalStr, currency string
		sourceReqID                                                *string
	)
	if err := row.Scan(&idStr, &orgID, &docNum, &status, &priority, &totalStr, &sourceReqID, &currency); err != nil {
		return nil, err
	}
	po := &models.PurchaseOrder{
		ID:                  idStr,
		OrganizationID:      orgID,
		DocumentNumber:      docNum,
		Status:              status,
		Priority:            priority,
		Currency:            currency,
		SourceRequisitionId: sourceReqID,
	}
	if totalStr != "" {
		fmt.Sscanf(totalStr, "%f", &po.TotalAmount)
	}
	return po, nil
}

func loadPaymentVoucherTx(ctx context.Context, tx pgx.Tx, id string) (*models.PaymentVoucher, error) {
	row := tx.QueryRow(ctx, `
		SELECT id, organization_id, document_number, COALESCE(status,''), COALESCE(linked_grn,''),
		       COALESCE(amount::text,'0'), COALESCE(currency,'')
		FROM payment_vouchers WHERE id = $1`, id)

	var (
		idStr, orgID, docNum, status, linkedGRN, amountStr, currency string
	)
	if err := row.Scan(&idStr, &orgID, &docNum, &status, &linkedGRN, &amountStr, &currency); err != nil {
		return nil, err
	}
	pv := &models.PaymentVoucher{
		ID:             idStr,
		OrganizationID: orgID,
		DocumentNumber: docNum,
		Status:         status,
		LinkedGRN:      linkedGRN,
		Currency:       currency,
	}
	if amountStr != "" {
		fmt.Sscanf(amountStr, "%f", &pv.Amount)
	}
	return pv, nil
}

func loadGRNByID(ctx context.Context, id string) (*models.GoodsReceivedNote, error) {
	return loadGRNWith(ctx, config.PgxDB, id)
}
func loadGRNTx(ctx context.Context, tx pgx.Tx, id string) (*models.GoodsReceivedNote, error) {
	return loadGRNWith(ctx, tx, id)
}

func loadGRNWith(ctx context.Context, src requisitionScanner, id string) (*models.GoodsReceivedNote, error) {
	row := src.QueryRow(ctx, `
		SELECT id, organization_id, document_number, COALESCE(status,'')
		FROM goods_received_notes WHERE id = $1`, id)

	var idStr, orgID, docNum, status string
	if err := row.Scan(&idStr, &orgID, &docNum, &status); err != nil {
		return nil, err
	}
	return &models.GoodsReceivedNote{
		ID:             idStr,
		OrganizationID: orgID,
		DocumentNumber: docNum,
		Status:         status,
	}, nil
}

func loadGRNByDocumentNumberTx(ctx context.Context, tx pgx.Tx, documentNumber, organizationID string) (*models.GoodsReceivedNote, error) {
	row := tx.QueryRow(ctx, `
		SELECT id, organization_id, document_number, COALESCE(status,'')
		FROM goods_received_notes
		WHERE document_number = $1 AND organization_id = $2`,
		documentNumber, organizationID,
	)
	var idStr, orgID, docNum, status string
	if err := row.Scan(&idStr, &orgID, &docNum, &status); err != nil {
		return nil, err
	}
	return &models.GoodsReceivedNote{
		ID:             idStr,
		OrganizationID: orgID,
		DocumentNumber: docNum,
		Status:         status,
	}, nil
}

// ===========================================================================
// Row → model converters.
// ===========================================================================

func taskRowToModel(t sqlc.WorkflowTask) *models.WorkflowTask {
	w := &models.WorkflowTask{
		ID:                   t.ID,
		OrganizationID:       t.OrganizationID,
		WorkflowAssignmentID: t.WorkflowAssignmentID,
		EntityID:             t.EntityID,
		EntityType:           t.EntityType,
		StageNumber:          int(t.StageNumber),
		StageName:            t.StageName,
		AssignedRole:         t.AssignedRole,
		AssignedUserID:       t.AssignedUserID,
		ClaimedBy:            t.ClaimedBy,
		Version:              int(t.Version),
		UpdatedBy:            t.UpdatedBy,
	}
	if t.AssignmentType != nil {
		w.AssignmentType = *t.AssignmentType
	}
	if t.Status != nil {
		w.Status = *t.Status
	}
	if t.Priority != nil {
		w.Priority = *t.Priority
	}
	if t.ClaimedAt.Valid {
		v := t.ClaimedAt.Time
		w.ClaimedAt = &v
	}
	if t.ClaimExpiry.Valid {
		v := t.ClaimExpiry.Time
		w.ClaimExpiry = &v
	}
	if t.CompletedAt.Valid {
		v := t.CompletedAt.Time
		w.CompletedAt = &v
	}
	if t.DueDate.Valid {
		v := t.DueDate.Time
		w.DueDate = &v
	}
	if t.CreatedAt.Valid {
		w.CreatedAt = t.CreatedAt.Time
	}
	return w
}

func userRowToModel(u sqlc.User) *models.User {
	user := &models.User{
		ID:                    u.ID,
		Email:                 u.Email,
		Name:                  u.Name,
		Password:              u.Password,
		Role:                  u.Role,
		Active:                u.Active,
		CurrentOrganizationID: u.CurrentOrganizationID,
		IsSuperAdmin:          u.IsSuperAdmin,
		Preferences:           json.RawMessage(u.Preferences),
		MustChangePassword:    u.MustChangePassword,
	}
	if u.LastLogin.Valid {
		v := u.LastLogin.Time
		user.LastLogin = &v
	}
	if u.CreatedAt.Valid {
		user.CreatedAt = u.CreatedAt.Time
	}
	if u.UpdatedAt.Valid {
		user.UpdatedAt = u.UpdatedAt.Time
	}
	if u.DeletedAt.Valid {
		v := u.DeletedAt.Time
		user.DeletedAt = &v
	}
	if u.Position != nil {
		user.Position = *u.Position
	}
	if u.ManNumber != nil {
		user.ManNumber = *u.ManNumber
	}
	if u.NrcNumber != nil {
		user.NrcNumber = *u.NrcNumber
	}
	if u.Contact != nil {
		user.Contact = *u.Contact
	}
	return user
}

func assignmentRowToModel(a sqlc.WorkflowAssignment) *models.WorkflowAssignment {
	w := &models.WorkflowAssignment{
		ID:              a.ID,
		OrganizationID:  a.OrganizationID,
		EntityID:        a.EntityID,
		EntityType:      a.EntityType,
		WorkflowVersion: int(a.WorkflowVersion),
		AssignedBy:      a.AssignedBy,
		StageHistory:    json.RawMessage(a.StageHistory),
	}
	if a.WorkflowID.Valid {
		w.WorkflowID = uuid.UUID(a.WorkflowID.Bytes)
	}
	if a.CurrentStage != nil {
		w.CurrentStage = int(*a.CurrentStage)
	}
	if a.Status != nil {
		w.Status = *a.Status
	}
	if a.AssignedAt.Valid {
		w.AssignedAt = a.AssignedAt.Time
	}
	if a.CompletedAt.Valid {
		v := a.CompletedAt.Time
		w.CompletedAt = &v
	}
	if a.CreatedAt.Valid {
		w.CreatedAt = a.CreatedAt.Time
	}
	if a.UpdatedAt.Valid {
		w.UpdatedAt = a.UpdatedAt.Time
	}
	return w
}
