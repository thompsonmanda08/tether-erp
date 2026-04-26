package utils

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
)

// SyncDocument fetches the latest entity data and upserts it into the generic
// documents table. Safe to call as a goroutine after any entity mutation.
// Errors are logged but not propagated.
func SyncDocument(entityType, entityID string) {
	ctx := context.Background()
	if err := syncDocument(ctx, strings.ToUpper(entityType), entityID); err != nil {
		log.Printf("[document_sync] failed to sync %s %s: %v", entityType, entityID, err)
	}
}

func syncDocument(ctx context.Context, entityType, entityID string) error {
	switch entityType {
	case "REQUISITION":
		return syncRequisition(ctx, entityID)
	case "PURCHASE_ORDER":
		return syncPurchaseOrder(ctx, entityID)
	case "PAYMENT_VOUCHER":
		return syncPaymentVoucher(ctx, entityID)
	case "GRN":
		return syncGRN(ctx, entityID)
	case "BUDGET":
		return syncBudget(ctx, entityID)
	default:
		return nil
	}
}

type docFields struct {
	OrganizationID string
	DocumentType   string
	DocumentNumber string
	Title          string
	Status         string
	Amount         *float64
	Currency       *string
	Department     *string
	CreatedBy      string
	Data           []byte
	CreatedAt      time.Time
}

// upsertDocument performs an atomic upsert keyed by document_number.
func upsertDocument(ctx context.Context, d docFields) error {
	var existingID uuid.UUID
	var existingCreatedAt time.Time
	err := config.PgxDB.QueryRow(ctx,
		`SELECT id, created_at FROM documents WHERE document_number = $1 AND deleted_at IS NULL`,
		d.DocumentNumber,
	).Scan(&existingID, &existingCreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		_, err := config.PgxDB.Exec(ctx, `
			INSERT INTO documents (
				id, organization_id, document_type, document_number, title, status,
				amount, currency, department, created_by, data, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		`,
			uuid.New(), d.OrganizationID, d.DocumentType, d.DocumentNumber, d.Title, d.Status,
			d.Amount, d.Currency, d.Department, d.CreatedBy, d.Data, d.CreatedAt, time.Now(),
		)
		return err
	}
	if err != nil {
		return err
	}
	_, err = config.PgxDB.Exec(ctx, `
		UPDATE documents SET
			organization_id = $2,
			document_type   = $3,
			title           = $4,
			status          = $5,
			amount          = $6,
			currency        = $7,
			department      = $8,
			created_by      = $9,
			data            = $10,
			updated_at      = $11
		WHERE id = $1
	`,
		existingID, d.OrganizationID, d.DocumentType, d.Title, d.Status,
		d.Amount, d.Currency, d.Department, d.CreatedBy, d.Data, time.Now(),
	)
	return err
}

func syncRequisition(ctx context.Context, id string) error {
	var (
		orgID, docNum, title, status, currency, requesterID string
		description, department                             *string
		totalAmount                                         float64
		items                                               []byte
		categoryID, preferredVendorID                       *string
		approvalStage                                       int32
		priority                                            string
		isEstimate                                          bool
		createdAt                                           time.Time
	)
	err := config.PgxDB.QueryRow(ctx, `
		SELECT organization_id, document_number, title, status, currency, requester_id,
		       description, department, total_amount, items, category_id, preferred_vendor_id,
		       approval_stage, priority, is_estimate, created_at
		FROM requisitions WHERE id = $1`, id).
		Scan(&orgID, &docNum, &title, &status, &currency, &requesterID,
			&description, &department, &totalAmount, &items, &categoryID, &preferredVendorID,
			&approvalStage, &priority, &isEstimate, &createdAt)
	if err != nil {
		return err
	}

	data, _ := json.Marshal(map[string]interface{}{
		"id":                id,
		"documentNumber":    docNum,
		"items":             json.RawMessage(items),
		"priority":          priority,
		"categoryId":        categoryID,
		"preferredVendorId": preferredVendorID,
		"isEstimate":        isEstimate,
		"approvalStage":     approvalStage,
	})

	d := docFields{
		OrganizationID: orgID,
		DocumentType:   "REQUISITION",
		DocumentNumber: docNum,
		Title:          title,
		Status:         status,
		Amount:         &totalAmount,
		Currency:       &currency,
		Department:     department,
		CreatedBy:      requesterID,
		Data:           data,
		CreatedAt:      createdAt,
	}
	if description != nil && *description != "" {
		// description already a *string, no extra work
	}
	return upsertDocument(ctx, d)
}

func syncPurchaseOrder(ctx context.Context, id string) error {
	var (
		orgID, docNum, status, currency string
		title                           *string
		vendorID                        *string
		totalAmount                     float64
		deliveryDate                    *time.Time
		linkedRequisition               *string
		approvalStage                   int32
		items                           []byte
		createdAt                       time.Time
	)
	err := config.PgxDB.QueryRow(ctx, `
		SELECT organization_id, document_number, status, currency, title, vendor_id,
		       total_amount, delivery_date, linked_requisition, approval_stage, items, created_at
		FROM purchase_orders WHERE id = $1`, id).
		Scan(&orgID, &docNum, &status, &currency, &title, &vendorID,
			&totalAmount, &deliveryDate, &linkedRequisition, &approvalStage, &items, &createdAt)
	if err != nil {
		return err
	}

	titleStr := "Purchase Order " + docNum
	if title != nil && *title != "" {
		titleStr = *title
	}

	data, _ := json.Marshal(map[string]interface{}{
		"id":                id,
		"documentNumber":    docNum,
		"vendorId":          vendorID,
		"items":             json.RawMessage(items),
		"deliveryDate":      deliveryDate,
		"linkedRequisition": linkedRequisition,
		"approvalStage":     approvalStage,
	})

	return upsertDocument(ctx, docFields{
		OrganizationID: orgID,
		DocumentType:   "PURCHASE_ORDER",
		DocumentNumber: docNum,
		Title:          titleStr,
		Status:         status,
		Amount:         &totalAmount,
		Currency:       &currency,
		CreatedBy:      "system",
		Data:           data,
		CreatedAt:      createdAt,
	})
}

func syncPaymentVoucher(ctx context.Context, id string) error {
	var (
		orgID, docNum, status, currency string
		vendorID                        *string
		invoiceNumber, paymentMethod    *string
		glCode                          *string
		linkedPO                        *string
		amount                          float64
		approvalStage                   int32
		description                     *string
		createdAt                       time.Time
	)
	err := config.PgxDB.QueryRow(ctx, `
		SELECT organization_id, document_number, status, currency, vendor_id,
		       invoice_number, payment_method, gl_code, linked_po, amount,
		       approval_stage, description, created_at
		FROM payment_vouchers WHERE id = $1`, id).
		Scan(&orgID, &docNum, &status, &currency, &vendorID,
			&invoiceNumber, &paymentMethod, &glCode, &linkedPO, &amount,
			&approvalStage, &description, &createdAt)
	if err != nil {
		return err
	}

	data, _ := json.Marshal(map[string]interface{}{
		"id":             id,
		"documentNumber": docNum,
		"vendorId":       vendorID,
		"invoiceNumber":  invoiceNumber,
		"paymentMethod":  paymentMethod,
		"glCode":         glCode,
		"linkedPO":       linkedPO,
		"approvalStage":  approvalStage,
	})

	return upsertDocument(ctx, docFields{
		OrganizationID: orgID,
		DocumentType:   "PAYMENT_VOUCHER",
		DocumentNumber: docNum,
		Title:          "Payment Voucher " + docNum,
		Status:         status,
		Amount:         &amount,
		Currency:       &currency,
		CreatedBy:      "system",
		Data:           data,
		CreatedAt:      createdAt,
	})
}

func syncGRN(ctx context.Context, id string) error {
	var (
		orgID, docNum, status string
		poDocumentNumber      *string
		receivedBy            string
		receivedDate          time.Time
		approvalStage         int32
		items                 []byte
		notes                 *string
		createdAt             time.Time
	)
	err := config.PgxDB.QueryRow(ctx, `
		SELECT organization_id, document_number, status, po_document_number, received_by,
		       received_date, approval_stage, items, notes, created_at
		FROM goods_received_notes WHERE id = $1`, id).
		Scan(&orgID, &docNum, &status, &poDocumentNumber, &receivedBy,
			&receivedDate, &approvalStage, &items, &notes, &createdAt)
	if err != nil {
		return err
	}

	title := "Goods Received Note " + docNum
	if notes != nil && *notes != "" {
		title = *notes
	}

	data, _ := json.Marshal(map[string]interface{}{
		"id":               id,
		"documentNumber":   docNum,
		"poDocumentNumber": poDocumentNumber,
		"items":            json.RawMessage(items),
		"receivedDate":     receivedDate,
		"receivedBy":       receivedBy,
		"approvalStage":    approvalStage,
	})

	return upsertDocument(ctx, docFields{
		OrganizationID: orgID,
		DocumentType:   "GRN",
		DocumentNumber: docNum,
		Title:          title,
		Status:         status,
		CreatedBy:      receivedBy,
		Data:           data,
		CreatedAt:      createdAt,
	})
}

func syncBudget(ctx context.Context, id string) error {
	var (
		orgID, status                                 string
		budgetCode, fiscalYear                        *string
		ownerID                                       string
		totalBudget, allocatedAmount, remainingAmount float64
		approvalStage                                 int32
		department                                    *string
		createdAt                                     time.Time
	)
	err := config.PgxDB.QueryRow(ctx, `
		SELECT organization_id, status, budget_code, fiscal_year, owner_id,
		       total_budget, allocated_amount, remaining_amount, approval_stage,
		       department, created_at
		FROM budgets WHERE id = $1`, id).
		Scan(&orgID, &status, &budgetCode, &fiscalYear, &ownerID,
			&totalBudget, &allocatedAmount, &remainingAmount, &approvalStage,
			&department, &createdAt)
	if err != nil {
		return err
	}

	if budgetCode == nil || *budgetCode == "" {
		return nil
	}

	data, _ := json.Marshal(map[string]interface{}{
		"id":              id,
		"budgetCode":      *budgetCode,
		"fiscalYear":      fiscalYear,
		"totalBudget":     totalBudget,
		"allocatedAmount": allocatedAmount,
		"remainingAmount": remainingAmount,
		"approvalStage":   approvalStage,
	})

	title := *budgetCode
	if fiscalYear != nil {
		title = *budgetCode + " – " + *fiscalYear
	}

	return upsertDocument(ctx, docFields{
		OrganizationID: orgID,
		DocumentType:   "BUDGET",
		DocumentNumber: *budgetCode,
		Title:          title,
		Status:         status,
		Amount:         &totalBudget,
		Department:     department,
		CreatedBy:      ownerID,
		Data:           data,
		CreatedAt:      createdAt,
	})
}
