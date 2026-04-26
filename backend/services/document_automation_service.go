package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shopspring/decimal"

	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// DocumentAutomationService handles automatic document generation.
//
// Migrated off GORM: writes go through sqlc (config.Queries) and the package
// pgx pool (config.PgxDB). The constructor signature changed: it no longer
// takes a *gorm.DB. Callers must drop that argument.
type DocumentAutomationService struct {
	auditService    *AuditService
	notificationSvc *NotificationService
}

// AutomationConfig controls automation behavior.
type AutomationConfig struct {
	AutoCreatePOFromRequisition bool
	AutoCreateGRNFromPO         bool
	AutoCreatePVFromGRN         bool
	RequireApprovalForAuto      bool
}

// AutomationResult contains the result of an automation operation.
type AutomationResult struct {
	Success         bool
	CreatedDocument interface{}
	DocumentType    string
	DocumentID      string
	Error           error
}

// NewDocumentAutomationService creates a new document automation service.
//
// Constructor signature changed: dropped *gorm.DB. All DB access goes via
// config.Queries / config.PgxDB.
func NewDocumentAutomationService(
	auditService *AuditService,
	notificationSvc *NotificationService,
) *DocumentAutomationService {
	return &DocumentAutomationService{
		auditService:    auditService,
		notificationSvc: notificationSvc,
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func ptrString(s string) *string { return &s }

func decimalPtr(f float64) *decimal.Decimal {
	d := decimal.NewFromFloat(f)
	return &d
}

func tsFromTime(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: !t.IsZero()}
}

// ---------------------------------------------------------------------------
// CreatePurchaseOrderFromRequisition
// ---------------------------------------------------------------------------

// CreatePurchaseOrderFromRequisition automatically creates a PO from an approved requisition.
func (s *DocumentAutomationService) CreatePurchaseOrderFromRequisition(
	ctx context.Context,
	requisition *models.Requisition,
	cfg AutomationConfig,
) (*AutomationResult, error) {
	if !cfg.AutoCreatePOFromRequisition {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("automatic PO creation is disabled"),
		}, nil
	}

	if strings.ToUpper(requisition.Status) != "APPROVED" {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("requisition must be approved to create PO"),
		}, nil
	}

	// Resolve vendor — verify it exists or fall back to a placeholder ID.
	var vendorID *string
	vendorName := "To Be Determined"
	placeholder := "vendor-placeholder-001"

	if requisition.PreferredVendorID != nil && *requisition.PreferredVendorID != "" {
		vendor, err := s.queriesGetVendor(ctx, *requisition.PreferredVendorID)
		if err != nil {
			vendorID = &placeholder
			vendorName = "To Be Determined (Invalid Vendor)"
		} else {
			id := vendor.ID
			vendorID = &id
			vendorName = vendor.Name
		}
	} else {
		vendorID = &placeholder
	}

	documentNumber := utils.GeneratePurchaseOrderNumber()

	// Convert requisition items → PO items, then marshal as JSONB ([]byte).
	poItems := make([]types.POItem, len(requisition.Items))
	for i, reqItem := range requisition.Items {
		poItems[i] = types.POItem{
			Description: reqItem.Description,
			Quantity:    reqItem.Quantity,
			UnitPrice:   reqItem.UnitPrice,
			Amount:      reqItem.Amount,
		}
	}
	itemsJSON, err := json.Marshal(poItems)
	if err != nil {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("failed to marshal PO items: %w", err),
		}, nil
	}

	approvalHistoryJSON, _ := json.Marshal([]types.ApprovalRecord{})

	poID := uuid.New().String()
	status := "DRAFT"
	currency := requisition.Currency
	stage := int32(0)
	desc := fmt.Sprintf("Auto-created from requisition %s. Vendor: %s",
		requisition.DocumentNumber, vendorName)
	dept := requisition.Department
	deptID := requisition.DepartmentId
	title := fmt.Sprintf("PO for %s", requisition.Title)
	budgetCode := requisition.BudgetCode
	costCenter := requisition.CostCenter
	projectCode := requisition.ProjectCode
	linkedReq := requisition.ID
	sourceReqID := requisition.ID
	sourceReqNum := requisition.DocumentNumber
	createdBy := requisition.CreatedBy
	ownerID := requisition.RequesterId
	automationUsed := true

	po, err := config.Queries.CreatePurchaseOrder(ctx, sqlc.CreatePurchaseOrderParams{
		ID:                      poID,
		OrganizationID:          requisition.OrganizationID,
		DocumentNumber:          documentNumber,
		VendorID:                vendorID,
		Status:                  &status,
		Items:                   itemsJSON,
		TotalAmount:             decimalPtr(requisition.TotalAmount),
		Currency:                &currency,
		DeliveryDate:            tsFromTime(time.Now().AddDate(0, 1, 0)),
		ApprovalStage:           &stage,
		ApprovalHistory:         approvalHistoryJSON,
		LinkedRequisition:       &linkedReq,
		Description:             &desc,
		Department:              &dept,
		DepartmentID:            &deptID,
		Title:                   &title,
		BudgetCode:              &budgetCode,
		CostCenter:              &costCenter,
		ProjectCode:             &projectCode,
		SourceRequisitionNumber: &sourceReqNum,
		SourceRequisitionID:     &sourceReqID,
		CreatedBy:               &createdBy,
		OwnerID:                 &ownerID,
		ActionHistory:           []byte(`[]`),
		Metadata:                []byte(`{}`),
		EstimatedCost:           decimal.NewFromFloat(requisition.TotalAmount),
		AutomationUsed:          &automationUsed,
		AutoCreatedGrn:          []byte(`null`),
	})
	if err != nil {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("failed to create purchase order: %w", err),
		}, nil
	}

	// Audit
	if s.auditService != nil {
		details := fmt.Sprintf("Auto-created PO %s from approved requisition %s (Vendor: %s)",
			documentNumber, requisition.DocumentNumber, vendorName)
		_ = s.auditService.LogEvent(ctx, "system", "", "po_auto_created", "purchase_order", po.ID, details, "", "")
	}

	// Notify
	if s.notificationSvc != nil {
		event := NotificationEvent{
			Type:         "document_created",
			DocumentID:   po.ID,
			DocumentType: "purchase_order",
			Action:       "auto_created",
			ActorID:      "system",
			Details: fmt.Sprintf(
				"Purchase Order %s was automatically created from your requisition (Vendor: %s)",
				documentNumber, vendorName),
			Timestamp: time.Now(),
		}
		_ = s.notificationSvc.HandleWorkflowEvent(event)
	}

	return &AutomationResult{
		Success:         true,
		CreatedDocument: po,
		DocumentType:    "purchase_order",
		DocumentID:      po.ID,
	}, nil
}

// queriesGetVendor wraps GetVendorByID, returning a not-found-friendly error.
func (s *DocumentAutomationService) queriesGetVendor(ctx context.Context, id string) (sqlc.Vendor, error) {
	v, err := config.Queries.GetVendorByID(ctx, sqlc.GetVendorByIDParams{ID: id})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return sqlc.Vendor{}, fmt.Errorf("vendor not found: %s", id)
		}
		return sqlc.Vendor{}, err
	}
	return v, nil
}

// CreatePurchaseOrderFromRequisitionWithStatus creates a PO with the specified target status.
func (s *DocumentAutomationService) CreatePurchaseOrderFromRequisitionWithStatus(
	ctx context.Context,
	requisition *models.Requisition,
	targetStatus string,
) (*AutomationResult, error) {
	if strings.ToUpper(requisition.Status) != "APPROVED" {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("requisition must be approved to create PO"),
		}, nil
	}

	autoCfg := AutomationConfig{AutoCreatePOFromRequisition: true}

	result, err := s.CreatePurchaseOrderFromRequisition(ctx, requisition, autoCfg)
	if err != nil {
		return result, err
	}
	if result == nil || !result.Success {
		return result, nil
	}

	// If the target status differs from "DRAFT", update the auto-created PO via sqlc.
	if strings.ToUpper(targetStatus) != "DRAFT" && result.DocumentID != "" {
		ts := targetStatus
		if _, err := config.Queries.UpdatePOStatus(ctx, sqlc.UpdatePOStatusParams{
			ID:     result.DocumentID,
			Status: &ts,
		}); err != nil {
			fmt.Printf("Warning: failed to update auto-PO status to %s: %v\n", targetStatus, err)
		}

		if s.auditService != nil {
			_ = s.auditService.LogEvent(ctx, "system", "", "po_auto_status_set",
				"purchase_order", result.DocumentID,
				fmt.Sprintf("Auto-created PO set to %s status via workflow routing", targetStatus),
				"", "")
		}
	}

	return result, nil
}

// ---------------------------------------------------------------------------
// CreateGRNFromPurchaseOrder
// ---------------------------------------------------------------------------

// CreateGRNFromPurchaseOrder automatically creates a GRN template from an approved PO.
func (s *DocumentAutomationService) CreateGRNFromPurchaseOrder(
	ctx context.Context,
	purchaseOrder *models.PurchaseOrder,
	cfg AutomationConfig,
) (*AutomationResult, error) {
	if !cfg.AutoCreateGRNFromPO {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("automatic GRN creation is disabled"),
		}, nil
	}

	if strings.ToUpper(purchaseOrder.Status) != "APPROVED" {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("purchase order must be approved to create GRN"),
		}, nil
	}

	documentNumber := utils.GenerateDocumentNumber("GRN")

	grnItems := make([]types.GRNItem, len(purchaseOrder.Items))
	for i, poItem := range purchaseOrder.Items {
		grnItems[i] = types.GRNItem{
			Description:      poItem.Description,
			QuantityOrdered:  poItem.Quantity,
			QuantityReceived: 0,
			Variance:         0,
			Condition:        "pending",
		}
	}

	if err := s.insertGRN(ctx, insertGRNArgs{
		ID:                uuid.New().String(),
		OrganizationID:    purchaseOrder.OrganizationID,
		DocumentNumber:    documentNumber,
		PoDocumentNumber:  purchaseOrder.DocumentNumber,
		Status:            "DRAFT",
		ReceivedDate:      time.Now(),
		ReceivedBy:        "",
		Items:             grnItems,
		BudgetCode:        purchaseOrder.BudgetCode,
		CostCenter:        purchaseOrder.CostCenter,
		ProjectCode:       purchaseOrder.ProjectCode,
		WarehouseLocation: "",
		Notes:             "",
		CreatedBy:         purchaseOrder.CreatedBy,
	}); err != nil {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("failed to create GRN: %w", err),
		}, nil
	}

	// Re-fetch via sqlc so callers get the canonical row.
	grn, err := config.Queries.GetGRNByDocumentNumber(ctx, sqlc.GetGRNByDocumentNumberParams{
		OrganizationID: purchaseOrder.OrganizationID,
		DocumentNumber: documentNumber,
	})
	if err != nil {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("failed to read created GRN: %w", err),
		}, nil
	}

	if s.auditService != nil {
		details := fmt.Sprintf("Auto-created GRN %s from approved PO %s",
			documentNumber, purchaseOrder.DocumentNumber)
		_ = s.auditService.LogEvent(ctx, "system", "", "grn_auto_created", "grn", grn.ID, details, "", "")
	}

	if s.notificationSvc != nil {
		event := NotificationEvent{
			Type:         "document_created",
			DocumentID:   grn.ID,
			DocumentType: "grn",
			Action:       "auto_created",
			ActorID:      "system",
			Details: fmt.Sprintf(
				"GRN %s was automatically created from PO %s and is ready for goods receipt",
				documentNumber, purchaseOrder.DocumentNumber),
			Timestamp: time.Now(),
		}
		_ = s.notificationSvc.HandleWorkflowEvent(event)
	}

	return &AutomationResult{
		Success:         true,
		CreatedDocument: grn,
		DocumentType:    "grn",
		DocumentID:      grn.ID,
	}, nil
}

// insertGRNArgs bundles the columns CreateGRN does not cover (items, budget,
// cost-center, project-code, approval_history). The sqlc CreateGRN binding
// only INSERTs the primary columns, so we use a single raw INSERT to populate
// items + budget tracking fields atomically.
type insertGRNArgs struct {
	ID                string
	OrganizationID    string
	DocumentNumber    string
	PoDocumentNumber  string
	Status            string
	ReceivedDate      time.Time
	ReceivedBy        string
	Items             []types.GRNItem
	BudgetCode        string
	CostCenter        string
	ProjectCode       string
	WarehouseLocation string
	Notes             string
	CreatedBy         string
}

func (s *DocumentAutomationService) insertGRN(ctx context.Context, a insertGRNArgs) error {
	itemsJSON, err := json.Marshal(a.Items)
	if err != nil {
		return fmt.Errorf("marshal grn items: %w", err)
	}
	approvalHistoryJSON, _ := json.Marshal([]types.ApprovalRecord{})

	const q = `
		INSERT INTO goods_received_notes (
			id, organization_id, document_number, po_document_number, status,
			received_date, received_by, items, approval_stage, approval_history,
			created_by, warehouse_location, notes, budget_code, cost_center,
			project_code, automation_used, action_history, metadata,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
			NOW(), NOW()
		)
	`
	if _, err := config.PgxDB.Exec(ctx, q,
		a.ID, a.OrganizationID, a.DocumentNumber, a.PoDocumentNumber, a.Status,
		a.ReceivedDate, a.ReceivedBy, itemsJSON, 0, approvalHistoryJSON,
		a.CreatedBy, a.WarehouseLocation, a.Notes, a.BudgetCode, a.CostCenter,
		a.ProjectCode, true, []byte(`[]`), []byte(`{}`),
	); err != nil {
		return fmt.Errorf("insert grn: %w", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// CreatePaymentVoucherFromGRN
// ---------------------------------------------------------------------------

// CreatePaymentVoucherFromGRN automatically creates a PV from an approved GRN.
func (s *DocumentAutomationService) CreatePaymentVoucherFromGRN(
	ctx context.Context,
	grn *models.GoodsReceivedNote,
	cfg AutomationConfig,
) (*AutomationResult, error) {
	if !cfg.AutoCreatePVFromGRN {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("automatic PV creation is disabled"),
		}, nil
	}

	if strings.ToUpper(grn.Status) != "APPROVED" {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("GRN must be approved to create payment voucher"),
		}, nil
	}

	// Get the linked PO via sqlc.
	po, err := getPOByDocNumberHelper(ctx, grn.OrganizationID, grn.PODocumentNumber)
	if err != nil {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("linked purchase order not found: %w", err),
		}, nil
	}

	// One-to-one: skip if a non-cancelled PV already exists for this PO.
	if existing, err := getActivePVForPO(ctx, grn.OrganizationID, po.DocumentNumber); err == nil && existing != nil {
		return &AutomationResult{
			Success: false,
			Error: fmt.Errorf("payment voucher %s already exists for PO %s",
				existing.DocumentNumber, po.DocumentNumber),
		}, nil
	}

	documentNumber := utils.GenerateDocumentNumber("PV")

	pvID := uuid.New().String()
	status := "DRAFT"
	paymentMethod := "bank_transfer"
	stage := int32(0)
	linkedPo := po.DocumentNumber
	linkedGrn := grn.DocumentNumber
	createdBy := grn.CreatedBy
	invoice := ""

	pv, err := config.Queries.CreatePaymentVoucher(ctx, sqlc.CreatePaymentVoucherParams{
		ID:             pvID,
		OrganizationID: grn.OrganizationID,
		DocumentNumber: documentNumber,
		VendorID:       po.VendorID,
		InvoiceNumber:  &invoice,
		Status:         &status,
		Amount:         po.TotalAmount,
		Currency:       po.Currency,
		PaymentMethod:  &paymentMethod,
		ApprovalStage:  &stage,
		LinkedPo:       &linkedPo,
		LinkedGrn:      &linkedGrn,
		CreatedBy:      &createdBy,
	})
	if err != nil {
		return &AutomationResult{
			Success: false,
			Error:   fmt.Errorf("failed to create payment voucher: %w", err),
		}, nil
	}

	// Patch budget tracking + approval_history (CreatePaymentVoucher binding
	// does not cover these columns).
	approvalHistoryJSON, _ := json.Marshal([]types.ApprovalRecord{})
	const patch = `
		UPDATE payment_vouchers
		SET budget_code = $2, cost_center = $3, project_code = $4,
		    approval_history = $5, updated_at = NOW()
		WHERE id = $1
	`
	if _, err := config.PgxDB.Exec(ctx, patch,
		pv.ID, po.BudgetCode, po.CostCenter, po.ProjectCode, approvalHistoryJSON,
	); err != nil {
		// Non-fatal — log and continue.
		fmt.Printf("Warning: failed to set PV budget tracking: %v\n", err)
	}

	if s.auditService != nil {
		details := fmt.Sprintf("Auto-created PV %s from approved GRN %s",
			documentNumber, grn.DocumentNumber)
		_ = s.auditService.LogEvent(ctx, "system", "", "pv_auto_created", "payment_voucher", pv.ID, details, "", "")
	}

	if s.notificationSvc != nil {
		event := NotificationEvent{
			Type:         "document_created",
			DocumentID:   pv.ID,
			DocumentType: "payment_voucher",
			Action:       "auto_created",
			ActorID:      "system",
			Details: fmt.Sprintf(
				"Payment Voucher %s was automatically created from GRN %s and is ready for processing",
				documentNumber, grn.DocumentNumber),
			Timestamp: time.Now(),
		}
		_ = s.notificationSvc.HandleWorkflowEvent(event)
	}

	return &AutomationResult{
		Success:         true,
		CreatedDocument: pv,
		DocumentType:    "payment_voucher",
		DocumentID:      pv.ID,
	}, nil
}

// getPOByDocNumberHelper fetches a PO by document number using sqlc.
func getPOByDocNumberHelper(ctx context.Context, orgID, docNum string) (sqlc.PurchaseOrder, error) {
	po, err := config.Queries.GetPurchaseOrderByNumber(ctx, sqlc.GetPurchaseOrderByNumberParams{
		OrganizationID: orgID,
		DocumentNumber: docNum,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return sqlc.PurchaseOrder{}, fmt.Errorf("purchase order %s not found", docNum)
		}
		return sqlc.PurchaseOrder{}, err
	}
	return po, nil
}

// getActivePVForPO returns the most recent non-cancelled PV linked to the
// given PO document number, or (nil, nil) when none exists.
func getActivePVForPO(ctx context.Context, orgID, poDocNum string) (*sqlc.PaymentVoucher, error) {
	pv, err := config.Queries.GetLinkedPVByPONumber(ctx, sqlc.GetLinkedPVByPONumberParams{
		LinkedPo:       &poDocNum,
		OrganizationID: orgID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &pv, nil
}

// GetDefaultAutomationConfig returns the default automation configuration.
func (s *DocumentAutomationService) GetDefaultAutomationConfig() AutomationConfig {
	return AutomationConfig{
		AutoCreatePOFromRequisition: false,
		AutoCreateGRNFromPO:         false,
		AutoCreatePVFromGRN:         false,
		RequireApprovalForAuto:      true,
	}
}

// ValidateAutomationPrerequisites checks if automation can proceed.
func (s *DocumentAutomationService) ValidateAutomationPrerequisites(
	documentType string,
	document interface{},
) error {
	switch documentType {
	case "requisition":
		req, ok := document.(*models.Requisition)
		if !ok {
			return fmt.Errorf("invalid requisition document")
		}
		if strings.ToUpper(req.Status) != "APPROVED" {
			return fmt.Errorf("requisition must be approved")
		}
	case "purchase_order":
		po, ok := document.(*models.PurchaseOrder)
		if !ok {
			return fmt.Errorf("invalid purchase order document")
		}
		if strings.ToUpper(po.Status) != "APPROVED" {
			return fmt.Errorf("purchase order must be approved")
		}
	case "grn":
		grn, ok := document.(*models.GoodsReceivedNote)
		if !ok {
			return fmt.Errorf("invalid GRN document")
		}
		if strings.ToUpper(grn.Status) != "APPROVED" {
			return fmt.Errorf("GRN must be approved")
		}
	default:
		return fmt.Errorf("unsupported document type: %s", documentType)
	}
	return nil
}
