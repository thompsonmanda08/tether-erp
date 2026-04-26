package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/tether-erp/config"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// ============================================================================
// PURCHASE ORDER — FROM REQUISITION
// POST /api/v1/purchase-orders/from-requisition
// ============================================================================

// CreatePurchaseOrderFromRequisition creates a PO pre-populated from an approved requisition.
func CreatePurchaseOrderFromRequisition(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("create_po_from_requisition_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	var req struct {
		RequisitionID             string         `json:"requisitionId"`
		RequisitionDocumentNumber string         `json:"requisitionDocumentNumber"`
		Title                     string         `json:"title"`
		Description               string         `json:"description"`
		VendorID                  string         `json:"vendorId"`
		VendorName                string         `json:"vendorName"`
		Department                string         `json:"department"`
		DepartmentID              string         `json:"departmentId"`
		RequiredByDate            *time.Time     `json:"requiredByDate"`
		Priority                  string         `json:"priority"`
		Items                     []types.POItem `json:"items"`
		TotalAmount               float64        `json:"totalAmount"`
		Currency                  string         `json:"currency"`
		BudgetCode                string         `json:"budgetCode"`
		CostCenter                string         `json:"costCenter"`
		ProjectCode               string         `json:"projectCode"`
		WorkflowID                string         `json:"workflowId"`
		ProcurementFlow           string         `json:"procurementFlow"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if req.RequisitionID == "" {
		return utils.SendBadRequestError(c, "requisitionId is required")
	}
	if len(req.Items) == 0 {
		return utils.SendBadRequestError(c, "At least one item is required")
	}
	if req.TotalAmount <= 0 {
		return utils.SendBadRequestError(c, "totalAmount must be greater than 0")
	}
	if req.Currency == "" {
		req.Currency = "ZMW"
	}

	ctx := c.Context()

	// One-to-one: reject if a non-cancelled PO already exists for this REQ.
	var existingPODoc, existingPOStatus string
	err = config.PgxDB.QueryRow(ctx,
		`SELECT document_number, COALESCE(status,'') FROM purchase_orders
		 WHERE source_requisition_id = $1 AND organization_id = $2
		 AND UPPER(COALESCE(status,'')) != 'CANCELLED' AND deleted_at IS NULL LIMIT 1`,
		req.RequisitionID, tenant.OrganizationID,
	).Scan(&existingPODoc, &existingPOStatus)
	if err == nil {
		return utils.SendConflictError(c, fmt.Sprintf(
			"Purchase order %s already exists for this requisition (status: %s).",
			existingPODoc, existingPOStatus))
	}

	requisition, err := loadRequisitionByID(ctx, req.RequisitionID, tenant.OrganizationID)
	if err != nil {
		return utils.SendBadRequestError(c, "Source requisition not found")
	}
	// Preload preferred vendor (for audit trail)
	if requisition.PreferredVendorID != nil && *requisition.PreferredVendorID != "" {
		if v, err := loadVendorByID(ctx, *requisition.PreferredVendorID, tenant.OrganizationID); err == nil {
			requisition.PreferredVendor = v
		}
	}

	// Currency inheritance
	if requisition.Currency != "" {
		req.Currency = requisition.Currency
	}

	// Verify vendor
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

	// Build PO metadata: copy REQ's attachments tagged + REQ's quotations
	poMetadata := map[string]interface{}{}
	if len(requisition.Metadata) > 0 {
		var reqMeta map[string]interface{}
		if err := json.Unmarshal(requisition.Metadata, &reqMeta); err == nil {
			if rawAttachments, ok := reqMeta["attachments"]; ok {
				if attachSlice, ok2 := rawAttachments.([]interface{}); ok2 {
					tagged := make([]interface{}, 0, len(attachSlice))
					for _, a := range attachSlice {
						if aMap, ok3 := a.(map[string]interface{}); ok3 {
							aMap["fromRequisition"] = true
							tagged = append(tagged, aMap)
						}
					}
					poMetadata["attachments"] = tagged
				}
			}
			if quotations, ok := reqMeta["quotations"]; ok {
				poMetadata["quotations"] = quotations
			}
		}
	}

	estimatedCost := 0.0
	if requisition.IsEstimate {
		estimatedCost = requisition.TotalAmount
	}

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
		ApprovalStage:     0,
		LinkedRequisition: req.RequisitionDocumentNumber,
		Title:             req.Title,
		Description:       req.Description,
		Department:        req.Department,
		DepartmentID:      req.DepartmentID,
		Priority:          req.Priority,
		BudgetCode:        req.BudgetCode,
		CostCenter:        req.CostCenter,
		ProjectCode:       req.ProjectCode,
		ProcurementFlow:   req.ProcurementFlow,
		EstimatedCost:     estimatedCost,
		CreatedBy:         tenant.UserID,
		ApprovalHistory:   []types.ApprovalRecord{},
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if len(poMetadata) > 0 {
		if metaBytes, err := json.Marshal(poMetadata); err == nil {
			order.Metadata = metaBytes
		}
	}
	if req.RequiredByDate != nil {
		order.RequiredByDate = req.RequiredByDate
	}
	if req.RequisitionID != "" {
		order.SourceRequisitionId = &req.RequisitionID
	}

	// Build initial action history
	var initialHistory []types.ActionHistoryEntry
	if requisition.DocumentNumber != "" {
		initialHistory = append(initialHistory, types.ActionHistoryEntry{
			ID:          uuid.New().String(),
			Action:      "CREATED_FROM_REQUISITION",
			PerformedBy: tenant.UserID,
			Timestamp:   now,
			Metadata: map[string]interface{}{
				"linkedDocNumber": requisition.DocumentNumber,
				"linkedDocType":   "requisition",
			},
		})
	}
	reqPreferredVendorID := ""
	if requisition.PreferredVendorID != nil {
		reqPreferredVendorID = *requisition.PreferredVendorID
	}
	if req.VendorID != reqPreferredVendorID && reqPreferredVendorID != "" {
		oldVendorName := ""
		if requisition.PreferredVendor != nil {
			oldVendorName = requisition.PreferredVendor.Name
		}
		initialHistory = append(initialHistory, types.ActionHistoryEntry{
			ID:          uuid.New().String(),
			Action:      "VENDOR_CHANGED",
			PerformedBy: tenant.UserID,
			Timestamp:   now,
			ChangedFields: map[string]interface{}{
				"vendor": map[string]interface{}{
					"from": oldVendorName,
					"to":   req.VendorName,
				},
			},
		})
	}
	initialHistory = append(initialHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "CREATE",
		ActionType:      "CREATE",
		PerformedBy:     tenant.UserID,
		PerformedByName: createUser.Name,
		PerformedByRole: createUser.Role,
		Timestamp:       now,
		PerformedAt:     now,
		Comments:        "Purchase order created from requisition",
		NewStatus:       "DRAFT",
	})
	order.ActionHistory = initialHistory

	if err := insertPurchaseOrder(ctx, &order); err != nil {
		logging.LogError(c, err, "create_po_from_requisition_failed", nil)
		return utils.SendInternalError(c, "Failed to create purchase order", err)
	}

	// Record PO_CREATED on the source requisition for chain traceability
	if req.RequisitionID != "" {
		requisition.ActionHistory = append(requisition.ActionHistory, types.ActionHistoryEntry{
			ID:          uuid.New().String(),
			Action:      "PO_CREATED",
			PerformedBy: tenant.UserID,
			Timestamp:   time.Now(),
			Metadata: map[string]interface{}{
				"linkedDocNumber": order.DocumentNumber,
				"linkedDocType":   "purchase_order",
			},
		})
		_ = updateRequisition(ctx, requisition)
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
		ActorRole:      createUser.Role,
		Action:         "created",
		Details:        map[string]interface{}{"documentNumber": order.DocumentNumber, "sourceRequisition": req.RequisitionDocumentNumber},
	})

	logger.Info("po_from_requisition_created")
	return utils.SendCreatedSuccess(c, modelToPurchaseOrderResponse(order), "Purchase order created from requisition successfully")
}

// ============================================================================
// PAYMENT VOUCHER — FROM PURCHASE ORDER
// POST /api/v1/payment-vouchers/from-po
// ============================================================================

// CreatePaymentVoucherFromPO creates a PV pre-populated from an approved PO.
func CreatePaymentVoucherFromPO(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("create_pv_from_po_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	var req struct {
		PurchaseOrderID             string              `json:"purchaseOrderId"`
		PurchaseOrderDocumentNumber string              `json:"purchaseOrderDocumentNumber"`
		Title                       string              `json:"title"`
		Description                 string              `json:"description"`
		VendorID                    string              `json:"vendorId"`
		VendorName                  string              `json:"vendorName"`
		Department                  string              `json:"department"`
		DepartmentID                string              `json:"departmentId"`
		Items                       []types.PaymentItem `json:"items"`
		TotalAmount                 float64             `json:"totalAmount"`
		Currency                    string              `json:"currency"`
		BudgetCode                  string              `json:"budgetCode"`
		CostCenter                  string              `json:"costCenter"`
		ProjectCode                 string              `json:"projectCode"`
		SourceRequisitionID         string              `json:"sourceRequisitionId"`
		WorkflowID                  string              `json:"workflowId"`
		LinkedGRNDocumentNumber     string              `json:"linkedGRNDocumentNumber"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if req.PurchaseOrderID == "" {
		return utils.SendBadRequestError(c, "purchaseOrderId is required")
	}
	if req.TotalAmount <= 0 {
		return utils.SendBadRequestError(c, "totalAmount must be greater than 0")
	}
	if req.Currency == "" {
		req.Currency = "ZMW"
	}

	ctx := c.Context()
	po, err := loadPOByID(ctx, req.PurchaseOrderID, tenant.OrganizationID)
	if err != nil {
		return utils.SendBadRequestError(c, "Purchase order not found")
	}
	// Preload PO vendor for audit trail
	if po.VendorID != nil && *po.VendorID != "" {
		if v, err := loadVendorByID(ctx, *po.VendorID, tenant.OrganizationID); err == nil {
			po.Vendor = v
		}
	}

	// Currency inheritance
	if po.Currency != "" {
		req.Currency = po.Currency
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

	// Goods-first enforcement
	var linkedGRN *models.GoodsReceivedNote
	if effectiveFlow == "goods_first" {
		if req.LinkedGRNDocumentNumber == "" {
			return utils.SendBadRequestError(c, "A linked GRN document number is required for goods-first procurement flow")
		}
		grn, err := loadGRNByDocNumber(ctx, req.LinkedGRNDocumentNumber, tenant.OrganizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Linked GRN not found")
		}
		if strings.ToUpper(grn.Status) != "APPROVED" {
			return utils.SendBadRequestError(c, "Linked GRN must be approved before creating a payment voucher (goods-first flow)")
		}
		if grn.PODocumentNumber != po.DocumentNumber {
			return utils.SendBadRequestError(c, "Linked GRN does not belong to the selected purchase order")
		}
		linkedGRN = grn
	}

	// Verify vendor
	var vendorIDPtr *string
	if req.VendorID != "" {
		if _, err := loadVendorByID(ctx, req.VendorID, tenant.OrganizationID); err != nil {
			return utils.SendBadRequestError(c, "Vendor not found")
		}
		vendorIDPtr = &req.VendorID
	}

	documentNumber := utils.GenerateDocumentNumber("PV")
	invoiceRef := "INV-" + po.DocumentNumber
	createUser, _ := loadUserByID(ctx, tenant.UserID)

	linkedGRNDocNum := ""
	if linkedGRN != nil {
		linkedGRNDocNum = linkedGRN.DocumentNumber
	}

	now := time.Now()
	voucher := models.PaymentVoucher{
		ID:              uuid.New().String(),
		OrganizationID:  tenant.OrganizationID,
		DocumentNumber:  documentNumber,
		VendorID:        vendorIDPtr,
		InvoiceNumber:   invoiceRef,
		Status:          "DRAFT",
		Amount:          req.TotalAmount,
		Currency:        req.Currency,
		PaymentMethod:   "bank_transfer",
		Description:     req.Description,
		ApprovalStage:   0,
		LinkedPO:        req.PurchaseOrderDocumentNumber,
		LinkedGRN:       linkedGRNDocNum,
		Title:           req.Title,
		Department:      req.Department,
		DepartmentID:    req.DepartmentID,
		BudgetCode:      req.BudgetCode,
		CostCenter:      req.CostCenter,
		ProjectCode:     req.ProjectCode,
		CreatedBy:       tenant.UserID,
		Items:           req.Items,
		ApprovalHistory: []types.ApprovalRecord{},
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	// Build initial action history
	var pvInitialHistory []types.ActionHistoryEntry
	if linkedGRN != nil {
		pvInitialHistory = append(pvInitialHistory, types.ActionHistoryEntry{
			ID:          uuid.New().String(),
			Action:      "CREATED_FROM_GRN",
			PerformedBy: tenant.UserID,
			Timestamp:   now,
			Metadata: map[string]interface{}{
				"linkedDocNumber": linkedGRN.DocumentNumber,
				"linkedDocType":   "grn",
				"flow":            "goods_first",
			},
		})
	} else {
		pvInitialHistory = append(pvInitialHistory, types.ActionHistoryEntry{
			ID:          uuid.New().String(),
			Action:      "CREATED_FROM_PO",
			PerformedBy: tenant.UserID,
			Timestamp:   now,
			Metadata: map[string]interface{}{
				"linkedDocNumber": po.DocumentNumber,
				"linkedDocType":   "purchase_order",
				"flow":            "payment_first",
			},
		})
	}
	poVendorID := ""
	if po.VendorID != nil {
		poVendorID = *po.VendorID
	}
	if req.VendorID != poVendorID && poVendorID != "" {
		oldVendorName := ""
		if po.Vendor != nil {
			oldVendorName = po.Vendor.Name
		}
		pvInitialHistory = append(pvInitialHistory, types.ActionHistoryEntry{
			ID:          uuid.New().String(),
			Action:      "VENDOR_CHANGED",
			PerformedBy: tenant.UserID,
			Timestamp:   now,
			ChangedFields: map[string]interface{}{
				"vendor": map[string]interface{}{
					"from": oldVendorName,
					"to":   req.VendorName,
				},
			},
		})
	}
	pvInitialHistory = append(pvInitialHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "CREATE",
		ActionType:      "CREATE",
		PerformedBy:     tenant.UserID,
		PerformedByName: createUser.Name,
		PerformedByRole: createUser.Role,
		Timestamp:       now,
		PerformedAt:     now,
		Comments:        "Payment voucher created from purchase order",
		NewStatus:       "DRAFT",
	})
	voucher.ActionHistory = pvInitialHistory

	if err := insertPaymentVoucher(ctx, &voucher); err != nil {
		logging.LogError(c, err, "create_pv_from_po_failed", nil)
		return utils.SendInternalError(c, "Failed to create payment voucher", err)
	}

	// Record PV_CREATED on parent doc
	pvCreatedEntry := types.ActionHistoryEntry{
		ID:          uuid.New().String(),
		Action:      "PV_CREATED",
		PerformedBy: tenant.UserID,
		Timestamp:   time.Now(),
		Metadata: map[string]interface{}{
			"linkedDocNumber": voucher.DocumentNumber,
			"linkedDocType":   "payment_voucher",
			"flow":            effectiveFlow,
		},
	}
	if linkedGRN != nil {
		linkedGRN.ActionHistory = append(linkedGRN.ActionHistory, pvCreatedEntry)
		_ = updateGRNRow(ctx, linkedGRN)
	} else {
		po.ActionHistory = append(po.ActionHistory, pvCreatedEntry)
		_ = updatePurchaseOrderRow(ctx, po)
	}

	if voucher.VendorID != nil && *voucher.VendorID != "" {
		if v, err := loadVendorByID(ctx, *voucher.VendorID, tenant.OrganizationID); err == nil {
			voucher.Vendor = v
			voucher.VendorName = v.Name
		}
	}

	go utils.SyncDocument("PAYMENT_VOUCHER", voucher.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: tenant.OrganizationID,
		DocumentID:     voucher.ID,
		DocumentType:   "payment_voucher",
		UserID:         tenant.UserID,
		ActorName:      createUser.Name,
		ActorRole:      createUser.Role,
		Action:         "created",
		Details:        map[string]interface{}{"documentNumber": voucher.DocumentNumber, "sourcePO": req.PurchaseOrderDocumentNumber},
	})

	logger.Info("pv_from_po_created")
	return utils.SendCreatedSuccess(c, modelToPaymentVoucherResponse(voucher), "Payment voucher created from purchase order successfully")
}

// ============================================================================
// PAYMENT VOUCHER — MARK PAID
// POST /api/v1/payment-vouchers/:id/mark-paid
// ============================================================================

// MarkPaymentVoucherPaid marks an approved PV as paid and records payment details.
func MarkPaymentVoucherPaid(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("mark_pv_paid_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Payment voucher ID is required")
	}

	var req struct {
		PaidAmount      float64    `json:"paidAmount"`
		PaidDate        *time.Time `json:"paidDate"`
		ReferenceNumber string     `json:"referenceNumber"`
		Comments        string     `json:"comments"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if req.PaidAmount <= 0 {
		return utils.SendBadRequestError(c, "paidAmount must be greater than 0")
	}
	if req.ReferenceNumber == "" {
		return utils.SendBadRequestError(c, "referenceNumber is required")
	}

	ctx := c.Context()
	voucher, err := loadPVByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Payment voucher")
	}

	if strings.ToUpper(voucher.Status) != "APPROVED" {
		return utils.SendBadRequestError(c, "Only approved payment vouchers can be marked as paid")
	}

	const amountTolerance = 0.01
	if req.PaidAmount < voucher.Amount-amountTolerance || req.PaidAmount > voucher.Amount+amountTolerance {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"success":        false,
			"error":          "amount_mismatch",
			"message":        fmt.Sprintf("Paid amount (%.2f) does not match the approved voucher amount (%.2f). Please enter the exact approved amount.", req.PaidAmount, voucher.Amount),
			"approvedAmount": voucher.Amount,
			"paidAmount":     req.PaidAmount,
		})
	}

	now := time.Now()
	paidDate := &now
	if req.PaidDate != nil {
		paidDate = req.PaidDate
	}

	voucher.Status = "PAID"
	voucher.PaidAmount = &req.PaidAmount
	voucher.PaidDate = paidDate
	voucher.UpdatedAt = now

	userID, _ := c.Locals("userID").(string)
	user, _ := loadUserByID(ctx, userID)

	voucher.ActionHistory = append(voucher.ActionHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "MARK_PAID",
		PerformedBy:     userID,
		PerformedByName: user.Name,
		PerformedByRole: user.Role,
		Timestamp:       now,
		Comments:        req.Comments,
		ActionType:      "MARK_PAID",
		PreviousStatus:  "APPROVED",
		NewStatus:       "PAID",
	})

	if err := updatePaymentVoucherRow(ctx, voucher); err != nil {
		logging.LogError(c, err, "mark_pv_paid_failed", nil)
		return utils.SendInternalError(c, "Failed to mark payment voucher as paid", err)
	}

	go utils.SyncDocument("PAYMENT_VOUCHER", voucher.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: tenant.OrganizationID,
		DocumentID:     voucher.ID,
		DocumentType:   "payment_voucher",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "marked_paid",
		Details:        map[string]interface{}{"documentNumber": voucher.DocumentNumber, "paidAmount": req.PaidAmount},
	})

	logger.Info("pv_marked_paid")
	return utils.SendSimpleSuccess(c, modelToPaymentVoucherResponse(*voucher), "Payment voucher marked as paid successfully")
}

// ============================================================================
// STATS ENDPOINTS
// ============================================================================

// statsForTable returns count summaries grouped by status for the given table/owner-field.
func statsForTable(ctx context.Context, tenant *utils.TenantContext, table, ownerField, entityType string, statuses []string) fiber.Map {
	scope := utils.GetDocumentScope(ctx, tenant.UserID, tenant.UserRole, tenant.OrganizationID)

	baseWhere := "organization_id = $1 AND deleted_at IS NULL"
	baseArgs := []interface{}{tenant.OrganizationID}
	nextArg := 2
	if frag, fragArgs, na := scope.WhereSQL(ownerField, entityType, "", nextArg); frag != "" {
		baseWhere += " AND " + frag
		baseArgs = append(baseArgs, fragArgs...)
		nextArg = na
	}
	_ = nextArg

	stats := fiber.Map{}
	for _, status := range statuses {
		var count int64
		args := append([]interface{}{}, baseArgs...)
		args = append(args, strings.ToUpper(status))
		sqlStr := fmt.Sprintf(
			"SELECT COUNT(*) FROM %s WHERE %s AND UPPER(COALESCE(status,'')) = $%d",
			table, baseWhere, len(args),
		)
		_ = config.PgxDB.QueryRow(ctx, sqlStr, args...).Scan(&count)
		stats[status] = count
	}
	var total int64
	_ = config.PgxDB.QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s", table, baseWhere),
		baseArgs...,
	).Scan(&total)
	stats["total"] = total
	return stats
}

// GetRequisitionStats returns count summaries for requisitions in the org.
func GetRequisitionStats(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}
	stats := statsForTable(c.Context(), tenant, "requisitions", "requester_id", "requisition",
		[]string{"draft", "pending", "approved", "rejected", "completed", "cancelled"})
	return utils.SendSimpleSuccess(c, stats, "Requisition statistics retrieved successfully")
}

// GetPurchaseOrderStats returns count summaries for POs in the org.
func GetPurchaseOrderStats(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}
	stats := statsForTable(c.Context(), tenant, "purchase_orders", "created_by", "purchase_order",
		[]string{"draft", "pending", "approved", "rejected", "fulfilled", "completed", "cancelled"})
	return utils.SendSimpleSuccess(c, stats, "Purchase order statistics retrieved successfully")
}

// GetPaymentVoucherStats returns count summaries for PVs in the org.
func GetPaymentVoucherStats(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}
	stats := statsForTable(c.Context(), tenant, "payment_vouchers", "vendor_id", "payment_voucher",
		[]string{"draft", "pending", "approved", "rejected", "paid", "completed", "cancelled"})
	return utils.SendSimpleSuccess(c, stats, "Payment voucher statistics retrieved successfully")
}

// ============================================================================
// DEPARTMENT HEADS LIST
// GET /api/v1/users/department-heads/list
// ============================================================================

// GetDepartmentHeadsList returns organization members with roles that can act as approvers/HODs.
func GetDepartmentHeadsList(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	departmentID := c.Query("department_id")
	roleID := c.Query("role_id")
	isActiveStr := c.Query("is_active")
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("page_size", 50)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}

	eligibleRoles := []string{"admin", "approver", "finance"}

	where := `om.organization_id = $1 AND om.active = true AND u.role = ANY($2::text[])`
	args := []interface{}{tenant.OrganizationID, eligibleRoles}
	nextArg := 3

	if departmentID != "" {
		where += fmt.Sprintf(" AND om.department_id = $%d", nextArg)
		args = append(args, departmentID)
		nextArg++
	}
	if roleID != "" {
		where += fmt.Sprintf(" AND u.role = $%d", nextArg)
		args = append(args, roleID)
		nextArg++
	}
	if isActiveStr == "true" {
		where += " AND u.active = true"
	} else if isActiveStr == "false" {
		where += " AND u.active = false"
	}

	ctx := c.Context()
	var total int64
	if err := config.PgxDB.QueryRow(ctx,
		"SELECT COUNT(*) FROM users u JOIN organization_members om ON om.user_id = u.id WHERE "+where,
		args...,
	).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count department heads", err)
	}

	type HODUser struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		Email        string `json:"email"`
		Role         string `json:"role"`
		Position     string `json:"position"`
		DepartmentID string `json:"departmentId"`
	}

	offset := (page - 1) * pageSize
	listSQL := `SELECT u.id, u.name, u.email, u.role, COALESCE(u.position, ''), COALESCE(om.department_id, '')
	            FROM users u
	            JOIN organization_members om ON om.user_id = u.id
	            WHERE ` + where + fmt.Sprintf(" ORDER BY u.name ASC LIMIT $%d OFFSET $%d", nextArg, nextArg+1)
	args = append(args, pageSize, offset)

	rows, err := config.PgxDB.Query(ctx, listSQL, args...)
	if err != nil {
		return utils.SendInternalError(c, "Failed to retrieve department heads", err)
	}
	defer rows.Close()

	users := make([]HODUser, 0)
	for rows.Next() {
		var u HODUser
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Position, &u.DepartmentID); err == nil {
			users = append(users, u)
		}
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)
	return utils.SendSuccess(c, fiber.StatusOK, users, "Department heads retrieved successfully", &types.PaginationMeta{
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    int64(page) < totalPages,
		HasPrev:    page > 1,
	})
}

// ============================================================================
// SIGNATURE VALIDATION
// ============================================================================

// ValidateSignature checks that a submitted digital signature is non-empty and well-formed.
func ValidateSignature(c *fiber.Ctx) error {
	var req struct {
		Signature string `json:"signature"`
		UserID    string `json:"userId"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if req.Signature == "" {
		return utils.SendBadRequestError(c, "Signature is required")
	}

	raw := req.Signature
	if idx := strings.Index(raw, "base64,"); idx != -1 {
		raw = raw[idx+7:]
	}

	_, decodeErr := base64.StdEncoding.DecodeString(raw)
	if decodeErr != nil {
		_, decodeErr = base64.URLEncoding.DecodeString(raw)
	}

	if decodeErr != nil {
		return utils.SendSimpleSuccess(c, fiber.Map{
			"valid":   false,
			"message": "Signature is not valid base64 encoded data",
		}, "Signature validation completed")
	}

	return utils.SendSimpleSuccess(c, fiber.Map{
		"valid":   true,
		"message": "Signature is valid",
	}, "Signature validation completed")
}

// ============================================================================
// APPROVER WORKLOAD
// ============================================================================

// GetApproverWorkload returns pending task count and basic stats for a given approver.
func GetApproverWorkload(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	approverID := c.Params("approverId")
	if approverID == "" {
		return utils.SendBadRequestError(c, "Approver ID is required")
	}

	ctx := c.Context()
	var pendingCount, completedThisMonth, overdueTasks int64

	_ = config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM workflow_tasks wt
		JOIN workflow_assignments wa ON wa.id = wt.workflow_assignment_id
		WHERE wt.assigned_user_id = $1 AND UPPER(wt.status) = 'PENDING' AND wa.organization_id = $2`,
		approverID, tenant.OrganizationID,
	).Scan(&pendingCount)

	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	_ = config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM workflow_tasks wt
		JOIN workflow_assignments wa ON wa.id = wt.workflow_assignment_id
		WHERE wt.assigned_user_id = $1 AND UPPER(wt.status) IN ('APPROVED','REJECTED')
		  AND wt.updated_at >= $2 AND wa.organization_id = $3`,
		approverID, startOfMonth, tenant.OrganizationID,
	).Scan(&completedThisMonth)

	_ = config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM workflow_tasks wt
		JOIN workflow_assignments wa ON wa.id = wt.workflow_assignment_id
		WHERE wt.assigned_user_id = $1 AND UPPER(wt.status) = 'PENDING'
		  AND wt.due_date < $2 AND wa.organization_id = $3`,
		approverID, now, tenant.OrganizationID,
	).Scan(&overdueTasks)

	return utils.SendSimpleSuccess(c, fiber.Map{
		"pendingCount":        pendingCount,
		"averageResponseTime": 0,
		"completedThisMonth":  completedThisMonth,
		"overdueTasks":        overdueTasks,
	}, "Approver workload retrieved successfully")
}

// ============================================================================
// GRN CONFIRM
// ============================================================================

// ConfirmGRN marks an approved GRN as confirmed/completed.
func ConfirmGRN(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("confirm_grn_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "GRN ID is required")
	}

	var req struct {
		Comments string `json:"comments"`
	}
	_ = c.BodyParser(&req)

	ctx := c.Context()
	grn, err := loadGRNByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "GRN")
	}

	if strings.ToUpper(grn.Status) != "APPROVED" {
		return utils.SendBadRequestError(c, "Only approved GRNs can be confirmed")
	}

	userID, _ := c.Locals("userID").(string)
	user, _ := loadUserByID(ctx, userID)

	now := time.Now()
	grn.Status = "COMPLETED"
	grn.UpdatedAt = now
	grn.ActionHistory = append(grn.ActionHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "CONFIRM",
		PerformedBy:     userID,
		PerformedByName: user.Name,
		PerformedByRole: user.Role,
		Timestamp:       now,
		Comments:        req.Comments,
		ActionType:      "CONFIRM",
		PreviousStatus:  "APPROVED",
		NewStatus:       "COMPLETED",
	})

	if err := updateGRNRow(ctx, grn); err != nil {
		logging.LogError(c, err, "confirm_grn_failed", nil)
		return utils.SendInternalError(c, "Failed to confirm GRN", err)
	}

	go utils.SyncDocument("GRN", grn.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: tenant.OrganizationID,
		DocumentID:     grn.ID,
		DocumentType:   "grn",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "confirmed",
		Details:        map[string]interface{}{"documentNumber": grn.DocumentNumber},
	})

	logger.Info("grn_confirmed")
	return utils.SendSimpleSuccess(c, modelToGRNResponse(*grn), "GRN confirmed successfully")
}
