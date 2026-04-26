package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tether-erp/config"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// ApproverInfo represents an approver
type ApproverInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type ApprovalHandler struct {
	validate *validator.Validate
}

func NewApprovalHandler() *ApprovalHandler {
	return &ApprovalHandler{
		validate: validator.New(),
	}
}

// Request/Response Types
type ApproveTaskRequest struct {
	Signature       string `json:"signature" validate:"required"`
	Comment         string `json:"comment"`
	ExpectedVersion int    `json:"expectedVersion"`
}

type RejectTaskRequest struct {
	Signature       string `json:"signature"`
	Reason          string `json:"reason" validate:"required"`
	ExpectedVersion int    `json:"expectedVersion"`
	RejectionType   string `json:"rejectionType"`
	ReturnToStage   int    `json:"returnToStage"`
}

type ReassignTaskRequest struct {
	NewUserID string `json:"newUserId" validate:"required"`
	Reason    string `json:"reason"`
}

type ClaimTaskRequest struct{}
type UnclaimTaskRequest struct{}

type BulkApproveRequest struct {
	TaskIDs   []string `json:"taskIds" validate:"required,min=1"`
	Signature string   `json:"signature" validate:"required"`
	Comment   string   `json:"comment"`
}

type BulkRejectRequest struct {
	TaskIDs   []string `json:"taskIds" validate:"required,min=1"`
	Signature string   `json:"signature" validate:"required"`
	Reason    string   `json:"reason" validate:"required"`
}

type BulkReassignRequest struct {
	TaskIDs   []string `json:"taskIds" validate:"required,min=1"`
	NewUserID string   `json:"newUserId" validate:"required"`
	Reason    string   `json:"reason"`
}

type BulkOperationResponse struct {
	SuccessCount int      `json:"successCount"`
	FailureCount int      `json:"failureCount"`
	SuccessIDs   []string `json:"successIds"`
	Errors       []string `json:"errors,omitempty"`
}

// ----- helpers -----

// fetchUserBasic returns id, role of a user (id, name, role) via raw pgx.
func fetchUserBasic(ctx context.Context, userID string) (id string, name string, role string, err error) {
	err = config.PgxDB.QueryRow(ctx,
		`SELECT id, name, role FROM users WHERE id = $1`, userID).Scan(&id, &name, &role)
	return
}

// fetchUserOrgRoleUUIDs returns the active custom org role UUID strings for the user
// in the given organization. Empty slice on no rows.
func fetchUserOrgRoleUUIDs(ctx context.Context, userID, organizationID string) ([]string, error) {
	rows, err := config.PgxDB.Query(ctx,
		`SELECT role_id FROM user_organization_roles
		 WHERE user_id = $1 AND organization_id = $2 AND active = true`,
		userID, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var roleID pgtype.UUID
		if err := rows.Scan(&roleID); err != nil {
			return nil, err
		}
		if roleID.Valid {
			out = append(out, uuid.UUID(roleID.Bytes).String())
		}
	}
	return out, rows.Err()
}

// fetchOrgRolePermissionsAny returns true if any of the user's active org roles
// includes any of the supplied permission strings (case-insensitive).
func fetchOrgRolePermissionsAny(ctx context.Context, userID, organizationID string, wanted []string) bool {
	roleUUIDs, err := fetchUserOrgRoleUUIDs(ctx, userID, organizationID)
	if err != nil || len(roleUUIDs) == 0 {
		return false
	}
	rows, err := config.PgxDB.Query(ctx,
		`SELECT permissions FROM organization_roles WHERE id::text = ANY($1::text[]) AND active = true`,
		roleUUIDs)
	if err != nil {
		return false
	}
	defer rows.Close()
	for rows.Next() {
		var permsRaw []byte
		if err := rows.Scan(&permsRaw); err != nil {
			continue
		}
		var perms []string
		if err := json.Unmarshal(permsRaw, &perms); err != nil {
			continue
		}
		for _, p := range perms {
			for _, w := range wanted {
				if strings.EqualFold(p, w) {
					return true
				}
			}
		}
	}
	return false
}

// buildPermissionFilter returns a SQL WHERE fragment (without leading "WHERE")
// and the argument slice that scopes workflow_tasks to what the user is allowed
// to see. Built-in approver roles or org roles with approval perms see everything
// in the org; otherwise the user can see only tasks assigned to them, their role
// name, or any of their custom org role UUIDs.
//
// NOTE: this builds a fragment that starts at $1 = organizationID. Callers who
// need to extend with additional filters (status, etc.) should append to args
// and reference $N positionally.
func buildPermissionFilter(ctx context.Context, organizationID, userID, userRole string) (string, []interface{}, error) {
	approverRoles := []string{"admin", "approver", "finance", "manager", "supervisor", "department_head"}
	for _, r := range approverRoles {
		if strings.EqualFold(userRole, r) {
			return "organization_id = $1", []interface{}{organizationID}, nil
		}
	}
	approvalPerms := []string{
		"requisition.approve", "approval.approve", "budget.approve",
		"purchase_order.approve", "payment_voucher.approve", "grn.approve",
	}
	if fetchOrgRolePermissionsAny(ctx, userID, organizationID, approvalPerms) {
		return "organization_id = $1", []interface{}{organizationID}, nil
	}
	orgRoleUUIDs, err := fetchUserOrgRoleUUIDs(ctx, userID, organizationID)
	if err != nil {
		return "", nil, err
	}
	args := []interface{}{organizationID, userID, userRole}
	if len(orgRoleUUIDs) > 0 {
		args = append(args, orgRoleUUIDs)
		return "organization_id = $1 AND (assigned_user_id = $2 OR LOWER(assigned_role) = LOWER($3) OR assigned_role = ANY($4::text[]))", args, nil
	}
	return "organization_id = $1 AND (assigned_user_id = $2 OR LOWER(assigned_role) = LOWER($3))", args, nil
}

// ----- handlers -----

// GetTaskStats retrieves task statistics for the current user
// GET /api/v1/approvals/stats
func (h *ApprovalHandler) GetTaskStats(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)
	ctx := c.Context()

	_, _, userRole, err := fetchUserBasic(ctx, userID)
	if err != nil {
		return utils.SendUnauthorizedError(c, "User not found")
	}

	whereFrag, args, err := buildPermissionFilter(ctx, organizationID, userID, userRole)
	if err != nil {
		return utils.SendInternalError(c, "Failed to build permission filter", err)
	}

	count := func(extraSQL string, extraArgs ...interface{}) int64 {
		fullArgs := append([]interface{}{}, args...)
		fullArgs = append(fullArgs, extraArgs...)
		var n int64
		_ = config.PgxDB.QueryRow(ctx,
			`SELECT COUNT(*) FROM workflow_tasks WHERE `+whereFrag+extraSQL, fullArgs...).Scan(&n)
		return n
	}

	totalTasks := count("")
	pendingTasks := count(" AND UPPER(status) = $" + strconv.Itoa(len(args)+1), "PENDING")
	completedTasks := count(" AND UPPER(status) IN ($"+strconv.Itoa(len(args)+1)+", $"+strconv.Itoa(len(args)+2)+")", "COMPLETED", "APPROVED")
	overdueTasks := count(
		" AND UPPER(status) = $"+strconv.Itoa(len(args)+1)+" AND due_date IS NOT NULL AND due_date < $"+strconv.Itoa(len(args)+2),
		"PENDING", time.Now())
	highPriorityTasks := count(
		" AND UPPER(priority) IN ($"+strconv.Itoa(len(args)+1)+", $"+strconv.Itoa(len(args)+2)+") AND UPPER(status) = $"+strconv.Itoa(len(args)+3),
		"HIGH", "URGENT", "PENDING")

	// Count by entity type (PENDING only)
	byTypeMap := make(map[string]int64)
	{
		fullArgs := append([]interface{}{}, args...)
		fullArgs = append(fullArgs, "PENDING")
		rows, err := config.PgxDB.Query(ctx,
			`SELECT entity_type, COUNT(*) FROM workflow_tasks WHERE `+whereFrag+
				` AND UPPER(status) = $`+strconv.Itoa(len(args)+1)+` GROUP BY entity_type`, fullArgs...)
		if err == nil {
			for rows.Next() {
				var et string
				var n int64
				if err := rows.Scan(&et, &n); err == nil {
					byTypeMap[et] = n
				}
			}
			rows.Close()
		}
	}

	// Count by priority (PENDING only)
	byPriorityMap := make(map[string]int64)
	{
		fullArgs := append([]interface{}{}, args...)
		fullArgs = append(fullArgs, "PENDING")
		rows, err := config.PgxDB.Query(ctx,
			`SELECT priority, COUNT(*) FROM workflow_tasks WHERE `+whereFrag+
				` AND UPPER(status) = $`+strconv.Itoa(len(args)+1)+` GROUP BY priority`, fullArgs...)
		if err == nil {
			for rows.Next() {
				var p string
				var n int64
				if err := rows.Scan(&p, &n); err == nil {
					byPriorityMap[strings.ToUpper(p)] = n
				}
			}
			rows.Close()
		}
	}

	stats := map[string]interface{}{
		"totalTasks":        totalTasks,
		"pendingTasks":      pendingTasks,
		"completedTasks":    completedTasks,
		"overdueTasks":      overdueTasks,
		"highPriorityTasks": highPriorityTasks,
		"byType":            byTypeMap,
		"byPriority":        byPriorityMap,
	}

	return utils.SendSimpleSuccess(c, stats, "Task statistics retrieved successfully")
}

// GetMyPendingCount returns the count of pending approval tasks for the current user
// GET /api/v1/approvals/my-pending-count
func (h *ApprovalHandler) GetMyPendingCount(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)
	ctx := c.Context()

	_, _, userRole, err := fetchUserBasic(ctx, userID)
	if err != nil {
		return utils.SendSimpleSuccess(c, map[string]interface{}{"count": 0}, "Pending approval count retrieved successfully")
	}

	whereFrag, args, err := buildPermissionFilter(ctx, organizationID, userID, userRole)
	if err != nil {
		return utils.SendInternalError(c, "Failed to build permission filter", err)
	}

	args = append(args, "PENDING")
	var pendingCount int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflow_tasks WHERE `+whereFrag+
			` AND UPPER(status) = $`+strconv.Itoa(len(args)), args...).Scan(&pendingCount); err != nil {
		log.Printf("Error counting pending tasks: %v", err)
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{"count": pendingCount}, "Pending approval count retrieved successfully")
}

// scanWorkflowTaskRow scans a workflow_tasks row into models.WorkflowTask.
// Columns expected (in this exact order):
//   id, organization_id, workflow_assignment_id, entity_id, entity_type,
//   stage_number, stage_name, assignment_type, assigned_role, assigned_user_id,
//   status, priority, claimed_at, claimed_by, claim_expiry, completed_at,
//   due_date, version, updated_by, created_at, updated_at
func scanWorkflowTaskRow(scan func(...interface{}) error) (models.WorkflowTask, error) {
	var (
		id                   string
		orgID                string
		workflowAssignmentID string
		entityID             string
		entityType           string
		stageNumber          int
		stageName            string
		assignmentType       string
		assignedRole         *string
		assignedUserID       *string
		status               string
		priority             string
		claimedAt            pgtype.Timestamptz
		claimedBy            *string
		claimExpiry          pgtype.Timestamptz
		completedAt          pgtype.Timestamptz
		dueDate              pgtype.Timestamptz
		version              int
		updatedBy            *string
		createdAt            pgtype.Timestamptz
		updatedAt            pgtype.Timestamptz
	)
	if err := scan(
		&id, &orgID, &workflowAssignmentID, &entityID, &entityType,
		&stageNumber, &stageName, &assignmentType, &assignedRole, &assignedUserID,
		&status, &priority, &claimedAt, &claimedBy, &claimExpiry, &completedAt,
		&dueDate, &version, &updatedBy, &createdAt, &updatedAt,
	); err != nil {
		return models.WorkflowTask{}, err
	}
	t := models.WorkflowTask{
		ID:                   id,
		OrganizationID:       orgID,
		WorkflowAssignmentID: workflowAssignmentID,
		EntityID:             entityID,
		EntityType:           entityType,
		StageNumber:          stageNumber,
		StageName:            stageName,
		AssignmentType:       assignmentType,
		AssignedRole:         assignedRole,
		AssignedUserID:       assignedUserID,
		Status:               status,
		Priority:             priority,
		ClaimedBy:            claimedBy,
		Version:              version,
		UpdatedBy:            updatedBy,
	}
	if claimedAt.Valid {
		t.ClaimedAt = &claimedAt.Time
	}
	if claimExpiry.Valid {
		t.ClaimExpiry = &claimExpiry.Time
	}
	if completedAt.Valid {
		t.CompletedAt = &completedAt.Time
	}
	if dueDate.Valid {
		t.DueDate = &dueDate.Time
	}
	if createdAt.Valid {
		t.CreatedAt = createdAt.Time
	}
	_ = updatedAt
	return t, nil
}

const workflowTaskCols = `id, organization_id, workflow_assignment_id, entity_id, entity_type,
		stage_number, stage_name, assignment_type, assigned_role, assigned_user_id,
		status, priority, claimed_at, claimed_by, claim_expiry, completed_at,
		due_date, version, updated_by, created_at, updated_at`

// GetApprovalTasks retrieves workflow tasks with pagination and filtering
func (h *ApprovalHandler) GetApprovalTasks(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)
	ctx := c.Context()

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	status := c.Query("status", "")
	documentType := c.Query("document_type", "")
	priority := c.Query("priority", "")
	assignedToMe := c.Query("assigned_to_me", "false") == "true"
	viewAll := c.Query("view_all", "false") == "true"

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	_, _, userRole, err := fetchUserBasic(ctx, userID)
	if err != nil {
		return utils.SendUnauthorizedError(c, "User not found")
	}

	// Auto-expire stale claims
	_, _ = config.PgxDB.Exec(ctx, `
		UPDATE workflow_tasks
		SET claimed_by = NULL, claimed_at = NULL, claim_expiry = NULL, status = 'PENDING'
		WHERE organization_id = $1 AND UPPER(status) = 'CLAIMED' AND claim_expiry < $2
	`, organizationID, time.Now())

	// Build base where + args
	var whereFrag string
	var args []interface{}

	if viewAll {
		whereFrag = "organization_id = $1"
		args = []interface{}{organizationID}
	} else if assignedToMe {
		orgRoleUUIDs, _ := fetchUserOrgRoleUUIDs(ctx, userID, organizationID)
		args = []interface{}{organizationID, userID, userRole}
		if len(orgRoleUUIDs) > 0 {
			args = append(args, orgRoleUUIDs)
			whereFrag = "organization_id = $1 AND (assigned_user_id = $2 OR LOWER(assigned_role) = LOWER($3) OR assigned_role = ANY($4::text[]))"
		} else {
			whereFrag = "organization_id = $1 AND (assigned_user_id = $2 OR LOWER(assigned_role) = LOWER($3))"
		}
	} else {
		whereFrag, args, err = buildPermissionFilter(ctx, organizationID, userID, userRole)
		if err != nil {
			return utils.SendInternalError(c, "Failed to build permission filter", err)
		}
	}

	if status != "" {
		args = append(args, status)
		whereFrag += fmt.Sprintf(" AND UPPER(status) = UPPER($%d)", len(args))
	}
	if documentType != "" {
		args = append(args, documentType)
		whereFrag += fmt.Sprintf(" AND UPPER(entity_type) = UPPER($%d)", len(args))
	}
	if priority != "" {
		args = append(args, priority)
		whereFrag += fmt.Sprintf(" AND UPPER(priority) = UPPER($%d)", len(args))
	}

	// Count
	var total int64
	if err := config.PgxDB.QueryRow(ctx, `SELECT COUNT(*) FROM workflow_tasks WHERE `+whereFrag, args...).Scan(&total); err != nil {
		log.Printf("Error counting workflow tasks: %v", err)
		return utils.SendInternalError(c, "Failed to count workflow tasks", err)
	}

	// Fetch
	listSQL := `SELECT ` + workflowTaskCols + ` FROM workflow_tasks WHERE ` + whereFrag +
		` ORDER BY created_at DESC LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2)
	args = append(args, limit, offset)
	rows, err := config.PgxDB.Query(ctx, listSQL, args...)
	if err != nil {
		log.Printf("Error fetching workflow tasks: %v", err)
		return utils.SendInternalError(c, "Failed to fetch workflow tasks", err)
	}
	defer rows.Close()

	tasks := []models.WorkflowTask{}
	for rows.Next() {
		t, err := scanWorkflowTaskRow(rows.Scan)
		if err != nil {
			log.Printf("Error scanning workflow task: %v", err)
			return utils.SendInternalError(c, "Failed to scan workflow task", err)
		}
		tasks = append(tasks, t)
	}
	if err := rows.Err(); err != nil {
		return utils.SendInternalError(c, "Failed to iterate workflow tasks", err)
	}

	for i := range tasks {
		if err := h.populateWorkflowTaskFields(ctx, &tasks[i]); err != nil {
			log.Printf("Error populating computed fields for task %s: %v", tasks[i].ID, err)
		}
	}

	return utils.SendPaginatedSuccess(c, tasks, "Workflow tasks retrieved successfully", page, limit, total)
}

// populateWorkflowTaskFields fills the frontend compatibility fields by joining
// to the relevant document table and the workflow assignment.
func (h *ApprovalHandler) populateWorkflowTaskFields(ctx context.Context, task *models.WorkflowTask) error {
	task.DocumentID = task.EntityID
	task.DocumentType = task.EntityType
	task.Stage = task.StageNumber
	task.DueAt = task.DueDate

	if task.AssignedUserID != nil {
		task.AssignedTo = *task.AssignedUserID
		task.ApproverID = *task.AssignedUserID
		var name string
		if err := config.PgxDB.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, *task.AssignedUserID).Scan(&name); err == nil {
			task.ApproverName = name
		}
	} else if task.ClaimedBy != nil {
		task.AssignedTo = *task.ClaimedBy
		task.ApproverID = *task.ClaimedBy
		var name string
		if err := config.PgxDB.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, *task.ClaimedBy).Scan(&name); err == nil {
			task.ApproverName = name
			task.ClaimerName = name
		}
	}

	switch task.EntityType {
	case "requisition":
		var docNum, title string
		if err := config.PgxDB.QueryRow(ctx, `SELECT document_number, title FROM requisitions WHERE id = $1`, task.EntityID).Scan(&docNum, &title); err == nil {
			task.DocumentNumber = docNum
			task.Title = title + " - Approval Required"
			task.TaskType = "REQUISITION_APPROVAL"
		}
	case "purchase_order":
		var docNum, title string
		if err := config.PgxDB.QueryRow(ctx, `SELECT document_number, title FROM purchase_orders WHERE id = $1`, task.EntityID).Scan(&docNum, &title); err == nil {
			task.DocumentNumber = docNum
			task.Title = title + " - Approval Required"
			task.TaskType = "PURCHASE_ORDER_APPROVAL"
		}
	case "payment_voucher":
		var docNum, title string
		if err := config.PgxDB.QueryRow(ctx, `SELECT document_number, title FROM payment_vouchers WHERE id = $1`, task.EntityID).Scan(&docNum, &title); err == nil {
			task.DocumentNumber = docNum
			task.Title = title + " - Approval Required"
			task.TaskType = "PAYMENT_VOUCHER_APPROVAL"
		}
	case "budget":
		var budgetCode, name string
		if err := config.PgxDB.QueryRow(ctx, `SELECT budget_code, name FROM budgets WHERE id = $1`, task.EntityID).Scan(&budgetCode, &name); err == nil {
			task.DocumentNumber = budgetCode
			task.Title = name + " - Approval Required"
			task.TaskType = "BUDGET_APPROVAL"
		}
	case "goods_received_note":
		var docNum string
		if err := config.PgxDB.QueryRow(ctx, `SELECT document_number FROM grns WHERE id = $1`, task.EntityID).Scan(&docNum); err == nil {
			task.DocumentNumber = docNum
			task.Title = "GRN " + docNum + " - Confirmation Required"
			task.TaskType = "GOODS_RECEIVED_NOTE_CONFIRMATION"
		}
	}

	if task.TaskType == "" {
		task.TaskType = "APPROVAL"
	}
	if task.Title == "" {
		task.Title = "Approval Required"
	}

	if task.DueDate == nil {
		defaultDueDate := task.CreatedAt.Add(7 * 24 * time.Hour)
		task.DueDate = &defaultDueDate
		task.DueAt = &defaultDueDate
	}

	if task.Priority == "" {
		task.Priority = "medium"
	}
	switch strings.ToLower(task.Priority) {
	case "high", "urgent":
		task.Importance = "high"
	case "low":
		task.Importance = "low"
	default:
		task.Importance = "medium"
	}

	// Resolve workflow id/name via assignment
	var (
		workflowID pgtype.UUID
	)
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT workflow_id FROM workflow_assignments WHERE id = $1`, task.WorkflowAssignmentID).Scan(&workflowID); err == nil && workflowID.Valid {
		task.WorkflowID = uuid.UUID(workflowID.Bytes).String()
		var name string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT name FROM workflows WHERE id = $1`, task.WorkflowID).Scan(&name); err == nil {
			task.WorkflowName = name
		}
	}
	if task.WorkflowName == "" {
		task.WorkflowName = "Standard Approval Workflow"
	}

	if task.AssignedRole != nil && *task.AssignedRole != "" {
		if _, parseErr := uuid.Parse(*task.AssignedRole); parseErr == nil {
			var roleName string
			if err := config.PgxDB.QueryRow(ctx,
				`SELECT name FROM organization_roles WHERE id = $1`, *task.AssignedRole).Scan(&roleName); err == nil {
				task.AssignedRoleName = roleName
			}
		} else {
			task.AssignedRoleName = *task.AssignedRole
		}
	}

	return nil
}

// GetApprovalTask retrieves a single workflow task with full details
func (h *ApprovalHandler) GetApprovalTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	if taskID == "" {
		return utils.SendBadRequestError(c, "Task ID is required")
	}

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)
	ctx := c.Context()

	_, _, userRole, _ := fetchUserBasic(ctx, userID)

	// Build base condition
	args := []interface{}{taskID, organizationID}
	whereFrag := "id = $1 AND organization_id = $2"
	if !strings.EqualFold(userRole, "admin") {
		orgRoleUUIDs, _ := fetchUserOrgRoleUUIDs(ctx, userID, organizationID)
		if len(orgRoleUUIDs) > 0 {
			args = append(args, userID, userRole, orgRoleUUIDs)
			whereFrag += " AND (assigned_user_id = $3 OR LOWER(assigned_role) = LOWER($4) OR assigned_role = ANY($5::text[]))"
		} else {
			args = append(args, userID, userRole)
			whereFrag += " AND (assigned_user_id = $3 OR LOWER(assigned_role) = LOWER($4))"
		}
	}

	row := config.PgxDB.QueryRow(ctx,
		`SELECT `+workflowTaskCols+` FROM workflow_tasks WHERE `+whereFrag, args...)
	task, err := scanWorkflowTaskRow(row.Scan)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFoundError(c, "Workflow task not found or access denied")
		}
		log.Printf("Error fetching workflow task %s: %v", taskID, err)
		return utils.SendNotFoundError(c, "Workflow task not found or access denied")
	}

	if err := h.populateWorkflowTaskFields(ctx, &task); err != nil {
		log.Printf("Error populating computed fields for task %s: %v", taskID, err)
	}

	return utils.SendSimpleSuccess(c, task, "Workflow task retrieved successfully")
}

// ClaimTask claims a workflow task for exclusive access
// POST /api/v1/approvals/tasks/:id/claim
func (h *ApprovalHandler) ClaimTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	if taskID == "" {
		return utils.SendBadRequestError(c, "Task ID is required")
	}

	userID := c.Locals("userID").(string)

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	err := workflowExecutionService.ClaimWorkflowTask(c.Context(), taskID, userID)
	if err != nil {
		log.Printf("Error claiming workflow task %s: %v", taskID, err)
		return c.Status(fiber.StatusConflict).JSON(types.ErrorResponse{
			Error:   "Claim failed",
			Message: err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
		Message: "Task claimed successfully",
		Data:    map[string]interface{}{"taskId": taskID, "claimedBy": userID},
	})
}

// UnclaimTask releases a claimed task
// POST /api/v1/approvals/tasks/:id/unclaim
func (h *ApprovalHandler) UnclaimTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	if taskID == "" {
		return utils.SendBadRequestError(c, "Task ID is required")
	}

	userID := c.Locals("userID").(string)

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	err := workflowExecutionService.UnclaimWorkflowTask(c.Context(), taskID, userID)
	if err != nil {
		log.Printf("Error unclaiming workflow task %s: %v", taskID, err)
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Unclaim failed",
			Message: err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
		Message: "Task unclaimed successfully",
		Data:    map[string]interface{}{"taskId": taskID},
	})
}

// ApproveTask marks a task as approved and moves to next stage
func (h *ApprovalHandler) ApproveTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	userID := c.Locals("userID").(string)

	var req ApproveTaskRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid request body",
			Message: "Failed to parse approval request",
		})
	}
	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
		})
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	var err error
	if req.ExpectedVersion > 0 {
		err = workflowExecutionService.ApproveWorkflowTaskWithVersion(c.Context(), taskID, userID, req.Signature, req.Comment, req.ExpectedVersion)
	} else {
		err = workflowExecutionService.ApproveWorkflowTask(c.Context(), taskID, userID, req.Signature, req.Comment)
	}

	if err != nil {
		log.Printf("Error approving workflow task: %v", err)
		if contains(err.Error(), "version") || contains(err.Error(), "modified by another user") {
			return c.Status(fiber.StatusConflict).JSON(types.ErrorResponse{
				Error:   "Concurrent modification",
				Message: err.Error(),
			})
		}
		if contains(err.Error(), "claimed by another user") || contains(err.Error(), "claim has expired") {
			return c.Status(fiber.StatusConflict).JSON(types.ErrorResponse{
				Error:   "Task claim issue",
				Message: err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(types.ErrorResponse{
			Error:   "Approval failed",
			Message: err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
		Message: "Task approved successfully",
		Data:    map[string]interface{}{"taskId": taskID},
	})
}

// RejectTask marks a task as rejected and returns document to draft
func (h *ApprovalHandler) RejectTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	userID := c.Locals("userID").(string)

	var req RejectTaskRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid request body",
			Message: "Failed to parse rejection request",
		})
	}
	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
		})
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	var err error
	if req.ExpectedVersion > 0 {
		err = workflowExecutionService.RejectWorkflowTaskWithVersion(c.Context(), taskID, userID, req.Signature, req.Reason, req.ExpectedVersion, req.RejectionType, req.ReturnToStage)
	} else {
		err = workflowExecutionService.RejectWorkflowTask(c.Context(), taskID, userID, req.Signature, req.Reason, req.RejectionType, req.ReturnToStage)
	}

	if err != nil {
		log.Printf("Error rejecting workflow task: %v", err)
		if strings.Contains(err.Error(), "version") || strings.Contains(err.Error(), "modified by another user") {
			return c.Status(fiber.StatusConflict).JSON(types.ErrorResponse{
				Error:   "Concurrent modification",
				Message: err.Error(),
			})
		}
		if strings.Contains(err.Error(), "claimed by another user") || strings.Contains(err.Error(), "claim has expired") {
			return c.Status(fiber.StatusConflict).JSON(types.ErrorResponse{
				Error:   "Task claim issue",
				Message: err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(types.ErrorResponse{
			Error:   "Rejection failed",
			Message: err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
		Message: "Task rejected successfully",
		Data:    map[string]interface{}{"taskId": taskID},
	})
}

// ReassignTask reassigns workflow task to different approver
func (h *ApprovalHandler) ReassignTask(c *fiber.Ctx) error {
	taskID := c.Params("id")
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	var req ReassignTaskRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid request body",
			Message: "Failed to parse reassignment request",
		})
	}
	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
		})
	}

	ctx := c.Context()

	// Fetch task
	row := config.PgxDB.QueryRow(ctx,
		`SELECT `+workflowTaskCols+` FROM workflow_tasks WHERE id = $1 AND organization_id = $2`,
		taskID, organizationID)
	task, err := scanWorkflowTaskRow(row.Scan)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(types.ErrorResponse{
			Error:   "Task not found",
			Message: "Workflow task not found",
		})
	}

	if strings.ToUpper(task.Status) != "PENDING" && strings.ToUpper(task.Status) != "CLAIMED" {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid task status",
			Message: "Task is not in pending or claimed status",
		})
	}

	_, userName, userRole, err := fetchUserBasic(ctx, userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(types.ErrorResponse{
			Error:   "User not found",
			Message: "Current user not found",
		})
	}

	reassignRoles := []string{"admin", "approver", "finance", "manager", "supervisor", "department_head"}
	reassignPermissions := []string{
		"approval.reassign", "requisition.reassign", "workflow.reassign",
		"approval.manage", "workflow.manage",
	}

	hasReassignPermission := false
	for _, r := range reassignRoles {
		if strings.EqualFold(userRole, r) {
			hasReassignPermission = true
			break
		}
	}
	if !hasReassignPermission {
		hasReassignPermission = fetchOrgRolePermissionsAny(ctx, userID, organizationID, reassignPermissions)
	}
	if !hasReassignPermission {
		return c.Status(fiber.StatusForbidden).JSON(types.ErrorResponse{
			Error:   "Insufficient permissions",
			Message: "You don't have permission to reassign tasks",
		})
	}

	// Resolve previous assignee
	var previousAssigneeName, previousAssigneeID string
	if task.AssignedUserID != nil {
		previousAssigneeID = *task.AssignedUserID
	} else if task.ClaimedBy != nil {
		previousAssigneeID = *task.ClaimedBy
	}
	if previousAssigneeID != "" {
		_ = config.PgxDB.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, previousAssigneeID).Scan(&previousAssigneeName)
	}

	// Validate new user exists and is active in this org
	var newUserName string
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT name FROM users WHERE id = $1 AND active = true AND current_organization_id = $2`,
		req.NewUserID, organizationID).Scan(&newUserName); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid assignee",
			Message: "Target user not found or inactive",
		})
	}

	// Update task: clear claim/role, assign to new user, bump version
	if _, err := config.PgxDB.Exec(ctx, `
		UPDATE workflow_tasks
		SET assigned_user_id = $1,
		    assigned_role = NULL,
		    claimed_by = NULL,
		    claimed_at = NULL,
		    claim_expiry = NULL,
		    version = version + 1,
		    updated_by = $2,
		    updated_at = NOW()
		WHERE id = $3
	`, req.NewUserID, userID, task.ID); err != nil {
		log.Printf("Error reassigning workflow task: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(types.ErrorResponse{
			Error:   "Database error",
			Message: "Failed to reassign task",
		})
	}

	// Audit log via utils helper (writes to audit_logs via pgx)
	_ = utils.CreateAuditLog(utils.AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     task.EntityID,
		DocumentType:   task.EntityType,
		UserID:         userID,
		ActorName:      userName,
		ActorRole:      userRole,
		Action:         utils.AuditAction("reassign"),
		Changes: map[string]interface{}{
			"previousAssignee":     previousAssigneeID,
			"previousAssigneeName": previousAssigneeName,
			"newAssignee":          req.NewUserID,
			"newAssigneeName":      newUserName,
			"reason":               req.Reason,
			"reassignedBy":         userName,
			"reassignedById":       userID,
		},
	})

	// TODO: action history mutation (gorm-based addReassignmentActionHistory was removed
	// during the GORM → sqlc migration). The previous implementation appended a JSONB
	// entry to requisitions.action_history; that needs a dedicated sqlc/raw-pgx helper.

	// Notify the new assignee
	if err := insertSimpleNotification(ctx, organizationID, req.NewUserID, "task_reassigned", task,
		fmt.Sprintf("Task Reassigned: %s Approval", task.EntityType),
		fmt.Sprintf("A %s approval task has been reassigned to you by %s. Stage: %s. Reason: %s", task.EntityType, userName, task.StageName, req.Reason),
		fmt.Sprintf("Task reassigned to you by %s", userName),
		userID, userName, req.Reason, "HIGH"); err != nil {
		log.Printf("Error creating reassignment notification: %v", err)
	}

	// Notify the previous assignee
	if previousAssigneeID != "" && previousAssigneeID != req.NewUserID {
		if err := insertSimpleNotification(ctx, organizationID, previousAssigneeID, "task_reassigned_away", task,
			fmt.Sprintf("Task Reassigned: %s Approval", task.EntityType),
			fmt.Sprintf("A %s approval task has been reassigned from you to %s by %s. Reason: %s", task.EntityType, newUserName, userName, req.Reason),
			fmt.Sprintf("Task reassigned to %s by %s", newUserName, userName),
			userID, userName, req.Reason, "MEDIUM"); err != nil {
			log.Printf("Error creating notification for previous assignee: %v", err)
		}
	}

	return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
		Message: "Task reassigned successfully",
		Data: map[string]interface{}{
			"taskId":             task.ID,
			"newAssignee":        newUserName,
			"newAssigneeId":      req.NewUserID,
			"previousAssignee":   previousAssigneeName,
			"previousAssigneeId": previousAssigneeID,
			"reassignedBy":       userName,
			"reason":             req.Reason,
		},
	})
}

// insertSimpleNotification inserts a notification row directly via pgx so we
// don't depend on the GORM-era helper. Mirrors the columns the previous
// gorm.Create(&Notification{...}) used.
func insertSimpleNotification(ctx context.Context, organizationID, recipientID, nType string, task models.WorkflowTask, subject, body, message, relatedUserID, relatedUserName, reassignmentReason, importance string) error {
	id := uuid.New().String()
	_, err := config.PgxDB.Exec(ctx, `
		INSERT INTO notifications (
			id, organization_id, recipient_id, type,
			document_id, document_type, entity_id, entity_type,
			subject, body, message,
			related_user_id, related_user_name, reassignment_reason, importance,
			sent, is_read, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8,
			$9, $10, $11,
			$12, $13, $14, $15,
			false, false, NOW(), NOW()
		)
	`,
		id, organizationID, recipientID, nType,
		task.EntityID, task.EntityType, task.EntityID, task.EntityType,
		subject, body, message,
		relatedUserID, relatedUserName, reassignmentReason, importance,
	)
	return err
}

// GetApprovalHistory retrieves approval history for a document
func (h *ApprovalHandler) GetApprovalHistory(c *fiber.Ctx) error {
	documentID := c.Params("documentId")
	organizationID := c.Locals("organizationID").(string)

	if documentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid request",
			Message: "Document ID is required",
		})
	}

	ctx := c.Context()

	// Resolve actual document ID from id-or-document_number
	actualDocumentID := documentID
	var resolvedID string
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT id FROM requisitions WHERE id = $1 OR document_number = $1`,
		documentID).Scan(&resolvedID); err == nil {
		actualDocumentID = resolvedID
	}

	rows, err := config.PgxDB.Query(ctx,
		`SELECT `+workflowTaskCols+` FROM workflow_tasks
		 WHERE entity_id = $1 AND organization_id = $2
		 ORDER BY created_at ASC`,
		actualDocumentID, organizationID)
	if err != nil {
		log.Printf("Error fetching workflow task history: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(types.ErrorResponse{
			Error:   "Database error",
			Message: "Failed to fetch workflow task history",
		})
	}
	defer rows.Close()

	history := []models.WorkflowTask{}
	for rows.Next() {
		t, err := scanWorkflowTaskRow(rows.Scan)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(types.ErrorResponse{
				Error:   "Database error",
				Message: "Failed to scan workflow task",
			})
		}
		history = append(history, t)
	}

	return c.Status(fiber.StatusOK).JSON(history)
}

// BulkApprove approves multiple tasks at once
// POST /api/v1/approvals/bulk/approve
func (h *ApprovalHandler) BulkApprove(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req BulkApproveRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if err := h.validate.Struct(req); err != nil {
		return utils.SendBadRequestError(c, "Validation failed: "+err.Error())
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	var successIDs []string
	var errorsList []string

	for _, taskID := range req.TaskIDs {
		err := workflowExecutionService.ApproveWorkflowTask(c.Context(), taskID, userID, req.Signature, req.Comment)
		if err != nil {
			errorsList = append(errorsList, "Task "+taskID+": "+err.Error())
			continue
		}
		successIDs = append(successIDs, taskID)
	}

	return utils.SendSimpleSuccess(c, BulkOperationResponse{
		SuccessCount: len(successIDs),
		FailureCount: len(errorsList),
		SuccessIDs:   successIDs,
		Errors:       errorsList,
	}, "Bulk approval completed")
}

// BulkReject rejects multiple tasks at once
// POST /api/v1/approvals/bulk/reject
func (h *ApprovalHandler) BulkReject(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req BulkRejectRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if err := h.validate.Struct(req); err != nil {
		return utils.SendBadRequestError(c, "Validation failed: "+err.Error())
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	var successIDs []string
	var errorsList []string

	for _, taskID := range req.TaskIDs {
		err := workflowExecutionService.RejectWorkflowTask(c.Context(), taskID, userID, req.Signature, req.Reason, "reject", 0)
		if err != nil {
			errorsList = append(errorsList, "Task "+taskID+": "+err.Error())
			continue
		}
		successIDs = append(successIDs, taskID)
	}

	return utils.SendSimpleSuccess(c, BulkOperationResponse{
		SuccessCount: len(successIDs),
		FailureCount: len(errorsList),
		SuccessIDs:   successIDs,
		Errors:       errorsList,
	}, "Bulk rejection completed")
}

// BulkReassign reassigns multiple tasks at once
// POST /api/v1/approvals/bulk/reassign
func (h *ApprovalHandler) BulkReassign(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	var req BulkReassignRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if err := h.validate.Struct(req); err != nil {
		return utils.SendBadRequestError(c, "Validation failed: "+err.Error())
	}

	ctx := c.Context()
	var successIDs []string
	var errorsList []string

	for _, taskID := range req.TaskIDs {
		// Verify task exists and is pending
		var status string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT status FROM workflow_tasks WHERE id = $1 AND organization_id = $2`,
			taskID, organizationID).Scan(&status); err != nil {
			errorsList = append(errorsList, "Task "+taskID+": not found")
			continue
		}
		if strings.ToUpper(status) != "PENDING" {
			errorsList = append(errorsList, "Task "+taskID+": not in pending status")
			continue
		}

		if _, err := config.PgxDB.Exec(ctx, `
			UPDATE workflow_tasks
			SET assigned_user_id = $1, updated_by = $2, updated_at = NOW()
			WHERE id = $3
		`, req.NewUserID, userID, taskID); err != nil {
			errorsList = append(errorsList, "Task "+taskID+": failed to reassign")
			continue
		}

		successIDs = append(successIDs, taskID)
	}

	return utils.SendSimpleSuccess(c, BulkOperationResponse{
		SuccessCount: len(successIDs),
		FailureCount: len(errorsList),
		SuccessIDs:   successIDs,
		Errors:       errorsList,
	}, "Bulk reassignment completed")
}

// GetOverdueTasks retrieves tasks that are past their due date
// GET /api/v1/approvals/tasks/overdue
func (h *ApprovalHandler) GetOverdueTasks(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	ctx := c.Context()
	now := time.Now()

	rows, err := config.PgxDB.Query(ctx,
		`SELECT `+workflowTaskCols+` FROM workflow_tasks
		 WHERE organization_id = $1 AND UPPER(status) = $2 AND created_at < $3
		 ORDER BY created_at ASC
		 LIMIT $4 OFFSET $5`,
		organizationID, "PENDING", now, limit, offset)
	if err != nil {
		log.Printf("Error fetching overdue tasks: %v", err)
		return utils.SendInternalError(c, "Failed to retrieve overdue tasks", err)
	}
	defer rows.Close()

	tasks := []models.WorkflowTask{}
	for rows.Next() {
		t, err := scanWorkflowTaskRow(rows.Scan)
		if err != nil {
			return utils.SendInternalError(c, "Failed to scan overdue task", err)
		}
		tasks = append(tasks, t)
	}

	var total int64
	_ = config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflow_tasks
		 WHERE organization_id = $1 AND UPPER(status) = $2 AND due_date < $3`,
		organizationID, "PENDING", now).Scan(&total)

	return utils.SendPaginatedSuccess(c, tasks, "Overdue tasks retrieved successfully", page, limit, total)
}

// GetApprovalWorkflowStatus retrieves the current approval workflow status for a document
// GET /api/v1/documents/{documentId}/approval-status
func (h *ApprovalHandler) GetApprovalWorkflowStatus(c *fiber.Ctx) error {
	documentID := c.Params("documentId")
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	if documentID == "" {
		return utils.SendBadRequestError(c, "Document ID is required")
	}

	ctx := c.Context()

	// Resolve actual document ID
	actualDocumentID := documentID
	var resolvedID string
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT id FROM requisitions WHERE id = $1 OR document_number = $1`,
		documentID).Scan(&resolvedID); err == nil {
		actualDocumentID = resolvedID
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	workflowStatus, err := workflowExecutionService.GetWorkflowStatus(c.Context(), organizationID, actualDocumentID)
	if err != nil {
		log.Printf("Error fetching workflow status: %v", err)
		return utils.SendInternalError(c, "Failed to fetch workflow status", err)
	}

	if workflowStatus.Status == "no_workflow" {
		return c.JSON(types.DetailResponse{
			Success: true,
			Data: map[string]interface{}{
				"currentStage":  0,
				"totalStages":   0,
				"status":        "no_workflow",
				"canApprove":    false,
				"canReject":     false,
				"stageProgress": []interface{}{},
			},
		})
	}

	pendingTasks, err := workflowExecutionService.GetPendingWorkflowTasks(c.Context(), organizationID, actualDocumentID)
	if err != nil {
		log.Printf("Error fetching pending tasks: %v", err)
		pendingTasks = []models.WorkflowTask{}
	}

	canApprove := false
	canReject := false
	nextApprover := ""

	if len(pendingTasks) > 0 {
		currentTask := pendingTasks[0]

		approverRoles := []string{"admin", "approver", "finance", "manager", "supervisor", "department_head"}
		approvalPermissions := []string{
			"requisition.approve", "approval.approve", "budget.approve",
			"purchase_order.approve", "payment_voucher.approve", "grn.approve",
		}

		_, _, userRole, _ := fetchUserBasic(ctx, userID)

		// PRIORITY 1: specific user assignment
		if currentTask.AssignedUserID != nil && *currentTask.AssignedUserID != "" {
			if *currentTask.AssignedUserID == userID {
				canApprove = true
				canReject = true
			}
		} else if currentTask.AssignedRole != nil {
			assignedRole := *currentTask.AssignedRole

			if _, parseErr := uuid.Parse(assignedRole); parseErr == nil {
				// UUID — check explicit user_organization_roles row
				var hasRole int
				_ = config.PgxDB.QueryRow(ctx, `
					SELECT COUNT(*) FROM user_organization_roles
					WHERE user_id = $1 AND organization_id = $2 AND role_id = $3 AND active = true
				`, userID, organizationID, assignedRole).Scan(&hasRole)
				if hasRole > 0 {
					canApprove = true
					canReject = true
				} else {
					// Fallback 1: built-in approver role
					for _, r := range approverRoles {
						if strings.EqualFold(userRole, r) {
							canApprove = true
							canReject = true
							break
						}
					}
					// Fallback 2: org-role permissions
					if !canApprove && fetchOrgRolePermissionsAny(ctx, userID, organizationID, approvalPermissions) {
						canApprove = true
						canReject = true
					}
				}
			} else {
				if strings.EqualFold(userRole, assignedRole) {
					canApprove = true
					canReject = true
				} else {
					for _, r := range approverRoles {
						if strings.EqualFold(userRole, r) {
							canApprove = true
							canReject = true
							break
						}
					}
					if !canApprove && fetchOrgRolePermissionsAny(ctx, userID, organizationID, approvalPermissions) {
						canApprove = true
						canReject = true
					}
				}
			}
		}

		// Resolve next approver name
		if currentTask.AssignedUserID != nil && *currentTask.AssignedUserID != "" {
			var name string
			if err := config.PgxDB.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, *currentTask.AssignedUserID).Scan(&name); err == nil {
				nextApprover = name
			} else {
				nextApprover = "Assigned User"
			}
		} else if currentTask.AssignedRole != nil {
			assignedRole := *currentTask.AssignedRole
			roleDisplayName := assignedRole

			if _, parseErr := uuid.Parse(assignedRole); parseErr == nil {
				_ = config.PgxDB.QueryRow(ctx, `SELECT name FROM organization_roles WHERE id = $1`, assignedRole).Scan(&roleDisplayName)

				// Find a user with this role
				var name string
				err := config.PgxDB.QueryRow(ctx, `
					SELECT u.name FROM user_organization_roles uor
					INNER JOIN users u ON u.id = uor.user_id
					WHERE uor.organization_id = $1 AND uor.role_id = $2 AND uor.active = true
					LIMIT 1
				`, organizationID, assignedRole).Scan(&name)
				if err == nil {
					nextApprover = name
				} else {
					nextApprover = fmt.Sprintf("Any %s", roleDisplayName)
				}
			} else {
				var name string
				err := config.PgxDB.QueryRow(ctx, `
					SELECT name FROM users
					WHERE current_organization_id = $1 AND role = $2 AND active = true
					LIMIT 1
				`, organizationID, assignedRole).Scan(&name)
				if err == nil {
					nextApprover = name
				} else {
					nextApprover = fmt.Sprintf("Any %s", roleDisplayName)
				}
			}
		}
	}

	workflowStatus.CanApprove = canApprove
	workflowStatus.CanReject = canReject
	if nextApprover != "" {
		workflowStatus.NextApprover = nextApprover
	}

	return c.JSON(types.DetailResponse{
		Success: true,
		Data:    workflowStatus,
	})
}

// GetAvailableApprovers retrieves available approvers for a document type and stage
// GET /api/v1/approvals/available-approvers?documentType=...&stage=...
func (h *ApprovalHandler) GetAvailableApprovers(c *fiber.Ctx) error {
	organizationIDInterface := c.Locals("organizationID")
	if organizationIDInterface == nil {
		return utils.SendUnauthorizedError(c, "Organization ID not found in context")
	}
	organizationID, ok := organizationIDInterface.(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "Invalid organization ID in context")
	}

	documentType := c.Query("documentType")
	entityID := c.Query("entityId")

	if documentType == "" {
		return utils.SendBadRequestError(c, "Document type is required")
	}

	ctx := c.Context()

	if entityID != "" {
		workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)
		workflowApprovers, err := workflowExecutionService.GetAvailableApproversForWorkflow(c.Context(), organizationID, entityID)
		if err == nil && len(workflowApprovers) > 0 {
			return utils.SendSuccess(c, fiber.StatusOK, workflowApprovers, "Available approvers retrieved successfully", nil)
		}
	}

	var roleFilters []string
	switch documentType {
	case "REQUISITION", "requisition":
		roleFilters = []string{"manager", "supervisor", "department_head", "finance"}
	case "PURCHASE_ORDER", "purchase_order":
		roleFilters = []string{"procurement", "finance", "admin"}
	case "PAYMENT_VOUCHER", "payment_voucher":
		roleFilters = []string{"finance", "accountant", "admin"}
	case "BUDGET", "budget":
		roleFilters = []string{"finance", "admin", "executive"}
	default:
		roleFilters = []string{"manager", "admin"}
	}

	rows, err := config.PgxDB.Query(ctx, `
		SELECT id, name, email, role
		FROM users
		WHERE current_organization_id = $1 AND active = true AND role = ANY($2::text[])
	`, organizationID, roleFilters)
	if err != nil {
		log.Printf("Error fetching available approvers: %v", err)
		return utils.SendInternalError(c, "Failed to fetch available approvers", err)
	}
	defer rows.Close()

	approvers := []ApproverInfo{}
	for rows.Next() {
		var a ApproverInfo
		if err := rows.Scan(&a.ID, &a.Name, &a.Email, &a.Role); err != nil {
			return utils.SendInternalError(c, "Failed to scan approver", err)
		}
		approvers = append(approvers, a)
	}

	return utils.SendSuccess(c, fiber.StatusOK, approvers, "Available approvers retrieved successfully", nil)
}

// Helper function for string contains check
func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
