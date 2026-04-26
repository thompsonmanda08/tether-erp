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

const pvSelectColumns = `
	id, organization_id, document_number, vendor_id, invoice_number, status,
	COALESCE(amount, 0)::float8, currency, payment_method, gl_code, description,
	approval_stage, approval_history, linked_po,
	title, department, department_id, priority,
	requested_by_name, requested_date, submitted_at, approved_at, paid_date, payment_due_date,
	budget_code, cost_center, project_code,
	tax_amount, withholding_tax_amount, paid_amount,
	bank_details, items, created_by, owner_id,
	action_history, metadata,
	linked_grn,
	created_at, updated_at
`

func scanPaymentVoucherRow(row rowScanner, p *models.PaymentVoucher) error {
	var (
		invoiceNumber, status, paymentMethod, glCode, description    *string
		title, department, departmentID, priority                    *string
		budgetCode, costCenter, projectCode, createdBy, ownerID      *string
		linkedPO, linkedGRN, requestedByName                         *string
		requestedDate, submittedAt, approvedAt, paidDate, paymentDue *time.Time
		taxAmount, withholdingTaxAmount, paidAmount                  *float64
		bankDetails, items, approvalHistory, actionHistory, metadata []byte
		approvalStage                                                *int32
	)
	err := row.Scan(
		&p.ID, &p.OrganizationID, &p.DocumentNumber, &p.VendorID, &invoiceNumber, &status,
		&p.Amount, &p.Currency, &paymentMethod, &glCode, &description,
		&approvalStage, &approvalHistory, &linkedPO,
		&title, &department, &departmentID, &priority,
		&requestedByName, &requestedDate, &submittedAt, &approvedAt, &paidDate, &paymentDue,
		&budgetCode, &costCenter, &projectCode,
		&taxAmount, &withholdingTaxAmount, &paidAmount,
		&bankDetails, &items, &createdBy, &ownerID,
		&actionHistory, &metadata,
		&linkedGRN,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if invoiceNumber != nil {
		p.InvoiceNumber = *invoiceNumber
	}
	if status != nil {
		p.Status = *status
	}
	if paymentMethod != nil {
		p.PaymentMethod = *paymentMethod
	}
	if glCode != nil {
		p.GLCode = *glCode
	}
	if description != nil {
		p.Description = *description
	}
	if title != nil {
		p.Title = *title
	}
	if department != nil {
		p.Department = *department
	}
	if departmentID != nil {
		p.DepartmentID = *departmentID
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
	if linkedPO != nil {
		p.LinkedPO = *linkedPO
	}
	if linkedGRN != nil {
		p.LinkedGRN = *linkedGRN
	}
	if requestedByName != nil {
		p.RequestedByName = *requestedByName
	}
	p.RequestedDate = requestedDate
	p.SubmittedAt = submittedAt
	p.ApprovedAt = approvedAt
	p.PaidDate = paidDate
	p.PaymentDueDate = paymentDue
	p.TaxAmount = taxAmount
	p.WithholdingTaxAmount = withholdingTaxAmount
	p.PaidAmount = paidAmount
	if approvalStage != nil {
		p.ApprovalStage = int(*approvalStage)
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
		// PaymentVoucher.Metadata is not declared on the model, but BankDetails is RawMessage
	}
	if len(items) > 0 {
		_ = json.Unmarshal(items, &p.Items)
	}
	if p.Items == nil {
		p.Items = []types.PaymentItem{}
	}
	if len(bankDetails) > 0 {
		p.BankDetails = json.RawMessage(bankDetails)
	}
	return nil
}

func loadPVByID(ctx context.Context, id, orgID string) (*models.PaymentVoucher, error) {
	q := `SELECT ` + pvSelectColumns + ` FROM payment_vouchers
	      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	var p models.PaymentVoucher
	if err := scanPaymentVoucherRow(config.PgxDB.QueryRow(ctx, q, id, orgID), &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func loadPVsByIDs(ctx context.Context, ids []string) []models.PaymentVoucher {
	if len(ids) == 0 {
		return nil
	}
	q := `SELECT ` + pvSelectColumns + ` FROM payment_vouchers
	      WHERE id = ANY($1::text[]) AND deleted_at IS NULL ORDER BY created_at DESC`
	rows, err := config.PgxDB.Query(ctx, q, ids)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make([]models.PaymentVoucher, 0, len(ids))
	for rows.Next() {
		var p models.PaymentVoucher
		if err := scanPaymentVoucherRow(rows, &p); err == nil {
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

func insertPaymentVoucher(ctx context.Context, p *models.PaymentVoucher) error {
	approvalHistoryJSON, _ := json.Marshal(p.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(p.ActionHistory)
	itemsJSON, _ := json.Marshal(p.Items)
	_, err := config.PgxDB.Exec(ctx, `
		INSERT INTO payment_vouchers (
			id, organization_id, document_number, vendor_id, invoice_number, status,
			amount, currency, payment_method, gl_code, description,
			approval_stage, approval_history, linked_po,
			title, department, department_id, priority,
			requested_by_name, requested_date, submitted_at, approved_at, paid_date, payment_due_date,
			budget_code, cost_center, project_code,
			tax_amount, withholding_tax_amount, paid_amount,
			bank_details, items, created_by, owner_id,
			action_history, metadata, linked_grn,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
			$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39
		)`,
		p.ID, p.OrganizationID, p.DocumentNumber, p.VendorID, nilIfEmpty(p.InvoiceNumber), nilIfEmpty(p.Status),
		p.Amount, p.Currency, nilIfEmpty(p.PaymentMethod), nilIfEmpty(p.GLCode), nilIfEmpty(p.Description),
		int32(p.ApprovalStage), approvalHistoryJSON, nilIfEmpty(p.LinkedPO),
		nilIfEmpty(p.Title), nilIfEmpty(p.Department), nilIfEmpty(p.DepartmentID), nilIfEmpty(p.Priority),
		nilIfEmpty(p.RequestedByName),
		nilIfNilTimePtr(p.RequestedDate), nilIfNilTimePtr(p.SubmittedAt),
		nilIfNilTimePtr(p.ApprovedAt), nilIfNilTimePtr(p.PaidDate), nilIfNilTimePtr(p.PaymentDueDate),
		nilIfEmpty(p.BudgetCode), nilIfEmpty(p.CostCenter), nilIfEmpty(p.ProjectCode),
		p.TaxAmount, p.WithholdingTaxAmount, p.PaidAmount,
		jsonOrNil(p.BankDetails), itemsJSON, nilIfEmpty(p.CreatedBy), nilIfEmpty(p.CreatedBy),
		actionHistoryJSON, nil /* metadata not on model */, nilIfEmpty(p.LinkedGRN),
		p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func updatePaymentVoucherRow(ctx context.Context, p *models.PaymentVoucher) error {
	approvalHistoryJSON, _ := json.Marshal(p.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(p.ActionHistory)
	itemsJSON, _ := json.Marshal(p.Items)
	_, err := config.PgxDB.Exec(ctx, `
		UPDATE payment_vouchers SET
			vendor_id = $2, invoice_number = $3, status = $4,
			amount = $5, currency = $6, payment_method = $7, gl_code = $8, description = $9,
			approval_stage = $10, approval_history = $11, linked_po = $12,
			title = $13, department = $14, department_id = $15, priority = $16,
			requested_by_name = $17, requested_date = $18, submitted_at = $19,
			approved_at = $20, paid_date = $21, payment_due_date = $22,
			budget_code = $23, cost_center = $24, project_code = $25,
			tax_amount = $26, withholding_tax_amount = $27, paid_amount = $28,
			bank_details = $29, items = $30,
			action_history = $31, linked_grn = $32, updated_at = $33
		WHERE id = $1`,
		p.ID, p.VendorID, nilIfEmpty(p.InvoiceNumber), nilIfEmpty(p.Status),
		p.Amount, p.Currency, nilIfEmpty(p.PaymentMethod), nilIfEmpty(p.GLCode), nilIfEmpty(p.Description),
		int32(p.ApprovalStage), approvalHistoryJSON, nilIfEmpty(p.LinkedPO),
		nilIfEmpty(p.Title), nilIfEmpty(p.Department), nilIfEmpty(p.DepartmentID), nilIfEmpty(p.Priority),
		nilIfEmpty(p.RequestedByName),
		nilIfNilTimePtr(p.RequestedDate), nilIfNilTimePtr(p.SubmittedAt),
		nilIfNilTimePtr(p.ApprovedAt), nilIfNilTimePtr(p.PaidDate), nilIfNilTimePtr(p.PaymentDueDate),
		nilIfEmpty(p.BudgetCode), nilIfEmpty(p.CostCenter), nilIfEmpty(p.ProjectCode),
		p.TaxAmount, p.WithholdingTaxAmount, p.PaidAmount,
		jsonOrNil(p.BankDetails), itemsJSON,
		actionHistoryJSON, nilIfEmpty(p.LinkedGRN), time.Now(),
	)
	return err
}

// GetPaymentVouchers retrieves all payment vouchers with pagination and filtering.
func GetPaymentVouchers(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_payment_vouchers_request")

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
	vendorID := c.Query("vendorId")

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":       "get_payment_vouchers",
		"page":            page,
		"limit":           limit,
		"status":          status,
		"vendor_id":       vendorID,
		"organization_id": tenant.OrganizationID,
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

	switch {
	case scope.CanViewAll:
		total, err = config.Queries.CountPaymentVouchersAll(ctx, db.CountPaymentVouchersAllParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count payment vouchers", err)
		}
		ids, err = config.Queries.ListPaymentVoucherIDsAll(ctx, db.ListPaymentVoucherIDsAllParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
			Limit: int32(limit), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch payment vouchers", err)
		}
	case scope.IsProcurement:
		total, err = config.Queries.CountPaymentVouchersProcurement(ctx, db.CountPaymentVouchersProcurementParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count payment vouchers", err)
		}
		ids, err = config.Queries.ListPaymentVoucherIDsProcurement(ctx, db.ListPaymentVoucherIDsProcurementParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
			Limit: int32(limit), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch payment vouchers", err)
		}
	default:
		total, err = config.Queries.CountPaymentVouchersLimited(ctx, db.CountPaymentVouchersLimitedParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
			CreatedBy: &scope.UserID, Lower: scope.UserRole, Column6: orgRoleIDs,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to count payment vouchers", err)
		}
		ids, err = config.Queries.ListPaymentVoucherIDsLimited(ctx, db.ListPaymentVoucherIDsLimitedParams{
			OrganizationID: tenant.OrganizationID, Column2: status, Column3: vendorID,
			CreatedBy: &scope.UserID, Lower: scope.UserRole, Column6: orgRoleIDs,
			Limit: int32(limit), Offset: offset,
		})
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch payment vouchers", err)
		}
	}

	vouchers := loadPVsByIDs(ctx, ids)
	responses := make([]types.PaymentVoucherResponse, 0, len(vouchers))
	for _, v := range vouchers {
		responses = append(responses, modelToPaymentVoucherResponse(v))
	}

	return utils.SendPaginatedSuccess(c, responses, "Payment vouchers retrieved successfully", page, limit, total)
}

// CreatePaymentVoucher creates a new payment voucher.
func CreatePaymentVoucher(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}

	var req types.CreatePaymentVoucherRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if req.InvoiceNumber == "" {
		return utils.SendBadRequestError(c, "Invoice number is required")
	}
	if req.Amount <= 0 {
		return utils.SendBadRequestError(c, "Amount must be greater than 0")
	}
	if req.Description == "" || len(req.Description) < 10 {
		return utils.SendBadRequestError(c, "Description is required and must be at least 10 characters")
	}

	ctx := c.Context()
	var vendorIDPtr *string
	if req.VendorID != "" {
		if _, err := loadVendorByID(ctx, req.VendorID, tenant.OrganizationID); err != nil {
			return utils.SendBadRequestError(c, "Vendor not found")
		}
		vendorIDPtr = &req.VendorID
	}

	if req.LinkedPO != "" {
		linkedPO, err := loadPOByDocNumber(ctx, req.LinkedPO, tenant.OrganizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Linked purchase order not found")
		}
		if strings.ToUpper(linkedPO.Status) != "APPROVED" {
			return utils.SendBadRequestError(c, fmt.Sprintf(
				"Cannot create PV: linked PO %s is in %s status and must be APPROVED first.",
				req.LinkedPO, linkedPO.Status))
		}
		var existingPVDoc, existingPVStatus string
		err = config.PgxDB.QueryRow(ctx,
			`SELECT document_number, COALESCE(status, '') FROM payment_vouchers
			 WHERE linked_po = $1 AND organization_id = $2 AND UPPER(COALESCE(status,'')) != 'CANCELLED'
			 AND deleted_at IS NULL LIMIT 1`,
			req.LinkedPO, tenant.OrganizationID,
		).Scan(&existingPVDoc, &existingPVStatus)
		if err == nil {
			return utils.SendConflictError(c, fmt.Sprintf(
				"Payment voucher %s already exists for PO %s (status: %s).",
				existingPVDoc, req.LinkedPO, existingPVStatus))
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return utils.SendInternalError(c, "Failed to check PV uniqueness", err)
		}
	}

	documentNumber := utils.GenerateDocumentNumber("PV")
	createUser, _ := loadUserByID(ctx, tenant.UserID)
	now := time.Now()

	voucher := models.PaymentVoucher{
		ID:              uuid.New().String(),
		OrganizationID:  tenant.OrganizationID,
		DocumentNumber:  documentNumber,
		VendorID:        vendorIDPtr,
		InvoiceNumber:   req.InvoiceNumber,
		Status:          "DRAFT",
		Amount:          req.Amount,
		Currency:        req.Currency,
		PaymentMethod:   req.PaymentMethod,
		GLCode:          req.GLCode,
		Description:     req.Description,
		ApprovalStage:   0,
		LinkedPO:        req.LinkedPO,
		CreatedBy:       tenant.UserID,
		Title:           req.Title,
		Department:      req.Department,
		DepartmentID:    req.DepartmentID,
		Priority:        req.Priority,
		BudgetCode:      req.BudgetCode,
		CostCenter:      req.CostCenter,
		ProjectCode:     req.ProjectCode,
		ApprovalHistory: []types.ApprovalRecord{},
		ActionHistory: []types.ActionHistoryEntry{{
			ID:              uuid.New().String(),
			Action:          "CREATE",
			ActionType:      "CREATE",
			PerformedBy:     tenant.UserID,
			PerformedByName: createUser.Name,
			PerformedByRole: createUser.Role,
			Timestamp:       now,
			PerformedAt:     now,
			Comments:        "Payment voucher created",
			NewStatus:       "DRAFT",
		}},
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := insertPaymentVoucher(ctx, &voucher); err != nil {
		return utils.SendInternalError(c, "Failed to create payment voucher", err)
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
		ActorRole:      tenant.UserRole,
		Action:         "created",
		Details:        map[string]interface{}{"documentNumber": voucher.DocumentNumber},
	})

	return c.Status(fiber.StatusCreated).JSON(types.DetailResponse{
		Success: true,
		Data:    modelToPaymentVoucherResponse(voucher),
	})
}

// GetPaymentVoucher retrieves a single payment voucher by ID.
func GetPaymentVoucher(c *fiber.Ctx) error {
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
		return utils.SendBadRequestError(c, "Payment Voucher ID is required")
	}

	ctx := c.Context()
	voucher, err := loadPVByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Payment voucher")
	}
	if voucher.VendorID != nil && *voucher.VendorID != "" {
		if v, err := loadVendorByID(ctx, *voucher.VendorID, tenant.OrganizationID); err == nil {
			voucher.Vendor = v
			voucher.VendorName = v.Name
		}
	}

	response := modelToPaymentVoucherResponse(*voucher)
	if liveHistory := utils.GetDocumentApprovalHistory(ctx, voucher.ID, "payment_voucher"); len(liveHistory) > 0 {
		response.ApprovalHistory = liveHistory
	}
	return c.JSON(types.DetailResponse{Success: true, Data: response})
}

// UpdatePaymentVoucher updates an existing payment voucher.
func UpdatePaymentVoucher(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Payment Voucher ID is required")
	}

	var req types.UpdatePaymentVoucherRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	ctx := c.Context()
	voucher, err := loadPVByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Payment voucher")
	}

	if strings.ToUpper(voucher.Status) != "DRAFT" && strings.ToUpper(voucher.Status) != "PENDING" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot update payment voucher in %s status", voucher.Status),
		})
	}

	if req.VendorID != "" {
		voucher.VendorID = &req.VendorID
	}
	if req.InvoiceNumber != "" {
		voucher.InvoiceNumber = req.InvoiceNumber
	}
	if req.Amount > 0 {
		voucher.Amount = req.Amount
	}
	if req.Currency != "" {
		voucher.Currency = req.Currency
	}
	if req.PaymentMethod != "" {
		voucher.PaymentMethod = req.PaymentMethod
	}
	if req.GLCode != "" {
		voucher.GLCode = req.GLCode
	}
	if req.Description != "" {
		voucher.Description = req.Description
	}
	if req.Title != "" {
		voucher.Title = req.Title
	}
	if req.Department != "" {
		voucher.Department = req.Department
	}
	if req.DepartmentID != "" {
		voucher.DepartmentID = req.DepartmentID
	}
	if req.Priority != "" {
		voucher.Priority = req.Priority
	}
	if req.BudgetCode != "" {
		voucher.BudgetCode = req.BudgetCode
	}
	if req.CostCenter != "" {
		voucher.CostCenter = req.CostCenter
	}
	if req.ProjectCode != "" {
		voucher.ProjectCode = req.ProjectCode
	}

	updateUser, _ := loadUserByID(ctx, tenant.UserID)
	now := time.Now()
	voucher.ActionHistory = append(voucher.ActionHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "UPDATE",
		ActionType:      "UPDATE",
		PerformedBy:     tenant.UserID,
		PerformedByName: updateUser.Name,
		PerformedByRole: updateUser.Role,
		Timestamp:       now,
		PerformedAt:     now,
		Comments:        "Payment voucher updated",
		NewStatus:       voucher.Status,
	})
	voucher.UpdatedAt = now

	if err := updatePaymentVoucherRow(ctx, voucher); err != nil {
		return utils.SendInternalError(c, "Failed to update payment voucher", err)
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
		ActorName:      updateUser.Name,
		ActorRole:      tenant.UserRole,
		Action:         "updated",
		Details:        map[string]interface{}{"documentNumber": voucher.DocumentNumber},
	})

	return c.JSON(types.DetailResponse{Success: true, Data: modelToPaymentVoucherResponse(*voucher)})
}

// DeletePaymentVoucher deletes a payment voucher (soft delete).
func DeletePaymentVoucher(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Payment Voucher ID is required")
	}

	ctx := c.Context()
	voucher, err := loadPVByID(ctx, id, tenant.OrganizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Payment voucher")
	}

	if strings.ToUpper(voucher.Status) != "DRAFT" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Only draft payment vouchers can be deleted",
		})
	}

	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE payment_vouchers SET deleted_at = $1, updated_at = $1 WHERE id = $2`,
		time.Now(), id,
	); err != nil {
		return utils.SendInternalError(c, "Failed to delete payment voucher", err)
	}

	return c.JSON(types.MessageResponse{Success: true, Message: "Payment voucher deleted successfully"})
}

// modelToPaymentVoucherResponse converts a model to its API response shape.
func modelToPaymentVoucherResponse(voucher models.PaymentVoucher) types.PaymentVoucherResponse {
	approvalHistory := voucher.ApprovalHistory
	if approvalHistory == nil {
		approvalHistory = []types.ApprovalRecord{}
	}

	vendorID := ""
	if voucher.VendorID != nil {
		vendorID = *voucher.VendorID
	}
	vendorName := voucher.VendorName
	var vendorResp *types.VendorResponse
	if voucher.Vendor != nil {
		vendorName = voucher.Vendor.Name
		vr := modelToVendorResponse(*voucher.Vendor)
		vendorResp = &vr
	}

	var bankDetails interface{}
	if len(voucher.BankDetails) > 0 {
		_ = json.Unmarshal(voucher.BankDetails, &bankDetails)
	}

	items := voucher.Items
	if items == nil {
		items = []types.PaymentItem{}
	}

	return types.PaymentVoucherResponse{
		ID:                   voucher.ID,
		OrganizationID:       voucher.OrganizationID,
		DocumentNumber:       voucher.DocumentNumber,
		VendorID:             vendorID,
		VendorName:           vendorName,
		Vendor:               vendorResp,
		InvoiceNumber:        voucher.InvoiceNumber,
		Status:               voucher.Status,
		Amount:               voucher.Amount,
		Currency:             voucher.Currency,
		PaymentMethod:        voucher.PaymentMethod,
		GLCode:               voucher.GLCode,
		Description:          voucher.Description,
		ApprovalStage:        voucher.ApprovalStage,
		ApprovalHistory:      approvalHistory,
		ActionHistory:        voucher.ActionHistory,
		LinkedPO:             voucher.LinkedPO,
		LinkedGRN:            voucher.LinkedGRN,
		Title:                voucher.Title,
		Department:           voucher.Department,
		DepartmentID:         voucher.DepartmentID,
		Priority:             voucher.Priority,
		BudgetCode:           voucher.BudgetCode,
		CostCenter:           voucher.CostCenter,
		ProjectCode:          voucher.ProjectCode,
		CreatedBy:            voucher.CreatedBy,
		RequestedByName:      voucher.RequestedByName,
		RequestedDate:        voucher.RequestedDate,
		SubmittedAt:          voucher.SubmittedAt,
		ApprovedAt:           voucher.ApprovedAt,
		PaidDate:             voucher.PaidDate,
		PaymentDueDate:       voucher.PaymentDueDate,
		TaxAmount:            voucher.TaxAmount,
		WithholdingTaxAmount: voucher.WithholdingTaxAmount,
		PaidAmount:           voucher.PaidAmount,
		BankDetails:          bankDetails,
		Items:                items,
		CreatedAt:            voucher.CreatedAt,
		UpdatedAt:            voucher.UpdatedAt,
	}
}

// SubmitPaymentVoucher submits a payment voucher for approval using the workflow system.
func SubmitPaymentVoucher(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Payment Voucher ID is required")
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
	voucher, err := loadPVByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Payment Voucher")
	}

	if strings.ToUpper(voucher.Status) != "DRAFT" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot submit payment voucher in %s status", voucher.Status),
		})
	}

	if voucher.LinkedPO != "" {
		linkedPO, err := loadPOByDocNumber(ctx, voucher.LinkedPO, organizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Linked purchase order not found")
		}
		if strings.ToUpper(linkedPO.Status) != "APPROVED" {
			return utils.SendBadRequestError(c, fmt.Sprintf(
				"Cannot submit PV: linked PO %s is in %s status and must be APPROVED.",
				voucher.LinkedPO, linkedPO.Status))
		}
	}

	if voucher.LinkedGRN != "" {
		linkedGRN, err := loadGRNByDocNumber(ctx, voucher.LinkedGRN, organizationID)
		if err != nil {
			return utils.SendBadRequestError(c, "Linked goods received note not found")
		}
		if strings.ToUpper(linkedGRN.Status) != "APPROVED" {
			return utils.SendBadRequestError(c, fmt.Sprintf(
				"Cannot submit PV: linked GRN %s is in %s status and must be APPROVED.",
				voucher.LinkedGRN, linkedGRN.Status))
		}
	}

	workflowExecutionService := c.Locals("workflowExecutionService").(*services.WorkflowExecutionService)
	assignment, err := workflowExecutionService.AssignWorkflowToDocumentWithID(
		ctx, organizationID, voucher.ID, "payment_voucher", submitReq.WorkflowID, userID,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to assign workflow to payment voucher", err)
	}

	voucher.Status = "PENDING"
	voucher.UpdatedAt = time.Now()

	user, _ := loadUserByID(ctx, userID)
	voucher.ActionHistory = append(voucher.ActionHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "SUBMIT",
		PerformedBy:     userID,
		PerformedByName: user.Name,
		PerformedByRole: user.Role,
		Timestamp:       time.Now(),
		Comments:        "Payment voucher submitted for approval",
		ActionType:      "SUBMIT",
		PreviousStatus:  "DRAFT",
		NewStatus:       "PENDING",
	})

	if err := updatePaymentVoucherRow(ctx, voucher); err != nil {
		return utils.SendInternalError(c, "Failed to update payment voucher status", err)
	}

	go utils.SyncDocument("PAYMENT_VOUCHER", voucher.ID)
	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     voucher.ID,
		DocumentType:   "payment_voucher",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "submitted",
		Details:        map[string]interface{}{"documentNumber": voucher.DocumentNumber},
	})

	return c.JSON(types.DetailResponse{
		Success: true,
		Data: fiber.Map{
			"paymentVoucher": modelToPaymentVoucherResponse(*voucher),
			"workflow": fiber.Map{
				"assignmentId": assignment.ID,
				"workflowId":   assignment.WorkflowID,
				"currentStage": assignment.CurrentStage,
				"status":       assignment.Status,
			},
		},
	})
}

// WithdrawPaymentVoucher withdraws a pending PV back to DRAFT.
func WithdrawPaymentVoucher(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Payment Voucher ID is required")
	}

	organizationID, _ := c.Locals("organizationID").(string)
	userID, _ := c.Locals("userID").(string)

	ctx := c.Context()
	voucher, err := loadPVByID(ctx, id, organizationID)
	if err != nil {
		return utils.SendNotFoundError(c, "Payment Voucher")
	}

	if len(voucher.ActionHistory) == 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Cannot determine payment voucher creator",
		})
	}
	creatorID := ""
	for _, action := range voucher.ActionHistory {
		if strings.ToUpper(action.ActionType) == "CREATE" {
			creatorID = action.PerformedBy
			break
		}
	}
	if creatorID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Only the creator can withdraw this payment voucher",
		})
	}

	if strings.ToUpper(voucher.Status) != "PENDING" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Cannot withdraw payment voucher in %s status. Only pending payment vouchers can be withdrawn.", voucher.Status),
		})
	}

	var taskStatus string
	var claimedBy *string
	err = config.PgxDB.QueryRow(ctx,
		`SELECT status, claimed_by FROM workflow_tasks
		 WHERE entity_id = $1 AND entity_type = $2 AND UPPER(status) IN ('PENDING','CLAIMED')
		 LIMIT 1`,
		id, "payment_voucher",
	).Scan(&taskStatus, &claimedBy)
	if err == nil {
		if strings.ToUpper(taskStatus) == "CLAIMED" && claimedBy != nil && *claimedBy != "" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"message": "Cannot withdraw payment voucher. It is currently being reviewed by an approver.",
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
		id, "payment_voucher",
	); err != nil {
		return utils.SendInternalError(c, "Failed to remove workflow tasks", err)
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM workflow_assignments WHERE entity_id = $1 AND entity_type = $2`,
		id, "payment_voucher",
	); err != nil {
		return utils.SendInternalError(c, "Failed to remove workflow assignments", err)
	}

	previousStatus := voucher.Status
	voucher.Status = "DRAFT"
	voucher.ApprovalStage = 0
	voucher.UpdatedAt = time.Now()
	voucher.ApprovalHistory = []types.ApprovalRecord{}

	user, _ := loadUserByID(ctx, userID)
	performerName := user.Name
	if performerName == "" {
		performerName = "Unknown User"
	}
	performerRole := user.Role
	if performerRole == "" {
		performerRole = "unknown"
	}
	voucher.ActionHistory = append(voucher.ActionHistory, types.ActionHistoryEntry{
		ID:              uuid.New().String(),
		Action:          "WITHDRAW",
		PerformedBy:     userID,
		PerformedByName: performerName,
		PerformedByRole: performerRole,
		Timestamp:       time.Now(),
		Comments:        "Payment voucher withdrawn by creator",
		ActionType:      "WITHDRAW",
		PreviousStatus:  previousStatus,
		NewStatus:       "DRAFT",
	})

	approvalHistoryJSON, _ := json.Marshal(voucher.ApprovalHistory)
	actionHistoryJSON, _ := json.Marshal(voucher.ActionHistory)
	if _, err := tx.Exec(ctx, `
		UPDATE payment_vouchers SET status=$1, approval_stage=$2, approval_history=$3,
			action_history=$4, updated_at=$5 WHERE id=$6`,
		voucher.Status, int32(voucher.ApprovalStage),
		approvalHistoryJSON, actionHistoryJSON, voucher.UpdatedAt, voucher.ID,
	); err != nil {
		return utils.SendInternalError(c, "Failed to update payment voucher status", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return utils.SendInternalError(c, "Failed to commit changes", err)
	}

	if voucher.VendorID != nil && *voucher.VendorID != "" {
		if v, err := loadVendorByID(ctx, *voucher.VendorID, organizationID); err == nil {
			voucher.Vendor = v
			voucher.VendorName = v.Name
		}
	}

	go services.LogDocumentEvent(context.Background(), services.DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     voucher.ID,
		DocumentType:   "payment_voucher",
		UserID:         userID,
		ActorName:      user.Name,
		ActorRole:      user.Role,
		Action:         "withdrawn",
		Details:        map[string]interface{}{"documentNumber": voucher.DocumentNumber},
	})

	return c.JSON(fiber.Map{
		"success": true,
		"data":    modelToPaymentVoucherResponse(*voucher),
		"message": "Payment voucher withdrawn successfully. You can now edit and re-submit it.",
	})
}
