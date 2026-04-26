package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/tether-erp/config"
	db "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

const grnSelectColumns = `
	id, organization_id, document_number, po_document_number, status,
	received_date, received_by, items, quality_issues,
	approval_stage, approval_history,
	created_by, owner_id, warehouse_location, notes,
	stage_name, approved_by, automation_used, auto_created_pv,
	action_history, metadata,
	budget_code, cost_center, project_code, linked_pv,
	created_at, updated_at
`

func scanGRNRow(row rowScanner, g *models.GoodsReceivedNote) error {
	var (
		poDocumentNumber, status, receivedBy                   *string
		createdBy, ownerID, warehouseLocation, notes           *string
		stageName, approvedBy                                  *string
		budgetCode, costCenter, projectCode, linkedPV          *string
		approvalHistory, items, qualityIssues                  []byte
		actionHistory, metadata, autoCreatedPV                 []byte
		approvalStage                                          *int32
		automationUsed                                         *bool
		receivedDate                                           *time.Time
	)
	err := row.Scan(
		&g.ID, &g.OrganizationID, &g.DocumentNumber, &poDocumentNumber, &status,
		&receivedDate, &receivedBy, &items, &qualityIssues,
		&approvalStage, &approvalHistory,
		&createdBy, &ownerID, &warehouseLocation, &notes,
		&stageName, &approvedBy, &automationUsed, &autoCreatedPV,
		&actionHistory, &metadata,
		&budgetCode, &costCenter, &projectCode, &linkedPV,
		&g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if poDocumentNumber != nil {
		g.PODocumentNumber = *poDocumentNumber
	}
	if status != nil {
		g.Status = *status
	}
	if receivedDate != nil {
		g.ReceivedDate = *receivedDate
	}
	if receivedBy != nil {
		g.ReceivedBy = *receivedBy
	}
	if createdBy != nil {
		g.CreatedBy = *createdBy
	}
	if ownerID != nil {
		g.OwnerID = *ownerID
	}
	if warehouseLocation != nil {
		g.WarehouseLocation = *warehouseLocation
	}
	if notes != nil {
		g.Notes = *notes
	}
	if stageName != nil {
		g.StageName = *stageName
	}
	if approvedBy != nil {
		g.ApprovedBy = *approvedBy
	}
	if budgetCode != nil {
		g.BudgetCode = *budgetCode
	}
	if costCenter != nil {
		g.CostCenter = *costCenter
	}
	if projectCode != nil {
		g.ProjectCode = *projectCode
	}
	if linkedPV != nil {
		g.LinkedPV = *linkedPV
	}
	if approvalStage != nil {
		g.ApprovalStage = int(*approvalStage)
	}
	if automationUsed != nil {
		g.AutomationUsed = *automationUsed
	}
	if len(items) > 0 {
		_ = json.Unmarshal(items, &g.Items)
	}
	if g.Items == nil {
		g.Items = []types.GRNItem{}
	}
	if len(qualityIssues) > 0 {
		_ = json.Unmarshal(qualityIssues, &g.QualityIssues)
	}
	if g.QualityIssues == nil {
		g.QualityIssues = []types.QualityIssue{}
	}
	if len(approvalHistory) > 0 {
		_ = json.Unmarshal(approvalHistory, &g.ApprovalHistory)
	}
	if g.ApprovalHistory == nil {
		g.ApprovalHistory = []types.ApprovalRecord{}
	}
	if len(actionHistory) > 0 {
		_ = json.Unmarshal(actionHistory, &g.ActionHistory)
	}
	if len(metadata) > 0 {
		g.Metadata = json.RawMessage(metadata)
	}
	if len(autoCreatedPV) > 0 {
		g.AutoCreatedPV = json.RawMessage(autoCreatedPV)
	}
	return nil
}

func loadGRNByID(ctx context.Context, id, orgID string) (*models.GoodsReceivedNote, error) {
	q := `SELECT ` + grnSelectColumns + ` FROM goods_received_notes
	      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	var g models.GoodsReceivedNote
	if err := scanGRNRow(config.PgxDB.QueryRow(ctx, q, id, orgID), &g); err != nil {
		return nil, err
	}
	return &g, nil
}

func loadGRNByDocNumber(ctx context.Context, docNum, orgID string) (*models.GoodsReceivedNote, error) {
	q := `SELECT ` + grnSelectColumns + ` FROM goods_received_notes
	      WHERE document_number = $1 AND organization_id = $2 AND deleted_at IS NULL`
	var g models.GoodsReceivedNote
	if err := scanGRNRow(config.PgxDB.QueryRow(ctx, q, docNum, orgID), &g); err != nil {
		return nil, err
	}
	return &g, nil
}

func loadGRNsByIDs(ctx context.Context, ids []string) []models.GoodsReceivedNote {
	if len(ids) == 0 {
		return nil
	}
	q := `SELECT ` + grnSelectColumns + ` FROM goods_received_notes
	      WHERE id = ANY($1::text[]) AND deleted_at IS NULL ORDER BY created_at DESC`
	rows, err := config.PgxDB.Query(ctx, q, ids)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make([]models.GoodsReceivedNote, 0, len(ids))
	for rows.Next() {
		var g models.GoodsReceivedNote
		if err := scanGRNRow(rows, &g); err == nil {
			out = append(out, g)
		}
	}
	return out
}

func insertGRN(ctx context.Context, g *models.GoodsReceivedNote) error {
	itemsJSON, _ := json.Marshal(g.Items)
	qualityIssuesJSON, _ := json.Marshal(g.QualityIssues)
	approvalHistoryJSON, _ := json.Marshal(g.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(g.ActionHistory)
	_, err := config.PgxDB.Exec(ctx, `
		INSERT INTO goods_received_notes (
			id, organization_id, document_number, po_document_number, status,
			received_date, received_by, items, quality_issues,
			approval_stage, approval_history,
			created_by, owner_id, warehouse_location, notes,
			stage_name, approved_by, automation_used, auto_created_pv,
			action_history, metadata,
			budget_code, cost_center, project_code, linked_pv,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
			$21,$22,$23,$24,$25,$26,$27
		)`,
		g.ID, g.OrganizationID, g.DocumentNumber, nilIfEmpty(g.PODocumentNumber), nilIfEmpty(g.Status),
		nilIfZeroTime(g.ReceivedDate), nilIfEmpty(g.ReceivedBy), itemsJSON, qualityIssuesJSON,
		int32(g.ApprovalStage), approvalHistoryJSON,
		nilIfEmpty(g.CreatedBy), nilIfEmpty(g.OwnerID), nilIfEmpty(g.WarehouseLocation), nilIfEmpty(g.Notes),
		nilIfEmpty(g.StageName), nilIfEmpty(g.ApprovedBy), g.AutomationUsed, jsonOrNil(g.AutoCreatedPV),
		actionHistoryJSON, jsonOrNil(g.Metadata),
		nilIfEmpty(g.BudgetCode), nilIfEmpty(g.CostCenter), nilIfEmpty(g.ProjectCode), nilIfEmpty(g.LinkedPV),
		g.CreatedAt, g.UpdatedAt,
	)
	return err
}

func updateGRNRow(ctx context.Context, g *models.GoodsReceivedNote) error {
	itemsJSON, _ := json.Marshal(g.Items)
	qualityIssuesJSON, _ := json.Marshal(g.QualityIssues)
	approvalHistoryJSON, _ := json.Marshal(g.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(g.ActionHistory)
	_, err := config.PgxDB.Exec(ctx, `
		UPDATE goods_received_notes SET
			po_document_number = $2, status = $3, received_date = $4, received_by = $5,
			items = $6, quality_issues = $7, approval_stage = $8, approval_history = $9,
			warehouse_location = $10, notes = $11, stage_name = $12, approved_by = $13,
			automation_used = $14, auto_created_pv = $15,
			action_history = $16, metadata = $17,
			budget_code = $18, cost_center = $19, project_code = $20, linked_pv = $21,
			updated_at = $22
		WHERE id = $1`,
		g.ID, nilIfEmpty(g.PODocumentNumber), nilIfEmpty(g.Status),
		nilIfZeroTime(g.ReceivedDate), nilIfEmpty(g.ReceivedBy),
		itemsJSON, qualityIssuesJSON, int32(g.ApprovalStage), approvalHistoryJSON,
		nilIfEmpty(g.WarehouseLocation), nilIfEmpty(g.Notes),
		nilIfEmpty(g.StageName), nilIfEmpty(g.ApprovedBy),
		g.AutomationUsed, jsonOrNil(g.AutoCreatedPV),
		actionHistoryJSON, jsonOrNil(g.Metadata),
		nilIfEmpty(g.BudgetCode), nilIfEmpty(g.CostCenter), nilIfEmpty(g.ProjectCode), nilIfEmpty(g.LinkedPV),
		time.Now(),
	)
	return err
}

// GetGRNs retrieves all goods received notes with pagination and filtering.
func GetGRNs(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
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
	poDocumentNumber := c.Query("poDocumentNumber")

	ctx := c.Context()
	scope := utils.GetDocumentScope(ctx, tenant.UserID, tenant.UserRole, tenant.OrganizationID)
	offset := int32((page - 1) * limit)
	orgRoleIDs := scope.OrgRoleIDs
	if orgRoleIDs == nil {
		orgRoleIDs = []string{}
	}

	var total int64
	var ids []string

	if scope.CanViewAll || scope.IsProcurement {
		total, err = config.Queries.CountGRNsAll(ctx, db.CountGRNsAllParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: poDocumentNumber,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count GRNs", err)
		}
		ids, err = config.Queries.ListGRNIDsAll(ctx, db.ListGRNIDsAllParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: poDocumentNumber,
			Limit: int32(limit), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch GRNs", err)
		}
	} else {
		total, err = config.Queries.CountGRNsLimited(ctx, db.CountGRNsLimitedParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: poDocumentNumber,
			CreatedBy: &scope.UserID, Lower: scope.UserRole, Column6: orgRoleIDs,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count GRNs", err)
		}
		ids, err = config.Queries.ListGRNIDsLimited(ctx, db.ListGRNIDsLimitedParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: poDocumentNumber,
			CreatedBy: &scope.UserID, Lower: scope.UserRole, Column6: orgRoleIDs,
			Limit: int32(limit), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch GRNs", err)
		}
	}

	grns := loadGRNsByIDs(ctx, ids)
	responses := make([]types.GRNResponse, 0, len(grns))
	for _, grn := range grns {
		responses = append(responses, modelToGRNResponse(grn))
	}

	return utils.SendPaginatedSuccess(c, responses, "GRNs retrieved successfully", page, limit, total)
}

// CreateGRN creates a new goods received note.
func CreateGRN(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}

	var req types.CreateGRNRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if req.PODocumentNumber == "" {
		return utils.SendBadRequestError(c, "PO number is required")
	}
	if len(req.PODocumentNumber) < 10 || req.PODocumentNumber[:3] != "PO-" {
		return utils.SendBadRequestError(c, "Invalid PO document number format")
	}
	if len(req.Items) == 0 {
		return utils.SendBadRequestError(c, "At least one item is required")
	}
	for _, item := range req.Items {
		if item.QuantityOrdered <= 0 {
			return utils.SendBadRequestError(c, "All items must have positive quantities")
		}
	}
	if req.ReceivedBy == "" {
		return utils.SendBadRequestError(c, "ReceivedBy is required")
	}

	ctx := c.Context()
	po, err := loadPOByDocNumber(ctx, req.PODocumentNumber, tenant.OrganizationID)
	if err != nil {
		return utils.SendBadRequestError(c, "Purchase order not found")
	}

	// Resolve effective procurement flow
	effectiveFlow := po.ProcurementFlow
	if effectiveFlow == "" {
		orgSvc := services.NewOrganizationService()
		orgSettings, _ := orgSvc.GetOrganizationSettings(tenant.OrganizationID)
		if orgSettings != nil && orgSettings.ProcurementFlow != "" {
			effectiveFlow = orgSettings.ProcurementFlow
		} else {
			effectiveFlow = "goods_first"
		}
	}

	// One-to-one guard
	if effectiveFlow == "payment_first" && req.LinkedPV != "" {
		var existingDoc, existingStatus string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT document_number, COALESCE(status,'') FROM goods_received_notes
			 WHERE linked_pv = $1 AND organization_id = $2 AND UPPER(COALESCE(status,'')) != 'CANCELLED'
			 AND deleted_at IS NULL LIMIT 1`,
			req.LinkedPV, tenant.OrganizationID,
		).Scan(&existingDoc, &existingStatus); err == nil {
			return utils.SendConflictError(c, fmt.Sprintf(
				"Goods received note %s already exists for payment voucher %s (status: %s).",
				existingDoc, req.LinkedPV, existingStatus))
		}
	} else {
		var existingDoc, existingStatus string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT document_number, COALESCE(status,'') FROM goods_received_notes
			 WHERE po_document_number = $1 AND organization_id = $2 AND UPPER(COALESCE(status,'')) != 'CANCELLED'
			 AND deleted_at IS NULL LIMIT 1`,
			req.PODocumentNumber, tenant.OrganizationID,
		).Scan(&existingDoc, &existingStatus); err == nil {
			return utils.SendConflictError(c, fmt.Sprintf(
				"Goods received note %s already exists for purchase order %s (status: %s).",
				existingDoc, req.PODocumentNumber, existingStatus))
		}
	}

	// Payment-first enforcement
	var linkedPVDoc *models.PaymentVoucher
	if effectiveFlow == "payment_first" {
		if req.LinkedPV == "" {
			return utils.SendBadRequestError(c, "A linked payment voucher document number is required for payment-first procurement flow")
		}
		var pvID string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT id FROM payment_vouchers WHERE document_number = $1 AND organization_id = $2 AND deleted_at IS NULL`,
			req.LinkedPV, tenant.OrganizationID,
		).Scan(&pvID); err != nil {
			return utils.SendBadRequestError(c, "Linked payment voucher not found")
		}
		pv, err := loadPVByID(ctx, pvID, tenant.OrganizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Linked payment voucher not found")
		}
		if strings.ToUpper(pv.Status) != "APPROVED" && strings.ToUpper(pv.Status) != "PAID" {
			return utils.SendBadRequestError(c, "Linked payment voucher must be approved or paid before receiving goods (payment-first flow)")
		}
		if pv.LinkedPO != po.DocumentNumber {
			return utils.SendBadRequestError(c, "Linked payment voucher does not belong to the selected purchase order")
		}
		linkedPVDoc = pv
	}

	documentNumber := utils.GenerateDocumentNumber("GRN")
	linkedPVDocNum := ""
	if linkedPVDoc != nil {
		linkedPVDocNum = linkedPVDoc.DocumentNumber
	}

	// Build initial action history
	var grnInitialHistory []types.ActionHistoryEntry
	if linkedPVDoc != nil {
		grnInitialHistory = append(grnInitialHistory, types.ActionHistoryEntry{
			ID:          uuid.New().String(),
			Action:      "CREATED_FROM_PV",
			PerformedBy: tenant.UserID,
			Timestamp:   time.Now(),
			Metadata: map[string]interface{}{
				"linkedDocNumber": linkedPVDoc.DocumentNumber,
				"linkedDocType":   "payment_voucher",
				"flow":            "payment_first",
			},
		})
	} else {
		grnInitialHistory = append(grnInitialHistory, types.ActionHistoryEntry{
			ID:          uuid.New().String(),
			Action:      "CREATED_FROM_PO",
			PerformedBy: tenant.UserID,
			Timestamp:   time.Now(),
			Metadata: map[string]interface{}{
				"linkedDocNumber": po.DocumentNumber,
				"linkedDocType":   "purchase_order",
				"flow":            "goods_first",
			},
		})
	}

	createUser, _ := loadUserByID(ctx, tenant.UserID)
	now := time.Now()
	grnInitialHistory = append(grnInitialHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "CREATE",
		ActionType:      "CREATE",
		PerformedBy:     tenant.UserID,
		PerformedByName: createUser.Name,
		PerformedByRole: createUser.Role,
		Timestamp:       now,
		PerformedAt:     now,
		Comments:        "GRN created",
		NewStatus:       "DRAFT",
	})

	grn := models.GoodsReceivedNote{
		ID:                uuid.New().String(),
		OrganizationID:    tenant.OrganizationID,
		DocumentNumber:    documentNumber,
		PODocumentNumber:  req.PODocumentNumber,
		Status:            "DRAFT",
		ReceivedDate:      now,
		ReceivedBy:        req.ReceivedBy,
		Items:             req.Items,
		QualityIssues:     []types.QualityIssue{},
		ApprovalStage:     0,
		LinkedPV:          linkedPVDocNum,
		WarehouseLocation: req.WarehouseLocation,
		Notes:             req.Notes,
		CreatedBy:         tenant.UserID,
		ApprovalHistory:   []types.ApprovalRecord{},
		ActionHistory:     grnInitialHistory,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := insertGRN(ctx, &grn); err != nil {
		return utils.SendInternalError(c, "Failed to create GRN", err)
	}

	// Record GRN_CREATED on the parent document for chain traceability
	grnCreatedEntry := types.ActionHistoryEntry{
		ID:          uuid.New().String(),
		Action:      "GRN_CREATED",
		PerformedBy: tenant.UserID,
		Timestamp:   time.Now(),
		Metadata: map[string]interface{}{
			"linkedDocNumber": grn.DocumentNumber,
			"linkedDocType":   "grn",
			"flow":            effectiveFlow,
		},
	}
	if linkedPVDoc != nil {
		linkedPVDoc.ActionHistory = append(linkedPVDoc.ActionHistory, grnCreatedEntry)
		_ = updatePaymentVoucherRow(ctx, linkedPVDoc)
	} else {
		po.ActionHistory = append(po.ActionHistory, grnCreatedEntry)
		_ = updatePurchaseOrderRow(ctx, po)
	}

	go utils.SyncDocument("GRN", grn.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: tenant.OrganizationID,
		DocumentID:     grn.ID,
		DocumentType:   "grn",
		UserID:         tenant.UserID,
		ActorName:      createUser.Name,
		ActorRole:      tenant.UserRole,
		Action:         "created",
		Details:        map[string]interface{}{"documentNumber": grn.DocumentNumber},
	})

	return c.Status(fiber.StatusCreated).JSON(types.DetailResponse{
		Success: true,
		Data:    modelToGRNResponse(grn),
	})
}

// GetGRN retrieves a single GRN by ID.
func GetGRN(c *fiber.Ctx) error {
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "GRN ID is required")
	}

	ctx := c.Context()
	grn, err := loadGRNByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "GRN")
	}

	response := modelToGRNResponse(*grn)
	if liveHistory := utils.GetDocumentApprovalHistory(ctx, grn.ID, "grn"); len(liveHistory) > 0 {
		response.ApprovalHistory = liveHistory
	}
	return c.JSON(types.DetailResponse{Success: true, Data: response})
}

// UpdateGRN updates an existing GRN.
func UpdateGRN(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "GRN ID is required")
	}

	var req types.UpdateGRNRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	ctx := c.Context()
	grn, err := loadGRNByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "GRN")
	}

	if strings.ToUpper(grn.Status) != "DRAFT" && strings.ToUpper(grn.Status) != "PENDING" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot update GRN in %s status", grn.Status),
		})
	}

	if len(req.Items) > 0 {
		grn.Items = req.Items
	}
	if req.ReceivedBy != "" {
		grn.ReceivedBy = req.ReceivedBy
	}
	if len(req.QualityIssues) > 0 {
		grn.QualityIssues = req.QualityIssues
	}

	updateUser, _ := loadUserByID(ctx, tenant.UserID)
	now := time.Now()
	grn.ActionHistory = append(grn.ActionHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "UPDATE",
		ActionType:      "UPDATE",
		PerformedBy:     tenant.UserID,
		PerformedByName: updateUser.Name,
		PerformedByRole: updateUser.Role,
		Timestamp:       now,
		PerformedAt:     now,
		Comments:        "GRN updated",
		NewStatus:       grn.Status,
	})
	grn.UpdatedAt = now

	if err := updateGRNRow(ctx, grn); err != nil {
		return utils.SendInternalError(c, "Failed to update GRN", err)
	}

	go utils.SyncDocument("GRN", grn.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: tenant.OrganizationID,
		DocumentID:     grn.ID,
		DocumentType:   "grn",
		UserID:         tenant.UserID,
		ActorName:      updateUser.Name,
		ActorRole:      tenant.UserRole,
		Action:         "updated",
		Details:        map[string]interface{}{"documentNumber": grn.DocumentNumber},
	})

	return c.JSON(types.DetailResponse{Success: true, Data: modelToGRNResponse(*grn)})
}

// DeleteGRN deletes a GRN (soft delete).
func DeleteGRN(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "GRN ID is required")
	}

	ctx := c.Context()
	grn, err := loadGRNByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "GRN")
	}

	if strings.ToUpper(grn.Status) != "DRAFT" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Only draft GRNs can be deleted",
		})
	}

	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE goods_received_notes SET deleted_at = $1, updated_at = $1 WHERE id = $2`,
		time.Now(), id,
	); err != nil {
		return utils.SendInternalError(c, "Failed to delete GRN", err)
	}

	return c.JSON(types.MessageResponse{Success: true, Message: "GRN deleted successfully"})
}

// modelToGRNResponse converts a model to its API response shape.
func modelToGRNResponse(grn models.GoodsReceivedNote) types.GRNResponse {
	items := grn.Items
	if items == nil {
		items = []types.GRNItem{}
	}
	qualityIssues := grn.QualityIssues
	if qualityIssues == nil {
		qualityIssues = []types.QualityIssue{}
	}
	approvalHistory := grn.ApprovalHistory
	if approvalHistory == nil {
		approvalHistory = []types.ApprovalRecord{}
	}

	var metadata map[string]interface{}
	if len(grn.Metadata) > 0 {
		_ = json.Unmarshal(grn.Metadata, &metadata)
	}

	var autoCreatedPV interface{}
	if len(grn.AutoCreatedPV) > 0 {
		_ = json.Unmarshal(grn.AutoCreatedPV, &autoCreatedPV)
	}

	return types.GRNResponse{
		ID:                grn.ID,
		OrganizationID:    grn.OrganizationID,
		DocumentNumber:    grn.DocumentNumber,
		PODocumentNumber:  grn.PODocumentNumber,
		Status:            grn.Status,
		ReceivedDate:      grn.ReceivedDate,
		ReceivedBy:        grn.ReceivedBy,
		Items:             items,
		QualityIssues:     qualityIssues,
		ApprovalStage:     grn.ApprovalStage,
		ApprovalHistory:   approvalHistory,
		ActionHistory:     grn.ActionHistory,
		LinkedPV:          grn.LinkedPV,
		BudgetCode:        grn.BudgetCode,
		CostCenter:        grn.CostCenter,
		ProjectCode:       grn.ProjectCode,
		CreatedBy:         grn.CreatedBy,
		OwnerID:           grn.OwnerID,
		WarehouseLocation: grn.WarehouseLocation,
		Notes:             grn.Notes,
		CurrentStage:      grn.CurrentStage,
		StageName:         grn.StageName,
		ApprovedBy:        grn.ApprovedBy,
		AutomationUsed:    grn.AutomationUsed,
		AutoCreatedPV:     autoCreatedPV,
		Metadata:          metadata,
		CreatedAt:         grn.CreatedAt,
		UpdatedAt:         grn.UpdatedAt,
	}
}

// SubmitGRN submits a GRN for approval using the workflow system.
func SubmitGRN(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "GRN ID is required")
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
	grn, err := loadGRNByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "GRN")
	}

	if strings.ToUpper(grn.Status) != "DRAFT" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot submit GRN in %s status", grn.Status),
		})
	}

	if grn.PODocumentNumber != "" {
		linkedPO, err := loadPOByDocNumber(ctx, grn.PODocumentNumber, organizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Linked purchase order not found")
		}
		if strings.ToUpper(linkedPO.Status) != "APPROVED" {
			return utils.SendBadRequestError(c, fmt.Sprintf(
				"Cannot submit GRN: linked PO %s is in %s status and must be APPROVED.",
				grn.PODocumentNumber, linkedPO.Status))
		}
	}

	if grn.LinkedPV != "" {
		var pvID string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT id FROM payment_vouchers WHERE document_number = $1 AND organization_id = $2 AND deleted_at IS NULL`,
			grn.LinkedPV, organizationID,
		).Scan(&pvID); err != nil {
			return utils.SendBadRequestError(c, "Linked payment voucher not found")
		}
		pv, err := loadPVByID(ctx, pvID, organizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Linked payment voucher not found")
		}
		pvStatus := strings.ToUpper(pv.Status)
		if pvStatus != "APPROVED" && pvStatus != "PAID" {
			return utils.SendBadRequestError(c, fmt.Sprintf(
				"Cannot submit GRN: linked PV %s is in %s status and must be APPROVED or PAID.",
				grn.LinkedPV, pv.Status))
		}
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)
	assignment, err := workflowExecutionService.AssignWorkflowToDocumentWithID(
		ctx, organizationID, grn.ID, "grn", submitReq.WorkflowID, userID,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to assign workflow to GRN", err)
	}

	grn.Status = "PENDING"
	grn.UpdatedAt = time.Now()

	user, _ := loadUserByID(ctx, userID)
	grn.ActionHistory = append(grn.ActionHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "SUBMIT",
		PerformedBy:     userID,
		PerformedByName: user.Name,
		PerformedByRole: user.Role,
		Timestamp:       time.Now(),
		Comments:        "GRN submitted for approval",
		ActionType:      "SUBMIT",
		PreviousStatus:  "DRAFT",
		NewStatus:       "PENDING",
	})

	if err := updateGRNRow(ctx, grn); err != nil {
		return utils.SendInternalError(c, "Failed to update GRN status", err)
	}

	go utils.SyncDocument("GRN", grn.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     grn.ID,
		DocumentType:   "grn",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "submitted",
		Details:        map[string]interface{}{"documentNumber": grn.DocumentNumber},
	})

	return c.JSON(types.DetailResponse{
		Success: true,
		Data: fiber.Map{
			"grn": modelToGRNResponse(*grn),
			"workflow": fiber.Map{
				"assignmentId": assignment.ID,
				"workflowId":   assignment.WorkflowID,
				"currentStage": assignment.CurrentStage,
				"status":       assignment.Status,
			},
		},
	})
}
