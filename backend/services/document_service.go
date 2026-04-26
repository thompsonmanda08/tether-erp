package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/tether-erp/models"
	"github.com/tether-erp/repository"
)

// DocumentService handles generic document business logic. All DB access goes
// through documentRepo (sqlc + pgxpool) and the package-global config.Queries.
//
// Caller breakage: NewDocumentService no longer accepts a *gorm.DB argument.
type DocumentService struct {
	documentRepo repository.DocumentRepositoryInterface
	auditService *AuditService
}

// CreateDocumentRequest represents a document creation request
type CreateDocumentRequest struct {
	DocumentType string                 `json:"documentType" validate:"required"`
	Title        string                 `json:"title" validate:"required"`
	Description  string                 `json:"description"`
	Amount       float64                `json:"amount"`
	Currency     string                 `json:"currency"`
	Department   string                 `json:"department"`
	WorkflowID   *uuid.UUID             `json:"workflowId"`
	Data         map[string]interface{} `json:"data" validate:"required"` // Type-specific fields
	Metadata     map[string]interface{} `json:"metadata"`                 // Additional metadata
}

// UpdateDocumentRequest represents a document update request
type UpdateDocumentRequest struct {
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Amount      float64                `json:"amount"`
	Currency    string                 `json:"currency"`
	Department  string                 `json:"department"`
	Data        map[string]interface{} `json:"data"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// NewDocumentService creates a new document service. The signature no longer
// takes a *gorm.DB argument. Tests previously passing nil for db can drop the
// argument; runtime callers should drop config.DB.
func NewDocumentService(documentRepo repository.DocumentRepositoryInterface, auditService *AuditService) *DocumentService {
	return &DocumentService{
		documentRepo: documentRepo,
		auditService: auditService,
	}
}

// CreateDocument creates a new generic document
func (s *DocumentService) CreateDocument(ctx context.Context, organizationID, userID string, req CreateDocumentRequest) (*models.Document, error) {
	// Validate document type
	validTypes := map[string]bool{
		"REQUISITION":     true,
		"BUDGET":          true,
		"PURCHASE_ORDER":  true,
		"PAYMENT_VOUCHER": true,
		"GRN":             true,
		"CATEGORY":        true,
		"VENDOR":          true,
	}

	if !validTypes[req.DocumentType] {
		return nil, fmt.Errorf("document_service: invalid document type: %s", req.DocumentType)
	}

	// Convert data to JSON
	dataJSON, err := json.Marshal(req.Data)
	if err != nil {
		return nil, fmt.Errorf("document_service: marshal data: %w", err)
	}

	var metadataJSON json.RawMessage
	if req.Metadata != nil {
		metadataBytes, err := json.Marshal(req.Metadata)
		if err != nil {
			return nil, fmt.Errorf("document_service: marshal metadata: %w", err)
		}
		metadataJSON = json.RawMessage(metadataBytes)
	}

	// Create document
	document := &models.Document{
		OrganizationID: organizationID,
		DocumentType:   req.DocumentType,
		Title:          req.Title,
		Status:         "DRAFT",
		CreatedBy:      userID,
		WorkflowID:     req.WorkflowID,
		Data:           json.RawMessage(dataJSON),
		Metadata:       metadataJSON,
	}

	// Set optional fields
	if req.Description != "" {
		document.Description = &req.Description
	}
	if req.Amount > 0 {
		document.Amount = &req.Amount
	}
	if req.Currency != "" {
		document.Currency = &req.Currency
	} else {
		defaultCurrency := "USD"
		document.Currency = &defaultCurrency
	}
	if req.Department != "" {
		document.Department = &req.Department
	}

	// Create document via repo
	document, err = s.documentRepo.Create(ctx, document)
	if err != nil {
		return nil, fmt.Errorf("document_service: create document: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Created %s document '%s'", req.DocumentType, req.Title)
		s.auditService.LogEvent(ctx, userID, organizationID, "document_created", "document", document.ID.String(), details, "", "")
	}

	return document, nil
}

// GetDocument retrieves a document by ID
func (s *DocumentService) GetDocument(ctx context.Context, id uuid.UUID, organizationID string) (*models.Document, error) {
	return s.documentRepo.GetByID(ctx, id, organizationID)
}

// GetDocumentByNumber retrieves a document by document number
func (s *DocumentService) GetDocumentByNumber(ctx context.Context, documentNumber, organizationID string) (*models.Document, error) {
	return s.documentRepo.GetByNumber(ctx, documentNumber, organizationID)
}

// PublicDocumentVerification represents the public verification response
type PublicDocumentVerification struct {
	Verified       bool     `json:"verified"`
	DocumentID     string   `json:"documentId"`
	DocumentNumber string   `json:"documentNumber"`
	DocumentType   string   `json:"documentType"`
	Title          string   `json:"title"`
	Status         string   `json:"status"`
	Department     *string  `json:"department,omitempty"`
	Amount         *float64 `json:"totalAmount,omitempty"`
	Currency       *string  `json:"currency,omitempty"`
	OrganizationID string   `json:"organizationId"`
	Organization   string   `json:"organization,omitempty"`
	CreatedByName  string   `json:"createdByName,omitempty"`
	CreatedAt      string   `json:"createdAt"`
}

// VerifyDocumentPublic verifies a document by document number for public access.
// Entity-specific tables (requisitions, purchase_orders, etc.) are always queried
// first so the caller always sees the latest committed status. The generic documents
// table is used only as a fallback for document types without a known prefix.
func (s *DocumentService) VerifyDocumentPublic(ctx context.Context, documentNumber string) (*PublicDocumentVerification, error) {
	// Prefer entity-specific tables — they are always authoritative and up-to-date.
	docType := getDocumentTypeFromNumber(documentNumber)

	switch docType {
	case "REQUISITION":
		req, err := s.documentRepo.GetRequisitionByNumberPublic(ctx, documentNumber)
		if err != nil {
			return nil, fmt.Errorf("document_service: requisition not found: %w", err)
		}
		return buildVerificationFromRequisition(req), nil

	case "PURCHASE_ORDER":
		po, err := s.documentRepo.GetPurchaseOrderByNumberPublic(ctx, documentNumber)
		if err != nil {
			return nil, fmt.Errorf("document_service: purchase order not found: %w", err)
		}
		return buildVerificationFromPurchaseOrder(po), nil

	case "PAYMENT_VOUCHER":
		pv, err := s.documentRepo.GetPaymentVoucherByNumberPublic(ctx, documentNumber)
		if err != nil {
			return nil, fmt.Errorf("document_service: payment voucher not found: %w", err)
		}
		return buildVerificationFromPaymentVoucher(pv), nil

	case "GRN":
		grn, err := s.documentRepo.GetGRNByNumberPublic(ctx, documentNumber)
		if err != nil {
			return nil, fmt.Errorf("document_service: GRN not found: %w", err)
		}
		return buildVerificationFromGRN(grn), nil
	}

	// Unknown prefix — fall back to the generic documents table.
	document, err := s.documentRepo.GetByNumberOnly(ctx, documentNumber)
	if err != nil || document == nil {
		return nil, fmt.Errorf("document_service: document not found")
	}

	verification := &PublicDocumentVerification{
		Verified:       true,
		DocumentNumber: document.DocumentNumber,
		DocumentType:   document.DocumentType,
		Title:          document.Title,
		Status:         document.Status,
		Department:     document.Department,
		Amount:         document.Amount,
		Currency:       document.Currency,
		OrganizationID: document.OrganizationID,
		CreatedAt:      document.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if document.Organization != nil {
		verification.Organization = document.Organization.Name
	}
	if document.Creator != nil {
		verification.CreatedByName = document.Creator.Name
	}
	return verification, nil
}

// getDocumentTypeFromNumber determines document type from document number prefix
func getDocumentTypeFromNumber(documentNumber string) string {
	upper := strings.ToUpper(documentNumber)
	if strings.HasPrefix(upper, "REQ-") {
		return "REQUISITION"
	}
	if strings.HasPrefix(upper, "PO-") {
		return "PURCHASE_ORDER"
	}
	if strings.HasPrefix(upper, "PV-") {
		return "PAYMENT_VOUCHER"
	}
	if strings.HasPrefix(upper, "GRN-") {
		return "GRN"
	}
	return ""
}

// buildVerificationFromRequisition builds verification response from requisition
func buildVerificationFromRequisition(req *models.Requisition) *PublicDocumentVerification {
	verification := &PublicDocumentVerification{
		Verified:       true,
		DocumentID:     req.ID,
		DocumentNumber: req.DocumentNumber,
		DocumentType:   "REQUISITION",
		Title:          req.Title,
		Status:         req.Status,
		OrganizationID: req.OrganizationID,
		CreatedAt:      req.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if req.TotalAmount > 0 {
		verification.Amount = &req.TotalAmount
	}
	if req.Currency != "" {
		verification.Currency = &req.Currency
	}
	if req.Department != "" {
		verification.Department = &req.Department
	}
	if req.Requester != nil {
		verification.CreatedByName = req.Requester.Name
	}
	if req.Organization != nil {
		verification.Organization = req.Organization.Name
	}
	return verification
}

// buildVerificationFromPurchaseOrder builds verification response from purchase order
func buildVerificationFromPurchaseOrder(po *models.PurchaseOrder) *PublicDocumentVerification {
	title := po.Title
	if title == "" {
		title = "Purchase Order " + po.DocumentNumber
	}
	verification := &PublicDocumentVerification{
		Verified:       true,
		DocumentID:     po.ID,
		DocumentNumber: po.DocumentNumber,
		DocumentType:   "PURCHASE_ORDER",
		Title:          title,
		Status:         po.Status,
		OrganizationID: po.OrganizationID,
		CreatedAt:      po.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if po.TotalAmount > 0 {
		verification.Amount = &po.TotalAmount
	}
	if po.Currency != "" {
		verification.Currency = &po.Currency
	}
	if po.Department != "" {
		verification.Department = &po.Department
	}
	if po.Organization != nil {
		verification.Organization = po.Organization.Name
	}
	if po.Vendor != nil {
		verification.CreatedByName = po.Vendor.Name
	}
	return verification
}

// buildVerificationFromPaymentVoucher builds verification response from payment voucher
func buildVerificationFromPaymentVoucher(pv *models.PaymentVoucher) *PublicDocumentVerification {
	title := pv.Title
	if title == "" {
		title = "Payment Voucher " + pv.DocumentNumber
	}
	verification := &PublicDocumentVerification{
		Verified:       true,
		DocumentID:     pv.ID,
		DocumentNumber: pv.DocumentNumber,
		DocumentType:   "PAYMENT_VOUCHER",
		Title:          title,
		Status:         pv.Status,
		OrganizationID: pv.OrganizationID,
		CreatedAt:      pv.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if pv.Amount > 0 {
		verification.Amount = &pv.Amount
	}
	if pv.Currency != "" {
		verification.Currency = &pv.Currency
	}
	if pv.Department != "" {
		verification.Department = &pv.Department
	}
	if pv.Organization != nil {
		verification.Organization = pv.Organization.Name
	}
	if pv.RequestedByName != "" {
		verification.CreatedByName = pv.RequestedByName
	}
	return verification
}

// buildVerificationFromGRN builds verification response from GRN
func buildVerificationFromGRN(grn *models.GoodsReceivedNote) *PublicDocumentVerification {
	title := "Goods Received Note " + grn.DocumentNumber
	if grn.Notes != "" {
		title = grn.Notes
	}
	verification := &PublicDocumentVerification{
		Verified:       true,
		DocumentID:     grn.ID,
		DocumentNumber: grn.DocumentNumber,
		DocumentType:   "GRN",
		Title:          title,
		Status:         grn.Status,
		OrganizationID: grn.OrganizationID,
		CreatedAt:      grn.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatedByName:  grn.ReceivedBy,
	}
	if grn.Organization != nil {
		verification.Organization = grn.Organization.Name
	}
	return verification
}

// UpdateDocument updates a document
func (s *DocumentService) UpdateDocument(ctx context.Context, id uuid.UUID, organizationID, userID string, req UpdateDocumentRequest) (*models.Document, error) {
	// Get existing document
	document, err := s.documentRepo.GetByID(ctx, id, organizationID)
	if err != nil {
		return nil, fmt.Errorf("document_service: document not found: %w", err)
	}

	// Check if document is editable
	if !document.IsEditable() {
		return nil, fmt.Errorf("document_service: document cannot be edited in %s status", document.Status)
	}

	// Update fields
	if req.Title != "" {
		document.Title = req.Title
	}
	if req.Description != "" {
		document.Description = &req.Description
	}
	if req.Amount > 0 {
		document.Amount = &req.Amount
	}
	if req.Currency != "" {
		document.Currency = &req.Currency
	}
	if req.Department != "" {
		document.Department = &req.Department
	}

	// Update data if provided
	if req.Data != nil {
		dataJSON, err := json.Marshal(req.Data)
		if err != nil {
			return nil, fmt.Errorf("document_service: marshal data: %w", err)
		}
		document.Data = json.RawMessage(dataJSON)
	}

	// Update metadata if provided
	if req.Metadata != nil {
		metadataJSON, err := json.Marshal(req.Metadata)
		if err != nil {
			return nil, fmt.Errorf("document_service: marshal metadata: %w", err)
		}
		document.Metadata = json.RawMessage(metadataJSON)
	}

	document.UpdatedBy = &userID

	// Update document
	document, err = s.documentRepo.Update(ctx, document)
	if err != nil {
		return nil, fmt.Errorf("document_service: update document: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Updated %s document '%s'", document.DocumentType, document.Title)
		s.auditService.LogEvent(ctx, userID, organizationID, "document_updated", "document", document.ID.String(), details, "", "")
	}

	return document, nil
}

// DeleteDocument deletes a document
func (s *DocumentService) DeleteDocument(ctx context.Context, id uuid.UUID, organizationID, userID string) error {
	// Get existing document for audit logging
	document, err := s.documentRepo.GetByID(ctx, id, organizationID)
	if err != nil {
		return fmt.Errorf("document_service: document not found: %w", err)
	}

	// Check if document can be deleted (only draft or rejected documents)
	if !document.IsEditable() {
		return fmt.Errorf("document_service: document cannot be deleted in %s status", document.Status)
	}

	// Delete document
	if err := s.documentRepo.Delete(ctx, id, organizationID); err != nil {
		return fmt.Errorf("document_service: delete document: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Deleted %s document '%s'", document.DocumentType, document.Title)
		s.auditService.LogEvent(ctx, userID, organizationID, "document_deleted", "document", document.ID.String(), details, "", "")
	}

	return nil
}

// ListDocuments retrieves documents with filtering and pagination
func (s *DocumentService) ListDocuments(ctx context.Context, organizationID string, filter *models.DocumentFilter, limit, offset int) ([]*models.Document, int64, error) {
	documents, err := s.documentRepo.List(ctx, organizationID, filter, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("document_service: list documents: %w", err)
	}

	total, err := s.documentRepo.Count(ctx, organizationID, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("document_service: count documents: %w", err)
	}

	return documents, total, nil
}

// ListUserDocuments retrieves documents created by a specific user
func (s *DocumentService) ListUserDocuments(ctx context.Context, organizationID, userID string, limit, offset int) ([]*models.Document, int64, error) {
	documents, err := s.documentRepo.ListByUser(ctx, organizationID, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("document_service: list user documents: %w", err)
	}

	total, err := s.documentRepo.CountByUser(ctx, organizationID, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("document_service: count user documents: %w", err)
	}

	return documents, total, nil
}

// SearchDocuments performs full-text search on documents
func (s *DocumentService) SearchDocuments(ctx context.Context, organizationID, query string, filter *models.DocumentFilter, limit, offset int) ([]*models.DocumentSearchResult, int64, error) {
	results, err := s.documentRepo.Search(ctx, organizationID, query, filter, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("document_service: search documents: %w", err)
	}

	total, err := s.documentRepo.CountSearch(ctx, organizationID, query, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("document_service: count search results: %w", err)
	}

	return results, total, nil
}

// SubmitDocument submits a document for approval
func (s *DocumentService) SubmitDocument(ctx context.Context, id uuid.UUID, organizationID, userID string) (*models.Document, error) {
	// Get document
	document, err := s.documentRepo.GetByID(ctx, id, organizationID)
	if err != nil {
		return nil, fmt.Errorf("document_service: document not found: %w", err)
	}

	// Check if document can be submitted
	if !document.CanBeSubmitted() {
		return nil, fmt.Errorf("document_service: document cannot be submitted in %s status", document.Status)
	}

	// Submit document
	if err := s.documentRepo.Submit(ctx, id, organizationID); err != nil {
		return nil, fmt.Errorf("document_service: submit document: %w", err)
	}

	// Get updated document
	document, err = s.documentRepo.GetByID(ctx, id, organizationID)
	if err != nil {
		return nil, fmt.Errorf("document_service: get updated document: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Submitted %s document '%s' for approval", document.DocumentType, document.Title)
		s.auditService.LogEvent(ctx, userID, organizationID, "document_submitted", "document", document.ID.String(), details, "", "")
	}

	return document, nil
}

// GetDocumentStats retrieves document statistics
func (s *DocumentService) GetDocumentStats(ctx context.Context, organizationID string) (*models.DocumentStats, error) {
	return s.documentRepo.GetStats(ctx, organizationID)
}

// OrganizationBranding contains minimal org details needed for PDF headers
type OrganizationBranding struct {
	Name    string `json:"name"`
	LogoURL string `json:"logoUrl,omitempty"`
	Tagline string `json:"tagline,omitempty"`
}

// PublicDocumentForPDF represents a document response for PDF generation
type PublicDocumentForPDF struct {
	DocumentType string                `json:"documentType"`
	Document     interface{}           `json:"document"`
	Organization *OrganizationBranding `json:"organization,omitempty"`
}

// GetDocumentForPDFPublic retrieves full document data for PDF generation (public endpoint).
//
// TODO(gorm-migration): the previous implementation called
// utils.GetDocumentApprovalHistory(s.db, ...) to refresh the entity's
// ApprovalHistory from a live DB query. That utility still uses GORM, so it
// has been removed here. Callers will see whatever ApprovalHistory was
// persisted on the entity row itself. Once utils.GetDocumentApprovalHistory
// is migrated to sqlc/pgx, re-introduce the live refresh below.
func (s *DocumentService) GetDocumentForPDFPublic(ctx context.Context, documentNumber string) (*PublicDocumentForPDF, error) {
	result := &PublicDocumentForPDF{}

	// First, try to get from the generic documents table to determine the type
	genericDoc, err := s.documentRepo.GetByNumberOnly(ctx, documentNumber)
	if err == nil && genericDoc != nil {
		result.DocumentType = genericDoc.DocumentType
	} else {
		// If not found in generic table, determine type from document number prefix
		result.DocumentType = getDocumentTypeFromNumber(documentNumber)
		if result.DocumentType == "" {
			return nil, fmt.Errorf("document_service: document not found")
		}
	}

	// Fetch the full document based on type and capture the org ID
	var orgID string
	switch result.DocumentType {
	case "REQUISITION":
		requisition, err := s.documentRepo.GetRequisitionByNumberPublic(ctx, documentNumber)
		if err != nil {
			return nil, fmt.Errorf("document_service: requisition not found: %w", err)
		}
		// Populate virtual fields from preloaded relations so PDF rendering works correctly.
		if requisition.Category != nil {
			requisition.CategoryName = requisition.Category.Name
		} else if len(requisition.Metadata) > 0 {
			// Fall back to category name stored in metadata at creation time
			var metaMap map[string]interface{}
			if json.Unmarshal(requisition.Metadata, &metaMap) == nil {
				if val, ok := metaMap["categoryName"].(string); ok {
					requisition.CategoryName = val
				}
			}
		}
		if requisition.PreferredVendor != nil {
			requisition.PreferredVendorName = requisition.PreferredVendor.Name
		}
		// RequesterName is a real DB column (created_by_name) — use it for computed aliases.
		requisition.RequestedByName = requisition.RequesterName
		requisition.CreatedByName = requisition.RequesterName
		requisition.RequestedBy = requisition.RequesterId
		requisition.CreatedBy = requisition.RequesterId
		requisition.RequestedDate = requisition.CreatedAt
		if requisition.Requester != nil {
			if requisition.Requester.Name != "" {
				requisition.RequestedByName = requisition.Requester.Name
				requisition.CreatedByName = requisition.Requester.Name
			}
			requisition.RequestedByRole = requisition.Requester.Role
			requisition.CreatedByRole = requisition.Requester.Role
		}
		result.Document = requisition
		orgID = requisition.OrganizationID

	case "PURCHASE_ORDER":
		po, err := s.documentRepo.GetPurchaseOrderByNumberPublic(ctx, documentNumber)
		if err != nil {
			return nil, fmt.Errorf("document_service: purchase order not found: %w", err)
		}
		// Populate virtual VendorName from preloaded Vendor relation.
		if po.Vendor != nil {
			po.VendorName = po.Vendor.Name
		}
		result.Document = po
		orgID = po.OrganizationID

	case "PAYMENT_VOUCHER":
		pv, err := s.documentRepo.GetPaymentVoucherByNumberPublic(ctx, documentNumber)
		if err != nil {
			return nil, fmt.Errorf("document_service: payment voucher not found: %w", err)
		}
		// VendorName may be empty if the column was never written; fall back to preloaded Vendor.
		if pv.VendorName == "" && pv.Vendor != nil {
			pv.VendorName = pv.Vendor.Name
		}
		result.Document = pv
		orgID = pv.OrganizationID

	case "GRN":
		grn, err := s.documentRepo.GetGRNByNumberPublic(ctx, documentNumber)
		if err != nil {
			return nil, fmt.Errorf("document_service: GRN not found: %w", err)
		}
		result.Document = grn
		orgID = grn.OrganizationID

	default:
		return nil, fmt.Errorf("document_service: unsupported document type for PDF: %s", result.DocumentType)
	}

	// Attach minimal org branding so public PDF previews show org name/logo
	if orgID != "" {
		if org, err := s.documentRepo.GetOrganizationBranding(ctx, orgID); err == nil {
			result.Organization = &OrganizationBranding{
				Name:    org.Name,
				LogoURL: org.LogoURL,
				Tagline: org.Tagline,
			}
		}
	}

	return result, nil
}
