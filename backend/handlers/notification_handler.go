package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tether-erp/config"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

type NotificationHandler struct {
	validate *validator.Validate
}

func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{
		validate: validator.New(),
	}
}

// Request/Response Types
type MarkAsReadRequest struct {
	NotificationIDs []string `json:"notificationIds" validate:"required,min=1"`
}

type NotificationStatsResponse struct {
	Pending int64 `json:"pending"`
	Read    int64 `json:"read"`
	Total   int64 `json:"total"`
}

// NotificationPreferencesRequest represents the request body for updating preferences
type NotificationPreferencesRequest struct {
	EmailEnabled           bool `json:"emailEnabled"`
	PushEnabled            bool `json:"pushEnabled"`
	InAppEnabled           bool `json:"inAppEnabled"`
	NotifyTaskAssigned     bool `json:"notifyTaskAssigned"`
	NotifyTaskReassigned   bool `json:"notifyTaskReassigned"`
	NotifyTaskApproved     bool `json:"notifyTaskApproved"`
	NotifyTaskRejected     bool `json:"notifyTaskRejected"`
	NotifyWorkflowComplete bool `json:"notifyWorkflowComplete"`
	NotifyApprovalOverdue  bool `json:"notifyApprovalOverdue"`
	NotifyCommentsAdded    bool `json:"notifyCommentsAdded"`
	QuietHoursEnabled      bool `json:"quietHoursEnabled"`
	QuietHoursStart        int  `json:"quietHoursStart"`
	QuietHoursEnd          int  `json:"quietHoursEnd"`
}

// scanNotificationRow scans a notifications row into a models.Notification.
// Columns expected (in order):
//   id, organization_id, recipient_id, type, document_id, document_type,
//   subject, body, sent, sent_at, entity_id, entity_type,
//   related_user_id, related_user_name, is_read, read_at,
//   importance, reassignment_reason, message,
//   created_at, updated_at
func scanNotificationRow(scan func(...interface{}) error) (models.Notification, error) {
	var (
		id                 pgtype.UUID
		orgID              string
		recipientID        string
		nType              string
		documentID         *string
		documentType       *string
		subject            string
		body               string
		sent               *bool
		sentAt             pgtype.Timestamptz
		entityID           *string
		entityType         *string
		relatedUserID      *string
		relatedUserName    *string
		isRead             *bool
		readAt             pgtype.Timestamptz
		importance         *string
		reassignmentReason *string
		message            *string
		createdAt          pgtype.Timestamptz
		updatedAt          pgtype.Timestamptz
	)
	if err := scan(
		&id, &orgID, &recipientID, &nType, &documentID, &documentType,
		&subject, &body, &sent, &sentAt, &entityID, &entityType,
		&relatedUserID, &relatedUserName, &isRead, &readAt,
		&importance, &reassignmentReason, &message,
		&createdAt, &updatedAt,
	); err != nil {
		return models.Notification{}, err
	}

	n := models.Notification{
		OrganizationID: orgID,
		RecipientID:    recipientID,
		Type:           nType,
		Subject:        subject,
		Body:           body,
	}
	if id.Valid {
		n.ID = uuid.UUID(id.Bytes).String()
	}
	if documentID != nil {
		n.DocumentID = *documentID
	}
	if documentType != nil {
		n.DocumentType = *documentType
	}
	if sent != nil {
		n.Sent = *sent
	}
	if sentAt.Valid {
		t := sentAt.Time
		n.SentAt = &t
	}
	if entityID != nil {
		n.EntityID = *entityID
	}
	if entityType != nil {
		n.EntityType = *entityType
	}
	if relatedUserID != nil {
		n.RelatedUserID = *relatedUserID
	}
	if relatedUserName != nil {
		n.RelatedUserName = *relatedUserName
	}
	if isRead != nil {
		n.IsRead = *isRead
	}
	if readAt.Valid {
		t := readAt.Time
		n.ReadAt = &t
	}
	if importance != nil {
		n.Importance = *importance
	}
	if reassignmentReason != nil {
		n.ReassignmentReason = *reassignmentReason
	}
	if message != nil {
		n.Message = *message
	}
	if createdAt.Valid {
		n.CreatedAt = createdAt.Time
	}
	if updatedAt.Valid {
		n.UpdatedAt = updatedAt.Time
	}
	return n, nil
}

const notificationSelectCols = `id, organization_id, recipient_id, type, document_id, document_type,
		subject, body, sent, sent_at, entity_id, entity_type,
		related_user_id, related_user_name, is_read, read_at,
		importance, reassignment_reason, message,
		created_at, updated_at`

// GetNotifications retrieves notifications for the current user with pagination and filtering
func (h *NotificationHandler) GetNotifications(c *fiber.Ctx) error {
	organizationIDRaw := c.Locals("organizationID")
	if organizationIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Organization context required"})
	}
	organizationID, ok := organizationIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid organization context"})
	}
	userIDRaw := c.Locals("userID")
	if userIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User context required"})
	}
	userID, ok := userIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user context"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	notificationType := c.Query("type", "")
	unreadOnly := c.Query("unread_only", "false") == "true"

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	ctx := c.Context()

	// Build dynamic WHERE
	args := []interface{}{organizationID, userID}
	where := "organization_id = $1 AND recipient_id = $2"
	if notificationType != "" {
		args = append(args, notificationType)
		where += " AND type = $3"
	}
	if unreadOnly {
		// is_read may be NULL → treat NULL as unread
		where += " AND COALESCE(is_read, false) = false"
	}

	// Count
	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM notifications WHERE "+where, args...).Scan(&total); err != nil {
		log.Printf("Error counting notifications: %v", err)
		return utils.SendInternalError(c, "Failed to count notifications", err)
	}

	// Fetch
	listSQL := "SELECT " + notificationSelectCols + " FROM notifications WHERE " + where +
		" ORDER BY created_at DESC LIMIT $" + strconv.Itoa(len(args)+1) +
		" OFFSET $" + strconv.Itoa(len(args)+2)
	args = append(args, limit, offset)
	rows, err := config.PgxDB.Query(ctx, listSQL, args...)
	if err != nil {
		log.Printf("Error fetching notifications: %v", err)
		return utils.SendInternalError(c, "Failed to fetch notifications", err)
	}
	defer rows.Close()

	var transformedNotifications []map[string]interface{}
	for rows.Next() {
		notification, err := scanNotificationRow(rows.Scan)
		if err != nil {
			log.Printf("Error scanning notification: %v", err)
			return utils.SendInternalError(c, "Failed to scan notification", err)
		}
		transformed := map[string]interface{}{
			"id":           notification.ID,
			"type":         notification.Type,
			"subject":      notification.Subject,
			"body":         notification.Body,
			"documentId":   notification.DocumentID,
			"documentType": notification.DocumentType,
			"entityId":     notification.DocumentID,
			"entityType":   notification.DocumentType,
			"isRead":       notification.IsRead,
			"readAt":       notification.ReadAt,
			"createdAt":    notification.CreatedAt,
			"updatedAt":    notification.UpdatedAt,
			"importance":   "MEDIUM",
			"message":      notification.Body,
		}

		switch notification.Type {
		case "approval_required":
			transformed["importance"] = "HIGH"
		case "document_rejected":
			transformed["importance"] = "HIGH"
		case "document_approved":
			transformed["importance"] = "MEDIUM"
		default:
			transformed["importance"] = "LOW"
		}

		if notification.DocumentID != "" && notification.DocumentType != "" {
			documentNumber := h.getDocumentNumber(ctx, notification.DocumentType, notification.DocumentID)
			if documentNumber != "" {
				transformed["entityNumber"] = documentNumber
			}
		}

		transformedNotifications = append(transformedNotifications, transformed)
	}
	if err := rows.Err(); err != nil {
		return utils.SendInternalError(c, "Failed to iterate notifications", err)
	}

	return utils.SendPaginatedSuccess(c, transformedNotifications, "Notifications retrieved successfully", page, limit, total)
}

// GetNotificationStats returns notification statistics for the current user
func (h *NotificationHandler) GetNotificationStats(c *fiber.Ctx) error {
	organizationIDRaw := c.Locals("organizationID")
	if organizationIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Organization context required"})
	}
	organizationID, ok := organizationIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid organization context"})
	}
	userIDRaw := c.Locals("userID")
	if userIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User context required"})
	}
	userID, ok := userIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user context"})
	}

	ctx := c.Context()
	var pendingCount, readCount, totalCount int64

	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE organization_id = $1 AND recipient_id = $2 AND COALESCE(is_read, false) = false`,
		organizationID, userID).Scan(&pendingCount); err != nil {
		log.Printf("Error counting pending notifications: %v", err)
	}
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE organization_id = $1 AND recipient_id = $2 AND COALESCE(is_read, false) = true`,
		organizationID, userID).Scan(&readCount); err != nil {
		log.Printf("Error counting read notifications: %v", err)
	}
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE organization_id = $1 AND recipient_id = $2`,
		organizationID, userID).Scan(&totalCount); err != nil {
		log.Printf("Error counting total notifications: %v", err)
	}

	stats := NotificationStatsResponse{
		Pending: pendingCount,
		Read:    readCount,
		Total:   totalCount,
	}

	return utils.SendSimpleSuccess(c, stats, "Notification statistics retrieved successfully")
}

// MarkAsRead marks one or more notifications as read
func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	var req MarkAsReadRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid request body",
			Message: "Failed to parse mark as read request",
		})
	}

	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
		})
	}

	ctx := c.Context()

	// Verify notifications belong to the user and organization
	var foundCount int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE id::text = ANY($1::text[]) AND organization_id = $2 AND recipient_id = $3`,
		req.NotificationIDs, organizationID, userID).Scan(&foundCount); err != nil {
		log.Printf("Error verifying notifications for mark as read: %v", err)
		return utils.SendInternalError(c, "Failed to verify notifications", err)
	}

	if int(foundCount) != len(req.NotificationIDs) {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid notifications",
			Message: "Some notifications not found or access denied",
		})
	}

	notificationService := services.NewNotificationService()
	if err := notificationService.MarkMultipleAsRead(req.NotificationIDs); err != nil {
		log.Printf("Error marking notifications as read: %v", err)
		return utils.SendInternalError(c, "Failed to mark notifications as read", err)
	}

	return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
		Message: "Notifications marked as read successfully",
		Data:    map[string]interface{}{"markedCount": len(req.NotificationIDs)},
	})
}

// MarkAllAsRead marks all unread notifications as read for the current user
func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	ctx := c.Context()

	// Get all unread notification IDs for the user
	rows, err := config.PgxDB.Query(ctx,
		`SELECT id FROM notifications WHERE organization_id = $1 AND recipient_id = $2 AND COALESCE(is_read, false) = false`,
		organizationID, userID)
	if err != nil {
		log.Printf("Error fetching unread notification IDs: %v", err)
		return utils.SendInternalError(c, "Failed to fetch unread notifications", err)
	}
	notificationIDs := []string{}
	for rows.Next() {
		var id pgtype.UUID
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return utils.SendInternalError(c, "Failed to scan notification id", err)
		}
		if id.Valid {
			notificationIDs = append(notificationIDs, uuid.UUID(id.Bytes).String())
		}
	}
	rows.Close()

	if len(notificationIDs) == 0 {
		return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
			Message: "No unread notifications to mark as read",
			Data:    map[string]interface{}{"markedCount": 0},
		})
	}

	notificationService := services.NewNotificationService()
	if err := notificationService.MarkMultipleAsRead(notificationIDs); err != nil {
		log.Printf("Error marking all notifications as read: %v", err)
		return utils.SendInternalError(c, "Failed to mark all notifications as read", err)
	}

	return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
		Message: "All notifications marked as read successfully",
		Data:    map[string]interface{}{"markedCount": len(notificationIDs)},
	})
}

// DeleteNotification deletes a notification
func (h *NotificationHandler) DeleteNotification(c *fiber.Ctx) error {
	notificationID := c.Params("id")
	if notificationID == "" {
		return utils.SendBadRequestError(c, "Notification ID is required")
	}

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	ctx := c.Context()

	// Verify notification belongs to the user
	var owned int
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE id = $1 AND organization_id = $2 AND recipient_id = $3`,
		notificationID, organizationID, userID).Scan(&owned); err != nil || owned == 0 {
		return utils.SendNotFoundError(c, "Notification not found or access denied")
	}

	notificationService := services.NewNotificationService()
	if err := notificationService.DeleteNotification(notificationID); err != nil {
		log.Printf("Error deleting notification: %v", err)
		return utils.SendInternalError(c, "Failed to delete notification", err)
	}

	return c.Status(fiber.StatusOK).JSON(types.SuccessResponse{
		Message: "Notification deleted successfully",
		Data:    map[string]interface{}{"deletedId": notificationID},
	})
}

// GetRecentNotifications returns the most recent notifications for header display
func (h *NotificationHandler) GetRecentNotifications(c *fiber.Ctx) error {
	organizationIDRaw := c.Locals("organizationID")
	if organizationIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Organization context required"})
	}
	organizationID, ok := organizationIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid organization context"})
	}
	userIDRaw := c.Locals("userID")
	if userIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User context required"})
	}
	userID, ok := userIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user context"})
	}

	ctx := c.Context()

	loadList := func(unread bool, limit int) ([]models.Notification, error) {
		readPredicate := "COALESCE(is_read, false) = false"
		if !unread {
			readPredicate = "COALESCE(is_read, false) = true"
		}
		sql := "SELECT " + notificationSelectCols + " FROM notifications WHERE organization_id = $1 AND recipient_id = $2 AND " +
			readPredicate + " ORDER BY created_at DESC LIMIT $3"
		rows, err := config.PgxDB.Query(ctx, sql, organizationID, userID, limit)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		out := []models.Notification{}
		for rows.Next() {
			n, err := scanNotificationRow(rows.Scan)
			if err != nil {
				return nil, err
			}
			out = append(out, n)
		}
		return out, rows.Err()
	}

	unreadNotifications, err := loadList(true, 10)
	if err != nil {
		log.Printf("Error fetching unread notifications: %v", err)
		return utils.SendInternalError(c, "Failed to fetch unread notifications", err)
	}
	readNotifications, err := loadList(false, 5)
	if err != nil {
		log.Printf("Error fetching read notifications: %v", err)
		return utils.SendInternalError(c, "Failed to fetch read notifications", err)
	}

	allNotifications := append(unreadNotifications, readNotifications...)
	var transformedNotifications []map[string]interface{}

	for _, notification := range allNotifications {
		transformed := map[string]interface{}{
			"id":           notification.ID,
			"type":         notification.Type,
			"subject":      notification.Subject,
			"body":         notification.Body,
			"message":      notification.Body,
			"documentId":   notification.DocumentID,
			"documentType": notification.DocumentType,
			"entityId":     notification.EntityID,
			"entityType":   notification.EntityType,
			"isRead":       notification.IsRead,
			"readAt":       notification.ReadAt,
			"createdAt":    notification.CreatedAt,
			"updatedAt":    notification.UpdatedAt,
			"importance":   "MEDIUM",
		}

		switch notification.Type {
		case "approval_required":
			transformed["importance"] = "HIGH"
		case "document_rejected":
			transformed["importance"] = "HIGH"
		case "document_approved":
			transformed["importance"] = "MEDIUM"
		default:
			transformed["importance"] = "LOW"
		}

		if notification.DocumentID != "" && notification.DocumentType != "" {
			documentNumber := h.getDocumentNumber(ctx, notification.DocumentType, notification.DocumentID)
			if documentNumber != "" {
				transformed["entityNumber"] = documentNumber
			}
		}

		transformedNotifications = append(transformedNotifications, transformed)
	}

	return utils.SendSimpleSuccess(c, transformedNotifications, "Recent notifications retrieved successfully")
}

// getDocumentNumber returns the document number for a given entity, looked up via
// raw pgx (no GORM). Returns "" if not found.
func (h *NotificationHandler) getDocumentNumber(ctx context.Context, documentType, documentID string) string {
	var table string
	switch documentType {
	case "requisition", "REQUISITION":
		table = "requisitions"
	case "purchase_order", "PURCHASE_ORDER":
		table = "purchase_orders"
	case "payment_voucher", "PAYMENT_VOUCHER":
		table = "payment_vouchers"
	case "grn", "GRN":
		table = "grns"
	default:
		return ""
	}

	var docNumber string
	if err := config.PgxDB.QueryRow(ctx,
		"SELECT document_number FROM "+table+" WHERE id = $1", documentID).Scan(&docNumber); err != nil {
		return ""
	}
	return docNumber
}

// GetNotificationPreferences retrieves notification preferences for the current user
func (h *NotificationHandler) GetNotificationPreferences(c *fiber.Ctx) error {
	organizationIDRaw := c.Locals("organizationID")
	if organizationIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Organization context required"})
	}
	organizationID, ok := organizationIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid organization context"})
	}
	userIDRaw := c.Locals("userID")
	if userIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User context required"})
	}
	userID, ok := userIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user context"})
	}

	ctx := c.Context()
	prefs, err := loadPreferences(ctx, userID, organizationID)
	if err == nil {
		return utils.SendSimpleSuccess(c, prefs, "Notification preferences retrieved successfully")
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		log.Printf("Error fetching notification preferences: %v", err)
		return utils.SendInternalError(c, "Failed to fetch notification preferences", err)
	}

	// Insert defaults
	defaults := models.NotificationPreferences{
		ID:                     uuid.New().String(),
		UserID:                 userID,
		OrganizationID:         organizationID,
		EmailEnabled:           false,
		PushEnabled:            true,
		InAppEnabled:           true,
		NotifyTaskAssigned:     true,
		NotifyTaskReassigned:   true,
		NotifyTaskApproved:     true,
		NotifyTaskRejected:     true,
		NotifyWorkflowComplete: true,
		NotifyApprovalOverdue:  true,
		NotifyCommentsAdded:    false,
		QuietHoursEnabled:      false,
		QuietHoursStart:        22,
		QuietHoursEnd:          8,
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
	}
	if err := upsertPreferences(ctx, &defaults); err != nil {
		log.Printf("Error creating default notification preferences: %v", err)
		return utils.SendInternalError(c, "Failed to create notification preferences", err)
	}

	return utils.SendSimpleSuccess(c, defaults, "Notification preferences retrieved successfully")
}

// UpdateNotificationPreferences updates notification preferences for the current user
func (h *NotificationHandler) UpdateNotificationPreferences(c *fiber.Ctx) error {
	organizationIDRaw := c.Locals("organizationID")
	if organizationIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Organization context required"})
	}
	organizationID, ok := organizationIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid organization context"})
	}
	userIDRaw := c.Locals("userID")
	if userIDRaw == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User context required"})
	}
	userID, ok := userIDRaw.(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user context"})
	}

	var req NotificationPreferencesRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid request body",
			Message: "Failed to parse notification preferences request",
		})
	}
	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
		})
	}
	if req.QuietHoursStart < 0 || req.QuietHoursStart > 23 {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid quiet hours start",
			Message: "Quiet hours start must be between 0 and 23",
		})
	}
	if req.QuietHoursEnd < 0 || req.QuietHoursEnd > 23 {
		return c.Status(fiber.StatusBadRequest).JSON(types.ErrorResponse{
			Error:   "Invalid quiet hours end",
			Message: "Quiet hours end must be between 0 and 23",
		})
	}

	ctx := c.Context()
	prefs, err := loadPreferences(ctx, userID, organizationID)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			log.Printf("Error fetching notification preferences: %v", err)
			return utils.SendInternalError(c, "Failed to fetch notification preferences", err)
		}
		prefs = &models.NotificationPreferences{
			ID:             uuid.New().String(),
			UserID:         userID,
			OrganizationID: organizationID,
			CreatedAt:      time.Now(),
		}
	}

	prefs.EmailEnabled = req.EmailEnabled
	prefs.PushEnabled = req.PushEnabled
	prefs.InAppEnabled = req.InAppEnabled
	prefs.NotifyTaskAssigned = req.NotifyTaskAssigned
	prefs.NotifyTaskReassigned = req.NotifyTaskReassigned
	prefs.NotifyTaskApproved = req.NotifyTaskApproved
	prefs.NotifyTaskRejected = req.NotifyTaskRejected
	prefs.NotifyWorkflowComplete = req.NotifyWorkflowComplete
	prefs.NotifyApprovalOverdue = req.NotifyApprovalOverdue
	prefs.NotifyCommentsAdded = req.NotifyCommentsAdded
	prefs.QuietHoursEnabled = req.QuietHoursEnabled
	prefs.QuietHoursStart = req.QuietHoursStart
	prefs.QuietHoursEnd = req.QuietHoursEnd
	prefs.UpdatedAt = time.Now()

	if err := upsertPreferences(ctx, prefs); err != nil {
		log.Printf("Error updating notification preferences: %v", err)
		return utils.SendInternalError(c, "Failed to update notification preferences", err)
	}

	return utils.SendSimpleSuccess(c, prefs, "Notification preferences updated successfully")
}

// loadPreferences fetches notification preferences via raw pgx. Returns pgx.ErrNoRows if missing.
func loadPreferences(ctx context.Context, userID, organizationID string) (*models.NotificationPreferences, error) {
	var (
		id                                                              pgtype.UUID
		emailEnabled, pushEnabled, inAppEnabled                         *bool
		notifyTaskAssigned, notifyTaskReassigned, notifyTaskApproved    *bool
		notifyTaskRejected, notifyWorkflowComplete, notifyApprovalOver  *bool
		notifyCommentsAdded                                             *bool
		quietHoursEnabled                                               *bool
		quietHoursStart, quietHoursEnd                                  *int32
		createdAt, updatedAt                                            pgtype.Timestamptz
	)
	err := config.PgxDB.QueryRow(ctx, `
		SELECT id, email_enabled, push_enabled, in_app_enabled,
		       notify_task_assigned, notify_task_reassigned, notify_task_approved,
		       notify_task_rejected, notify_workflow_complete, notify_approval_overdue,
		       notify_comments_added, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
		       created_at, updated_at
		FROM notification_preferences
		WHERE user_id = $1 AND organization_id = $2
	`, userID, organizationID).Scan(
		&id,
		&emailEnabled, &pushEnabled, &inAppEnabled,
		&notifyTaskAssigned, &notifyTaskReassigned, &notifyTaskApproved,
		&notifyTaskRejected, &notifyWorkflowComplete, &notifyApprovalOver,
		&notifyCommentsAdded, &quietHoursEnabled, &quietHoursStart, &quietHoursEnd,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}

	prefs := &models.NotificationPreferences{
		UserID:         userID,
		OrganizationID: organizationID,
	}
	if id.Valid {
		prefs.ID = uuid.UUID(id.Bytes).String()
	}
	prefs.EmailEnabled = boolValue(emailEnabled)
	prefs.PushEnabled = boolValue(pushEnabled)
	prefs.InAppEnabled = boolValue(inAppEnabled)
	prefs.NotifyTaskAssigned = boolValue(notifyTaskAssigned)
	prefs.NotifyTaskReassigned = boolValue(notifyTaskReassigned)
	prefs.NotifyTaskApproved = boolValue(notifyTaskApproved)
	prefs.NotifyTaskRejected = boolValue(notifyTaskRejected)
	prefs.NotifyWorkflowComplete = boolValue(notifyWorkflowComplete)
	prefs.NotifyApprovalOverdue = boolValue(notifyApprovalOver)
	prefs.NotifyCommentsAdded = boolValue(notifyCommentsAdded)
	prefs.QuietHoursEnabled = boolValue(quietHoursEnabled)
	if quietHoursStart != nil {
		prefs.QuietHoursStart = int(*quietHoursStart)
	}
	if quietHoursEnd != nil {
		prefs.QuietHoursEnd = int(*quietHoursEnd)
	}
	if createdAt.Valid {
		prefs.CreatedAt = createdAt.Time
	}
	if updatedAt.Valid {
		prefs.UpdatedAt = updatedAt.Time
	}
	return prefs, nil
}

// upsertPreferences inserts or updates a notification_preferences row.
func upsertPreferences(ctx context.Context, p *models.NotificationPreferences) error {
	// Use upsert keyed on (user_id, organization_id). The id column is uuid-typed; the
	// caller may pass a string id which we keep deterministic via ON CONFLICT.
	qhs := int32(p.QuietHoursStart)
	qhe := int32(p.QuietHoursEnd)
	_, err := config.PgxDB.Exec(ctx, `
		INSERT INTO notification_preferences (
			id, user_id, organization_id,
			email_enabled, push_enabled, in_app_enabled,
			notify_task_assigned, notify_task_reassigned, notify_task_approved,
			notify_task_rejected, notify_workflow_complete, notify_approval_overdue,
			notify_comments_added, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
			created_at, updated_at
		) VALUES (
			COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()), $2, $3,
			$4, $5, $6,
			$7, $8, $9,
			$10, $11, $12,
			$13, $14, $15, $16,
			$17, $18
		)
		ON CONFLICT (user_id, organization_id) DO UPDATE SET
			email_enabled = EXCLUDED.email_enabled,
			push_enabled = EXCLUDED.push_enabled,
			in_app_enabled = EXCLUDED.in_app_enabled,
			notify_task_assigned = EXCLUDED.notify_task_assigned,
			notify_task_reassigned = EXCLUDED.notify_task_reassigned,
			notify_task_approved = EXCLUDED.notify_task_approved,
			notify_task_rejected = EXCLUDED.notify_task_rejected,
			notify_workflow_complete = EXCLUDED.notify_workflow_complete,
			notify_approval_overdue = EXCLUDED.notify_approval_overdue,
			notify_comments_added = EXCLUDED.notify_comments_added,
			quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
			quiet_hours_start = EXCLUDED.quiet_hours_start,
			quiet_hours_end = EXCLUDED.quiet_hours_end,
			updated_at = EXCLUDED.updated_at
	`,
		p.ID, p.UserID, p.OrganizationID,
		p.EmailEnabled, p.PushEnabled, p.InAppEnabled,
		p.NotifyTaskAssigned, p.NotifyTaskReassigned, p.NotifyTaskApproved,
		p.NotifyTaskRejected, p.NotifyWorkflowComplete, p.NotifyApprovalOverdue,
		p.NotifyCommentsAdded, p.QuietHoursEnabled, qhs, qhe,
		p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func boolValue(p *bool) bool {
	if p == nil {
		return false
	}
	return *p
}

// avoid unused import warnings if json drift later
var _ = json.RawMessage(nil)
