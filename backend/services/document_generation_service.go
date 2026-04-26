package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
)

// DocumentGenerationService handles explicit document generation requests.
//
// Backed by sqlc + pgxpool via package-level config.Queries / config.PgxDB.
// The previous constructor accepted a *gorm.DB; that argument has been removed.
type DocumentGenerationService struct {
	automationService *DocumentAutomationService
}

// GenerateDocumentResult contains metadata about a generation operation.
type GenerateDocumentResult struct {
	SourceID         string `json:"sourceId"`
	SourceDocType    string `json:"sourceDocType"`
	GeneratedID      string `json:"generatedId"`
	GeneratedDocType string `json:"generatedDocType"`
	DocumentNumber   string `json:"documentNumber,omitempty"`
}

// NewDocumentGenerationService creates a new DocumentGenerationService.
//
// NOTE: The previous signature was (db *gorm.DB, automationService *DocumentAutomationService).
// The DB argument has been removed; callers must update their construction sites.
func NewDocumentGenerationService(automationService *DocumentAutomationService) *DocumentGenerationService {
	return &DocumentGenerationService{
		automationService: automationService,
	}
}

func (s *DocumentGenerationService) GenerateFromSource(
	ctx context.Context,
	organizationID, sourceID, docType, targetDocType string,
) (*GenerateDocumentResult, error) {
	if s.automationService == nil {
		return nil, fmt.Errorf("document_generation: generate_from_source: automation service unavailable")
	}
	if sourceID == "" {
		return nil, fmt.Errorf("document_generation: generate_from_source: source ID is required")
	}

	sourceType := normalizeDocType(docType)
	if sourceType == "" {
		return nil, fmt.Errorf("document_generation: generate_from_source: docType is required")
	}

	targetType := normalizeDocType(targetDocType)
	if targetType != "" {
		expectedTarget, err := expectedTargetForSource(sourceType)
		if err != nil {
			return nil, err
		}
		if targetType != expectedTarget {
			return nil, fmt.Errorf("document_generation: generate_from_source: invalid targetDocType for %s", sourceType)
		}
	}

	automationCfg := AutomationConfig{
		AutoCreatePOFromRequisition: true,
		AutoCreateGRNFromPO:         true,
		AutoCreatePVFromGRN:         true,
		RequireApprovalForAuto:      true,
	}

	switch sourceType {
	case "REQUISITION":
		return s.generateFromRequisition(ctx, organizationID, sourceID, sourceType, automationCfg)
	case "PURCHASE_ORDER":
		return s.generateFromPurchaseOrder(ctx, organizationID, sourceID, sourceType, automationCfg)
	case "GRN":
		return s.generateFromGRN(ctx, organizationID, sourceID, sourceType, automationCfg)
	default:
		return nil, fmt.Errorf("document_generation: generate_from_source: unsupported docType: %s", sourceType)
	}
}

// generateFromRequisition fetches a requisition, validates it, ensures no PO has
// already been generated for it, then delegates to the automation service.
func (s *DocumentGenerationService) generateFromRequisition(
	ctx context.Context,
	organizationID, sourceID, sourceType string,
	cfg AutomationConfig,
) (*GenerateDocumentResult, error) {
	row, err := config.Queries.GetRequisitionByID(ctx, sqlc.GetRequisitionByIDParams{ID: sourceID})
	if err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_requisition: requisition not found: %w", err)
	}
	if row.OrganizationID != organizationID {
		return nil, fmt.Errorf("document_generation: generate_from_requisition: requisition not found")
	}

	status := derefStringRO(row.Status)
	if strings.ToUpper(status) != "APPROVED" {
		return nil, fmt.Errorf("document_generation: generate_from_requisition: requisition must be approved")
	}

	// Existence check: any PO already linked to this requisition?
	const existingPOQuery = `
SELECT COUNT(*) FROM purchase_orders
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND (source_requisition_id = $2 OR linked_requisition = $2)
`
	var existing int64
	if err := config.PgxDB.QueryRow(ctx, existingPOQuery, organizationID, row.ID).Scan(&existing); err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_requisition: failed to validate existing purchase order: %w", err)
	}
	if existing > 0 {
		return nil, fmt.Errorf("document_generation: generate_from_requisition: purchase order already generated for this requisition")
	}

	req := sqlcRequisitionToModel(row)
	result, err := s.automationService.CreatePurchaseOrderFromRequisition(ctx, req, cfg)
	if err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_requisition: %w", err)
	}
	if !result.Success {
		if result.Error != nil {
			return nil, result.Error
		}
		return nil, fmt.Errorf("document_generation: generate_from_requisition: failed to generate purchase order")
	}

	return &GenerateDocumentResult{
		SourceID:         req.ID,
		SourceDocType:    sourceType,
		GeneratedID:      result.DocumentID,
		GeneratedDocType: "PURCHASE_ORDER",
		DocumentNumber:   extractGeneratedDocumentNumber(result.CreatedDocument),
	}, nil
}

// generateFromPurchaseOrder fetches a PO, validates it, ensures no GRN already
// exists for its document number, then delegates to the automation service.
func (s *DocumentGenerationService) generateFromPurchaseOrder(
	ctx context.Context,
	organizationID, sourceID, sourceType string,
	cfg AutomationConfig,
) (*GenerateDocumentResult, error) {
	row, err := config.Queries.GetPurchaseOrderByID(ctx, sqlc.GetPurchaseOrderByIDParams{ID: sourceID})
	if err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_purchase_order: purchase order not found: %w", err)
	}
	if row.OrganizationID != organizationID {
		return nil, fmt.Errorf("document_generation: generate_from_purchase_order: purchase order not found")
	}

	status := derefStringRO(row.Status)
	if strings.ToUpper(status) != "APPROVED" {
		return nil, fmt.Errorf("document_generation: generate_from_purchase_order: purchase order must be approved")
	}

	const existingGRNQuery = `
SELECT COUNT(*) FROM goods_received_notes
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND po_document_number = $2
`
	var existing int64
	if err := config.PgxDB.QueryRow(ctx, existingGRNQuery, organizationID, row.DocumentNumber).Scan(&existing); err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_purchase_order: failed to validate existing GRN: %w", err)
	}
	if existing > 0 {
		return nil, fmt.Errorf("document_generation: generate_from_purchase_order: GRN already generated for this purchase order")
	}

	po := sqlcPurchaseOrderToModel(row)
	result, err := s.automationService.CreateGRNFromPurchaseOrder(ctx, po, cfg)
	if err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_purchase_order: %w", err)
	}
	if !result.Success {
		if result.Error != nil {
			return nil, result.Error
		}
		return nil, fmt.Errorf("document_generation: generate_from_purchase_order: failed to generate GRN")
	}

	return &GenerateDocumentResult{
		SourceID:         po.ID,
		SourceDocType:    sourceType,
		GeneratedID:      result.DocumentID,
		GeneratedDocType: "GRN",
		DocumentNumber:   extractGeneratedDocumentNumber(result.CreatedDocument),
	}, nil
}

// generateFromGRN fetches a GRN, validates it, ensures no PV already exists for
// its linked PO, then delegates to the automation service.
func (s *DocumentGenerationService) generateFromGRN(
	ctx context.Context,
	organizationID, sourceID, sourceType string,
	cfg AutomationConfig,
) (*GenerateDocumentResult, error) {
	row, err := config.Queries.GetGRNByID(ctx, sqlc.GetGRNByIDParams{ID: sourceID})
	if err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_grn: GRN not found: %w", err)
	}
	if row.OrganizationID != organizationID {
		return nil, fmt.Errorf("document_generation: generate_from_grn: GRN not found")
	}

	status := derefStringRO(row.Status)
	if strings.ToUpper(status) != "APPROVED" {
		return nil, fmt.Errorf("document_generation: generate_from_grn: GRN must be approved")
	}

	poDocNumber := derefStringRO(row.PoDocumentNumber)
	const existingPVQuery = `
SELECT COUNT(*) FROM payment_vouchers
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND linked_po = $2
`
	var existing int64
	if err := config.PgxDB.QueryRow(ctx, existingPVQuery, organizationID, poDocNumber).Scan(&existing); err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_grn: failed to validate existing payment voucher: %w", err)
	}
	if existing > 0 {
		return nil, fmt.Errorf("document_generation: generate_from_grn: payment voucher already generated for this GRN")
	}

	grn := sqlcGRNToModel(row)
	result, err := s.automationService.CreatePaymentVoucherFromGRN(ctx, grn, cfg)
	if err != nil {
		return nil, fmt.Errorf("document_generation: generate_from_grn: %w", err)
	}
	if !result.Success {
		if result.Error != nil {
			return nil, result.Error
		}
		return nil, fmt.Errorf("document_generation: generate_from_grn: failed to generate payment voucher")
	}

	return &GenerateDocumentResult{
		SourceID:         grn.ID,
		SourceDocType:    sourceType,
		GeneratedID:      result.DocumentID,
		GeneratedDocType: "PAYMENT_VOUCHER",
		DocumentNumber:   extractGeneratedDocumentNumber(result.CreatedDocument),
	}, nil
}

func normalizeDocType(docType string) string {
	return strings.ToUpper(strings.TrimSpace(docType))
}

func expectedTargetForSource(sourceDocType string) (string, error) {
	switch sourceDocType {
	case "REQUISITION":
		return "PURCHASE_ORDER", nil
	case "PURCHASE_ORDER":
		return "GRN", nil
	case "GRN":
		return "PAYMENT_VOUCHER", nil
	default:
		return "", fmt.Errorf("document_generation: unsupported docType: %s", sourceDocType)
	}
}

func extractGeneratedDocumentNumber(createdDocument interface{}) string {
	switch doc := createdDocument.(type) {
	case models.PurchaseOrder:
		return doc.DocumentNumber
	case *models.PurchaseOrder:
		return doc.DocumentNumber
	case models.GoodsReceivedNote:
		return doc.DocumentNumber
	case *models.GoodsReceivedNote:
		return doc.DocumentNumber
	case models.PaymentVoucher:
		return doc.DocumentNumber
	case *models.PaymentVoucher:
		return doc.DocumentNumber
	default:
		return ""
	}
}

// --- minimal sqlc → domain model mappers ---
//
// These map only the fields read by DocumentAutomationService. They are
// intentionally narrow; richer mapping should live in database/convert/.

func sqlcRequisitionToModel(r sqlc.Requisition) *models.Requisition {
	req := &models.Requisition{
		ID:                r.ID,
		OrganizationID:    r.OrganizationID,
		DocumentNumber:    r.DocumentNumber,
		RequesterId:       r.RequesterID,
		Title:             r.Title,
		Description:       derefStringRO(r.Description),
		Department:        derefStringRO(r.Department),
		DepartmentId:      derefStringRO(r.DepartmentID),
		Status:            derefStringRO(r.Status),
		Priority:          derefStringRO(r.Priority),
		Currency:          derefStringRO(r.Currency),
		ApprovalStage:     int(derefInt32RO(r.ApprovalStage)),
		IsEstimate:        derefBoolRO(r.IsEstimate),
		BudgetCode:        derefStringRO(r.BudgetCode),
		SourceOfFunds:     derefStringRO(r.SourceOfFunds),
		CostCenter:        derefStringRO(r.CostCenter),
		ProjectCode:       derefStringRO(r.ProjectCode),
		CategoryID:        r.CategoryID,
		PreferredVendorID: r.PreferredVendorID,
		CreatedBy:         derefStringRO(r.CreatedBy),
		CreatedByName:     derefStringRO(r.CreatedByName),
		CreatedByRole:     derefStringRO(r.CreatedByRole),
	}
	if r.TotalAmount != nil {
		req.TotalAmount, _ = r.TotalAmount.Float64()
	}
	if r.RequiredByDate.Valid {
		req.RequiredByDate = r.RequiredByDate.Time
	}
	if r.CreatedAt.Valid {
		req.CreatedAt = r.CreatedAt.Time
	}
	if r.UpdatedAt.Valid {
		req.UpdatedAt = r.UpdatedAt.Time
	}
	if r.Items != nil {
		// Items JSONB; leave decoding to types.RequisitionItem unmarshaller.
		_ = unmarshalJSONB(r.Items, &req.Items)
	}
	if r.Metadata != nil {
		req.Metadata = r.Metadata
	}
	if r.AutoCreatedPo != nil {
		req.AutoCreatedPO = r.AutoCreatedPo
	}
	return req
}

func sqlcPurchaseOrderToModel(p sqlc.PurchaseOrder) *models.PurchaseOrder {
	po := &models.PurchaseOrder{
		ID:                  p.ID,
		OrganizationID:      p.OrganizationID,
		DocumentNumber:      p.DocumentNumber,
		VendorID:            p.VendorID,
		Status:              derefStringRO(p.Status),
		Currency:            derefStringRO(p.Currency),
		ApprovalStage:       int(derefInt32RO(p.ApprovalStage)),
		LinkedRequisition:   derefStringRO(p.LinkedRequisition),
		Description:         derefStringRO(p.Description),
		Department:          derefStringRO(p.Department),
		DepartmentID:        derefStringRO(p.DepartmentID),
		GLCode:              derefStringRO(p.GlCode),
		Title:               derefStringRO(p.Title),
		Priority:            derefStringRO(p.Priority),
		BudgetCode:          derefStringRO(p.BudgetCode),
		CostCenter:          derefStringRO(p.CostCenter),
		ProjectCode:         derefStringRO(p.ProjectCode),
		CreatedBy:           derefStringRO(p.CreatedBy),
		ProcurementFlow:     derefStringRO(p.ProcurementFlow),
		SourceRequisitionId: p.SourceRequisitionID,
	}
	if p.TotalAmount != nil {
		po.TotalAmount, _ = p.TotalAmount.Float64()
	}
	if p.DeliveryDate.Valid {
		po.DeliveryDate = p.DeliveryDate.Time
	}
	if p.RequiredByDate.Valid {
		t := p.RequiredByDate.Time
		po.RequiredByDate = &t
	}
	if p.CreatedAt.Valid {
		po.CreatedAt = p.CreatedAt.Time
	}
	if p.UpdatedAt.Valid {
		po.UpdatedAt = p.UpdatedAt.Time
	}
	if p.Items != nil {
		_ = unmarshalJSONB(p.Items, &po.Items)
	}
	if p.Metadata != nil {
		po.Metadata = p.Metadata
	}
	if p.AutoCreatedGrn != nil {
		po.AutoCreatedGRN = p.AutoCreatedGrn
	}
	po.QuotationGateOverridden = p.QuotationGateOverridden
	po.BypassJustification = p.BypassJustification
	return po
}

func sqlcGRNToModel(g sqlc.GoodsReceivedNote) *models.GoodsReceivedNote {
	grn := &models.GoodsReceivedNote{
		ID:                g.ID,
		OrganizationID:    g.OrganizationID,
		DocumentNumber:    g.DocumentNumber,
		PODocumentNumber:  derefStringRO(g.PoDocumentNumber),
		Status:            derefStringRO(g.Status),
		ReceivedBy:        derefStringRO(g.ReceivedBy),
		ApprovalStage:     int(derefInt32RO(g.ApprovalStage)),
		BudgetCode:        derefStringRO(g.BudgetCode),
		CostCenter:        derefStringRO(g.CostCenter),
		ProjectCode:       derefStringRO(g.ProjectCode),
		CreatedBy:         derefStringRO(g.CreatedBy),
		OwnerID:           derefStringRO(g.OwnerID),
		WarehouseLocation: derefStringRO(g.WarehouseLocation),
		Notes:             derefStringRO(g.Notes),
		StageName:         derefStringRO(g.StageName),
		ApprovedBy:        derefStringRO(g.ApprovedBy),
		LinkedPV:          derefStringRO(g.LinkedPv),
	}
	if g.ReceivedDate.Valid {
		grn.ReceivedDate = g.ReceivedDate.Time
	}
	if g.CreatedAt.Valid {
		grn.CreatedAt = g.CreatedAt.Time
	}
	if g.UpdatedAt.Valid {
		grn.UpdatedAt = g.UpdatedAt.Time
	}
	if g.Items != nil {
		_ = unmarshalJSONB(g.Items, &grn.Items)
	}
	if g.QualityIssues != nil {
		_ = unmarshalJSONB(g.QualityIssues, &grn.QualityIssues)
	}
	if g.Metadata != nil {
		grn.Metadata = g.Metadata
	}
	if g.AutoCreatedPv != nil {
		grn.AutoCreatedPV = g.AutoCreatedPv
	}
	return grn
}

// derefStringRO returns "" for nil string pointers. Suffix avoids collision
// with helpers in other service files.
func derefStringRO(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefInt32RO(i *int32) int32 {
	if i == nil {
		return 0
	}
	return *i
}

func derefBoolRO(b *bool) bool {
	return b != nil && *b
}

// unmarshalJSONB is a thin wrapper around json.Unmarshal that no-ops on empty input.
func unmarshalJSONB(raw []byte, out interface{}) error {
	if len(raw) == 0 {
		return nil
	}
	return json.Unmarshal(raw, out)
}
