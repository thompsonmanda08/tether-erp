package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// budgetSelectColumns lists the columns scanned by scanBudgetRow.
// NUMERIC columns are cast to float8 so pgx scans them straight into float64.
const budgetSelectColumns = `
	id, organization_id, owner_id, budget_code, department, department_id,
	status, fiscal_year,
	COALESCE(total_budget,     0)::float8,
	COALESCE(allocated_amount, 0)::float8,
	COALESCE(remaining_amount, 0)::float8,
	approval_stage, approval_history, name, description, currency, created_by,
	items, action_history, metadata, created_at, updated_at
`

// scanBudgetRow scans a single budgets row into models.Budget.
type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanBudgetRow(row rowScanner, b *models.Budget) error {
	var (
		department, departmentID, fiscalYear, name, description, currency, createdBy *string
		approvalHistory, items, actionHistory, metadata                               []byte
		approvalStage                                                                 *int32
		status                                                                        *string
	)
	err := row.Scan(
		&b.ID, &b.OrganizationID, &b.OwnerID, &b.BudgetCode, &department, &departmentID,
		&status, &fiscalYear, &b.TotalBudget, &b.AllocatedAmount, &b.RemainingAmount,
		&approvalStage, &approvalHistory, &name, &description, &currency, &createdBy,
		&items, &actionHistory, &metadata, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if department != nil {
		b.Department = *department
	}
	if departmentID != nil {
		b.DepartmentID = *departmentID
	}
	if status != nil {
		b.Status = *status
	}
	if fiscalYear != nil {
		b.FiscalYear = *fiscalYear
	}
	if approvalStage != nil {
		b.ApprovalStage = int(*approvalStage)
	}
	if name != nil {
		b.Name = *name
	}
	if description != nil {
		b.Description = *description
	}
	if currency != nil {
		b.Currency = *currency
	}
	if createdBy != nil {
		b.CreatedBy = *createdBy
	}
	if len(approvalHistory) > 0 {
		_ = json.Unmarshal(approvalHistory, &b.ApprovalHistory)
	}
	if b.ApprovalHistory == nil {
		b.ApprovalHistory = []types.ApprovalRecord{}
	}
	if len(items) > 0 {
		b.Items = json.RawMessage(items)
	}
	if len(actionHistory) > 0 {
		_ = json.Unmarshal(actionHistory, &b.ActionHistory)
	}
	if len(metadata) > 0 {
		b.Metadata = json.RawMessage(metadata)
	}
	return nil
}

// loadBudgetByID loads one budget scoped to org.
func loadBudgetByID(ctx context.Context, id, orgID string) (*models.Budget, error) {
	sqlStr := `SELECT ` + budgetSelectColumns + ` FROM budgets WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	var b models.Budget
	if err := scanBudgetRow(config.PgxDB.QueryRow(ctx, sqlStr, id, orgID), &b); err != nil {
		return nil, err
	}
	return &b, nil
}

// insertBudget writes a new budget row.
func insertBudget(ctx context.Context, b *models.Budget) error {
	approvalHistoryJSON, _ := json.Marshal(b.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(b.ActionHistory)
	_, err := config.PgxDB.Exec(ctx, `
		INSERT INTO budgets (
			id, organization_id, owner_id, budget_code, department, department_id,
			status, fiscal_year, total_budget, allocated_amount, remaining_amount,
			approval_stage, approval_history, name, description, currency, created_by,
			items, action_history, metadata, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
			$18, $19, $20, $21, $22
		)`,
		b.ID, b.OrganizationID, b.OwnerID, b.BudgetCode,
		nilIfEmpty(b.Department), nilIfEmpty(b.DepartmentID),
		nilIfEmpty(b.Status), nilIfEmpty(b.FiscalYear),
		b.TotalBudget, b.AllocatedAmount, b.RemainingAmount,
		int32(b.ApprovalStage), approvalHistoryJSON,
		nilIfEmpty(b.Name), nilIfEmpty(b.Description),
		nilIfEmpty(b.Currency), nilIfEmpty(b.CreatedBy),
		jsonOrNil(b.Items), actionHistoryJSON, jsonOrNil(b.Metadata),
		b.CreatedAt, b.UpdatedAt,
	)
	return err
}

// updateBudget UPDATEs all mutable budget columns.
func updateBudget(ctx context.Context, b *models.Budget) error {
	approvalHistoryJSON, _ := json.Marshal(b.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(b.ActionHistory)
	_, err := config.PgxDB.Exec(ctx, `
		UPDATE budgets SET
			department = $2, department_id = $3, status = $4, fiscal_year = $5,
			total_budget = $6, allocated_amount = $7, remaining_amount = $8,
			approval_stage = $9, approval_history = $10, name = $11, description = $12,
			currency = $13, items = $14, action_history = $15, metadata = $16, updated_at = $17
		WHERE id = $1`,
		b.ID,
		nilIfEmpty(b.Department), nilIfEmpty(b.DepartmentID),
		nilIfEmpty(b.Status), nilIfEmpty(b.FiscalYear),
		b.TotalBudget, b.AllocatedAmount, b.RemainingAmount,
		int32(b.ApprovalStage), approvalHistoryJSON,
		nilIfEmpty(b.Name), nilIfEmpty(b.Description), nilIfEmpty(b.Currency),
		jsonOrNil(b.Items), actionHistoryJSON, jsonOrNil(b.Metadata),
		time.Now(),
	)
	return err
}

// nilIfEmpty turns "" into a SQL NULL.
func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// jsonOrNil returns nil when the raw message is empty, else its bytes.
func jsonOrNil(r json.RawMessage) interface{} {
	if len(r) == 0 {
		return nil
	}
	return []byte(r)
}

// loadUserByID loads a user; returns zero-value User and false on miss.
func loadUserByID(ctx context.Context, id string) (models.User, bool) {
	if id == "" {
		return models.User{}, false
	}
	var u models.User
	var lastLogin *time.Time
	err := config.PgxDB.QueryRow(ctx,
		`SELECT id, email, name, role, active, last_login, COALESCE(position, ''), COALESCE(man_number, '')
		 FROM users WHERE id = $1 AND deleted_at IS NULL`, id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.Active, &lastLogin, &u.Position, &u.ManNumber)
	if err != nil {
		return models.User{}, false
	}
	u.LastLogin = lastLogin
	return u, true
}

// GetBudgets retrieves all budgets with pagination and filtering
func GetBudgets(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_budgets_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	status := c.Query("status")
	department := c.Query("department")
	fiscalYear := c.Query("fiscalYear")

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"page":            page,
		"limit":           limit,
		"status":          status,
		"department":      department,
		"fiscal_year":     fiscalYear,
		"operation":       "get_budgets",
		"organization_id": tenant.OrganizationID,
	})

	ctx := c.Context()
	scope := utils.GetDocumentScope(ctx, tenant.UserID, tenant.UserRole, tenant.OrganizationID)

	// Build dynamic WHERE
	where := "organization_id = $1 AND deleted_at IS NULL"
	args := []interface{}{tenant.OrganizationID}
	nextArg := 2

	if status != "" {
		where += fmt.Sprintf(" AND UPPER(status) = UPPER($%d)", nextArg)
		args = append(args, status)
		nextArg++
	}
	if department != "" {
		where += fmt.Sprintf(" AND department = $%d", nextArg)
		args = append(args, department)
		nextArg++
	}
	if fiscalYear != "" {
		where += fmt.Sprintf(" AND fiscal_year = $%d", nextArg)
		args = append(args, fiscalYear)
		nextArg++
	}
	if frag, fragArgs, na := scope.WhereSQL("created_by", "budget", "", nextArg); frag != "" {
		where += " AND " + frag
		args = append(args, fragArgs...)
		nextArg = na
	}

	// Count
	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM budgets WHERE "+where, args...).Scan(&total); err != nil {
		logging.LogError(c, err, "failed_to_count_budgets")
		return utils.SendInternalError(c, "Failed to count budgets", err)
	}

	// Fetch paged
	offset := (page - 1) * limit
	listSQL := "SELECT " + budgetSelectColumns + " FROM budgets WHERE " + where +
		fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", nextArg, nextArg+1)
	args = append(args, limit, offset)

	rows, err := config.PgxDB.Query(ctx, listSQL, args...)
	if err != nil {
		logging.LogError(c, err, "failed_to_fetch_budgets")
		return utils.SendInternalError(c, "Failed to fetch budgets", err)
	}
	defer rows.Close()

	var budgets []models.Budget
	for rows.Next() {
		var b models.Budget
		if err := scanBudgetRow(rows, &b); err != nil {
			logging.LogError(c, err, "failed_to_scan_budget")
			continue
		}
		budgets = append(budgets, b)
	}

	// Enrich owner names
	for i := range budgets {
		if u, ok := loadUserByID(ctx, budgets[i].OwnerID); ok {
			budgets[i].Owner = &u
			budgets[i].OwnerName = u.Name
		}
	}

	responses := make([]types.BudgetResponse, 0, len(budgets))
	for _, budget := range budgets {
		responses = append(responses, modelToBudgetResponse(budget))
	}

	return utils.SendPaginatedSuccess(c, responses, "Budgets retrieved successfully", page, limit, total)
}

// CreateBudget creates a new budget
func CreateBudget(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("create_budget_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	var req types.CreateBudgetRequest
	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_create_budget_request")
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if req.BudgetCode == "" {
		year := time.Now().Year()
		randomID := uuid.New().String()[:8]
		req.BudgetCode = fmt.Sprintf("BG-%d-%s", year, strings.ToUpper(randomID))
	}
	if req.TotalBudget <= 0 {
		return utils.SendBadRequestError(c, "Total budget must be greater than 0")
	}
	if req.AllocatedAmount < 0 {
		return utils.SendBadRequestError(c, "Allocated amount cannot be negative")
	}

	userID, _ := c.Locals("userID").(string)
	if userID == "" {
		return utils.SendUnauthorizedError(c, "User ID not found in token")
	}

	ctx := c.Context()
	user, ok := loadUserByID(ctx, userID)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not found")
	}

	remaining := req.TotalBudget - req.AllocatedAmount
	now := time.Now()

	budget := models.Budget{
		ID:              uuid.New().String(),
		OrganizationID:  tenant.OrganizationID,
		OwnerID:         userID,
		BudgetCode:      req.BudgetCode,
		Name:            req.Name,
		Description:     req.Description,
		Department:      req.Department,
		DepartmentID:    req.DepartmentID,
		Status:          "DRAFT",
		FiscalYear:      req.FiscalYear,
		TotalBudget:     req.TotalBudget,
		AllocatedAmount: req.AllocatedAmount,
		RemainingAmount: remaining,
		Currency:        req.Currency,
		ApprovalStage:   0,
		CreatedBy:       userID,
		CreatedAt:       now,
		UpdatedAt:       now,
		ApprovalHistory: []types.ApprovalRecord{},
		ActionHistory: []types.ActionHistoryEntry{
			{
				ID:              uuid.New().String(),
				Action:          "BUDGET_CREATED",
				ActionType:      "BUDGET_CREATED",
				PerformedBy:     userID,
				PerformedByName: user.Name,
				Timestamp:       now,
				PerformedAt:     now,
				Comments:        "Budget created",
				Metadata:        map[string]interface{}{},
			},
		},
	}

	if err := insertBudget(ctx, &budget); err != nil {
		logging.LogError(c, err, "failed_to_create_budget_in_database")
		return utils.SendInternalError(c, "Failed to create budget", err)
	}

	budget.Owner = &user
	budget.OwnerName = user.Name

	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: tenant.OrganizationID,
		DocumentID:     budget.ID,
		DocumentType:   "budget",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "created",
		Details:        map[string]interface{}{"budgetCode": budget.BudgetCode},
	})

	logger.Info("budget_created_successfully")
	return utils.SendCreatedSuccess(c, modelToBudgetResponse(budget), "Budget created successfully")
}

// GetBudget retrieves a single budget by ID
func GetBudget(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Budget ID is required")
	}

	ctx := c.Context()
	budget, err := loadBudgetByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Budget")
	}
	if u, ok := loadUserByID(ctx, budget.OwnerID); ok {
		budget.Owner = &u
		budget.OwnerName = u.Name
	}

	return utils.SendSimpleSuccess(c, modelToBudgetResponse(*budget), "Budget retrieved successfully")
}

// UpdateBudget updates an existing budget
func UpdateBudget(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Budget ID is required")
	}

	var req types.UpdateBudgetRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	userIDAny := c.Locals("userID")
	userID := "system"
	if s, ok := userIDAny.(string); ok && s != "" {
		userID = s
	}

	ctx := c.Context()
	budget, err := loadBudgetByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Budget")
	}

	if strings.ToUpper(budget.Status) != "DRAFT" && strings.ToUpper(budget.Status) != "PENDING" {
		return utils.SendForbiddenError(c, fmt.Sprintf("Cannot update budget in %s status", budget.Status))
	}

	var updates []string
	if req.Department != "" && req.Department != budget.Department {
		budget.Department = req.Department
		updates = append(updates, "department")
	}
	if req.TotalBudget > 0 && req.TotalBudget != budget.TotalBudget {
		budget.TotalBudget = req.TotalBudget
		updates = append(updates, "total budget")
	}
	if req.AllocatedAmount >= 0 && req.AllocatedAmount != budget.AllocatedAmount {
		budget.AllocatedAmount = req.AllocatedAmount
		updates = append(updates, "allocated amount")
	}
	if req.Name != "" && req.Name != budget.Name {
		budget.Name = req.Name
		updates = append(updates, "name")
	}
	if req.Description != "" && req.Description != budget.Description {
		budget.Description = req.Description
		updates = append(updates, "description")
	}
	if req.Currency != "" && req.Currency != budget.Currency {
		budget.Currency = req.Currency
		updates = append(updates, "currency")
	}
	if req.Items != nil {
		itemsJSON, err := json.Marshal(req.Items)
		if err != nil {
			return utils.SendBadRequestError(c, "Invalid items format")
		}
		budget.Items = itemsJSON
		updates = append(updates, "budget items")
	}

	budget.RemainingAmount = budget.TotalBudget - budget.AllocatedAmount
	budget.UpdatedAt = time.Now()

	if len(updates) > 0 {
		user, _ := loadUserByID(ctx, userID)
		actionMessage := fmt.Sprintf("Updated %s", strings.Join(updates, ", "))
		budget.ActionHistory = append(budget.ActionHistory, types.ActionHistoryEntry{
			ID:              uuid.New().String(),
			Action:          "BUDGET_UPDATED",
			ActionType:      "BUDGET_UPDATED",
			PerformedBy:     userID,
			PerformedByName: user.Name,
			Timestamp:       time.Now(),
			PerformedAt:     time.Now(),
			Comments:        actionMessage,
			Metadata:        map[string]interface{}{},
		})

		go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
			OrganizationID: tenant.OrganizationID,
			DocumentID:     budget.ID,
			DocumentType:   "budget",
			UserID:         userID,
			ActorName:      user.Name,
			ActorRole:      user.Role,
			Action:         "updated",
			Details:        map[string]interface{}{"updates": updates},
		})
	}

	if err := updateBudget(ctx, budget); err != nil {
		return utils.SendInternalError(c, "Failed to update budget", err)
	}

	if u, ok := loadUserByID(ctx, budget.OwnerID); ok {
		budget.Owner = &u
		budget.OwnerName = u.Name
	}

	return utils.SendSimpleSuccess(c, modelToBudgetResponse(*budget), "Budget updated successfully")
}

// DeleteBudget deletes a budget (soft delete)
func DeleteBudget(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Budget ID is required")
	}

	ctx := c.Context()
	budget, err := loadBudgetByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Budget")
	}

	if strings.ToUpper(budget.Status) != "DRAFT" {
		return utils.SendForbiddenError(c, "Only draft budgets can be deleted")
	}

	_, err = config.PgxDB.Exec(ctx,
		`UPDATE budgets SET deleted_at = $1, updated_at = $1 WHERE id = $2`,
		time.Now(), id,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to delete budget", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Budget deleted successfully")
}

// SubmitBudget submits a budget for approval workflow
func SubmitBudget(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Budget ID is required")
	}

	ctx := c.Context()
	budget, err := loadBudgetByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Budget")
	}

	if strings.ToUpper(budget.Status) != "DRAFT" {
		return utils.SendBadRequestError(c, fmt.Sprintf("Cannot submit budget in %s status", budget.Status))
	}

	userID, _ := c.Locals("userID").(string)
	organizationID, _ := c.Locals("organizationID").(string)

	var submitReq types.SubmitDocumentRequest
	if err := c.BodyParser(&submitReq); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if submitReq.WorkflowID == "" {
		return utils.SendBadRequestError(c, "workflowId is required")
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	if _, err := workflowExecutionService.AssignWorkflowToDocumentWithID(
		ctx, organizationID, budget.ID, "budget", submitReq.WorkflowID, userID,
	); err != nil {
		return utils.SendInternalError(c, "Failed to assign workflow to budget", err)
	}

	budget.Status = "PENDING"
	budget.UpdatedAt = time.Now()
	budget.ActionHistory = append(budget.ActionHistory, types.ActionHistoryEntry{
		Action:      "SUBMIT",
		PerformedBy: userID,
		Timestamp:   time.Now(),
		Comments:    "Budget submitted for approval",
	})

	if err := updateBudget(ctx, budget); err != nil {
		return utils.SendInternalError(c, "Failed to submit budget", err)
	}

	if u, ok := loadUserByID(ctx, budget.OwnerID); ok {
		budget.Owner = &u
		budget.OwnerName = u.Name
	}

	submitter, _ := loadUserByID(ctx, userID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     budget.ID,
		DocumentType:   "budget",
		UserID:         userID,
		ActorName:      submitter.Name,
		ActorRole:      submitter.Role,
		Action:         "submitted",
		Details:        map[string]interface{}{"budgetCode": budget.BudgetCode},
	})

	return utils.SendSimpleSuccess(c, modelToBudgetResponse(*budget), "Budget submitted for approval successfully")
}

// modelToBudgetResponse converts a model to its API response shape.
func modelToBudgetResponse(budget models.Budget) types.BudgetResponse {
	approvalHistory := budget.ApprovalHistory
	if approvalHistory == nil {
		approvalHistory = []types.ApprovalRecord{}
	}
	actionHistory := budget.ActionHistory
	if actionHistory == nil {
		actionHistory = []types.ActionHistoryEntry{}
	}

	items := make([]interface{}, 0)
	if len(budget.Items) > 0 {
		_ = json.Unmarshal(budget.Items, &items)
	}

	ownerName := budget.OwnerName
	if budget.Owner != nil && budget.Owner.Name != "" {
		ownerName = budget.Owner.Name
	}

	return types.BudgetResponse{
		ID:              budget.ID,
		BudgetCode:      budget.BudgetCode,
		OwnerID:         budget.OwnerID,
		OwnerName:       ownerName,
		Department:      budget.Department,
		DepartmentID:    budget.DepartmentID,
		Status:          budget.Status,
		FiscalYear:      budget.FiscalYear,
		TotalBudget:     budget.TotalBudget,
		AllocatedAmount: budget.AllocatedAmount,
		RemainingAmount: budget.RemainingAmount,
		ApprovalStage:   budget.ApprovalStage,
		ApprovalHistory: approvalHistory,
		ActionHistory:   actionHistory,
		Name:            budget.Name,
		Description:     budget.Description,
		Currency:        budget.Currency,
		CreatedBy:       budget.CreatedBy,
		Items:           items,
		CreatedAt:       budget.CreatedAt,
		UpdatedAt:       budget.UpdatedAt,
	}
}

// errIsNoRows reports whether err is the pgx "no rows" sentinel.
func errIsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
