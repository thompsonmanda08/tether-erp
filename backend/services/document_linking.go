package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/logging"
)

// DocumentLink represents a relationship between two documents.
//
// Persisted in the `document_links` table. There is no sqlc binding for this
// table — it is not in the local migration set under
// backend/database/migrations/00001_core_schema.sql but is expected to exist
// in production. All CRUD on this table goes through raw config.PgxDB SQL.
type DocumentLink struct {
	ID            string    `json:"id"`
	SourceDocID   string    `json:"sourceDocId"`   // Parent document
	SourceDocType string    `json:"sourceDocType"` // requisition, budget, po, etc.
	TargetDocID   string    `json:"targetDocId"`   // Child document
	TargetDocType string    `json:"targetDocType"`
	LinkType      string    `json:"linkType"`             // creates, links_to, inherits_from
	Amount        float64   `json:"amount,omitempty"`     // For partial allocations
	Proportion    float64   `json:"proportion,omitempty"` // Percentage of parent
	Status        string    `json:"status"`               // active, inactive
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// DocumentLinkingService manages document relationships.
//
// Migrated off GORM: typed-document mutations use sqlc; the cross-document
// `document_links` table uses raw config.PgxDB SQL.
type DocumentLinkingService struct{}

// NewDocumentLinkingService creates a new document linking service.
//
// Constructor signature changed: takes no arguments. All DB access goes via
// config.Queries / config.PgxDB.
func NewDocumentLinkingService() *DocumentLinkingService {
	return &DocumentLinkingService{}
}

// ---------------------------------------------------------------------------
// document_links helpers (raw SQL — no sqlc binding)
// ---------------------------------------------------------------------------

func (dls *DocumentLinkingService) insertLink(ctx context.Context, l *DocumentLink) error {
	const q = `
		INSERT INTO document_links (
			id, source_doc_id, source_doc_type, target_doc_id, target_doc_type,
			link_type, amount, proportion, status, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`
	_, err := config.PgxDB.Exec(ctx, q,
		l.ID, l.SourceDocID, l.SourceDocType, l.TargetDocID, l.TargetDocType,
		l.LinkType, l.Amount, l.Proportion, l.Status, l.CreatedAt, l.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("document_linking: insert link: %w", err)
	}
	return nil
}

// findLink returns a single matching link, or (nil, nil) when nothing matches.
func (dls *DocumentLinkingService) findLink(ctx context.Context, sourceDocID, targetDocID, linkType string) (*DocumentLink, error) {
	const q = `
		SELECT id, source_doc_id, source_doc_type, target_doc_id, target_doc_type,
		       link_type, COALESCE(amount,0), COALESCE(proportion,0), status,
		       created_at, updated_at
		FROM document_links
		WHERE source_doc_id = $1 AND target_doc_id = $2 AND link_type = $3
		LIMIT 1
	`
	var l DocumentLink
	err := config.PgxDB.QueryRow(ctx, q, sourceDocID, targetDocID, linkType).Scan(
		&l.ID, &l.SourceDocID, &l.SourceDocType, &l.TargetDocID, &l.TargetDocType,
		&l.LinkType, &l.Amount, &l.Proportion, &l.Status, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("document_linking: find link: %w", err)
	}
	return &l, nil
}

// findLinkBy fetches a link by an arbitrary triple of (column, op, value)
// constraints. Used for the chain-walk lookups below.
func (dls *DocumentLinkingService) findLinkByTarget(ctx context.Context, targetDocID, targetDocType, linkType string) (*DocumentLink, error) {
	const q = `
		SELECT id, source_doc_id, source_doc_type, target_doc_id, target_doc_type,
		       link_type, COALESCE(amount,0), COALESCE(proportion,0), status,
		       created_at, updated_at
		FROM document_links
		WHERE target_doc_id = $1 AND target_doc_type = $2 AND link_type = $3
		LIMIT 1
	`
	var l DocumentLink
	err := config.PgxDB.QueryRow(ctx, q, targetDocID, targetDocType, linkType).Scan(
		&l.ID, &l.SourceDocID, &l.SourceDocType, &l.TargetDocID, &l.TargetDocType,
		&l.LinkType, &l.Amount, &l.Proportion, &l.Status, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("document_linking: find link by target: %w", err)
	}
	return &l, nil
}

func (dls *DocumentLinkingService) findLinkBySource(ctx context.Context, sourceDocID, sourceDocType, linkType string) (*DocumentLink, error) {
	const q = `
		SELECT id, source_doc_id, source_doc_type, target_doc_id, target_doc_type,
		       link_type, COALESCE(amount,0), COALESCE(proportion,0), status,
		       created_at, updated_at
		FROM document_links
		WHERE source_doc_id = $1 AND source_doc_type = $2 AND link_type = $3
		LIMIT 1
	`
	var l DocumentLink
	err := config.PgxDB.QueryRow(ctx, q, sourceDocID, sourceDocType, linkType).Scan(
		&l.ID, &l.SourceDocID, &l.SourceDocType, &l.TargetDocID, &l.TargetDocType,
		&l.LinkType, &l.Amount, &l.Proportion, &l.Status, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("document_linking: find link by source: %w", err)
	}
	return &l, nil
}

// ---------------------------------------------------------------------------
// Public API — link operations
// ---------------------------------------------------------------------------

// LinkRequisitionToBudget links a requisition to a budget allocation.
func (dls *DocumentLinkingService) LinkRequisitionToBudget(
	requisitionID, budgetID string,
	amount float64,
) error {
	ctx := context.Background()

	if _, err := config.Queries.GetRequisitionByID(ctx, sqlc.GetRequisitionByIDParams{ID: requisitionID}); err != nil {
		return fmt.Errorf("document_linking: requisition not found: %w", err)
	}

	budget, err := config.Queries.GetBudgetByID(ctx, sqlc.GetBudgetByIDParams{ID: budgetID})
	if err != nil {
		return fmt.Errorf("document_linking: budget not found: %w", err)
	}

	existing, err := dls.findLink(ctx, budgetID, requisitionID, "allocates_to")
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("document_linking: link already exists between budget and requisition")
	}

	totalBudget := decimal.Zero
	if budget.TotalBudget != nil {
		totalBudget = *budget.TotalBudget
	}

	proportion := 0.0
	if totalBudget.GreaterThan(decimal.Zero) {
		amt := decimal.NewFromFloat(amount)
		p, _ := amt.Div(totalBudget).Float64()
		proportion = p * 100
	}

	now := time.Now()
	link := &DocumentLink{
		ID:            uuid.New().String(),
		SourceDocID:   budgetID,
		SourceDocType: "budget",
		TargetDocID:   requisitionID,
		TargetDocType: "requisition",
		LinkType:      "allocates_to",
		Amount:        amount,
		Proportion:    proportion,
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := dls.insertLink(ctx, link); err != nil {
		return err
	}

	logging.WithFields(map[string]interface{}{
		"operation":      "link_requisition_to_budget",
		"requisition_id": requisitionID,
		"budget_id":      budgetID,
		"amount":         amount,
	}).Info("linked_requisition_to_budget")
	return nil
}

// LinkRequisitionToPurchaseOrder links a requisition to a PO.
func (dls *DocumentLinkingService) LinkRequisitionToPurchaseOrder(
	requisitionID, poID string,
) error {
	ctx := context.Background()

	req, err := config.Queries.GetRequisitionByID(ctx, sqlc.GetRequisitionByIDParams{ID: requisitionID})
	if err != nil {
		return fmt.Errorf("document_linking: requisition not found: %w", err)
	}

	po, err := config.Queries.GetPurchaseOrderByID(ctx, sqlc.GetPurchaseOrderByIDParams{ID: poID})
	if err != nil {
		return fmt.Errorf("document_linking: purchase order not found: %w", err)
	}

	existing, err := dls.findLink(ctx, requisitionID, poID, "creates")
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("document_linking: requisition already linked to this PO")
	}

	poTotal := 0.0
	if po.TotalAmount != nil {
		poTotal, _ = po.TotalAmount.Float64()
	}

	now := time.Now()
	link := &DocumentLink{
		ID:            uuid.New().String(),
		SourceDocID:   requisitionID,
		SourceDocType: "requisition",
		TargetDocID:   poID,
		TargetDocType: "po",
		LinkType:      "creates",
		Amount:        poTotal,
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := dls.insertLink(ctx, link); err != nil {
		return fmt.Errorf("document_linking: failed to link requisition to PO: %w", err)
	}

	// Update PO with requisition link via typed sqlc query.
	reqIDCopy := requisitionID
	reqDocNum := req.DocumentNumber
	if err := config.Queries.UpdatePOLinkedRequisition(ctx, sqlc.UpdatePOLinkedRequisitionParams{
		ID:                      poID,
		LinkedRequisition:       &reqIDCopy,
		SourceRequisitionID:     &reqIDCopy,
		SourceRequisitionNumber: &reqDocNum,
	}); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":      "update_po_with_requisition_link",
			"po_id":          poID,
			"requisition_id": requisitionID,
		}).WithError(err).Warn("failed_to_update_po_with_requisition_link")
	}

	logging.WithFields(map[string]interface{}{
		"operation":      "link_requisition_to_purchase_order",
		"requisition_id": requisitionID,
		"po_id":          poID,
	}).Info("linked_requisition_to_purchase_order")
	return nil
}

// LinkPurchaseOrderToPaymentVoucher links a PO to a payment voucher.
func (dls *DocumentLinkingService) LinkPurchaseOrderToPaymentVoucher(
	poID, pvID string,
	amount float64,
) error {
	ctx := context.Background()

	po, err := config.Queries.GetPurchaseOrderByID(ctx, sqlc.GetPurchaseOrderByIDParams{ID: poID})
	if err != nil {
		return fmt.Errorf("document_linking: purchase order not found: %w", err)
	}

	if _, err := config.Queries.GetPaymentVoucherByID(ctx, sqlc.GetPaymentVoucherByIDParams{ID: pvID}); err != nil {
		return fmt.Errorf("document_linking: payment voucher not found: %w", err)
	}

	poTotal := 0.0
	if po.TotalAmount != nil {
		poTotal, _ = po.TotalAmount.Float64()
	}

	proportion := 0.0
	if poTotal > 0 {
		proportion = (amount / poTotal) * 100
	}

	now := time.Now()
	link := &DocumentLink{
		ID:            uuid.New().String(),
		SourceDocID:   poID,
		SourceDocType: "po",
		TargetDocID:   pvID,
		TargetDocType: "pv",
		LinkType:      "creates_payment_for",
		Amount:        amount,
		Proportion:    proportion,
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := dls.insertLink(ctx, link); err != nil {
		return fmt.Errorf("document_linking: failed to link PO to payment voucher: %w", err)
	}

	// Update PV with PO link via typed sqlc query.
	poDocNum := po.DocumentNumber
	if err := config.Queries.UpdatePVLinkedPO(ctx, sqlc.UpdatePVLinkedPOParams{
		ID:                        pvID,
		LinkedPo:                  &poDocNum,
		SourcePurchaseOrderNumber: &poDocNum,
	}); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "update_pv_with_po_link",
			"pv_id":     pvID,
			"po_id":     poID,
		}).WithError(err).Warn("failed_to_update_pv_with_po_link")
	}

	logging.WithFields(map[string]interface{}{
		"operation": "link_purchase_order_to_payment_voucher",
		"po_id":     poID,
		"pv_id":     pvID,
		"amount":    amount,
	}).Info("linked_purchase_order_to_payment_voucher")
	return nil
}

// LinkPurchaseOrderToGRN links a PO (looked up by document number) to a GRN.
func (dls *DocumentLinkingService) LinkPurchaseOrderToGRN(
	poDocumentNumber, grnID string,
) error {
	ctx := context.Background()

	// We need an organization to scope the lookup; the GRN gives us that.
	grn, err := config.Queries.GetGRNByID(ctx, sqlc.GetGRNByIDParams{ID: grnID})
	if err != nil {
		return fmt.Errorf("document_linking: GRN not found: %w", err)
	}

	po, err := config.Queries.GetPurchaseOrderByNumber(ctx, sqlc.GetPurchaseOrderByNumberParams{
		OrganizationID: grn.OrganizationID,
		DocumentNumber: poDocumentNumber,
	})
	if err != nil {
		return fmt.Errorf("document_linking: purchase order not found: %w", err)
	}

	poTotal := 0.0
	if po.TotalAmount != nil {
		poTotal, _ = po.TotalAmount.Float64()
	}

	now := time.Now()
	link := &DocumentLink{
		ID:            uuid.New().String(),
		SourceDocID:   po.ID,
		SourceDocType: "po",
		TargetDocID:   grnID,
		TargetDocType: "grn",
		LinkType:      "fulfilled_by",
		Amount:        poTotal,
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := dls.insertLink(ctx, link); err != nil {
		return fmt.Errorf("document_linking: failed to link PO to GRN: %w", err)
	}

	// Persist po_document_number on the GRN side via raw SQL (no sqlc binding
	// for this specific column-only update on goods_received_notes).
	const updateGRN = `
		UPDATE goods_received_notes
		SET po_document_number = $2, updated_at = NOW()
		WHERE id = $1
	`
	if _, err := config.PgxDB.Exec(ctx, updateGRN, grnID, po.DocumentNumber); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":          "update_grn_with_po_number",
			"grn_id":             grnID,
			"po_document_number": po.DocumentNumber,
		}).WithError(err).Warn("failed_to_update_grn_with_po_number")
	}

	logging.WithFields(map[string]interface{}{
		"operation":          "link_purchase_order_to_grn",
		"po_id":              po.ID,
		"grn_id":             grnID,
		"po_document_number": po.DocumentNumber,
	}).Info("linked_purchase_order_to_grn")
	return nil
}

// LinkGRNToPaymentVoucher links a GRN to a PV (goods-first flow).
func (dls *DocumentLinkingService) LinkGRNToPaymentVoucher(grnID, pvID string) error {
	ctx := context.Background()

	if _, err := config.Queries.GetGRNByID(ctx, sqlc.GetGRNByIDParams{ID: grnID}); err != nil {
		return fmt.Errorf("document_linking: GRN not found: %w", err)
	}

	pv, err := config.Queries.GetPaymentVoucherByID(ctx, sqlc.GetPaymentVoucherByIDParams{ID: pvID})
	if err != nil {
		return fmt.Errorf("document_linking: payment voucher not found: %w", err)
	}

	pvAmount := 0.0
	if pv.Amount != nil {
		pvAmount, _ = pv.Amount.Float64()
	}

	now := time.Now()
	link := &DocumentLink{
		ID:            uuid.New().String(),
		SourceDocID:   grnID,
		SourceDocType: "grn",
		TargetDocID:   pvID,
		TargetDocType: "payment_voucher",
		LinkType:      "funded_by",
		Amount:        pvAmount,
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := dls.insertLink(ctx, link); err != nil {
		return fmt.Errorf("document_linking: failed to link GRN to payment voucher: %w", err)
	}

	// Wire the typed cross-link too: PV.linked_grn = GRN.document_number.
	grnDocNum := pv.SourceRequisitionNumber // placeholder set; re-fetch GRN for doc number
	_ = grnDocNum
	grnRow, err := config.Queries.GetGRNByID(ctx, sqlc.GetGRNByIDParams{ID: grnID})
	if err == nil {
		docNum := grnRow.DocumentNumber
		if err := config.Queries.UpdatePVLinkedGRN(ctx, sqlc.UpdatePVLinkedGRNParams{
			ID:        pvID,
			LinkedGrn: &docNum,
		}); err != nil {
			logging.WithFields(map[string]interface{}{
				"operation": "update_pv_linked_grn",
				"pv_id":     pvID,
				"grn_id":    grnID,
			}).WithError(err).Warn("failed_to_update_pv_with_grn_link")
		}
	}

	logging.WithFields(map[string]interface{}{
		"operation": "link_grn_to_payment_voucher",
		"grn_id":    grnID,
		"pv_id":     pvID,
	}).Info("linked_grn_to_payment_voucher")
	return nil
}

// LinkPaymentVoucherToGRN links a PV to a GRN (payment-first flow).
func (dls *DocumentLinkingService) LinkPaymentVoucherToGRN(pvID, grnID string) error {
	ctx := context.Background()

	pv, err := config.Queries.GetPaymentVoucherByID(ctx, sqlc.GetPaymentVoucherByIDParams{ID: pvID})
	if err != nil {
		return fmt.Errorf("document_linking: payment voucher not found: %w", err)
	}

	if _, err := config.Queries.GetGRNByID(ctx, sqlc.GetGRNByIDParams{ID: grnID}); err != nil {
		return fmt.Errorf("document_linking: GRN not found: %w", err)
	}

	pvAmount := 0.0
	if pv.Amount != nil {
		pvAmount, _ = pv.Amount.Float64()
	}

	now := time.Now()
	link := &DocumentLink{
		ID:            uuid.New().String(),
		SourceDocID:   pvID,
		SourceDocType: "payment_voucher",
		TargetDocID:   grnID,
		TargetDocType: "grn",
		LinkType:      "confirmed_by",
		Amount:        pvAmount,
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := dls.insertLink(ctx, link); err != nil {
		return fmt.Errorf("document_linking: failed to link payment voucher to GRN: %w", err)
	}

	// Wire the typed cross-link: GRN.linked_pv = PV.document_number.
	pvDocNum := pv.DocumentNumber
	if err := config.Queries.UpdateGRNLinkedPV(ctx, sqlc.UpdateGRNLinkedPVParams{
		ID:       grnID,
		LinkedPv: &pvDocNum,
	}); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "update_grn_linked_pv",
			"grn_id":    grnID,
			"pv_id":     pvID,
		}).WithError(err).Warn("failed_to_update_grn_with_pv_link")
	}

	logging.WithFields(map[string]interface{}{
		"operation": "link_payment_voucher_to_grn",
		"pv_id":     pvID,
		"grn_id":    grnID,
	}).Info("linked_payment_voucher_to_grn")
	return nil
}

// GetLinkedDocuments returns all linked documents (active) for a given document.
func (dls *DocumentLinkingService) GetLinkedDocuments(
	documentID, docType string,
) ([]DocumentLink, error) {
	ctx := context.Background()

	const outgoing = `
		SELECT id, source_doc_id, source_doc_type, target_doc_id, target_doc_type,
		       link_type, COALESCE(amount,0), COALESCE(proportion,0), status,
		       created_at, updated_at
		FROM document_links
		WHERE source_doc_id = $1 AND source_doc_type = $2 AND status = 'active'
	`
	const incoming = `
		SELECT id, source_doc_id, source_doc_type, target_doc_id, target_doc_type,
		       link_type, COALESCE(amount,0), COALESCE(proportion,0), status,
		       created_at, updated_at
		FROM document_links
		WHERE target_doc_id = $1 AND target_doc_type = $2 AND status = 'active'
	`

	scan := func(rows pgx.Rows) ([]DocumentLink, error) {
		defer rows.Close()
		var out []DocumentLink
		for rows.Next() {
			var l DocumentLink
			if err := rows.Scan(
				&l.ID, &l.SourceDocID, &l.SourceDocType, &l.TargetDocID, &l.TargetDocType,
				&l.LinkType, &l.Amount, &l.Proportion, &l.Status, &l.CreatedAt, &l.UpdatedAt,
			); err != nil {
				return nil, err
			}
			out = append(out, l)
		}
		return out, rows.Err()
	}

	rows, err := config.PgxDB.Query(ctx, outgoing, documentID, docType)
	if err != nil {
		return nil, fmt.Errorf("document_linking: list outgoing links: %w", err)
	}
	links, err := scan(rows)
	if err != nil {
		return nil, fmt.Errorf("document_linking: scan outgoing links: %w", err)
	}

	rows2, err := config.PgxDB.Query(ctx, incoming, documentID, docType)
	if err != nil {
		return nil, fmt.Errorf("document_linking: list incoming links: %w", err)
	}
	incomingLinks, err := scan(rows2)
	if err != nil {
		return nil, fmt.Errorf("document_linking: scan incoming links: %w", err)
	}

	links = append(links, incomingLinks...)
	return links, nil
}

// GetDocumentRelationshipChain returns the full chain from requisition to payment.
func (dls *DocumentLinkingService) GetDocumentRelationshipChain(
	requisitionID string,
) (map[string]interface{}, error) {
	ctx := context.Background()

	chain := map[string]interface{}{
		"requisitionId": requisitionID,
		"documents":     []map[string]interface{}{},
	}

	if _, err := config.Queries.GetRequisitionByID(ctx, sqlc.GetRequisitionByIDParams{ID: requisitionID}); err != nil {
		return nil, fmt.Errorf("document_linking: requisition not found: %w", err)
	}

	// Linked budget (incoming "allocates_to" link).
	budgetLink, err := dls.findLinkByTarget(ctx, requisitionID, "requisition", "allocates_to")
	if err == nil && budgetLink != nil {
		if budget, err := config.Queries.GetBudgetByID(ctx, sqlc.GetBudgetByIDParams{ID: budgetLink.SourceDocID}); err == nil {
			chain["budgetId"] = budget.ID
			chain["budgetCode"] = budget.BudgetCode
		}
	}

	// Linked PO (outgoing "creates" link).
	poLink, err := dls.findLinkBySource(ctx, requisitionID, "requisition", "creates")
	if err == nil && poLink != nil {
		if po, err := config.Queries.GetPurchaseOrderByID(ctx, sqlc.GetPurchaseOrderByIDParams{ID: poLink.TargetDocID}); err == nil {
			chain["poId"] = po.ID
			chain["poDocumentNumber"] = po.DocumentNumber
		}
	}

	// Linked GRN if PO exists (outgoing "fulfilled_by" link from the PO).
	if poID, ok := chain["poId"].(string); ok && poID != "" {
		grnLink, err := dls.findLinkBySource(ctx, poID, "po", "fulfilled_by")
		if err == nil && grnLink != nil {
			if grn, err := config.Queries.GetGRNByID(ctx, sqlc.GetGRNByIDParams{ID: grnLink.TargetDocID}); err == nil {
				chain["grnId"] = grn.ID
				chain["grnDocumentNumber"] = grn.DocumentNumber
			}
		}
	}

	return chain, nil
}

// UnlinkDocuments removes a link between two documents.
func (dls *DocumentLinkingService) UnlinkDocuments(
	sourceDocID, targetDocID string,
) error {
	ctx := context.Background()

	const q = `DELETE FROM document_links WHERE source_doc_id = $1 AND target_doc_id = $2`
	if _, err := config.PgxDB.Exec(ctx, q, sourceDocID, targetDocID); err != nil {
		return fmt.Errorf("document_linking: failed to unlink documents: %w", err)
	}

	logging.WithFields(map[string]interface{}{
		"operation":     "unlink_documents",
		"source_doc_id": sourceDocID,
		"target_doc_id": targetDocID,
	}).Info("unlinked_document_from_document")
	return nil
}

// GetLinkStatistics returns statistics about document links.
func (dls *DocumentLinkingService) GetLinkStatistics() (map[string]interface{}, error) {
	ctx := context.Background()

	var totalLinks int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM document_links WHERE status = 'active'`,
	).Scan(&totalLinks); err != nil {
		return nil, fmt.Errorf("document_linking: count active links: %w", err)
	}

	rows, err := config.PgxDB.Query(ctx,
		`SELECT link_type, COUNT(*) AS count FROM document_links
		 WHERE status = 'active' GROUP BY link_type`,
	)
	if err != nil {
		return nil, fmt.Errorf("document_linking: group by link_type: %w", err)
	}
	defer rows.Close()

	byType := []map[string]interface{}{}
	for rows.Next() {
		var (
			lt    string
			count int64
		)
		if err := rows.Scan(&lt, &count); err != nil {
			return nil, fmt.Errorf("document_linking: scan link_type group: %w", err)
		}
		byType = append(byType, map[string]interface{}{
			"link_type": lt,
			"count":     count,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("document_linking: iterate link_type groups: %w", err)
	}

	return map[string]interface{}{
		"totalLinks": totalLinks,
		"byType":     byType,
	}, nil
}
