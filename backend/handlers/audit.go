package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/config"
	db "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/utils"
)

func auditRowToMap(row db.AuditLog) map[string]interface{} {
	return map[string]interface{}{
		"id":             row.ID,
		"organizationId": row.OrganizationID,
		"documentId":     row.DocumentID,
		"documentType":   row.DocumentType,
		"userId":         row.UserID,
		"actorName":      row.ActorName,
		"actorRole":      row.ActorRole,
		"action":         row.Action,
		"details":        json.RawMessage(row.Details),
		"changes":        json.RawMessage(row.Changes),
		"createdAt":      row.CreatedAt.Time,
	}
}

// GetAuditLogs returns org-scoped audit logs with pagination and filtering
func GetAuditLogs(c *fiber.Ctx) error {
	orgID := c.Locals("organizationID").(string)

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	action := c.Query("action")
	documentType := c.Query("documentType")
	userID := c.Query("userId")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	ctx := c.Context()

	total, err := config.Queries.CountAuditLogs(ctx, db.CountAuditLogsParams{
		OrganizationID: orgID,
		Column2:        action,
		Column3:        documentType,
		Column4:        userID,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to count audit logs", err)
	}

	offset := int32((page - 1) * limit)
	rows, err := config.Queries.ListAuditLogs(ctx, db.ListAuditLogsParams{
		OrganizationID: orgID,
		Column2:        action,
		Column3:        documentType,
		Column4:        userID,
		Limit:          int32(limit),
		Offset:         offset,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch audit logs", err)
	}

	responses := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		responses = append(responses, auditRowToMap(row))
	}

	return utils.SendPaginatedSuccess(c, responses, "Audit logs retrieved successfully", page, limit, total)
}

// GetDocumentAuditLogs returns audit logs for a specific document (org-scoped)
func GetDocumentAuditLogs(c *fiber.Ctx) error {
	orgID := c.Locals("organizationID").(string)
	documentID := c.Params("documentId")
	if documentID == "" {
		return utils.SendBadRequestError(c, "Document ID is required")
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 100)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 100
	}

	ctx := c.Context()

	total, err := config.Queries.CountDocumentAuditLogs(ctx, db.CountDocumentAuditLogsParams{
		OrganizationID: orgID,
		DocumentID:     documentID,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to count audit logs", err)
	}

	offset := int32((page - 1) * limit)
	rows, err := config.Queries.ListDocumentAuditLogs(ctx, db.ListDocumentAuditLogsParams{
		OrganizationID: orgID,
		DocumentID:     documentID,
		Limit:          int32(limit),
		Offset:         offset,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch audit logs", err)
	}

	responses := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		responses = append(responses, auditRowToMap(row))
	}

	return utils.SendPaginatedSuccess(c, responses, "Document audit logs retrieved successfully", page, limit, total)
}

// GetDocumentAuditEvents returns audit events for a specific document by entityType + entityId query params.
func GetDocumentAuditEvents(c *fiber.Ctx) error {
	orgID := c.Locals("organizationID").(string)
	entityType := c.Query("entityType")
	entityID := c.Query("entityId")

	if entityType == "" || entityID == "" {
		return utils.SendBadRequestError(c, "entityType and entityId query parameters are required")
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 100)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 100
	}

	ctx := c.Context()

	total, err := config.Queries.CountAuditEvents(ctx, db.CountAuditEventsParams{
		OrganizationID: orgID,
		DocumentType:   entityType,
		DocumentID:     entityID,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to count audit events", err)
	}

	offset := int32((page - 1) * limit)
	rows, err := config.Queries.ListAuditEvents(ctx, db.ListAuditEventsParams{
		OrganizationID: orgID,
		DocumentType:   entityType,
		DocumentID:     entityID,
		Limit:          int32(limit),
		Offset:         offset,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch audit events", err)
	}

	responses := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		responses = append(responses, auditRowToMap(row))
	}

	return utils.SendPaginatedSuccess(c, responses, "Audit events retrieved successfully", page, limit, total)
}
