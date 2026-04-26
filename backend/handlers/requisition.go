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
	db "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// requisitionSelectColumns lists the columns scanned by scanRequisitionRow.
const requisitionSelectColumns = `
	id, organization_id, document_number, requester_id, title, description,
	department, department_id, status, priority,
	items, COALESCE(total_amount, 0)::float8, currency,
	approval_stage, approval_history, action_history,
	category_id, preferred_vendor_id, is_estimate, required_by_date,
	cost_center, project_code, budget_code, source_of_funds,
	created_by, created_by_name, created_by_role,
	metadata, automation_used, auto_created_po,
	created_at, updated_at
`

func scanRequisitionRow(row rowScanner, r *models.Requisition) error {
	var (
		description, department, departmentID, status, priority *string
		categoryID, preferredVendorID                           *string
		costCenter, projectCode, budgetCode, sourceOfFunds      *string
		createdBy, createdByName, createdByRole                 *string
		approvalHistoryJSON, actionHistoryJSON                  []byte
		itemsJSON, metadataJSON, autoCreatedPOJSON              []byte
		approvalStage                                           *int32
		isEstimate, automationUsed                              *bool
		requiredByDate                                          *time.Time
	)
	err := row.Scan(
		&r.ID, &r.OrganizationID, &r.DocumentNumber, &r.RequesterId, &r.Title, &description,
		&department, &departmentID, &status, &priority,
		&itemsJSON, &r.TotalAmount, &r.Currency,
		&approvalStage, &approvalHistoryJSON, &actionHistoryJSON,
		&categoryID, &preferredVendorID, &isEstimate, &requiredByDate,
		&costCenter, &projectCode, &budgetCode, &sourceOfFunds,
		&createdBy, &createdByName, &createdByRole,
		&metadataJSON, &automationUsed, &autoCreatedPOJSON,
		&r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if description != nil {
		r.Description = *description
	}
	if department != nil {
		r.Department = *department
	}
	if departmentID != nil {
		r.DepartmentId = *departmentID
	}
	if status != nil {
		r.Status = *status
	}
	if priority != nil {
		r.Priority = *priority
	}
	if approvalStage != nil {
		r.ApprovalStage = int(*approvalStage)
	}
	r.CategoryID = categoryID
	r.PreferredVendorID = preferredVendorID
	if isEstimate != nil {
		r.IsEstimate = *isEstimate
	}
	if requiredByDate != nil {
		r.RequiredByDate = *requiredByDate
	}
	if costCenter != nil {
		r.CostCenter = *costCenter
	}
	if projectCode != nil {
		r.ProjectCode = *projectCode
	}
	if budgetCode != nil {
		r.BudgetCode = *budgetCode
	}
	if sourceOfFunds != nil {
		r.SourceOfFunds = *sourceOfFunds
	}
	if createdBy != nil {
		r.CreatedBy = *createdBy
	}
	if createdByName != nil {
		r.CreatedByName = *createdByName
		r.RequesterName = *createdByName
	}
	if createdByRole != nil {
		r.CreatedByRole = *createdByRole
	}
	if len(itemsJSON) > 0 {
		_ = json.Unmarshal(itemsJSON, &r.Items)
	}
	if r.Items == nil {
		r.Items = []types.RequisitionItem{}
	}
	if len(approvalHistoryJSON) > 0 {
		_ = json.Unmarshal(approvalHistoryJSON, &r.ApprovalHistory)
	}
	if r.ApprovalHistory == nil {
		r.ApprovalHistory = []types.ApprovalRecord{}
	}
	if len(actionHistoryJSON) > 0 {
		_ = json.Unmarshal(actionHistoryJSON, &r.ActionHistory)
	}
	if len(metadataJSON) > 0 {
		r.Metadata = json.RawMessage(metadataJSON)
	}
	if len(autoCreatedPOJSON) > 0 {
		r.AutoCreatedPO = json.RawMessage(autoCreatedPOJSON)
	}
	if automationUsed != nil {
		r.AutomationUsed = *automationUsed
	}
	return nil
}

// loadRequisitionByID loads one requisition scoped to org.
func loadRequisitionByID(ctx context.Context, id, orgID string) (*models.Requisition, error) {
	q := `SELECT ` + requisitionSelectColumns + ` FROM requisitions
	      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	var r models.Requisition
	if err := scanRequisitionRow(config.PgxDB.QueryRow(ctx, q, id, orgID), &r); err != nil {
		return nil, err
	}
	return &r, nil
}

// loadRequisitionByIDOrNumber tries id, then document_number.
func loadRequisitionByIDOrNumber(ctx context.Context, idOrNum, orgID string) (*models.Requisition, error) {
	q := `SELECT ` + requisitionSelectColumns + ` FROM requisitions
	      WHERE organization_id = $1 AND deleted_at IS NULL AND (id = $2 OR document_number = $2)`
	var r models.Requisition
	if err := scanRequisitionRow(config.PgxDB.QueryRow(ctx, q, orgID, idOrNum), &r); err != nil {
		return nil, err
	}
	return &r, nil
}

// insertRequisition writes a new requisition row.
func insertRequisition(ctx context.Context, r *models.Requisition) error {
	itemsJSON, _ := json.Marshal(r.Items)
	approvalHistoryJSON, _ := json.Marshal(r.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(r.ActionHistory)
	_, err := config.PgxDB.Exec(ctx, `
		INSERT INTO requisitions (
			id, organization_id, document_number, requester_id, title, description,
			department, department_id, status, priority,
			items, total_amount, currency,
			approval_stage, approval_history, action_history,
			category_id, preferred_vendor_id, is_estimate, required_by_date,
			cost_center, project_code, budget_code, source_of_funds,
			created_by, created_by_name, created_by_role,
			metadata, automation_used, auto_created_po,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
			$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
		)`,
		r.ID, r.OrganizationID, r.DocumentNumber, r.RequesterId, r.Title, nilIfEmpty(r.Description),
		nilIfEmpty(r.Department), nilIfEmpty(r.DepartmentId), nilIfEmpty(r.Status), nilIfEmpty(r.Priority),
		itemsJSON, r.TotalAmount, r.Currency,
		int32(r.ApprovalStage), approvalHistoryJSON, actionHistoryJSON,
		r.CategoryID, r.PreferredVendorID, r.IsEstimate, nilIfZeroTime(r.RequiredByDate),
		nilIfEmpty(r.CostCenter), nilIfEmpty(r.ProjectCode), nilIfEmpty(r.BudgetCode), nilIfEmpty(r.SourceOfFunds),
		nilIfEmpty(r.CreatedBy), nilIfEmpty(r.CreatedByName), nilIfEmpty(r.CreatedByRole),
		jsonOrNil(r.Metadata), r.AutomationUsed, jsonOrNil(r.AutoCreatedPO),
		r.CreatedAt, r.UpdatedAt,
	)
	return err
}

// updateRequisition saves all mutable fields.
func updateRequisition(ctx context.Context, r *models.Requisition) error {
	itemsJSON, _ := json.Marshal(r.Items)
	approvalHistoryJSON, _ := json.Marshal(r.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(r.ActionHistory)
	_, err := config.PgxDB.Exec(ctx, `
		UPDATE requisitions SET
			title = $2, description = $3, department = $4, department_id = $5,
			status = $6, priority = $7, items = $8, total_amount = $9, currency = $10,
			approval_stage = $11, approval_history = $12, action_history = $13,
			category_id = $14, preferred_vendor_id = $15, is_estimate = $16, required_by_date = $17,
			cost_center = $18, project_code = $19, budget_code = $20, source_of_funds = $21,
			metadata = $22, automation_used = $23, auto_created_po = $24, updated_at = $25
		WHERE id = $1`,
		r.ID, r.Title, nilIfEmpty(r.Description),
		nilIfEmpty(r.Department), nilIfEmpty(r.DepartmentId),
		nilIfEmpty(r.Status), nilIfEmpty(r.Priority),
		itemsJSON, r.TotalAmount, r.Currency,
		int32(r.ApprovalStage), approvalHistoryJSON, actionHistoryJSON,
		r.CategoryID, r.PreferredVendorID, r.IsEstimate, nilIfZeroTime(r.RequiredByDate),
		nilIfEmpty(r.CostCenter), nilIfEmpty(r.ProjectCode), nilIfEmpty(r.BudgetCode), nilIfEmpty(r.SourceOfFunds),
		jsonOrNil(r.Metadata), r.AutomationUsed, jsonOrNil(r.AutoCreatedPO),
		time.Now(),
	)
	return err
}

// nilIfZeroTime returns nil for a zero-value time, else its address.
func nilIfZeroTime(t time.Time) interface{} {
	if t.IsZero() {
		return nil
	}
	return t
}

// loadCategoryByID loads a category scoped to org.
func loadCategoryByID(ctx context.Context, id, orgID string) (*models.Category, error) {
	var c models.Category
	var description *string
	var active *bool
	err := config.PgxDB.QueryRow(ctx,
		`SELECT id, organization_id, name, description, active, created_at, updated_at
		 FROM categories WHERE id = $1 AND organization_id = $2`,
		id, orgID,
	).Scan(&c.ID, &c.OrganizationID, &c.Name, &description, &active, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if description != nil {
		c.Description = *description
	}
	if active != nil {
		c.Active = *active
	}
	return &c, nil
}

// loadVendorByID loads a vendor scoped to org.
func loadVendorByID(ctx context.Context, id, orgID string) (*models.Vendor, error) {
	row, err := config.Queries.GetVendorByID(ctx, db.GetVendorByIDParams{ID: id})
	if err != nil {
		return nil, err
	}
	if row.OrganizationID != orgID {
		return nil, pgx.ErrNoRows
	}
	v := sqlcVendorToModel(row)
	return &v, nil
}

// GetRequisitions retrieves all requisitions with pagination and filtering
func GetRequisitions(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_requisitions_request")

	page, pageSize := utils.NormalizePaginationParams(
		c.QueryInt("page", 1),
		c.QueryInt("page_size", 10),
	)

	status := c.Query("status")
	department := c.Query("department")
	priority := c.Query("priority")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}
	organizationID := tenant.OrganizationID

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":      "get_requisitions",
		"page":           page,
		"page_size":      pageSize,
		"status":         status,
		"department":     department,
		"priority":       priority,
		"organizationID": organizationID,
	})

	ctx := c.Context()
	scope := utils.GetDocumentScope(ctx, tenant.UserID, tenant.UserRole, organizationID)
	offset := int32((page - 1) * pageSize)
	orgRoleIDs := scope.OrgRoleIDs
	if orgRoleIDs == nil {
		orgRoleIDs = []string{}
	}

	var total int64
	var ids []string

	switch {
	case scope.CanViewAll:
		total, err = config.Queries.CountRequisitionsAll(ctx, db.CountRequisitionsAllParams{
			OrganizationID: organizationID, Column2: status, Column3: department, Column4: priority,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count requisitions", err)
		}
		ids, err = config.Queries.ListRequisitionIDsAll(ctx, db.ListRequisitionIDsAllParams{
			OrganizationID: organizationID, Column2: status, Column3: department, Column4: priority,
			Limit: int32(pageSize), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch requisitions", err)
		}
	case scope.IsProcurement:
		total, err = config.Queries.CountRequisitionsProcurement(ctx, db.CountRequisitionsProcurementParams{
			OrganizationID: organizationID, Column2: status, Column3: department, Column4: priority,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count requisitions", err)
		}
		ids, err = config.Queries.ListRequisitionIDsProcurement(ctx, db.ListRequisitionIDsProcurementParams{
			OrganizationID: organizationID, Column2: status, Column3: department, Column4: priority,
			Limit: int32(pageSize), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch requisitions", err)
		}
	default:
		total, err = config.Queries.CountRequisitionsLimited(ctx, db.CountRequisitionsLimitedParams{
			OrganizationID: organizationID, Column2: status, Column3: department, Column4: priority,
			RequesterID: scope.UserID, Lower: scope.UserRole, Column7: orgRoleIDs,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count requisitions", err)
		}
		ids, err = config.Queries.ListRequisitionIDsLimited(ctx, db.ListRequisitionIDsLimitedParams{
			OrganizationID: organizationID, Column2: status, Column3: department, Column4: priority,
			RequesterID: scope.UserID, Lower: scope.UserRole, Column7: orgRoleIDs,
			Limit: int32(pageSize), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch requisitions", err)
		}
	}

	requisitions := loadRequisitionsByIDs(ctx, ids)

	responses := make([]types.RequisitionResponse, 0, len(requisitions))
	for _, req := range requisitions {
		responses = append(responses, modelToRequisitionResponse(req))
	}

	if len(responses) > 0 {
		reqIDs := make([]string, len(responses))
		for i, r := range responses {
			reqIDs[i] = r.ID
		}
		poRows, _ := config.Queries.GetLinkedPOsForRequisitions(ctx, db.GetLinkedPOsForRequisitionsParams{
			Column1: reqIDs, OrganizationID: organizationID,
		})
		poMap := make(map[string]db.GetLinkedPOsForRequisitionsRow, len(poRows))
		for _, r := range poRows {
			if r.SourceRequisitionID != nil {
				poMap[*r.SourceRequisitionID] = r
			}
		}
		for i, r := range responses {
			if row, ok := poMap[r.ID]; ok {
				poStatus := ""
				if row.Status != nil {
					poStatus = *row.Status
				}
				responses[i].LinkedPO = &types.LinkedPOSummary{
					ID:             row.ID,
					DocumentNumber: row.DocumentNumber,
					Status:         poStatus,
				}
			}
		}
	}

	pagination := utils.CalculatePagination(page, pageSize, total)
	return utils.SendSuccess(c, fiber.StatusOK, responses, "Requisitions retrieved successfully", pagination)
}

// loadRequisitionsByIDs fetches a batch of requisitions by ID, preserving DESC-by-created_at order.
func loadRequisitionsByIDs(ctx context.Context, ids []string) []models.Requisition {
	if len(ids) == 0 {
		return nil
	}
	q := `SELECT ` + requisitionSelectColumns + ` FROM requisitions
	      WHERE id = ANY($1::text[]) AND deleted_at IS NULL ORDER BY created_at DESC`
	rows, err := config.PgxDB.Query(ctx, q, ids)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make([]models.Requisition, 0, len(ids))
	for rows.Next() {
		var r models.Requisition
		if err := scanRequisitionRow(rows, &r); err == nil {
			out = append(out, r)
		}
	}

	// Enrich requester / category / preferred vendor for the page
	for i := range out {
		if u, ok := loadUserByID(ctx, out[i].RequesterId); ok {
			out[i].Requester = &u
			if out[i].RequesterName == "" {
				out[i].RequesterName = u.Name
			}
		}
		if out[i].CategoryID != nil && *out[i].CategoryID != "" {
			if cat, err := loadCategoryByID(ctx, *out[i].CategoryID, out[i].OrganizationID); err == nil {
				out[i].Category = cat
				out[i].CategoryName = cat.Name
			}
		}
		if out[i].PreferredVendorID != nil && *out[i].PreferredVendorID != "" {
			if v, err := loadVendorByID(ctx, *out[i].PreferredVendorID, out[i].OrganizationID); err == nil {
				out[i].PreferredVendor = v
				out[i].PreferredVendorName = v.Name
			}
		}
	}
	return out
}

// CreateRequisition creates a new requisition
func CreateRequisition(c *fiber.Ctx) error {
	var req types.CreateRequisitionRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if req.Title == "" || len(req.Title) < 3 {
		return utils.SendBadRequestError(c, "Title is required and must be at least 3 characters")
	}
	if req.Description == "" || len(req.Description) < 10 {
		return utils.SendBadRequestError(c, "Description is required and must be at least 10 characters")
	}
	if len(req.Items) == 0 {
		return utils.SendBadRequestError(c, "At least one item is required")
	}
	for _, item := range req.Items {
		if item.Description == "" {
			return utils.SendBadRequestError(c, "All items must have descriptions")
		}
		if item.Quantity <= 0 {
			return utils.SendBadRequestError(c, "All items must have positive quantities")
		}
		if item.UnitPrice <= 0 {
			return utils.SendBadRequestError(c, "All items must have positive unit prices")
		}
	}
	if req.TotalAmount <= 0 {
		return utils.SendBadRequestError(c, "Total amount must be greater than 0")
	}

	userID, _ := c.Locals("userID").(string)
	if userID == "" {
		return utils.SendUnauthorizedError(c, "User ID not found in token")
	}
	organizationID, _ := c.Locals("organizationID").(string)
	if organizationID == "" {
		return utils.SendUnauthorizedError(c, "Organization ID not found in token")
	}

	ctx := c.Context()
	user, ok := loadUserByID(ctx, userID)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not found")
	}

	resolvedCategoryName := ""
	if req.CategoryID != nil && *req.CategoryID != "" {
		cat, err := loadCategoryByID(ctx, *req.CategoryID, organizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Category not found in your organization")
		}
		resolvedCategoryName = cat.Name
	}
	if req.PreferredVendorID != nil && *req.PreferredVendorID != "" {
		if _, err := loadVendorByID(ctx, *req.PreferredVendorID, organizationID); err != nil {
			return utils.SendBadRequestError(c, "Preferred vendor not found in your organization")
		}
	}

	documentNumber := utils.GenerateDocumentNumber("REQ")

	metadataMap := map[string]interface{}{}
	for k, v := range req.Metadata {
		metadataMap[k] = v
	}
	if req.RequestedFor != "" {
		metadataMap["requestedFor"] = req.RequestedFor
	}
	if req.OtherCategoryText != "" {
		metadataMap["otherCategoryText"] = req.OtherCategoryText
	}
	if resolvedCategoryName != "" {
		metadataMap["categoryName"] = resolvedCategoryName
	}
	metadataBytes, _ := json.Marshal(metadataMap)

	now := time.Now()
	requisition := models.Requisition{
		ID:                uuid.New().String(),
		OrganizationID:    organizationID,
		DocumentNumber:    documentNumber,
		RequesterId:       userID,
		RequesterName:     user.Name,
		Title:             req.Title,
		Description:       req.Description,
		Department:        req.Department,
		DepartmentId:      req.DepartmentId,
		Status:            "DRAFT",
		Priority:          req.Priority,
		Items:             req.Items,
		TotalAmount:       req.TotalAmount,
		Currency:          req.Currency,
		CategoryID:        req.CategoryID,
		PreferredVendorID: req.PreferredVendorID,
		IsEstimate:        req.IsEstimate,
		ApprovalStage:     0,
		BudgetCode:        req.BudgetCode,
		SourceOfFunds:     req.SourceOfFunds,
		CostCenter:        req.CostCenter,
		ProjectCode:       req.ProjectCode,
		RequiredByDate:    req.RequiredByDate,
		CreatedBy:         userID,
		CreatedByName:     user.Name,
		CreatedByRole:     user.Role,
		RequestedBy:       userID,
		RequestedByName:   user.Name,
		RequestedByRole:   user.Role,
		RequestedDate:     now,
		Metadata:          json.RawMessage(metadataBytes),
		ApprovalHistory:   []types.ApprovalRecord{},
		ActionHistory: []types.ActionHistoryEntry{
			{
				ID:              uuid.New().String(),
				Action:          "CREATE",
				PerformedBy:     userID,
				PerformedByName: user.Name,
				PerformedByRole: user.Role,
				Timestamp:       now,
				Comments:        "Requisition created",
				ActionType:      "CREATE",
				NewStatus:       "DRAFT",
			},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := insertRequisition(ctx, &requisition); err != nil {
		return utils.SendInternalError(c, "Failed to create requisition", err)
	}

	requisition.Requester = &user
	if requisition.CategoryID != nil && *requisition.CategoryID != "" {
		if cat, err := loadCategoryByID(ctx, *requisition.CategoryID, organizationID); err == nil {
			requisition.Category = cat
			requisition.CategoryName = cat.Name
		}
	}
	if requisition.PreferredVendorID != nil && *requisition.PreferredVendorID != "" {
		if v, err := loadVendorByID(ctx, *requisition.PreferredVendorID, organizationID); err == nil {
			requisition.PreferredVendor = v
			requisition.PreferredVendorName = v.Name
		}
	}

	go utils.SyncDocument("REQUISITION", requisition.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     requisition.ID,
		DocumentType:   "requisition",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "created",
		Details:        map[string]interface{}{"documentNumber": requisition.DocumentNumber, "title": requisition.Title},
	})

	return c.Status(fiber.StatusCreated).JSON(types.DetailResponse{
		Success: true,
		Data:    modelToRequisitionResponse(requisition),
	})
}

// GetRequisition retrieves a single requisition by ID or document number.
func GetRequisition(c *fiber.Ctx) error {
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Requisition ID is required")
	}

	organizationID, _ := c.Locals("organizationID").(string)
	ctx := c.Context()

	requisition, err := loadRequisitionByIDOrNumber(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Requisition")
	}

	if u, ok := loadUserByID(ctx, requisition.RequesterId); ok {
		requisition.Requester = &u
		if requisition.RequesterName == "" {
			requisition.RequesterName = u.Name
		}
	}
	if requisition.CategoryID != nil && *requisition.CategoryID != "" {
		if cat, err := loadCategoryByID(ctx, *requisition.CategoryID, organizationID); err == nil {
			requisition.Category = cat
			requisition.CategoryName = cat.Name
		}
	}
	if requisition.PreferredVendorID != nil && *requisition.PreferredVendorID != "" {
		if v, err := loadVendorByID(ctx, *requisition.PreferredVendorID, organizationID); err == nil {
			requisition.PreferredVendor = v
			requisition.PreferredVendorName = v.Name
		}
	}

	response := modelToRequisitionResponse(*requisition)
	if liveHistory := utils.GetDocumentApprovalHistory(ctx, requisition.ID, "requisition"); len(liveHistory) > 0 {
		response.ApprovalHistory = liveHistory
	}
	return c.JSON(types.DetailResponse{Success: true, Data: response})
}

// UpdateRequisition updates an existing requisition.
func UpdateRequisition(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Requisition ID is required")
	}

	var req types.UpdateRequisitionRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	organizationID, _ := c.Locals("organizationID").(string)
	ctx := c.Context()

	requisition, err := loadRequisitionByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Requisition")
	}

	statusUpper := strings.ToUpper(requisition.Status)
	isMetadataOnly := req.Metadata != nil && req.Title == "" && req.Description == "" &&
		req.Department == "" && req.Priority == "" && len(req.Items) == 0 &&
		req.TotalAmount == 0 && req.Currency == ""
	if statusUpper != "DRAFT" && statusUpper != "PENDING" && !isMetadataOnly {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot update requisition in %s status", requisition.Status),
		})
	}

	if req.Title != "" {
		requisition.Title = req.Title
	}
	if req.Description != "" {
		requisition.Description = req.Description
	}
	if req.Department != "" {
		requisition.Department = req.Department
	}
	if req.Priority != "" {
		requisition.Priority = req.Priority
	}
	if len(req.Items) > 0 {
		requisition.Items = req.Items
	}
	if req.TotalAmount > 0 {
		requisition.TotalAmount = req.TotalAmount
	}
	if req.Currency != "" {
		requisition.Currency = req.Currency
	}
	if req.CategoryID != nil {
		if *req.CategoryID != "" {
			if _, err := loadCategoryByID(ctx, *req.CategoryID, organizationID); err != nil {
				return utils.SendBadRequestError(c, "Category not found")
			}
		}
		requisition.CategoryID = req.CategoryID
	}
	if req.PreferredVendorID != nil {
		if *req.PreferredVendorID != "" {
			if _, err := loadVendorByID(ctx, *req.PreferredVendorID, organizationID); err != nil {
				return utils.SendBadRequestError(c, "Preferred vendor not found")
			}
		}
		requisition.PreferredVendorID = req.PreferredVendorID
	}
	if req.IsEstimate != nil {
		requisition.IsEstimate = *req.IsEstimate
	}
	if req.SourceOfFunds != "" {
		requisition.SourceOfFunds = req.SourceOfFunds
	}

	if req.Metadata != nil {
		existingMeta := map[string]interface{}{}
		if len(requisition.Metadata) > 0 {
			_ = json.Unmarshal(requisition.Metadata, &existingMeta)
		}
		for k, v := range req.Metadata {
			existingMeta[k] = v
		}
		metaBytes, _ := json.Marshal(existingMeta)
		requisition.Metadata = json.RawMessage(metaBytes)
	}

	userID, _ := c.Locals("userID").(string)
	if user, ok := loadUserByID(ctx, userID); ok {
		requisition.ActionHistory = append(requisition.ActionHistory, types.ActionHistoryEntry{
			ID:              uuid.New().String(),
			Action:          "UPDATE",
			PerformedBy:     userID,
			PerformedByName: user.Name,
			PerformedByRole: user.Role,
			Timestamp:       time.Now(),
			Comments:        "Requisition updated",
			ActionType:      "UPDATE",
			PreviousStatus:  requisition.Status,
			NewStatus:       requisition.Status,
		})
	}

	requisition.UpdatedAt = time.Now()

	if err := updateRequisition(ctx, requisition); err != nil {
		return utils.SendInternalError(c, "Failed to update requisition", err)
	}

	// Sync quotations into linked PO if metadata has quotations
	if req.Metadata != nil {
		if _, hasQuotations := req.Metadata["quotations"]; hasQuotations {
			go syncQuotationsToLinkedPO(requisition.ID, organizationID, requisition.Metadata)
		}
	}

	if u, ok := loadUserByID(ctx, requisition.RequesterId); ok {
		requisition.Requester = &u
		if requisition.RequesterName == "" {
			requisition.RequesterName = u.Name
		}
	}
	if requisition.CategoryID != nil && *requisition.CategoryID != "" {
		if cat, err := loadCategoryByID(ctx, *requisition.CategoryID, organizationID); err == nil {
			requisition.Category = cat
			requisition.CategoryName = cat.Name
		}
	}
	if requisition.PreferredVendorID != nil && *requisition.PreferredVendorID != "" {
		if v, err := loadVendorByID(ctx, *requisition.PreferredVendorID, organizationID); err == nil {
			requisition.PreferredVendor = v
			requisition.PreferredVendorName = v.Name
		}
	}

	go utils.SyncDocument("REQUISITION", requisition.ID)

	actorID, _ := c.Locals("userID").(string)
	actorRole, _ := c.Locals("userRole").(string)
	updateUser, _ := loadUserByID(context.Background(), actorID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     requisition.ID,
		DocumentType:   "requisition",
		UserID:         actorID,
		ActorName:      updateUser.Name,
		ActorRole:      actorRole,
		Action:         "updated",
		Details:        map[string]interface{}{"documentNumber": requisition.DocumentNumber},
	})

	return c.JSON(types.DetailResponse{
		Success: true,
		Data:    modelToRequisitionResponse(*requisition),
	})
}

// syncQuotationsToLinkedPO copies quotations from requisition metadata to its linked PO metadata.
func syncQuotationsToLinkedPO(reqID, orgID string, reqMetadata json.RawMessage) {
	ctx := context.Background()
	var poID string
	var poMetaJSON []byte
	err := config.PgxDB.QueryRow(ctx,
		`SELECT id, COALESCE(metadata, '{}'::jsonb) FROM purchase_orders
		 WHERE source_requisition_id = $1 AND organization_id = $2 AND deleted_at IS NULL LIMIT 1`,
		reqID, orgID,
	).Scan(&poID, &poMetaJSON)
	if err != nil {
		return
	}
	poMeta := map[string]interface{}{}
	_ = json.Unmarshal(poMetaJSON, &poMeta)
	var reqMeta map[string]interface{}
	if err := json.Unmarshal(reqMetadata, &reqMeta); err != nil {
		return
	}
	if q, ok := reqMeta["quotations"]; ok {
		poMeta["quotations"] = q
	}
	metaBytes, _ := json.Marshal(poMeta)
	_, _ = config.PgxDB.Exec(ctx,
		`UPDATE purchase_orders SET metadata = $1, updated_at = $2 WHERE id = $3`,
		metaBytes, time.Now(), poID,
	)
}

// DeleteRequisition deletes a requisition (soft delete).
func DeleteRequisition(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Requisition ID is required")
	}

	organizationID, _ := c.Locals("organizationID").(string)
	ctx := c.Context()

	requisition, err := loadRequisitionByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Requisition")
	}

	if strings.ToUpper(requisition.Status) != "DRAFT" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Only draft requisitions can be deleted",
		})
	}

	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE requisitions SET deleted_at = $1, updated_at = $1 WHERE id = $2`,
		time.Now(), id,
	); err != nil {
		return utils.SendInternalError(c, "Failed to delete requisition", err)
	}

	return c.JSON(types.MessageResponse{Success: true, Message: "Requisition deleted successfully"})
}

// ReassignRequisition reassigns a requisition to a different approver.
func ReassignRequisition(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Requisition ID is required")
	}

	var req types.ReassignDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if req.NewApproverID == "" {
		return utils.SendBadRequestError(c, "New approver ID is required")
	}

	ctx := c.Context()
	if _, ok := loadUserByID(ctx, req.NewApproverID); !ok {
		return utils.SendBadRequestError(c, "New approver not found")
	}

	organizationID, _ := c.Locals("organizationID").(string)
	requisition, err := loadRequisitionByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Requisition")
	}

	requisition.UpdatedAt = time.Now()
	if err := updateRequisition(ctx, requisition); err != nil {
		return utils.SendInternalError(c, "Failed to reassign requisition", err)
	}

	if u, ok := loadUserByID(ctx, requisition.RequesterId); ok {
		requisition.Requester = &u
		if requisition.RequesterName == "" {
			requisition.RequesterName = u.Name
		}
	}

	return c.JSON(types.DetailResponse{
		Success: true,
		Data:    modelToRequisitionResponse(*requisition),
	})
}

// modelToRequisitionResponse converts a model to its API response shape.
func modelToRequisitionResponse(req models.Requisition) types.RequisitionResponse {
	items := req.Items
	if items == nil {
		items = []types.RequisitionItem{}
	}
	approvalHistory := req.ApprovalHistory
	if approvalHistory == nil {
		approvalHistory = []types.ApprovalRecord{}
	}

	requesterName := req.RequesterName
	if req.Requester != nil && req.Requester.Name != "" {
		requesterName = req.Requester.Name
	}

	categoryName := req.CategoryName
	if req.Category != nil {
		categoryName = req.Category.Name
	}

	preferredVendorName := req.PreferredVendorName
	var preferredVendorResp *types.VendorResponse
	if req.PreferredVendor != nil {
		preferredVendorName = req.PreferredVendor.Name
		vr := modelToVendorResponse(*req.PreferredVendor)
		preferredVendorResp = &vr
	}

	var requestedFor, otherCategoryText string
	var metadataMap map[string]interface{}
	if len(req.Metadata) > 0 {
		if err := json.Unmarshal(req.Metadata, &metadataMap); err == nil {
			if val, ok := metadataMap["requestedFor"].(string); ok {
				requestedFor = val
			}
			if val, ok := metadataMap["otherCategoryText"].(string); ok {
				otherCategoryText = val
			}
			if categoryName == "" {
				if val, ok := metadataMap["categoryName"].(string); ok {
					categoryName = val
				}
			}
		}
	}

	actionHistory := req.ActionHistory

	return types.RequisitionResponse{
		ID:                  req.ID,
		DocumentNumber:      req.DocumentNumber,
		RequesterID:         req.RequesterId,
		RequesterName:       requesterName,
		Title:               req.Title,
		Description:         req.Description,
		Department:          req.Department,
		Status:              req.Status,
		Priority:            req.Priority,
		Items:               items,
		TotalAmount:         req.TotalAmount,
		Currency:            req.Currency,
		CategoryID:          req.CategoryID,
		CategoryName:        categoryName,
		PreferredVendorID:   req.PreferredVendorID,
		PreferredVendorName: preferredVendorName,
		PreferredVendor:     preferredVendorResp,
		IsEstimate:          req.IsEstimate,
		ApprovalStage:       req.ApprovalStage,
		ApprovalHistory:     approvalHistory,
		BudgetCode:          req.BudgetCode,
		CostCenter:          req.CostCenter,
		ProjectCode:         req.ProjectCode,
		RequiredByDate:      req.RequiredByDate,
		RequestedFor:        requestedFor,
		OtherCategoryText:   otherCategoryText,
		Metadata:            metadataMap,
		ActionHistory:       actionHistory,
		CreatedAt:           req.CreatedAt,
		UpdatedAt:           req.UpdatedAt,
	}
}

// WithdrawRequisition allows the requester to withdraw a submitted (PENDING) requisition.
func WithdrawRequisition(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Requisition ID is required")
	}

	organizationID, _ := c.Locals("organizationID").(string)
	userID, _ := c.Locals("userID").(string)

	ctx := c.Context()
	requisition, err := loadRequisitionByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Requisition")
	}
	if requisition.RequesterId != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Only the requester can withdraw this requisition",
		})
	}
	if strings.ToUpper(requisition.Status) != "PENDING" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot withdraw requisition in %s status. Only pending requisitions can be withdrawn.", requisition.Status),
		})
	}

	// Check for active claimed workflow tasks
	var taskStatus string
	var claimedBy *string
	err = config.PgxDB.QueryRow(ctx,
		`SELECT status, claimed_by FROM workflow_tasks
		 WHERE entity_id = $1 AND entity_type = $2 AND UPPER(status) IN ('PENDING','CLAIMED')
		 LIMIT 1`,
		id, "requisition",
	).Scan(&taskStatus, &claimedBy)
	if err == nil {
		if strings.ToUpper(taskStatus) == "CLAIMED" && claimedBy != nil && *claimedBy != "" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"message": "Cannot withdraw requisition. It is currently being reviewed by an approver.",
			})
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return utils.SendInternalError(c, "Failed to check workflow tasks", err)
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return utils.SendInternalError(c, "Failed to start transaction", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`DELETE FROM workflow_tasks WHERE entity_id = $1 AND entity_type = $2`,
		id, "requisition",
	); err != nil {
		return utils.SendInternalError(c, "Failed to remove workflow tasks", err)
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM workflow_assignments WHERE entity_id = $1 AND entity_type = $2`,
		id, "requisition",
	); err != nil {
		return utils.SendInternalError(c, "Failed to remove workflow assignments", err)
	}

	previousStatus := requisition.Status
	requisition.Status = "DRAFT"
	requisition.ApprovalStage = 0
	requisition.UpdatedAt = time.Now()
	requisition.ApprovalHistory = []types.ApprovalRecord{}

	user, _ := loadUserByID(ctx, userID)
	performerName := user.Name
	if performerName == "" {
		performerName = "Unknown User"
	}
	performerRole := user.Role
	if performerRole == "" {
		performerRole = "unknown"
	}
	requisition.ActionHistory = append(requisition.ActionHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "WITHDRAW",
		PerformedBy:     userID,
		PerformedByName: performerName,
		PerformedByRole: performerRole,
		Timestamp:       time.Now(),
		Comments:        "Requisition withdrawn by requester",
		ActionType:      "WITHDRAW",
		PreviousStatus:  previousStatus,
		NewStatus:       "DRAFT",
	})

	itemsJSON, _ := json.Marshal(requisition.Items)
	approvalHistoryJSON, _ := json.Marshal(requisition.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(requisition.ActionHistory)
	if _, err := tx.Exec(ctx, `
		UPDATE requisitions SET status=$1, approval_stage=$2, approval_history=$3,
			action_history=$4, items=$5, updated_at=$6 WHERE id=$7`,
		requisition.Status, int32(requisition.ApprovalStage),
		approvalHistoryJSON, actionHistoryJSON, itemsJSON, requisition.UpdatedAt, requisition.ID,
	); err != nil {
		return utils.SendInternalError(c, "Failed to update requisition status", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return utils.SendInternalError(c, "Failed to commit changes", err)
	}

	if u, ok := loadUserByID(ctx, requisition.RequesterId); ok {
		requisition.Requester = &u
	}
	if requisition.CategoryID != nil && *requisition.CategoryID != "" {
		if cat, err := loadCategoryByID(ctx, *requisition.CategoryID, organizationID); err == nil {
			requisition.Category = cat
			requisition.CategoryName = cat.Name
		}
	}
	if requisition.PreferredVendorID != nil && *requisition.PreferredVendorID != "" {
		if v, err := loadVendorByID(ctx, *requisition.PreferredVendorID, organizationID); err == nil {
			requisition.PreferredVendor = v
			requisition.PreferredVendorName = v.Name
		}
	}

	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     requisition.ID,
		DocumentType:   "requisition",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "withdrawn",
		Details:        map[string]interface{}{"documentNumber": requisition.DocumentNumber},
	})

	return c.JSON(fiber.Map{
		"success": true,
		"data":    modelToRequisitionResponse(*requisition),
		"message": "Requisition withdrawn successfully. You can now edit and re-submit it.",
	})
}

// SubmitRequisition submits a requisition for approval using the workflow system.
func SubmitRequisition(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Requisition ID is required")
	}

	organizationID, _ := c.Locals("organizationID").(string)
	userID, _ := c.Locals("userID").(string)

	var submitReq types.SubmitDocumentRequest
	if err := c.BodyParser(&submitReq); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if submitReq.WorkflowID == "" {
		return utils.SendBadRequestError(c, "workflowId is required")
	}

	ctx := c.Context()
	requisition, err := loadRequisitionByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Requisition")
	}
	if strings.ToUpper(requisition.Status) != "DRAFT" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot submit requisition in %s status", requisition.Status),
		})
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)

	routingResult, err := workflowExecutionService.SubmitRequisitionWithRouting(
		ctx, organizationID, requisition.ID, submitReq.WorkflowID, userID, requisition,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to submit requisition", err)
	}

	if !routingResult.AutoApproved {
		requisition.Status = "PENDING"
		requisition.UpdatedAt = time.Now()

		user, _ := loadUserByID(ctx, userID)
		performerName := user.Name
		if performerName == "" {
			performerName = "Unknown User"
		}
		performerRole := user.Role
		if performerRole == "" {
			performerRole = "unknown"
		}
		requisition.ActionHistory = append(requisition.ActionHistory, types.ActionHistoryEntry{
			ID:              uuid.New().String(),
			Action:          "SUBMIT",
			PerformedBy:     userID,
			PerformedByName: performerName,
			PerformedByRole: performerRole,
			Timestamp:       time.Now(),
			Comments:        "Requisition submitted for approval",
			ActionType:      "SUBMIT",
			PreviousStatus:  "DRAFT",
			NewStatus:       "PENDING",
		})

		if err := updateRequisition(ctx, requisition); err != nil {
			return utils.SendInternalError(c, "Failed to update requisition status", err)
		}
	} else {
		// Reload — auto-approval pathway updated the row already
		if reloaded, err := loadRequisitionByID(ctx, requisition.ID, organizationID); err == nil {
			requisition = reloaded
		}
	}

	if u, ok := loadUserByID(ctx, requisition.RequesterId); ok {
		requisition.Requester = &u
	}
	if requisition.CategoryID != nil && *requisition.CategoryID != "" {
		if cat, err := loadCategoryByID(ctx, *requisition.CategoryID, organizationID); err == nil {
			requisition.Category = cat
			requisition.CategoryName = cat.Name
		}
	}
	if requisition.PreferredVendorID != nil && *requisition.PreferredVendorID != "" {
		if v, err := loadVendorByID(ctx, *requisition.PreferredVendorID, organizationID); err == nil {
			requisition.PreferredVendor = v
			requisition.PreferredVendorName = v.Name
		}
	}

	go utils.SyncDocument("REQUISITION", requisition.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     requisition.ID,
		DocumentType:   "requisition",
		UserID:         userID,
		Action:         "submitted",
		Details:        map[string]interface{}{"routingPath": routingResult.RoutingPath, "autoApproved": routingResult.AutoApproved},
	})

	responseData := fiber.Map{
		"requisition": modelToRequisitionResponse(*requisition),
		"routing": fiber.Map{
			"path":         routingResult.RoutingPath,
			"autoApproved": routingResult.AutoApproved,
		},
	}
	if routingResult.Assignment != nil {
		responseData["workflow"] = fiber.Map{
			"assignmentId": routingResult.Assignment.ID,
			"workflowId":   routingResult.Assignment.WorkflowID,
			"currentStage": routingResult.Assignment.CurrentStage,
			"status":       routingResult.Assignment.Status,
		}
	}
	if routingResult.AutoCreatedPO != nil && routingResult.AutoCreatedPO.Success {
		poID := routingResult.AutoCreatedPO.DocumentID
		if routingResult.AutoCreatedPOID != "" {
			poID = routingResult.AutoCreatedPOID
		}
		responseData["autoCreatedPO"] = fiber.Map{"id": poID}
	}

	return c.JSON(types.DetailResponse{Success: true, Data: responseData})
}

// GetRequisitionChain returns the full document chain for a requisition.
func GetRequisitionChain(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Requisition ID is required")
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}
	orgID := tenant.OrganizationID

	ctx := c.Context()
	req, err := loadRequisitionByID(ctx, id, orgID)
	if err != nil {
		return utils.SendNotFoundError(c, "Requisition")
	}

	dls := services.NewDocumentLinkingService()
	rawChain, err := dls.GetDocumentRelationshipChain(id)
	if err != nil {
		return utils.SendInternalError(c, "Failed to retrieve document chain", err)
	}

	chain := fiber.Map{
		"requisitionId":     id,
		"requisitionStatus": req.Status,
	}

	if poID, ok := rawChain["poId"].(string); ok && poID != "" {
		chain["poId"] = poID
		chain["poDocumentNumber"] = rawChain["poDocumentNumber"]
		var poStatus string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT status FROM purchase_orders WHERE id = $1 AND organization_id = $2`,
			poID, orgID,
		).Scan(&poStatus); err == nil {
			chain["poStatus"] = poStatus
		}

		if poDocNum, ok := rawChain["poDocumentNumber"].(string); ok && poDocNum != "" {
			var pvID, pvDocNum, pvStatus string
			if err := config.PgxDB.QueryRow(ctx,
				`SELECT id, document_number, COALESCE(status, '')
				 FROM payment_vouchers WHERE linked_po = $1 AND organization_id = $2 LIMIT 1`,
				poDocNum, orgID,
			).Scan(&pvID, &pvDocNum, &pvStatus); err == nil {
				chain["pvId"] = pvID
				chain["pvDocumentNumber"] = pvDocNum
				chain["pvStatus"] = pvStatus
			}
		}
	}

	if grnID, ok := rawChain["grnId"].(string); ok && grnID != "" {
		chain["grnId"] = grnID
		chain["grnDocumentNumber"] = rawChain["grnDocumentNumber"]
		var grnStatus string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT COALESCE(status, '') FROM goods_received_notes WHERE id = $1 AND organization_id = $2`,
			grnID, orgID,
		).Scan(&grnStatus); err == nil {
			chain["grnStatus"] = grnStatus
		}
	}

	// Detect routing type from workflow assignment
	routingType := "procurement"
	var conditionsJSON []byte
	err = config.PgxDB.QueryRow(ctx,
		`SELECT COALESCE(w.conditions, '{}'::jsonb)
		 FROM workflow_assignments wa
		 JOIN workflows w ON w.id = wa.workflow_id
		 WHERE wa.entity_id = $1 AND wa.entity_type = $2 AND wa.organization_id = $3
		 ORDER BY wa.created_at DESC LIMIT 1`,
		id, "requisition", orgID,
	).Scan(&conditionsJSON)
	if err == nil && len(conditionsJSON) > 0 {
		var wfConditions models.WorkflowConditions
		if json.Unmarshal(conditionsJSON, &wfConditions) == nil {
			if strings.EqualFold(wfConditions.RoutingType, "accounting") {
				routingType = "accounting"
			}
		}
	}
	chain["routingType"] = routingType

	return c.JSON(fiber.Map{"success": true, "data": chain})
}

// GetRequisitionAuditTrail returns merged audit logs across all documents in the chain.
func GetRequisitionAuditTrail(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Requisition ID is required")
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}
	orgID := tenant.OrganizationID

	allowedRoles := []string{"admin", "super_admin", "manager", "finance"}
	callerRole := strings.ToLower(tenant.UserRole)
	allowed := false
	for _, r := range allowedRoles {
		if callerRole == r {
			allowed = true
			break
		}
	}
	if !allowed {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Access restricted to admin, manager, and finance roles",
		})
	}

	ctx := c.Context()
	if _, err := loadRequisitionByID(ctx, id, orgID); err != nil {
		return utils.SendNotFoundError(c, "Requisition")
	}

	dls := services.NewDocumentLinkingService()
	rawChain, err := dls.GetDocumentRelationshipChain(id)
	if err != nil {
		return utils.SendInternalError(c, "Failed to retrieve document chain", err)
	}

	docIDs := []string{id}
	docLabels := map[string]string{id: "Requisition"}

	if poID, ok := rawChain["poId"].(string); ok && poID != "" {
		docIDs = append(docIDs, poID)
		docLabels[poID] = "Purchase Order"

		if poDocNum, ok := rawChain["poDocumentNumber"].(string); ok && poDocNum != "" {
			var pvID string
			if err := config.PgxDB.QueryRow(ctx,
				`SELECT id FROM payment_vouchers WHERE linked_po = $1 AND organization_id = $2 LIMIT 1`,
				poDocNum, orgID,
			).Scan(&pvID); err == nil {
				docIDs = append(docIDs, pvID)
				docLabels[pvID] = "Payment Voucher"
			}
		}
	}
	if grnID, ok := rawChain["grnId"].(string); ok && grnID != "" {
		docIDs = append(docIDs, grnID)
		docLabels[grnID] = "Goods Received Note"
	}

	rows, err := config.PgxDB.Query(ctx,
		`SELECT id, document_id, document_type, user_id, action, COALESCE(changes,'{}'::jsonb), created_at
		 FROM audit_logs WHERE document_id = ANY($1::text[]) ORDER BY created_at ASC`,
		docIDs,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch audit logs", err)
	}
	defer rows.Close()

	responses := make([]map[string]interface{}, 0)
	for rows.Next() {
		var alID, docID, docType, userID, action string
		var changes []byte
		var createdAt time.Time
		if err := rows.Scan(&alID, &docID, &docType, &userID, &action, &changes, &createdAt); err != nil {
			continue
		}
		responses = append(responses, map[string]interface{}{
			"id":            alID,
			"documentId":    docID,
			"documentType":  docType,
			"documentLabel": docLabels[docID],
			"userId":        userID,
			"action":        action,
			"changes":       json.RawMessage(changes),
			"createdAt":     createdAt,
		})
	}

	return c.JSON(fiber.Map{"success": true, "data": responses})
}
