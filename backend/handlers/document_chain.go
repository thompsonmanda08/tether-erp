package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/services"
)

// GetDocumentChain retrieves the complete document chain for any workflow document.
// Supports: requisition, purchase_order, payment_voucher, grn.
func GetDocumentChain(c *fiber.Ctx) error {
	documentID := c.Params("id")
	if documentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Document ID is required",
		})
	}

	documentType := c.Query("documentType", "")
	if documentType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "documentType query parameter is required",
		})
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
		})
	}
	orgID := tenant.OrganizationID

	if err := verifyDocumentOwnership(c.Context(), documentID, documentType, orgID); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Document not found",
		})
	}

	// services.NewDocumentLinkingService no longer takes a *gorm.DB — it uses
	// config.Queries / config.PgxDB internally.
	dls := services.NewDocumentLinkingService()
	rawChain, err := dls.GetDocumentRelationshipChain(documentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to retrieve document chain",
			"error":   err.Error(),
		})
	}

	chain := buildDocumentChain(c.Context(), documentID, documentType, rawChain, orgID)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    chain,
	})
}

// verifyDocumentOwnership checks the document exists and belongs to the org.
// fasthttp.RequestCtx (returned by c.Context()) implements context.Context.
func verifyDocumentOwnership(ctx context.Context, documentID, documentType, orgID string) error {
	var table string
	switch strings.ToLower(documentType) {
	case "requisition":
		table = "requisitions"
	case "purchase_order", "purchase-order":
		table = "purchase_orders"
	case "payment_voucher", "payment-voucher":
		table = "payment_vouchers"
	case "grn", "goods_received_note":
		table = "goods_received_notes"
	default:
		return fiber.NewError(fiber.StatusBadRequest, "Invalid document type")
	}

	var foundID string
	q := "SELECT id FROM " + table + " WHERE id = $1 AND organization_id = $2 LIMIT 1"
	err := config.PgxDB.QueryRow(ctx, q, documentID, orgID).Scan(&foundID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("not found")
		}
		return err
	}
	return nil
}

// buildDocumentChain constructs the document chain response.
func buildDocumentChain(ctx context.Context, documentID, documentType string, rawChain fiber.Map, orgID string) fiber.Map {
	chain := fiber.Map{
		"documentId":   documentID,
		"documentType": documentType,
	}

	parentDocs := []fiber.Map{}

	if reqID, ok := rawChain["requisitionId"].(string); ok && reqID != "" && reqID != documentID {
		var docNum, status, title string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT document_number, COALESCE(status,''), COALESCE(title,'') FROM requisitions
			 WHERE id = $1 AND organization_id = $2`, reqID, orgID,
		).Scan(&docNum, &status, &title); err == nil {
			parentDocs = append(parentDocs, fiber.Map{
				"id":             reqID,
				"type":           "requisition",
				"documentNumber": docNum,
				"status":         status,
				"title":          title,
			})
		}
	}

	if poID, ok := rawChain["poId"].(string); ok && poID != "" && poID != documentID {
		var docNum, status string
		var vendorID *string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT document_number, COALESCE(status,''), vendor_id FROM purchase_orders
			 WHERE id = $1 AND organization_id = $2`, poID, orgID,
		).Scan(&docNum, &status, &vendorID); err == nil {
			vendorName := ""
			if vendorID != nil {
				_ = config.PgxDB.QueryRow(ctx,
					`SELECT name FROM vendors WHERE id = $1`, *vendorID,
				).Scan(&vendorName)
			}
			parentDocs = append(parentDocs, fiber.Map{
				"id":             poID,
				"type":           "purchase_order",
				"documentNumber": docNum,
				"status":         status,
				"vendorName":     vendorName,
			})
		}
	}

	if grnID, ok := rawChain["grnId"].(string); ok && grnID != "" && grnID != documentID {
		dt := strings.ToLower(documentType)
		if dt == "payment_voucher" || dt == "payment-voucher" {
			var docNum, status string
			if err := config.PgxDB.QueryRow(ctx,
				`SELECT document_number, COALESCE(status,'') FROM goods_received_notes
				 WHERE id = $1 AND organization_id = $2`, grnID, orgID,
			).Scan(&docNum, &status); err == nil {
				parentDocs = append(parentDocs, fiber.Map{
					"id":             grnID,
					"type":           "grn",
					"documentNumber": docNum,
					"status":         status,
				})
			}
		}
	}
	chain["parentDocuments"] = parentDocs

	childDocs := []fiber.Map{}

	dt := strings.ToLower(documentType)
	if dt == "requisition" || dt == "purchase_order" || dt == "purchase-order" {
		if grnID, ok := rawChain["grnId"].(string); ok && grnID != "" {
			var docNum, status string
			if err := config.PgxDB.QueryRow(ctx,
				`SELECT document_number, COALESCE(status,'') FROM goods_received_notes
				 WHERE id = $1 AND organization_id = $2`, grnID, orgID,
			).Scan(&docNum, &status); err == nil {
				childDocs = append(childDocs, fiber.Map{
					"id":             grnID,
					"type":           "grn",
					"documentNumber": docNum,
					"status":         status,
				})
			}
		}
	}

	if dt != "payment_voucher" && dt != "payment-voucher" {
		if poDocNum, ok := rawChain["poDocumentNumber"].(string); ok && poDocNum != "" {
			var pvID, pvDoc, pvStatus string
			var vendorID *string
			if err := config.PgxDB.QueryRow(ctx,
				`SELECT id, document_number, COALESCE(status,''), vendor_id FROM payment_vouchers
				 WHERE linked_po = $1 AND organization_id = $2 LIMIT 1`, poDocNum, orgID,
			).Scan(&pvID, &pvDoc, &pvStatus, &vendorID); err == nil {
				vendorName := ""
				if vendorID != nil {
					_ = config.PgxDB.QueryRow(ctx,
						`SELECT name FROM vendors WHERE id = $1`, *vendorID,
					).Scan(&vendorName)
				}
				childDocs = append(childDocs, fiber.Map{
					"id":             pvID,
					"type":           "payment_voucher",
					"documentNumber": pvDoc,
					"status":         pvStatus,
					"vendorName":     vendorName,
				})
			}
		}
	}
	chain["childDocuments"] = childDocs

	procurementFlow := "payment_first"
	for _, doc := range parentDocs {
		if t, ok := doc["type"].(string); ok && t == "grn" {
			procurementFlow = "goods_first"
			break
		}
	}
	chain["procurementFlow"] = procurementFlow

	if dt == "requisition" {
		routingType := "procurement"
		var conditions []byte
		err := config.PgxDB.QueryRow(ctx, `
			SELECT w.conditions
			  FROM workflow_assignments wa
			  JOIN workflows w ON w.id = wa.workflow_id
			 WHERE wa.entity_id = $1 AND wa.entity_type = 'requisition' AND wa.organization_id = $2
			 ORDER BY wa.created_at DESC LIMIT 1
		`, documentID, orgID).Scan(&conditions)
		if err == nil && len(conditions) > 0 {
			var wfConditions struct {
				RoutingType string `json:"routingType"`
			}
			if jsonErr := json.Unmarshal(conditions, &wfConditions); jsonErr == nil {
				if strings.EqualFold(wfConditions.RoutingType, "accounting") {
					routingType = "accounting"
				}
			}
		}
		chain["routingType"] = routingType
	}

	return chain
}
