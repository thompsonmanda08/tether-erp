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
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// poSelectColumns lists the columns scanned by scanPurchaseOrderRow.
const poSelectColumns = `
	id, organization_id, document_number, vendor_id, status,
	items, COALESCE(total_amount, 0)::float8, currency, delivery_date,
	approval_stage, approval_history, linked_requisition,
	description, department, department_id, gl_code, title, priority,
	budget_code, cost_center, project_code, required_by_date,
	source_requisition_id, created_by, owner_id,
	action_history, metadata,
	COALESCE(estimated_cost, 0)::float8, quotation_gate_overridden, bypass_justification,
	automation_used, auto_created_grn, procurement_flow,
	created_at, updated_at
`

func scanPurchaseOrderRow(row rowScanner, p *models.PurchaseOrder) error {
	var (
		status, description, department, departmentID, glCode, title, priority *string
		budgetCode, costCenter, projectCode                                    *string
		createdBy, ownerID, procurementFlow                                    *string
		approvalHistory, itemsJSON, actionHistory, metadata, autoCreatedGrn    []byte
		approvalStage                                                          *int32
		automationUsed                                                         *bool
		deliveryDate, requiredByDate                                           *time.Time
	)
	err := row.Scan(
		&p.ID, &p.OrganizationID, &p.DocumentNumber, &p.VendorID, &status,
		&itemsJSON, &p.TotalAmount, &p.Currency, &deliveryDate,
		&approvalStage, &approvalHistory, &p.LinkedRequisition,
		&description, &department, &departmentID, &glCode, &title, &priority,
		&budgetCode, &costCenter, &projectCode, &requiredByDate,
		&p.SourceRequisitionId, &createdBy, &ownerID,
		&actionHistory, &metadata,
		&p.EstimatedCost, &p.QuotationGateOverridden, &p.BypassJustification,
		&automationUsed, &autoCreatedGrn, &procurementFlow,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if status != nil {
		p.Status = *status
	}
	if description != nil {
		p.Description = *description
	}
	if department != nil {
		p.Department = *department
	}
	if departmentID != nil {
		p.DepartmentID = *departmentID
	}
	if glCode != nil {
		p.GLCode = *glCode
	}
	if title != nil {
		p.Title = *title
	}
	if priority != nil {
		p.Priority = *priority
	}
	if budgetCode != nil {
		p.BudgetCode = *budgetCode
	}
	if costCenter != nil {
		p.CostCenter = *costCenter
	}
	if projectCode != nil {
		p.ProjectCode = *projectCode
	}
	if createdBy != nil {
		p.CreatedBy = *createdBy
	}
	if procurementFlow != nil {
		p.ProcurementFlow = *procurementFlow
	}
	if approvalStage != nil {
		p.ApprovalStage = int(*approvalStage)
	}
	if automationUsed != nil {
		p.AutomationUsed = *automationUsed
	}
	if deliveryDate != nil {
		p.DeliveryDate = *deliveryDate
	}
	if requiredByDate != nil {
		p.RequiredByDate = requiredByDate
	}
	if len(itemsJSON) > 0 {
		_ = json.Unmarshal(itemsJSON, &p.Items)
	}
	if p.Items == nil {
		p.Items = []types.POItem{}
	}
	if len(approvalHistory) > 0 {
		_ = json.Unmarshal(approvalHistory, &p.ApprovalHistory)
	}
	if p.ApprovalHistory == nil {
		p.ApprovalHistory = []types.ApprovalRecord{}
	}
	if len(actionHistory) > 0 {
		_ = json.Unmarshal(actionHistory, &p.ActionHistory)
	}
	if len(metadata) > 0 {
		p.Metadata = json.RawMessage(metadata)
	}
	if len(autoCreatedGrn) > 0 {
		p.AutoCreatedGRN = json.RawMessage(autoCreatedGrn)
	}
	return nil
}

func loadPOByID(ctx context.Context, id, orgID string) (*models.PurchaseOrder, error) {
	q := `SELECT ` + poSelectColumns + ` FROM purchase_orders
	      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	var p models.PurchaseOrder
	if err := scanPurchaseOrderRow(config.PgxDB.QueryRow(ctx, q, id, orgID), &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func loadPOByDocNumber(ctx context.Context, docNum, orgID string) (*models.PurchaseOrder, error) {
	q := `SELECT ` + poSelectColumns + ` FROM purchase_orders
	      WHERE document_number = $1 AND organization_id = $2 AND deleted_at IS NULL`
	var p models.PurchaseOrder
	if err := scanPurchaseOrderRow(config.PgxDB.QueryRow(ctx, q, docNum, orgID), &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func insertPurchaseOrder(ctx context.Context, p *models.PurchaseOrder) error {
	itemsJSON, _ := json.Marshal(p.Items)
	approvalHistoryJSON, _ := json.Marshal(p.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(p.ActionHistory)
	_, err := config.PgxDB.Exec(ctx, `
		INSERT INTO purchase_orders (
			id, organization_id, document_number, vendor_id, status,
			items, total_amount, currency, delivery_date,
			approval_stage, approval_history, linked_requisition,
			description, department, department_id, gl_code, title, priority,
			budget_code, cost_center, project_code, required_by_date,
			source_requisition_id, created_by, owner_id,
			action_history, metadata,
			estimated_cost, quotation_gate_overridden, bypass_justification,
			automation_used, auto_created_grn, procurement_flow,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
			$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35
		)`,
		p.ID, p.OrganizationID, p.DocumentNumber, p.VendorID, nilIfEmpty(p.Status),
		itemsJSON, p.TotalAmount, p.Currency, nilIfZeroTime(p.DeliveryDate),
		int32(p.ApprovalStage), approvalHistoryJSON, nilIfEmpty(p.LinkedRequisition),
		nilIfEmpty(p.Description), nilIfEmpty(p.Department), nilIfEmpty(p.DepartmentID),
		nilIfEmpty(p.GLCode), nilIfEmpty(p.Title), nilIfEmpty(p.Priority),
		nilIfEmpty(p.BudgetCode), nilIfEmpty(p.CostCenter), nilIfEmpty(p.ProjectCode),
		nilIfNilTimePtr(p.RequiredByDate),
		p.SourceRequisitionId, nilIfEmpty(p.CreatedBy), nilIfEmpty(p.CreatedBy),
		actionHistoryJSON, jsonOrNil(p.Metadata),
		p.EstimatedCost, p.QuotationGateOverridden, p.BypassJustification,
		p.AutomationUsed, jsonOrNil(p.AutoCreatedGRN), nilIfEmpty(p.ProcurementFlow),
		p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func nilIfNilTimePtr(t *time.Time) interface{} {
	if t == nil || t.IsZero() {
		return nil
	}
	return *t
}

func updatePurchaseOrderRow(ctx context.Context, p *models.PurchaseOrder) error {
	itemsJSON, _ := json.Marshal(p.Items)
	approvalHistoryJSON, _ := json.Marshal(p.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(p.ActionHistory)
	_, err := config.PgxDB.Exec(ctx, `
		UPDATE purchase_orders SET
			vendor_id = $2, status = $3, items = $4, total_amount = $5, currency = $6,
			delivery_date = $7, approval_stage = $8, approval_history = $9,
			linked_requisition = $10, description = $11, department = $12, department_id = $13,
			gl_code = $14, title = $15, priority = $16, budget_code = $17, cost_center = $18,
			project_code = $19, required_by_date = $20, source_requisition_id = $21,
			action_history = $22, metadata = $23,
			estimated_cost = $24, quotation_gate_overridden = $25, bypass_justification = $26,
			automation_used = $27, auto_created_grn = $28, procurement_flow = $29,
			updated_at = $30
		WHERE id = $1`,
		p.ID, p.VendorID, nilIfEmpty(p.Status), itemsJSON, p.TotalAmount, p.Currency,
		nilIfZeroTime(p.DeliveryDate), int32(p.ApprovalStage), approvalHistoryJSON,
		nilIfEmpty(p.LinkedRequisition), nilIfEmpty(p.Description),
		nilIfEmpty(p.Department), nilIfEmpty(p.DepartmentID),
		nilIfEmpty(p.GLCode), nilIfEmpty(p.Title), nilIfEmpty(p.Priority),
		nilIfEmpty(p.BudgetCode), nilIfEmpty(p.CostCenter), nilIfEmpty(p.ProjectCode),
		nilIfNilTimePtr(p.RequiredByDate), p.SourceRequisitionId,
		actionHistoryJSON, jsonOrNil(p.Metadata),
		p.EstimatedCost, p.QuotationGateOverridden, p.BypassJustification,
		p.AutomationUsed, jsonOrNil(p.AutoCreatedGRN), nilIfEmpty(p.ProcurementFlow),
		time.Now(),
	)
	return err
}

// GetPurchaseOrders retrieves all purchase orders with pagination and filtering.
func GetPurchaseOrders(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_purchase_orders_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
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
	vendorID := c.Query("vendorId")

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":      "get_purchase_orders",
		"page":           page,
		"limit":          limit,
		"status":         status,
		"vendor_id":      vendorID,
		"organizationID": tenant.OrganizationID,
	})

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
		total, err = config.Queries.CountPurchaseOrdersAll(ctx, db.CountPurchaseOrdersAllParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count purchase orders", err)
		}
		ids, err = config.Queries.ListPurchaseOrderIDsAll(ctx, db.ListPurchaseOrderIDsAllParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
			Limit: int32(limit), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch purchase orders", err)
		}
	} else {
		total, err = config.Queries.CountPurchaseOrdersLimited(ctx, db.CountPurchaseOrdersLimitedParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
			CreatedBy: &scope.UserID, Lower: scope.UserRole, Column6: orgRoleIDs,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count purchase orders", err)
		}
		ids, err = config.Queries.ListPurchaseOrderIDsLimited(ctx, db.ListPurchaseOrderIDsLimitedParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
			CreatedBy: &scope.UserID, Lower: scope.UserRole, Column6: orgRoleIDs,
			Limit: int32(limit), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch purchase orders", err)
		}
	}

	orders := loadPurchaseOrdersByIDs(ctx, ids)

	responses := make([]types.PurchaseOrderResponse, 0, len(orders))
	for _, order := range orders {
		responses = append(responses, modelToPurchaseOrderResponse(order))
	}

	if len(responses) > 0 {
		poDocNumbers := make([]string, len(responses))
		for i, r := range responses {
			poDocNumbers[i] = r.DocumentNumber
		}
		pvRows, _ := config.Queries.GetLinkedPVsForPurchaseOrders(ctx, db.GetLinkedPVsForPurchaseOrdersParams{
			Column1: poDocNumbers, OrganizationID: tenant.OrganizationID,
		})
		pvMap := make(map[string]db.GetLinkedPVsForPurchaseOrdersRow, len(pvRows))
		for _, r := range pvRows {
			if r.LinkedPo != nil {
				pvMap[*r.LinkedPo] = r
			}
		}
		for i, r := range responses {
			if row, ok := pvMap[r.DocumentNumber]; ok {
				pvStatus := ""
				if row.Status != nil {
					pvStatus = *row.Status
				}
				responses[i].LinkedPV = &types.LinkedPVSummary{
					ID:             row.ID,
					DocumentNumber: row.DocumentNumber,
					Status:         pvStatus,
				}
			}
		}
	}

	return utils.SendPaginatedSuccess(c, responses, "Purchase orders retrieved successfully", page, limit, total)
}

func loadPurchaseOrdersByIDs(ctx context.Context, ids []string) []models.PurchaseOrder {
	if len(ids) == 0 {
		return nil
	}
	q := `SELECT ` + poSelectColumns + ` FROM purchase_orders
	      WHERE id = ANY($1::text[]) AND deleted_at IS NULL ORDER BY created_at DESC`
	rows, err := config.PgxDB.Query(ctx, q, ids)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make([]models.PurchaseOrder, 0, len(ids))
	for rows.Next() {
		var p models.PurchaseOrder
		if err := scanPurchaseOrderRow(rows, &p); err == nil {
			out = append(out, p)
		}
	}
	for i := range out {
		if out[i].VendorID != nil && *out[i].VendorID != "" {
			if v, err := loadVendorByID(ctx, *out[i].VendorID, out[i].OrganizationID); err == nil {
				out[i].Vendor = v
				out[i].VendorName = v.Name
			}
		}
	}
	return out
}

// CreatePurchaseOrder creates a new purchase order.
func CreatePurchaseOrder(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("create_purchase_order_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}

	var req types.CreatePurchaseOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if len(req.Items) == 0 {
		return utils.SendBadRequestError(c, "At least one item is required")
	}
	for _, item := range req.Items {
		if item.Quantity <= 0 {
			return utils.SendBadRequestError(c, "All items must have positive quantities")
		}
	}
	if req.TotalAmount <= 0 {
		return utils.SendBadRequestError(c, "Total amount must be greater than 0")
	}
	if !req.DeliveryDate.Time.IsZero() && req.DeliveryDate.Time.Before(time.Now().Truncate(24*time.Hour)) {
		return utils.SendBadRequestError(c, "Delivery date cannot be in the past")
	}

	ctx := c.Context()
	var vendorIDPtr *string
	if req.VendorID != "" {
		if _, err := loadVendorByID(ctx, req.VendorID, tenant.OrganizationID); err != nil {
			return utils.SendBadRequestError(c, "Vendor not found")
		}
		vendorIDPtr = &req.VendorID
	}

	documentNumber := utils.GenerateDocumentNumber("PO")
	orderID := uuid.New().String()

	createUser, _ := loadUserByID(ctx, tenant.UserID)
	now := time.Now()

	order := models.PurchaseOrder{
		ID:                orderID,
		OrganizationID:    tenant.OrganizationID,
		DocumentNumber:    documentNumber,
		VendorID:          vendorIDPtr,
		Status:            "DRAFT",
		Items:             req.Items,
		TotalAmount:       req.TotalAmount,
		Currency:          req.Currency,
		DeliveryDate:      req.DeliveryDate.Time,
		ApprovalStage:     0,
		LinkedRequisition: req.LinkedRequisition,
		EstimatedCost:     req.EstimatedCost,
		CreatedBy:         tenant.UserID,
		Title:             req.Title,
		Description:       req.Description,
		Department:        req.Department,
		DepartmentID:      req.DepartmentID,
		Priority:          req.Priority,
		BudgetCode:        req.BudgetCode,
		CostCenter:        req.CostCenter,
		ProjectCode:       req.ProjectCode,
		ProcurementFlow:   req.ProcurementFlow,
		ApprovalHistory:   []types.ApprovalRecord{},
		ActionHistory: []types.ActionHistoryEntry{{
			ID:              uuid.New().String(),
			Action:          "CREATE",
			ActionType:      "CREATE",
			PerformedBy:     tenant.UserID,
			PerformedByName: createUser.Name,
			PerformedByRole: createUser.Role,
			Timestamp:       now,
			PerformedAt:     now,
			Comments:        "Purchase order created",
			NewStatus:       "DRAFT",
		}},
		CreatedAt: now,
		UpdatedAt: now,
	}

	if len(req.Metadata) > 0 {
		if metaBytes, err := json.Marshal(req.Metadata); err == nil {
			order.Metadata = metaBytes
		}
	}

	if err := insertPurchaseOrder(ctx, &order); err != nil {
		return utils.SendInternalError(c, "Failed to create purchase order", err)
	}

	if order.VendorID != nil && *order.VendorID != "" {
		if v, err := loadVendorByID(ctx, *order.VendorID, tenant.OrganizationID); err == nil {
			order.Vendor = v
			order.VendorName = v.Name
		}
	}

	go utils.SyncDocument("PURCHASE_ORDER", order.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: tenant.OrganizationID,
		DocumentID:     order.ID,
		DocumentType:   "purchase_order",
		UserID:         tenant.UserID,
		ActorName:      createUser.Name,
		ActorRole:      tenant.UserRole,
		Action:         "created",
		Details:        map[string]interface{}{"documentNumber": order.DocumentNumber},
	})

	return c.Status(fiber.StatusCreated).JSON(types.DetailResponse{
		Success: true,
		Data:    modelToPurchaseOrderResponse(order),
	})
}

// GetPurchaseOrder retrieves a single purchase order by ID.
func GetPurchaseOrder(c *fiber.Ctx) error {
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
		return utils.SendBadRequestError(c, "Purchase Order ID is required")
	}

	ctx := c.Context()
	order, err := loadPOByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Purchase order")
	}
	if order.VendorID != nil && *order.VendorID != "" {
		if v, err := loadVendorByID(ctx, *order.VendorID, tenant.OrganizationID); err == nil {
			order.Vendor = v
			order.VendorName = v.Name
		}
	}

	response := modelToPurchaseOrderResponse(*order)
	if liveHistory := utils.GetDocumentApprovalHistory(ctx, order.ID, "purchase_order"); len(liveHistory) > 0 {
		response.ApprovalHistory = liveHistory
	}
	return c.JSON(types.DetailResponse{Success: true, Data: response})
}

// UpdatePurchaseOrder updates an existing purchase order.
func UpdatePurchaseOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Purchase Order ID is required")
	}

	var req types.UpdatePurchaseOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	orgID, _ := c.Locals("organizationID").(string)
	ctx := c.Context()
	order, err := loadPOByID(ctx, id, orgID)
	if err != nil {
		return utils.SendNotFoundError(c, "Purchase order")
	}

	isMetadataOnly := len(req.Metadata) > 0 &&
		req.VendorID == "" &&
		len(req.Items) == 0 && req.TotalAmount == 0 &&
		req.Currency == "" && req.DeliveryDate.Time.IsZero()
	if strings.ToUpper(order.Status) != "DRAFT" && strings.ToUpper(order.Status) != "PENDING" && !isMetadataOnly {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot update purchase order in %s status", order.Status),
		})
	}

	changes := make(map[string]interface{})
	if req.VendorID != "" {
		fromVendorID := ""
		if order.VendorID != nil {
			fromVendorID = *order.VendorID
		}
		if fromVendorID != req.VendorID {
			changes["vendorId"] = map[string]string{"old": fromVendorID, "new": req.VendorID}
		}
		order.VendorID = &req.VendorID
	}
	if len(req.Items) > 0 {
		oldItems := order.Items
		changes["items"] = map[string]interface{}{"old": oldItems, "new": req.Items}
		changes["itemsCount"] = map[string]int{"old": len(oldItems), "new": len(req.Items)}
		order.Items = req.Items
	}
	if req.TotalAmount > 0 && req.TotalAmount != order.TotalAmount {
		changes["totalAmount"] = map[string]float64{"old": order.TotalAmount, "new": req.TotalAmount}
		order.TotalAmount = req.TotalAmount
	}
	if req.Currency != "" && req.Currency != order.Currency {
		changes["currency"] = map[string]string{"old": order.Currency, "new": req.Currency}
		order.Currency = req.Currency
	}
	if !req.DeliveryDate.Time.IsZero() && !req.DeliveryDate.Time.Equal(order.DeliveryDate) {
		changes["deliveryDate"] = map[string]interface{}{
			"old": order.DeliveryDate.Format(time.RFC3339),
			"new": req.DeliveryDate.Time.Format(time.RFC3339),
		}
		order.DeliveryDate = req.DeliveryDate.Time
	}
	if len(req.Metadata) > 0 {
		existingMeta := map[string]interface{}{}
		if len(order.Metadata) > 0 {
			_ = json.Unmarshal(order.Metadata, &existingMeta)
		}
		for k, v := range req.Metadata {
			existingMeta[k] = v
		}
		if metaBytes, err := json.Marshal(existingMeta); err == nil {
			order.Metadata = metaBytes
			changes["metadata"] = "updated"
		}
	}
	if req.QuotationGateOverridden != nil {
		order.QuotationGateOverridden = *req.QuotationGateOverridden
	}
	if req.BypassJustification != "" {
		order.BypassJustification = req.BypassJustification
	}
	if req.Title != "" && req.Title != order.Title {
		changes["title"] = map[string]string{"old": order.Title, "new": req.Title}
		order.Title = req.Title
	}
	if req.Description != "" && req.Description != order.Description {
		changes["description"] = map[string]string{"old": order.Description, "new": req.Description}
		order.Description = req.Description
	}
	if req.Department != "" && req.Department != order.Department {
		changes["department"] = map[string]string{"old": order.Department, "new": req.Department}
		order.Department = req.Department
	}
	if req.DepartmentID != "" && req.DepartmentID != order.DepartmentID {
		changes["departmentId"] = map[string]string{"old": order.DepartmentID, "new": req.DepartmentID}
		order.DepartmentID = req.DepartmentID
	}
	if req.Priority != "" && req.Priority != order.Priority {
		changes["priority"] = map[string]string{"old": order.Priority, "new": req.Priority}
		order.Priority = req.Priority
	}
	if req.BudgetCode != "" && req.BudgetCode != order.BudgetCode {
		changes["budgetCode"] = map[string]string{"old": order.BudgetCode, "new": req.BudgetCode}
		order.BudgetCode = req.BudgetCode
	}
	if req.CostCenter != "" && req.CostCenter != order.CostCenter {
		changes["costCenter"] = map[string]string{"old": order.CostCenter, "new": req.CostCenter}
		order.CostCenter = req.CostCenter
	}
	if req.ProjectCode != "" && req.ProjectCode != order.ProjectCode {
		changes["projectCode"] = map[string]string{"old": order.ProjectCode, "new": req.ProjectCode}
		order.ProjectCode = req.ProjectCode
	}

	actorID, _ := c.Locals("userID").(string)
	actorRole, _ := c.Locals("userRole").(string)
	updateUser, _ := loadUserByID(ctx, actorID)
	if len(changes) > 0 {
		now := time.Now()
		order.ActionHistory = append(order.ActionHistory, types.ActionHistoryEntry{
			ID:              uuid.New().String(),
			Action:          "UPDATE",
			ActionType:      "UPDATE",
			PerformedBy:     actorID,
			PerformedByName: updateUser.Name,
			PerformedByRole: actorRole,
			Timestamp:       now,
			PerformedAt:     now,
			Comments:        "Purchase order updated",
			NewStatus:       order.Status,
		})
	}
	order.UpdatedAt = time.Now()

	if err := updatePurchaseOrderRow(ctx, order); err != nil {
		return utils.SendInternalError(c, "Failed to update purchase order", err)
	}

	if order.VendorID != nil && *order.VendorID != "" {
		if v, err := loadVendorByID(ctx, *order.VendorID, orgID); err == nil {
			order.Vendor = v
			order.VendorName = v.Name
		}
	}

	go utils.SyncDocument("PURCHASE_ORDER", order.ID)

	if len(changes) > 0 {
		snapshot := services.CreateDocumentSnapshot(*order)
		go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
			OrganizationID: orgID,
			DocumentID:     order.ID,
			DocumentType:   "purchase_order",
			UserID:         actorID,
			ActorName:      updateUser.Name,
			ActorRole:      actorRole,
			Action:         "updated",
			Changes:        changes,
			Snapshot:       snapshot,
			Details: map[string]interface{}{
				"documentNumber": order.DocumentNumber,
				"updateType":     "manual_edit",
			},
		})
	}

	return c.JSON(types.DetailResponse{Success: true, Data: modelToPurchaseOrderResponse(*order)})
}

// DeletePurchaseOrder deletes a purchase order (soft delete).
func DeletePurchaseOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Purchase Order ID is required")
	}

	orgID, _ := c.Locals("organizationID").(string)
	ctx := c.Context()
	order, err := loadPOByID(ctx, id, orgID)
	if err != nil {
		return utils.SendNotFoundError(c, "Purchase order")
	}

	if strings.ToUpper(order.Status) != "DRAFT" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Only draft purchase orders can be deleted",
		})
	}

	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE purchase_orders SET deleted_at = $1, updated_at = $1 WHERE id = $2`,
		time.Now(), id,
	); err != nil {
		return utils.SendInternalError(c, "Failed to delete purchase order", err)
	}

	return c.JSON(types.MessageResponse{Success: true, Message: "Purchase order deleted successfully"})
}

// convertReqItemsToPOItems maps RequisitionItems to POItems for sync on submission.
func convertReqItemsToPOItems(reqItems []types.RequisitionItem) []types.POItem {
	poItems := make([]types.POItem, 0, len(reqItems))
	for _, ri := range reqItems {
		id := ""
		if ri.ID != nil {
			id = *ri.ID
		}
		unit := ""
		if ri.Unit != nil {
			unit = *ri.Unit
		}
		notes := ""
		if ri.Notes != nil {
			notes = *ri.Notes
		}
		category := ""
		if ri.Category != nil {
			category = *ri.Category
		}
		poItems = append(poItems, types.POItem{
			ID:          id,
			Description: ri.Description,
			Quantity:    ri.Quantity,
			UnitPrice:   ri.UnitPrice,
			Amount:      ri.Amount,
			TotalPrice:  ri.Amount,
			Unit:        unit,
			Notes:       notes,
			Category:    category,
		})
	}
	return poItems
}

// modelToPurchaseOrderResponse converts a model to its API response shape.
func modelToPurchaseOrderResponse(order models.PurchaseOrder) types.PurchaseOrderResponse {
	items := order.Items
	if items == nil {
		items = []types.POItem{}
	}

	approvalHistory := order.ApprovalHistory
	if approvalHistory == nil {
		approvalHistory = []types.ApprovalRecord{}
	}

	vendorID := ""
	if order.VendorID != nil {
		vendorID = *order.VendorID
	}
	vendorName := order.VendorName
	var vendorResp *types.VendorResponse
	if order.Vendor != nil {
		vendorName = order.Vendor.Name
		vr := modelToVendorResponse(*order.Vendor)
		vendorResp = &vr
	}

	srcReqID := ""
	if order.SourceRequisitionId != nil {
		srcReqID = *order.SourceRequisitionId
	}

	var metadata map[string]interface{}
	if len(order.Metadata) > 0 {
		_ = json.Unmarshal(order.Metadata, &metadata)
	}

	return types.PurchaseOrderResponse{
		ID:                      order.ID,
		OrganizationID:          order.OrganizationID,
		DocumentNumber:          order.DocumentNumber,
		VendorID:                vendorID,
		VendorName:              vendorName,
		Vendor:                  vendorResp,
		Status:                  order.Status,
		Items:                   items,
		TotalAmount:             order.TotalAmount,
		Currency:                order.Currency,
		DeliveryDate:            order.DeliveryDate,
		ApprovalStage:           order.ApprovalStage,
		ApprovalHistory:         approvalHistory,
		ActionHistory:           order.ActionHistory,
		LinkedRequisition:       order.LinkedRequisition,
		SourceRequisitionId:     srcReqID,
		ProcurementFlow:         order.ProcurementFlow,
		Metadata:                metadata,
		EstimatedCost:           order.EstimatedCost,
		AutomationUsed:          order.AutomationUsed,
		QuotationGateOverridden: order.QuotationGateOverridden,
		BypassJustification:     order.BypassJustification,
		Title:                   order.Title,
		Description:             order.Description,
		Department:              order.Department,
		DepartmentID:            order.DepartmentID,
		Priority:                order.Priority,
		BudgetCode:              order.BudgetCode,
		CostCenter:              order.CostCenter,
		ProjectCode:             order.ProjectCode,
		CreatedBy:               order.CreatedBy,
		CreatedAt:               order.CreatedAt,
		UpdatedAt:               order.UpdatedAt,
	}
}

// SubmitPurchaseOrder submits a purchase order for approval using the workflow system.
func SubmitPurchaseOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Purchase Order ID is required")
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
	order, err := loadPOByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Purchase Order")
	}

	if strings.ToUpper(order.Status) != "DRAFT" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot submit purchase order in %s status", order.Status),
		})
	}

	// Quotation gate
	if !order.AutomationUsed {
		var quotations []types.Quotation
		if len(order.Metadata) > 0 {
			var meta map[string]interface{}
			if err := json.Unmarshal(order.Metadata, &meta); err == nil {
				if rawQ, ok := meta["quotations"]; ok {
					if qBytes, err := json.Marshal(rawQ); err == nil {
						_ = json.Unmarshal(qBytes, &quotations)
					}
				}
			}
		}
		quotationCount := len(quotations)
		if quotationCount < 3 {
			if !order.QuotationGateOverridden || order.BypassJustification == "" {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
					"success": false,
					"error":   "quotation_required",
					"message": fmt.Sprintf("At least 3 quotations are required before submission. Currently %d attached.", quotationCount),
					"count":   quotationCount,
				})
			}
			bypassUser, _ := loadUserByID(ctx, userID)
			bypassTime := time.Now()
			order.ActionHistory = append(order.ActionHistory, types.ActionHistoryEntry{
				ID:              uuid.New().String(),
				Action:          "QUOTATION_GATE_BYPASSED",
				ActionType:      "QUOTATION_GATE_BYPASSED",
				PerformedBy:     userID,
				PerformedByName: bypassUser.Name,
				PerformedByRole: bypassUser.Role,
				Timestamp:       bypassTime,
				PerformedAt:     bypassTime,
				Comments:        order.BypassJustification,
				NewStatus:       order.Status,
			})
			roleStr, _ := c.Locals("userRole").(string)
			go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
				OrganizationID: organizationID,
				DocumentID:     order.ID,
				DocumentType:   "purchase_order",
				UserID:         userID,
				ActorName:      bypassUser.Name,
				ActorRole:      roleStr,
				Action:         "quotation_gate_bypassed",
				Details: map[string]interface{}{
					"justification":  order.BypassJustification,
					"quotationCount": quotationCount,
				},
			})
		}
	}

	// Sync from linked APPROVED requisition
	if order.SourceRequisitionId != nil && *order.SourceRequisitionId != "" {
		req, err := loadRequisitionByID(ctx, *order.SourceRequisitionId, organizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Linked requisition not found")
		}
		if strings.ToUpper(req.Status) != "APPROVED" {
			return utils.SendBadRequestError(c, fmt.Sprintf(
				"Cannot submit PO: linked requisition %s is in %s status and must be APPROVED first.",
				req.DocumentNumber, req.Status))
		}
		order.Items = convertReqItemsToPOItems(req.Items)
		order.TotalAmount = req.TotalAmount
		order.Currency = req.Currency
		if req.PreferredVendorID != nil && *req.PreferredVendorID != "" {
			order.VendorID = req.PreferredVendorID
		}
		order.UpdatedAt = time.Now()
		if err := updatePurchaseOrderRow(ctx, order); err != nil {
			return utils.SendInternalError(c, "Failed to sync PO data from requisition", err)
		}
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)
	assignment, err := workflowExecutionService.AssignWorkflowToDocumentWithID(
		ctx, organizationID, order.ID, "purchase_order", submitReq.WorkflowID, userID,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to assign workflow to purchase order", err)
	}

	order.Status = "PENDING"
	order.UpdatedAt = time.Now()

	user, ok := loadUserByID(ctx, userID)
	if ok {
		submitTime := time.Now()
		order.ActionHistory = append(order.ActionHistory, types.ActionHistoryEntry{
			ID:              uuid.New().String(),
			Action:          "SUBMIT",
			ActionType:      "SUBMIT",
			PerformedBy:     userID,
			PerformedByName: user.Name,
			PerformedByRole: user.Role,
			Timestamp:       submitTime,
			PerformedAt:     submitTime,
			Comments:        "Purchase order submitted for approval",
			PreviousStatus:  "DRAFT",
			NewStatus:       "PENDING",
		})
	}

	if err := updatePurchaseOrderRow(ctx, order); err != nil {
		return utils.SendInternalError(c, "Failed to update purchase order status", err)
	}

	if order.VendorID != nil && *order.VendorID != "" {
		if v, err := loadVendorByID(ctx, *order.VendorID, organizationID); err == nil {
			order.Vendor = v
			order.VendorName = v.Name
		}
	}

	go utils.SyncDocument("PURCHASE_ORDER", order.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     order.ID,
		DocumentType:   "purchase_order",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "submitted",
		Details:        map[string]interface{}{"documentNumber": order.DocumentNumber, "workflowId": submitReq.WorkflowID},
	})

	return c.JSON(types.DetailResponse{
		Success: true,
		Data: fiber.Map{
			"purchaseOrder": modelToPurchaseOrderResponse(*order),
			"workflow": fiber.Map{
				"assignmentId": assignment.ID,
				"workflowId":   assignment.WorkflowID,
				"currentStage": assignment.CurrentStage,
				"status":       assignment.Status,
			},
		},
	})
}
