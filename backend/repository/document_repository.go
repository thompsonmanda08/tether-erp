package repository

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
	"github.com/jackc/pgx/v5/pgxpool"
	decimal "github.com/shopspring/decimal"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
	"github.com/tether-erp/types"
)

// DocumentRepositoryInterface defines the contract for document repository
type DocumentRepositoryInterface interface {
	// Basic CRUD operations
	Create(ctx context.Context, document *models.Document) (*models.Document, error)
	GetByID(ctx context.Context, id uuid.UUID, organizationID string) (*models.Document, error)
	GetByNumber(ctx context.Context, documentNumber, organizationID string) (*models.Document, error)
	GetByNumberOnly(ctx context.Context, documentNumber string) (*models.Document, error) // Public verification (no org filter)
	Update(ctx context.Context, document *models.Document) (*models.Document, error)
	Delete(ctx context.Context, id uuid.UUID, organizationID string) error

	// List operations
	List(ctx context.Context, organizationID string, filter *models.DocumentFilter, limit, offset int) ([]*models.Document, error)
	ListByUser(ctx context.Context, organizationID, userID string, limit, offset int) ([]*models.Document, error)
	ListByType(ctx context.Context, organizationID, documentType string, limit, offset int) ([]*models.Document, error)
	ListByStatus(ctx context.Context, organizationID, status string, limit, offset int) ([]*models.Document, error)
	ListByDepartment(ctx context.Context, organizationID, department string, limit, offset int) ([]*models.Document, error)

	// Search operations
	Search(ctx context.Context, organizationID, query string, filter *models.DocumentFilter, limit, offset int) ([]*models.DocumentSearchResult, error)

	// Count operations
	Count(ctx context.Context, organizationID string, filter *models.DocumentFilter) (int64, error)
	CountSearch(ctx context.Context, organizationID, query string, filter *models.DocumentFilter) (int64, error)
	CountByType(ctx context.Context, organizationID, documentType string) (int64, error)
	CountByStatus(ctx context.Context, organizationID, status string) (int64, error)
	CountByUser(ctx context.Context, organizationID, userID string) (int64, error)

	// Status operations
	UpdateStatus(ctx context.Context, id uuid.UUID, organizationID, status string) error
	Submit(ctx context.Context, id uuid.UUID, organizationID string) error

	// Statistics
	GetStats(ctx context.Context, organizationID string) (*models.DocumentStats, error)

	// Public document retrieval for PDF generation
	GetRequisitionByNumberPublic(ctx context.Context, documentNumber string) (*models.Requisition, error)
	GetPurchaseOrderByNumberPublic(ctx context.Context, documentNumber string) (*models.PurchaseOrder, error)
	GetPaymentVoucherByNumberPublic(ctx context.Context, documentNumber string) (*models.PaymentVoucher, error)
	GetGRNByNumberPublic(ctx context.Context, documentNumber string) (*models.GoodsReceivedNote, error)

	// GetOrganizationBranding fetches minimal branding fields for an org (no auth required)
	GetOrganizationBranding(ctx context.Context, organizationID string) (*models.Organization, error)
}

// DocumentRepository implements DocumentRepositoryInterface using sqlc + pgxpool.
type DocumentRepository struct {
	db *pgxpool.Pool
	q  *sqlc.Queries
}

// NewDocumentRepository creates a new document repository backed by sqlc + pgxpool.
func NewDocumentRepository(pgxDB *pgxpool.Pool) DocumentRepositoryInterface {
	return &DocumentRepository{
		db: pgxDB,
		q:  sqlc.New(pgxDB),
	}
}

// Create creates a new document. The repository generates the UUID and document
// number explicitly because the GORM BeforeCreate hook is no longer present.
func (r *DocumentRepository) Create(ctx context.Context, document *models.Document) (*models.Document, error) {
	if document == nil {
		return nil, fmt.Errorf("document_repository: create: document is nil")
	}

	// Generate UUID if not provided
	if document.ID == uuid.Nil {
		document.ID = uuid.New()
	}

	// Generate document number if not provided
	if document.DocumentNumber == "" {
		document.DocumentNumber = models.GenerateDocumentNumber(document.DocumentType, document.ID)
	}

	row, err := r.q.CreateDocument(ctx, sqlc.CreateDocumentParams{
		ID:             pgUUID(document.ID),
		OrganizationID: document.OrganizationID,
		DocumentType:   document.DocumentType,
		DocumentNumber: document.DocumentNumber,
		Title:          document.Title,
		Description:    document.Description,
		Status:         document.Status,
		Amount:         float64PtrToDecimalPtr(document.Amount),
		Currency:       document.Currency,
		Department:     document.Department,
		CreatedBy:      document.CreatedBy,
		UpdatedBy:      document.UpdatedBy,
		WorkflowID:     uuidPtrToPg(document.WorkflowID),
		Data:           []byte(document.Data),
		Metadata:       []byte(document.Metadata),
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: create: %w", err)
	}

	return documentFromSQLC(row), nil
}

// GetByID retrieves a document by ID
func (r *DocumentRepository) GetByID(ctx context.Context, id uuid.UUID, organizationID string) (*models.Document, error) {
	row, err := r.q.GetDocumentByID(ctx, sqlc.GetDocumentByIDParams{
		ID:             pgUUID(id),
		OrganizationID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_by_id: %w", err)
	}
	return documentFromSQLC(row), nil
}

// GetByNumber retrieves a document by document number
func (r *DocumentRepository) GetByNumber(ctx context.Context, documentNumber, organizationID string) (*models.Document, error) {
	row, err := r.q.GetDocumentByNumber(ctx, sqlc.GetDocumentByNumberParams{
		OrganizationID: organizationID,
		DocumentNumber: documentNumber,
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_by_number: %w", err)
	}
	return documentFromSQLC(row), nil
}

// GetByNumberOnly retrieves a document by document number only (for public verification).
// TODO: previously preloaded Creator + Organization via GORM. With sqlc we currently
// return only the base document; if relations are required, use the dedicated repos
// (UserRepository / GetOrganizationBranding) at the call site.
func (r *DocumentRepository) GetByNumberOnly(ctx context.Context, documentNumber string) (*models.Document, error) {
	const q = `SELECT id, organization_id, document_type, document_number, title, description,
		status, amount, currency, department, created_by, updated_by, workflow_id,
		data, metadata, deleted_at, created_at, updated_at
		FROM documents
		WHERE document_number = $1 AND deleted_at IS NULL
		LIMIT 1`

	var row sqlc.Document
	err := r.db.QueryRow(ctx, q, documentNumber).Scan(
		&row.ID,
		&row.OrganizationID,
		&row.DocumentType,
		&row.DocumentNumber,
		&row.Title,
		&row.Description,
		&row.Status,
		&row.Amount,
		&row.Currency,
		&row.Department,
		&row.CreatedBy,
		&row.UpdatedBy,
		&row.WorkflowID,
		&row.Data,
		&row.Metadata,
		&row.DeletedAt,
		&row.CreatedAt,
		&row.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_by_number_only: %w", err)
	}
	return documentFromSQLC(row), nil
}

// GetRequisitionByNumberPublic retrieves a requisition by document number for public PDF generation.
// TODO: preloaded relations (Requester, Organization, Category, PreferredVendor) are not
// hydrated here. Callers needing them should fetch via the relevant repository.
func (r *DocumentRepository) GetRequisitionByNumberPublic(ctx context.Context, documentNumber string) (*models.Requisition, error) {
	// Public access: no organization filter. We can't use the org-scoped sqlc query,
	// so issue a direct lookup by document_number.
	const q = `SELECT id, organization_id, document_number, requester_id, title, description,
		department, department_id, status, priority, items, total_amount, currency,
		approval_stage, approval_history, action_history, category_id, preferred_vendor_id,
		is_estimate, required_by_date, cost_center, project_code, budget_code, source_of_funds,
		created_by, created_by_name, created_by_role, metadata, automation_used, auto_created_po,
		deleted_at, created_at, updated_at
		FROM requisitions
		WHERE document_number = $1 AND deleted_at IS NULL
		LIMIT 1`

	var row sqlc.Requisition
	err := r.db.QueryRow(ctx, q, documentNumber).Scan(
		&row.ID, &row.OrganizationID, &row.DocumentNumber, &row.RequesterID, &row.Title,
		&row.Description, &row.Department, &row.DepartmentID, &row.Status, &row.Priority,
		&row.Items, &row.TotalAmount, &row.Currency, &row.ApprovalStage, &row.ApprovalHistory,
		&row.ActionHistory, &row.CategoryID, &row.PreferredVendorID, &row.IsEstimate,
		&row.RequiredByDate, &row.CostCenter, &row.ProjectCode, &row.BudgetCode,
		&row.SourceOfFunds, &row.CreatedBy, &row.CreatedByName, &row.CreatedByRole,
		&row.Metadata, &row.AutomationUsed, &row.AutoCreatedPo, &row.DeletedAt,
		&row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_requisition_by_number_public: %w", err)
	}
	return requisitionFromSQLC(row), nil
}

// GetPurchaseOrderByNumberPublic retrieves a purchase order by document number for public PDF generation.
// TODO: preloaded relations (Vendor, Organization) are not hydrated here.
func (r *DocumentRepository) GetPurchaseOrderByNumberPublic(ctx context.Context, documentNumber string) (*models.PurchaseOrder, error) {
	const q = `SELECT id, organization_id, document_number, vendor_id, status, items, total_amount,
		currency, delivery_date, approval_stage, approval_history, linked_requisition,
		description, department, department_id, gl_code, title, priority, subtotal, tax,
		total, budget_code, cost_center, project_code, required_by_date,
		source_requisition_number, source_requisition_id, created_by, owner_id,
		action_history, metadata, estimated_cost, quotation_gate_overridden,
		bypass_justification, automation_used, auto_created_grn, deleted_at,
		created_at, updated_at, procurement_flow
		FROM purchase_orders
		WHERE document_number = $1 AND deleted_at IS NULL
		LIMIT 1`

	var row sqlc.PurchaseOrder
	err := r.db.QueryRow(ctx, q, documentNumber).Scan(
		&row.ID, &row.OrganizationID, &row.DocumentNumber, &row.VendorID, &row.Status,
		&row.Items, &row.TotalAmount, &row.Currency, &row.DeliveryDate, &row.ApprovalStage,
		&row.ApprovalHistory, &row.LinkedRequisition, &row.Description, &row.Department,
		&row.DepartmentID, &row.GlCode, &row.Title, &row.Priority, &row.Subtotal, &row.Tax,
		&row.Total, &row.BudgetCode, &row.CostCenter, &row.ProjectCode, &row.RequiredByDate,
		&row.SourceRequisitionNumber, &row.SourceRequisitionID, &row.CreatedBy, &row.OwnerID,
		&row.ActionHistory, &row.Metadata, &row.EstimatedCost, &row.QuotationGateOverridden,
		&row.BypassJustification, &row.AutomationUsed, &row.AutoCreatedGrn, &row.DeletedAt,
		&row.CreatedAt, &row.UpdatedAt, &row.ProcurementFlow,
	)
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_purchase_order_by_number_public: %w", err)
	}
	return purchaseOrderFromSQLC(row), nil
}

// GetPaymentVoucherByNumberPublic retrieves a payment voucher by document number for public PDF generation.
// TODO: preloaded relations (Vendor, Organization) are not hydrated here.
func (r *DocumentRepository) GetPaymentVoucherByNumberPublic(ctx context.Context, documentNumber string) (*models.PaymentVoucher, error) {
	const q = `SELECT id, organization_id, document_number, vendor_id, invoice_number, status,
		amount, currency, payment_method, gl_code, description, approval_stage,
		approval_history, linked_po, title, department, department_id, priority,
		requested_by_name, requested_date, submitted_at, approved_at, paid_date,
		payment_due_date, budget_code, cost_center, project_code, tax_amount,
		withholding_tax_amount, paid_amount, source_purchase_order_number,
		source_requisition_number, bank_details, items, created_by, owner_id,
		action_history, metadata, deleted_at, created_at, updated_at, linked_grn
		FROM payment_vouchers
		WHERE document_number = $1 AND deleted_at IS NULL
		LIMIT 1`

	var row sqlc.PaymentVoucher
	err := r.db.QueryRow(ctx, q, documentNumber).Scan(
		&row.ID, &row.OrganizationID, &row.DocumentNumber, &row.VendorID, &row.InvoiceNumber,
		&row.Status, &row.Amount, &row.Currency, &row.PaymentMethod, &row.GlCode,
		&row.Description, &row.ApprovalStage, &row.ApprovalHistory, &row.LinkedPo, &row.Title,
		&row.Department, &row.DepartmentID, &row.Priority, &row.RequestedByName,
		&row.RequestedDate, &row.SubmittedAt, &row.ApprovedAt, &row.PaidDate,
		&row.PaymentDueDate, &row.BudgetCode, &row.CostCenter, &row.ProjectCode,
		&row.TaxAmount, &row.WithholdingTaxAmount, &row.PaidAmount,
		&row.SourcePurchaseOrderNumber, &row.SourceRequisitionNumber, &row.BankDetails,
		&row.Items, &row.CreatedBy, &row.OwnerID, &row.ActionHistory, &row.Metadata,
		&row.DeletedAt, &row.CreatedAt, &row.UpdatedAt, &row.LinkedGrn,
	)
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_payment_voucher_by_number_public: %w", err)
	}
	return paymentVoucherFromSQLC(row), nil
}

// GetGRNByNumberPublic retrieves a GRN by document number for public PDF generation.
// TODO: preloaded relation (Organization) is not hydrated here.
func (r *DocumentRepository) GetGRNByNumberPublic(ctx context.Context, documentNumber string) (*models.GoodsReceivedNote, error) {
	const q = `SELECT id, organization_id, document_number, po_document_number, status,
		received_date, received_by, items, quality_issues, approval_stage, approval_history,
		created_by, owner_id, warehouse_location, notes, stage_name, approved_by,
		automation_used, auto_created_pv, action_history, metadata, budget_code,
		cost_center, project_code, deleted_at, created_at, updated_at, linked_pv
		FROM goods_received_notes
		WHERE document_number = $1 AND deleted_at IS NULL
		LIMIT 1`

	var row sqlc.GoodsReceivedNote
	err := r.db.QueryRow(ctx, q, documentNumber).Scan(
		&row.ID, &row.OrganizationID, &row.DocumentNumber, &row.PoDocumentNumber, &row.Status,
		&row.ReceivedDate, &row.ReceivedBy, &row.Items, &row.QualityIssues, &row.ApprovalStage,
		&row.ApprovalHistory, &row.CreatedBy, &row.OwnerID, &row.WarehouseLocation, &row.Notes,
		&row.StageName, &row.ApprovedBy, &row.AutomationUsed, &row.AutoCreatedPv,
		&row.ActionHistory, &row.Metadata, &row.BudgetCode, &row.CostCenter, &row.ProjectCode,
		&row.DeletedAt, &row.CreatedAt, &row.UpdatedAt, &row.LinkedPv,
	)
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_grn_by_number_public: %w", err)
	}
	return grnFromSQLC(row), nil
}

// Update updates a document via UpdateDocument (COALESCE-based partial update).
func (r *DocumentRepository) Update(ctx context.Context, document *models.Document) (*models.Document, error) {
	if document == nil {
		return nil, fmt.Errorf("document_repository: update: document is nil")
	}

	row, err := r.q.UpdateDocument(ctx, sqlc.UpdateDocumentParams{
		ID:          pgUUID(document.ID),
		Title:       document.Title,
		Description: document.Description,
		Status:      document.Status,
		Amount:      float64PtrToDecimalPtr(document.Amount),
		Currency:    document.Currency,
		Department:  document.Department,
		UpdatedBy:   document.UpdatedBy,
		WorkflowID:  uuidPtrToPg(document.WorkflowID),
		Data:        []byte(document.Data),
		Metadata:    []byte(document.Metadata),
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: update: %w", err)
	}
	return documentFromSQLC(row), nil
}

// Delete soft-deletes a document. The sqlc SoftDeleteDocument query does not
// filter by organization_id; we enforce that by issuing the SQL directly.
func (r *DocumentRepository) Delete(ctx context.Context, id uuid.UUID, organizationID string) error {
	const q = `UPDATE documents SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, q, pgUUID(id), organizationID)
	if err != nil {
		return fmt.Errorf("document_repository: delete: %w", err)
	}
	return nil
}

// List retrieves documents with filtering and pagination
func (r *DocumentRepository) List(ctx context.Context, organizationID string, filter *models.DocumentFilter, limit, offset int) ([]*models.Document, error) {
	params := buildListDocumentsParams(organizationID, filter, "", limit, offset)
	rows, err := r.q.ListDocuments(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("document_repository: list: %w", err)
	}
	return documentsFromSQLC(rows), nil
}

// ListByUser retrieves documents created by a specific user
func (r *DocumentRepository) ListByUser(ctx context.Context, organizationID, userID string, limit, offset int) ([]*models.Document, error) {
	params := sqlc.ListDocumentsParams{
		OrganizationID: organizationID,
		Column5:        []string{userID},
		Limit:          int32(limit),
		Offset:         int32(offset),
	}
	rows, err := r.q.ListDocuments(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("document_repository: list_by_user: %w", err)
	}
	return documentsFromSQLC(rows), nil
}

// ListByType retrieves documents by type
func (r *DocumentRepository) ListByType(ctx context.Context, organizationID, documentType string, limit, offset int) ([]*models.Document, error) {
	params := sqlc.ListDocumentsParams{
		OrganizationID: organizationID,
		Column2:        []string{documentType},
		Limit:          int32(limit),
		Offset:         int32(offset),
	}
	rows, err := r.q.ListDocuments(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("document_repository: list_by_type: %w", err)
	}
	return documentsFromSQLC(rows), nil
}

// ListByStatus retrieves documents by status
func (r *DocumentRepository) ListByStatus(ctx context.Context, organizationID, status string, limit, offset int) ([]*models.Document, error) {
	params := sqlc.ListDocumentsParams{
		OrganizationID: organizationID,
		Column3:        []string{status},
		Limit:          int32(limit),
		Offset:         int32(offset),
	}
	rows, err := r.q.ListDocuments(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("document_repository: list_by_status: %w", err)
	}
	return documentsFromSQLC(rows), nil
}

// ListByDepartment retrieves documents by department
func (r *DocumentRepository) ListByDepartment(ctx context.Context, organizationID, department string, limit, offset int) ([]*models.Document, error) {
	params := sqlc.ListDocumentsParams{
		OrganizationID: organizationID,
		Column4:        []string{department},
		Limit:          int32(limit),
		Offset:         int32(offset),
	}
	rows, err := r.q.ListDocuments(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("document_repository: list_by_department: %w", err)
	}
	return documentsFromSQLC(rows), nil
}

// Search performs full-text search on documents across all entity tables.
//
// TODO: This implementation searches the typed-document tables (requisitions,
// purchase_orders, payment_vouchers, goods_received_notes) directly with ILIKE.
// We don't have a real full-text index yet, so Relevance is hard-coded to 1.0
// and Matches is left nil. Replace with a proper FTS implementation when ready.
func (r *DocumentRepository) Search(ctx context.Context, organizationID, query string, filter *models.DocumentFilter, limit, offset int) ([]*models.DocumentSearchResult, error) {
	var allResults []*models.DocumentSearchResult

	searchTypes := []string{}
	if filter != nil && len(filter.DocumentTypes) > 0 {
		searchTypes = filter.DocumentTypes
	}
	if len(searchTypes) == 0 {
		searchTypes = []string{"REQUISITION", "PURCHASE_ORDER", "PAYMENT_VOUCHER", "GRN"}
	}
	normalizedTypes := toUpperSlice(searchTypes)

	if containsType(normalizedTypes, "REQUISITION") {
		results, err := r.searchRequisitions(ctx, organizationID, query, filter)
		if err == nil {
			allResults = append(allResults, results...)
		}
	}
	if containsType(normalizedTypes, "PURCHASE_ORDER") || containsType(normalizedTypes, "PO") {
		results, err := r.searchPurchaseOrders(ctx, organizationID, query, filter)
		if err == nil {
			allResults = append(allResults, results...)
		}
	}
	if containsType(normalizedTypes, "PAYMENT_VOUCHER") || containsType(normalizedTypes, "PV") {
		results, err := r.searchPaymentVouchers(ctx, organizationID, query, filter)
		if err == nil {
			allResults = append(allResults, results...)
		}
	}
	if containsType(normalizedTypes, "GRN") || containsType(normalizedTypes, "GOODS_RECEIVED_NOTE") {
		results, err := r.searchGRNs(ctx, organizationID, query, filter)
		if err == nil {
			allResults = append(allResults, results...)
		}
	}

	// Sort by created_at DESC
	sortResultsByDate(allResults)

	// Apply pagination to combined results
	start := offset
	if start > len(allResults) {
		start = len(allResults)
	}
	end := start + limit
	if end > len(allResults) {
		end = len(allResults)
	}

	return allResults[start:end], nil
}

// containsType checks if a slice contains a type (case-insensitive).
func containsType(types []string, target string) bool {
	targetUpper := strings.ToUpper(target)
	for _, t := range types {
		if strings.ToUpper(t) == targetUpper {
			return true
		}
	}
	return false
}

// sortResultsByDate sorts results by created_at in descending order (stable bubble sort).
func sortResultsByDate(results []*models.DocumentSearchResult) {
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].CreatedAt.After(results[i].CreatedAt) {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
}

// searchRequisitions runs an ILIKE search against the requisitions table.
func (r *DocumentRepository) searchRequisitions(ctx context.Context, organizationID, query string, filter *models.DocumentFilter) ([]*models.DocumentSearchResult, error) {
	sql, args := buildTypedSearchSQL(
		"SELECT id, organization_id, document_number, title, description, department, status, total_amount, currency, requester_id, created_at, updated_at FROM requisitions",
		[]string{"title", "description", "document_number", "department"},
		organizationID, query, filter,
	)

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("document_repository: search_requisitions: %w", err)
	}
	defer rows.Close()

	results := []*models.DocumentSearchResult{}
	for rows.Next() {
		var (
			id, orgID, docNum, title, requesterID string
			desc, dept, status, currency          *string
			totalAmount                           *decimal.Decimal
			createdAt, updatedAt                  pgtype.Timestamptz
		)
		if err := rows.Scan(&id, &orgID, &docNum, &title, &desc, &dept, &status,
			&totalAmount, &currency, &requesterID, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("document_repository: search_requisitions: %w", err)
		}
		uid, _ := uuid.Parse(id)
		doc := models.Document{
			ID:             uid,
			OrganizationID: orgID,
			DocumentType:   "REQUISITION",
			DocumentNumber: docNum,
			Title:          title,
			Description:    desc,
			Status:         deref(status),
			Amount:         decimalPtrToFloat64Ptr(totalAmount),
			Currency:       currency,
			Department:     dept,
			CreatedBy:      requesterID,
			CreatedAt:      pgTimestamptzToTime(createdAt),
			UpdatedAt:      pgTimestamptzToTime(updatedAt),
		}
		results = append(results, &models.DocumentSearchResult{Document: doc, Relevance: 1.0})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("document_repository: search_requisitions: %w", err)
	}
	return results, nil
}

// searchPurchaseOrders runs an ILIKE search against the purchase_orders table.
func (r *DocumentRepository) searchPurchaseOrders(ctx context.Context, organizationID, query string, filter *models.DocumentFilter) ([]*models.DocumentSearchResult, error) {
	sql, args := buildTypedSearchSQL(
		"SELECT id, organization_id, document_number, title, description, department, status, total_amount, currency, created_by, created_at, updated_at FROM purchase_orders",
		[]string{"title", "document_number"},
		organizationID, query, filter,
	)

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("document_repository: search_purchase_orders: %w", err)
	}
	defer rows.Close()

	results := []*models.DocumentSearchResult{}
	for rows.Next() {
		var (
			id, orgID, docNum                       string
			title, desc, dept, status, currency, by *string
			totalAmount                             *decimal.Decimal
			createdAt, updatedAt                    pgtype.Timestamptz
		)
		if err := rows.Scan(&id, &orgID, &docNum, &title, &desc, &dept, &status,
			&totalAmount, &currency, &by, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("document_repository: search_purchase_orders: %w", err)
		}
		uid, _ := uuid.Parse(id)
		creator := deref(by)
		if creator == "" {
			creator = "system"
		}
		doc := models.Document{
			ID:             uid,
			OrganizationID: orgID,
			DocumentType:   "PURCHASE_ORDER",
			DocumentNumber: docNum,
			Title:          deref(title),
			Description:    desc,
			Status:         deref(status),
			Amount:         decimalPtrToFloat64Ptr(totalAmount),
			Currency:       currency,
			Department:     dept,
			CreatedBy:      creator,
			CreatedAt:      pgTimestamptzToTime(createdAt),
			UpdatedAt:      pgTimestamptzToTime(updatedAt),
		}
		results = append(results, &models.DocumentSearchResult{Document: doc, Relevance: 1.0})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("document_repository: search_purchase_orders: %w", err)
	}
	return results, nil
}

// searchPaymentVouchers runs an ILIKE search against the payment_vouchers table.
func (r *DocumentRepository) searchPaymentVouchers(ctx context.Context, organizationID, query string, filter *models.DocumentFilter) ([]*models.DocumentSearchResult, error) {
	sql, args := buildTypedSearchSQL(
		"SELECT id, organization_id, document_number, title, description, department, status, amount, currency, created_by, created_at, updated_at FROM payment_vouchers",
		[]string{"title", "description", "document_number"},
		organizationID, query, filter,
	)

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("document_repository: search_payment_vouchers: %w", err)
	}
	defer rows.Close()

	results := []*models.DocumentSearchResult{}
	for rows.Next() {
		var (
			id, orgID, docNum                       string
			title, desc, dept, status, currency, by *string
			amount                                  *decimal.Decimal
			createdAt, updatedAt                    pgtype.Timestamptz
		)
		if err := rows.Scan(&id, &orgID, &docNum, &title, &desc, &dept, &status,
			&amount, &currency, &by, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("document_repository: search_payment_vouchers: %w", err)
		}
		uid, _ := uuid.Parse(id)
		creator := deref(by)
		if creator == "" {
			creator = "system"
		}
		doc := models.Document{
			ID:             uid,
			OrganizationID: orgID,
			DocumentType:   "PAYMENT_VOUCHER",
			DocumentNumber: docNum,
			Title:          deref(title),
			Description:    desc,
			Status:         deref(status),
			Amount:         decimalPtrToFloat64Ptr(amount),
			Currency:       currency,
			Department:     dept,
			CreatedBy:      creator,
			CreatedAt:      pgTimestamptzToTime(createdAt),
			UpdatedAt:      pgTimestamptzToTime(updatedAt),
		}
		results = append(results, &models.DocumentSearchResult{Document: doc, Relevance: 1.0})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("document_repository: search_payment_vouchers: %w", err)
	}
	return results, nil
}

// searchGRNs runs an ILIKE search against the goods_received_notes table.
func (r *DocumentRepository) searchGRNs(ctx context.Context, organizationID, query string, filter *models.DocumentFilter) ([]*models.DocumentSearchResult, error) {
	sql, args := buildTypedSearchSQL(
		"SELECT id, organization_id, document_number, status, notes, received_by, created_at, updated_at FROM goods_received_notes",
		[]string{"document_number", "notes"},
		organizationID, query, filter,
	)

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("document_repository: search_grns: %w", err)
	}
	defer rows.Close()

	results := []*models.DocumentSearchResult{}
	for rows.Next() {
		var (
			id, orgID, docNum    string
			status, notes, by    *string
			createdAt, updatedAt pgtype.Timestamptz
		)
		if err := rows.Scan(&id, &orgID, &docNum, &status, &notes, &by, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("document_repository: search_grns: %w", err)
		}
		uid, _ := uuid.Parse(id)
		title := "GRN: " + docNum
		if n := deref(notes); n != "" {
			title = n
		}
		doc := models.Document{
			ID:             uid,
			OrganizationID: orgID,
			DocumentType:   "GRN",
			DocumentNumber: docNum,
			Title:          title,
			Status:         deref(status),
			CreatedBy:      deref(by),
			CreatedAt:      pgTimestamptzToTime(createdAt),
			UpdatedAt:      pgTimestamptzToTime(updatedAt),
		}
		results = append(results, &models.DocumentSearchResult{Document: doc, Relevance: 1.0})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("document_repository: search_grns: %w", err)
	}
	return results, nil
}

// Count counts documents in the unified documents table with the given filter.
func (r *DocumentRepository) Count(ctx context.Context, organizationID string, filter *models.DocumentFilter) (int64, error) {
	return r.CountSearch(ctx, organizationID, "", filter)
}

// CountSearch counts documents matching both the text query and optional filter.
//
// Like Search, this is implemented across the four typed-document tables and
// summed. The sqlc-generated CountDocuments counts the unified documents table,
// which is not where the typed records live.
func (r *DocumentRepository) CountSearch(ctx context.Context, organizationID, query string, filter *models.DocumentFilter) (int64, error) {
	var totalCount int64

	searchTypes := []string{}
	if filter != nil && len(filter.DocumentTypes) > 0 {
		searchTypes = toUpperSlice(filter.DocumentTypes)
	} else {
		searchTypes = []string{"REQUISITION", "PURCHASE_ORDER", "PAYMENT_VOUCHER", "GRN"}
	}

	if containsType(searchTypes, "REQUISITION") {
		count, _ := r.countTyped(ctx, "requisitions", []string{"title", "description", "document_number", "department"}, organizationID, query, filter)
		totalCount += count
	}
	if containsType(searchTypes, "PURCHASE_ORDER") || containsType(searchTypes, "PO") {
		count, _ := r.countTyped(ctx, "purchase_orders", []string{"title", "document_number"}, organizationID, query, filter)
		totalCount += count
	}
	if containsType(searchTypes, "PAYMENT_VOUCHER") || containsType(searchTypes, "PV") {
		count, _ := r.countTyped(ctx, "payment_vouchers", []string{"title", "description", "document_number"}, organizationID, query, filter)
		totalCount += count
	}
	if containsType(searchTypes, "GRN") || containsType(searchTypes, "GOODS_RECEIVED_NOTE") {
		count, _ := r.countTyped(ctx, "goods_received_notes", []string{"document_number", "notes"}, organizationID, query, filter)
		totalCount += count
	}

	return totalCount, nil
}

// countTyped runs SELECT COUNT(*) against a typed-document table with the
// same filter shape used by buildTypedSearchSQL.
func (r *DocumentRepository) countTyped(ctx context.Context, table string, searchCols []string, organizationID, searchText string, filter *models.DocumentFilter) (int64, error) {
	sql, args := buildTypedSearchSQL("SELECT COUNT(*) FROM "+table, searchCols, organizationID, searchText, filter)
	// Strip ORDER BY (the helper appends none for COUNT, but make this explicit).
	var count int64
	if err := r.db.QueryRow(ctx, sql, args...).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

// CountByType counts documents by type
func (r *DocumentRepository) CountByType(ctx context.Context, organizationID, documentType string) (int64, error) {
	count, err := r.q.CountDocuments(ctx, sqlc.CountDocumentsParams{
		OrganizationID: organizationID,
		Column2:        []string{documentType},
	})
	if err != nil {
		return 0, fmt.Errorf("document_repository: count_by_type: %w", err)
	}
	return count, nil
}

// CountByStatus counts documents by status
func (r *DocumentRepository) CountByStatus(ctx context.Context, organizationID, status string) (int64, error) {
	count, err := r.q.CountDocuments(ctx, sqlc.CountDocumentsParams{
		OrganizationID: organizationID,
		Column3:        []string{status},
	})
	if err != nil {
		return 0, fmt.Errorf("document_repository: count_by_status: %w", err)
	}
	return count, nil
}

// CountByUser counts documents by user
func (r *DocumentRepository) CountByUser(ctx context.Context, organizationID, userID string) (int64, error) {
	count, err := r.q.CountDocuments(ctx, sqlc.CountDocumentsParams{
		OrganizationID: organizationID,
		Column5:        []string{userID},
	})
	if err != nil {
		return 0, fmt.Errorf("document_repository: count_by_user: %w", err)
	}
	return count, nil
}

// UpdateStatus updates document status. Uses UpdateDocument with only the status
// field set; remaining fields fall through COALESCE and preserve existing values.
//
// We must verify the document belongs to the requested organization before
// updating, since UpdateDocument's WHERE clause does not filter by organization.
func (r *DocumentRepository) UpdateStatus(ctx context.Context, id uuid.UUID, organizationID, status string) error {
	const q = `UPDATE documents SET status = $3, updated_at = NOW()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, q, pgUUID(id), organizationID, status)
	if err != nil {
		return fmt.Errorf("document_repository: update_status: %w", err)
	}
	return nil
}

// Submit submits a document for approval. Only DRAFT/REJECTED docs may be submitted.
func (r *DocumentRepository) Submit(ctx context.Context, id uuid.UUID, organizationID string) error {
	const q = `UPDATE documents SET status = 'SUBMITTED', updated_at = NOW()
		WHERE id = $1 AND organization_id = $2
		  AND deleted_at IS NULL
		  AND UPPER(status) IN ('DRAFT', 'REJECTED')`
	_, err := r.db.Exec(ctx, q, pgUUID(id), organizationID)
	if err != nil {
		return fmt.Errorf("document_repository: submit: %w", err)
	}
	return nil
}

// GetStats retrieves document statistics for an organization.
func (r *DocumentRepository) GetStats(ctx context.Context, organizationID string) (*models.DocumentStats, error) {
	stats := &models.DocumentStats{
		DocumentsByType:   make(map[string]int64),
		DocumentsByStatus: make(map[string]int64),
		DocumentsByDept:   make(map[string]int64),
	}

	// Total documents
	total, err := r.q.CountDocuments(ctx, sqlc.CountDocumentsParams{
		OrganizationID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_stats: total: %w", err)
	}
	stats.TotalDocuments = total

	// By type
	typeStats, err := r.q.GetDocumentStatsByType(ctx, sqlc.GetDocumentStatsByTypeParams{
		OrganizationID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_stats: by_type: %w", err)
	}
	for _, row := range typeStats {
		stats.DocumentsByType[row.DocumentType] = row.Count
	}

	// By status
	statusStats, err := r.q.GetDocumentStatsByStatus(ctx, sqlc.GetDocumentStatsByStatusParams{
		OrganizationID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_stats: by_status: %w", err)
	}
	for _, row := range statusStats {
		stats.DocumentsByStatus[row.Status] = row.Count
	}

	// By department
	deptStats, err := r.q.GetDocumentStatsByDepartment(ctx, sqlc.GetDocumentStatsByDepartmentParams{
		OrganizationID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_stats: by_department: %w", err)
	}
	for _, row := range deptStats {
		if row.Department != nil {
			stats.DocumentsByDept[*row.Department] = row.Count
		}
	}

	// Pending approvals
	pending, err := r.q.CountPendingApprovalDocuments(ctx, sqlc.CountPendingApprovalDocumentsParams{
		OrganizationID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_stats: pending: %w", err)
	}
	stats.PendingApprovals = pending

	// Recent (last 7 days) — derive from CountDocuments with a date filter so we don't
	// need to load N rows just to count them.
	weekAgo := time.Now().AddDate(0, 0, -7)
	recent, err := r.q.CountDocuments(ctx, sqlc.CountDocumentsParams{
		OrganizationID: organizationID,
		Column6:        timeToPgTimestamptz(&weekAgo),
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_stats: recent: %w", err)
	}
	stats.RecentDocuments = recent

	// Total / average value via direct SQL — no sqlc query exists for this aggregate.
	const valueSQL = `SELECT COALESCE(SUM(amount), 0)::float8 AS total_value,
			COALESCE(AVG(amount), 0)::float8 AS average_value
		FROM documents
		WHERE organization_id = $1 AND amount IS NOT NULL AND deleted_at IS NULL`
	if err := r.db.QueryRow(ctx, valueSQL, organizationID).Scan(&stats.TotalValue, &stats.AverageValue); err != nil {
		return nil, fmt.Errorf("document_repository: get_stats: values: %w", err)
	}

	return stats, nil
}

// GetOrganizationBranding fetches minimal branding fields for a given organization.
// Used by public PDF generation endpoints.
func (r *DocumentRepository) GetOrganizationBranding(ctx context.Context, organizationID string) (*models.Organization, error) {
	row, err := r.q.GetOrganizationByID(ctx, sqlc.GetOrganizationByIDParams{
		ID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("document_repository: get_organization_branding: %w", err)
	}
	return organizationFromSQLC(row), nil
}

//
// ============================================================================
// Helpers
// ============================================================================
//

// toUpperSlice converts a slice of strings to uppercase.
func toUpperSlice(slice []string) []string {
	result := make([]string, len(slice))
	for i, s := range slice {
		result[i] = strings.ToUpper(s)
	}
	return result
}

// buildListDocumentsParams builds the parameter struct for sqlc.ListDocuments / CountDocuments
// based on a DocumentFilter. The COALESCE-style placeholders in the SQL accept either the
// zero-value (empty slice / null timestamp / zero decimal / empty string) to disable a
// filter, or a populated value to apply it.
func buildListDocumentsParams(organizationID string, filter *models.DocumentFilter, searchOverride string, limit, offset int) sqlc.ListDocumentsParams {
	params := sqlc.ListDocumentsParams{
		OrganizationID: organizationID,
		Limit:          int32(limit),
		Offset:         int32(offset),
	}
	if filter != nil {
		if len(filter.DocumentTypes) > 0 {
			params.Column2 = filter.DocumentTypes
		}
		if len(filter.Statuses) > 0 {
			params.Column3 = filter.Statuses
		}
		if len(filter.Departments) > 0 {
			params.Column4 = filter.Departments
		}
		if len(filter.CreatedBy) > 0 {
			params.Column5 = filter.CreatedBy
		}
		if filter.DateFrom != nil {
			params.Column6 = timeToPgTimestamptz(filter.DateFrom)
		}
		if filter.DateTo != nil {
			params.Column7 = timeToPgTimestamptz(filter.DateTo)
		}
		if filter.AmountMin != nil {
			params.Column8 = decimal.NewFromFloat(*filter.AmountMin)
		}
		if filter.AmountMax != nil {
			params.Column9 = decimal.NewFromFloat(*filter.AmountMax)
		}
		// filter.Search applies the same ILIKE clause that ListDocuments supports.
		if filter.Search != "" {
			params.Column10 = filter.Search
		}
		// filter.DocumentNumber: ListDocuments does not support an exact document_number
		// filter — the SQL is title/description ILIKE. Fall back to the search column so
		// callers using DocumentNumber-only filters still get a substring match.
		if filter.DocumentNumber != "" && params.Column10 == "" {
			params.Column10 = filter.DocumentNumber
		}
	}
	if searchOverride != "" {
		params.Column10 = searchOverride
	}
	return params
}

// buildTypedSearchSQL constructs a parameterized SELECT for a typed-document table
// (requisitions / purchase_orders / payment_vouchers / goods_received_notes).
//
// It honors organization scoping, soft-delete, optional document_number filter,
// status whitelist, date range, and a search query that ILIKEs across the given
// search columns. Results are ordered by created_at DESC.
func buildTypedSearchSQL(selectClause string, searchCols []string, organizationID, query string, filter *models.DocumentFilter) (string, []any) {
	args := []any{organizationID}
	conds := []string{"organization_id = $1", "deleted_at IS NULL"}

	addArg := func(v any) string {
		args = append(args, v)
		return fmt.Sprintf("$%d", len(args))
	}

	// Search across columns
	if query != "" {
		for _, term := range strings.Fields(query) {
			placeholder := addArg("%" + term + "%")
			parts := make([]string, 0, len(searchCols))
			for _, col := range searchCols {
				parts = append(parts, fmt.Sprintf("%s ILIKE %s", col, placeholder))
			}
			conds = append(conds, "("+strings.Join(parts, " OR ")+")")
		}
	}

	if filter != nil {
		if filter.DocumentNumber != "" {
			conds = append(conds, fmt.Sprintf("document_number ILIKE %s", addArg("%"+filter.DocumentNumber+"%")))
		}
		if len(filter.Statuses) > 0 {
			conds = append(conds, fmt.Sprintf("UPPER(status) = ANY(%s)", addArg(toUpperSlice(filter.Statuses))))
		}
		if filter.DateFrom != nil {
			conds = append(conds, fmt.Sprintf("created_at >= %s", addArg(*filter.DateFrom)))
		}
		if filter.DateTo != nil {
			conds = append(conds, fmt.Sprintf("created_at <= %s", addArg(*filter.DateTo)))
		}
	}

	sql := selectClause + " WHERE " + strings.Join(conds, " AND ")
	// Only add ORDER BY when not counting.
	if !strings.HasPrefix(strings.ToUpper(strings.TrimSpace(selectClause)), "SELECT COUNT") {
		sql += " ORDER BY created_at DESC"
	}
	return sql, args
}

// pgUUID converts a uuid.UUID into pgtype.UUID.
func pgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

// uuidPtrToPg converts a *uuid.UUID into pgtype.UUID (invalid when nil).
func uuidPtrToPg(id *uuid.UUID) pgtype.UUID {
	if id == nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: *id, Valid: true}
}

// pgUUIDToUUID converts a pgtype.UUID back to uuid.UUID (zero when invalid).
func pgUUIDToUUID(p pgtype.UUID) uuid.UUID {
	if !p.Valid {
		return uuid.Nil
	}
	return uuid.UUID(p.Bytes)
}

// pgUUIDToUUIDPtr returns a *uuid.UUID, or nil when invalid.
func pgUUIDToUUIDPtr(p pgtype.UUID) *uuid.UUID {
	if !p.Valid {
		return nil
	}
	id := uuid.UUID(p.Bytes)
	return &id
}

// timeToPgTimestamptz converts a *time.Time into pgtype.Timestamptz.
func timeToPgTimestamptz(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

// pgTimestamptzToTime returns the underlying time.Time (zero when invalid).
func pgTimestamptzToTime(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

// pgTimestamptzToTimePtr returns a *time.Time, or nil when invalid.
func pgTimestamptzToTimePtr(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	tt := t.Time
	return &tt
}

// decimalPtrToFloat64Ptr returns a *float64 from a *decimal.Decimal.
func decimalPtrToFloat64Ptr(d *decimal.Decimal) *float64 {
	if d == nil {
		return nil
	}
	v, _ := d.Float64()
	return &v
}

// decimalPtrToFloat64 returns the float64 value of a *decimal.Decimal (0 when nil).
func decimalPtrToFloat64(d *decimal.Decimal) float64 {
	if d == nil {
		return 0
	}
	v, _ := d.Float64()
	return v
}

// float64PtrToDecimalPtr converts a *float64 into a *decimal.Decimal.
func float64PtrToDecimalPtr(f *float64) *decimal.Decimal {
	if f == nil {
		return nil
	}
	d := decimal.NewFromFloat(*f)
	return &d
}

// deref returns the underlying string ("" when nil).
func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// jsonRawOrNil returns a json.RawMessage, or nil for empty input.
func jsonRawOrNil(b []byte) json.RawMessage {
	if len(b) == 0 {
		return nil
	}
	return json.RawMessage(b)
}

// documentFromSQLC converts a sqlc Document row into a domain *models.Document.
func documentFromSQLC(row sqlc.Document) *models.Document {
	return &models.Document{
		ID:             pgUUIDToUUID(row.ID),
		OrganizationID: row.OrganizationID,
		DocumentType:   row.DocumentType,
		DocumentNumber: row.DocumentNumber,
		Title:          row.Title,
		Description:    row.Description,
		Status:         row.Status,
		Amount:         decimalPtrToFloat64Ptr(row.Amount),
		Currency:       row.Currency,
		Department:     row.Department,
		CreatedBy:      row.CreatedBy,
		UpdatedBy:      row.UpdatedBy,
		WorkflowID:     pgUUIDToUUIDPtr(row.WorkflowID),
		Data:           jsonRawOrNil(row.Data),
		Metadata:       jsonRawOrNil(row.Metadata),
		CreatedAt:      pgTimestamptzToTime(row.CreatedAt),
		UpdatedAt:      pgTimestamptzToTime(row.UpdatedAt),
		DeletedAt:      pgTimestamptzToTimePtr(row.DeletedAt),
	}
}

// documentsFromSQLC converts a slice of sqlc Documents into a slice of *models.Document.
func documentsFromSQLC(rows []sqlc.Document) []*models.Document {
	out := make([]*models.Document, len(rows))
	for i := range rows {
		out[i] = documentFromSQLC(rows[i])
	}
	return out
}

// requisitionFromSQLC converts a sqlc Requisition row into a domain *models.Requisition.
func requisitionFromSQLC(row sqlc.Requisition) *models.Requisition {
	r := &models.Requisition{
		ID:                  row.ID,
		OrganizationID:      row.OrganizationID,
		DocumentNumber:      row.DocumentNumber,
		RequesterId:         row.RequesterID,
		Title:               row.Title,
		Description:         deref(row.Description),
		Department:          deref(row.Department),
		DepartmentId:        deref(row.DepartmentID),
		Status:              deref(row.Status),
		Priority:            deref(row.Priority),
		TotalAmount:         decimalPtrToFloat64(row.TotalAmount),
		Currency:            deref(row.Currency),
		CategoryID:          row.CategoryID,
		PreferredVendorID:   row.PreferredVendorID,
		BudgetCode:          deref(row.BudgetCode),
		SourceOfFunds:       deref(row.SourceOfFunds),
		CostCenter:          deref(row.CostCenter),
		ProjectCode:         deref(row.ProjectCode),
		CreatedBy:           deref(row.CreatedBy),
		CreatedByName:       deref(row.CreatedByName),
		CreatedByRole:       deref(row.CreatedByRole),
		Metadata:            jsonRawOrNil(row.Metadata),
		AutoCreatedPO:       jsonRawOrNil(row.AutoCreatedPo),
		CreatedAt:           pgTimestamptzToTime(row.CreatedAt),
		UpdatedAt:           pgTimestamptzToTime(row.UpdatedAt),
		RequestedDate:       pgTimestamptzToTime(row.CreatedAt),
		RequiredByDate:      pgTimestamptzToTime(row.RequiredByDate),
	}
	if row.ApprovalStage != nil {
		r.ApprovalStage = int(*row.ApprovalStage)
	}
	if row.IsEstimate != nil {
		r.IsEstimate = *row.IsEstimate
	}
	if row.AutomationUsed != nil {
		r.AutomationUsed = *row.AutomationUsed
	}
	if len(row.Items) > 0 {
		_ = json.Unmarshal(row.Items, &r.Items)
	}
	if len(row.ApprovalHistory) > 0 {
		_ = json.Unmarshal(row.ApprovalHistory, &r.ApprovalHistory)
	}
	if len(row.ActionHistory) > 0 {
		_ = json.Unmarshal(row.ActionHistory, &r.ActionHistory)
	}
	return r
}

// purchaseOrderFromSQLC converts a sqlc PurchaseOrder row into a domain *models.PurchaseOrder.
func purchaseOrderFromSQLC(row sqlc.PurchaseOrder) *models.PurchaseOrder {
	po := &models.PurchaseOrder{
		ID:                      row.ID,
		OrganizationID:          row.OrganizationID,
		DocumentNumber:          row.DocumentNumber,
		VendorID:                row.VendorID,
		Status:                  deref(row.Status),
		TotalAmount:             decimalPtrToFloat64(row.TotalAmount),
		Currency:                deref(row.Currency),
		LinkedRequisition:       deref(row.LinkedRequisition),
		Description:             deref(row.Description),
		Department:              deref(row.Department),
		DepartmentID:            deref(row.DepartmentID),
		GLCode:                  deref(row.GlCode),
		Title:                   deref(row.Title),
		Priority:                deref(row.Priority),
		Subtotal:                decimalPtrToFloat64Ptr(row.Subtotal),
		Tax:                     decimalPtrToFloat64Ptr(row.Tax),
		Total:                   decimalPtrToFloat64Ptr(row.Total),
		BudgetCode:              deref(row.BudgetCode),
		CostCenter:              deref(row.CostCenter),
		ProjectCode:             deref(row.ProjectCode),
		CreatedBy:               deref(row.CreatedBy),
		Metadata:                jsonRawOrNil(row.Metadata),
		EstimatedCost:           func() float64 { v, _ := row.EstimatedCost.Float64(); return v }(),
		QuotationGateOverridden: row.QuotationGateOverridden,
		BypassJustification:     row.BypassJustification,
		AutoCreatedGRN:          jsonRawOrNil(row.AutoCreatedGrn),
		ProcurementFlow:         deref(row.ProcurementFlow),
		DeliveryDate:            pgTimestamptzToTime(row.DeliveryDate),
		CreatedAt:               pgTimestamptzToTime(row.CreatedAt),
		UpdatedAt:               pgTimestamptzToTime(row.UpdatedAt),
		RequiredByDate:          pgTimestamptzToTimePtr(row.RequiredByDate),
		SourceRequisitionId:     row.SourceRequisitionID,
	}
	if row.AutomationUsed != nil {
		po.AutomationUsed = *row.AutomationUsed
	}
	if len(row.Items) > 0 {
		_ = json.Unmarshal(row.Items, &po.Items)
	}
	if len(row.ApprovalHistory) > 0 {
		_ = json.Unmarshal(row.ApprovalHistory, &po.ApprovalHistory)
	}
	if len(row.ActionHistory) > 0 {
		_ = json.Unmarshal(row.ActionHistory, &po.ActionHistory)
	}
	return po
}

// paymentVoucherFromSQLC converts a sqlc PaymentVoucher row into a domain *models.PaymentVoucher.
func paymentVoucherFromSQLC(row sqlc.PaymentVoucher) *models.PaymentVoucher {
	pv := &models.PaymentVoucher{
		ID:                   row.ID,
		OrganizationID:       row.OrganizationID,
		DocumentNumber:       row.DocumentNumber,
		VendorID:             row.VendorID,
		InvoiceNumber:        deref(row.InvoiceNumber),
		Status:               deref(row.Status),
		Amount:               decimalPtrToFloat64(row.Amount),
		Currency:             deref(row.Currency),
		PaymentMethod:        deref(row.PaymentMethod),
		GLCode:               deref(row.GlCode),
		Description:          deref(row.Description),
		LinkedPO:             deref(row.LinkedPo),
		LinkedGRN:            deref(row.LinkedGrn),
		Title:                deref(row.Title),
		Department:           deref(row.Department),
		DepartmentID:         deref(row.DepartmentID),
		Priority:             deref(row.Priority),
		CreatedBy:            deref(row.CreatedBy),
		RequestedByName:      deref(row.RequestedByName),
		RequestedDate:        pgTimestamptzToTimePtr(row.RequestedDate),
		SubmittedAt:          pgTimestamptzToTimePtr(row.SubmittedAt),
		ApprovedAt:           pgTimestamptzToTimePtr(row.ApprovedAt),
		PaidDate:             pgTimestamptzToTimePtr(row.PaidDate),
		PaymentDueDate:       pgTimestamptzToTimePtr(row.PaymentDueDate),
		BudgetCode:           deref(row.BudgetCode),
		CostCenter:           deref(row.CostCenter),
		ProjectCode:          deref(row.ProjectCode),
		TaxAmount:            decimalPtrToFloat64Ptr(row.TaxAmount),
		WithholdingTaxAmount: decimalPtrToFloat64Ptr(row.WithholdingTaxAmount),
		PaidAmount:           decimalPtrToFloat64Ptr(row.PaidAmount),
		BankDetails:          jsonRawOrNil(row.BankDetails),
		CreatedAt:            pgTimestamptzToTime(row.CreatedAt),
		UpdatedAt:            pgTimestamptzToTime(row.UpdatedAt),
	}
	if row.ApprovalStage != nil {
		pv.ApprovalStage = int(*row.ApprovalStage)
	}
	if len(row.ApprovalHistory) > 0 {
		_ = json.Unmarshal(row.ApprovalHistory, &pv.ApprovalHistory)
	}
	if len(row.Items) > 0 {
		_ = json.Unmarshal(row.Items, &pv.Items)
	}
	if len(row.ActionHistory) > 0 {
		_ = json.Unmarshal(row.ActionHistory, &pv.ActionHistory)
	}
	return pv
}

// grnFromSQLC converts a sqlc GoodsReceivedNote row into a domain *models.GoodsReceivedNote.
func grnFromSQLC(row sqlc.GoodsReceivedNote) *models.GoodsReceivedNote {
	grn := &models.GoodsReceivedNote{
		ID:                row.ID,
		OrganizationID:    row.OrganizationID,
		DocumentNumber:    row.DocumentNumber,
		PODocumentNumber:  deref(row.PoDocumentNumber),
		Status:            deref(row.Status),
		ReceivedDate:      pgTimestamptzToTime(row.ReceivedDate),
		ReceivedBy:        deref(row.ReceivedBy),
		BudgetCode:        deref(row.BudgetCode),
		CostCenter:        deref(row.CostCenter),
		ProjectCode:       deref(row.ProjectCode),
		CreatedBy:         deref(row.CreatedBy),
		OwnerID:           deref(row.OwnerID),
		WarehouseLocation: deref(row.WarehouseLocation),
		Notes:             deref(row.Notes),
		StageName:         deref(row.StageName),
		ApprovedBy:        deref(row.ApprovedBy),
		LinkedPV:          deref(row.LinkedPv),
		AutoCreatedPV:     jsonRawOrNil(row.AutoCreatedPv),
		Metadata:          jsonRawOrNil(row.Metadata),
		CreatedAt:         pgTimestamptzToTime(row.CreatedAt),
		UpdatedAt:         pgTimestamptzToTime(row.UpdatedAt),
	}
	if row.ApprovalStage != nil {
		grn.ApprovalStage = int(*row.ApprovalStage)
		grn.CurrentStage = int(*row.ApprovalStage)
	}
	if row.AutomationUsed != nil {
		grn.AutomationUsed = *row.AutomationUsed
	}
	if len(row.Items) > 0 {
		_ = json.Unmarshal(row.Items, &grn.Items)
	}
	if len(row.QualityIssues) > 0 {
		_ = json.Unmarshal(row.QualityIssues, &grn.QualityIssues)
	}
	if len(row.ApprovalHistory) > 0 {
		_ = json.Unmarshal(row.ApprovalHistory, &grn.ApprovalHistory)
	}
	if len(row.ActionHistory) > 0 {
		_ = json.Unmarshal(row.ActionHistory, &grn.ActionHistory)
	}
	return grn
}

// organizationFromSQLC converts a sqlc Organization row into a domain *models.Organization.
func organizationFromSQLC(row sqlc.Organization) *models.Organization {
	org := &models.Organization{
		ID:           row.ID,
		Name:         row.Name,
		Slug:         row.Slug,
		Description:  deref(row.Description),
		LogoURL:      deref(row.LogoUrl),
		Tagline:      deref(row.Tagline),
		PrimaryColor: deref(row.PrimaryColor),
		CreatedBy:    deref(row.CreatedBy),
		CreatedAt:    pgTimestamptzToTime(row.CreatedAt),
		UpdatedAt:    pgTimestamptzToTime(row.UpdatedAt),
	}
	if row.Active != nil {
		org.Active = *row.Active
	}
	return org
}

// IsNotFound reports whether err is a "no rows" error from pgx, allowing callers
// to distinguish missing records from other failure modes.
func IsNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

// Compile-time assertions to keep unused-import linters happy when types are
// referenced only via type conversions above.
var _ = types.RequisitionItem{}
