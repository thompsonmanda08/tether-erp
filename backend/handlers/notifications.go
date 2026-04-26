package handlers

import (
	"errors"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tether-erp/config"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

// GetNotifications returns notifications for the authenticated user
func GetNotifications(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	notifType := c.Query("type")
	unreadOnly := c.Query("unreadOnly") == "true"

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	notificationService := services.NewNotificationService()

	var notifications []interface{}
	var total int64

	if unreadOnly {
		notifs, err := notificationService.GetPendingNotifications(userID)
		if err != nil {
			log.Printf("Error getting pending notifications: %v", err)
			return utils.SendInternalError(c, "Failed to fetch notifications", err)
		}
		for _, notif := range notifs {
			notifications = append(notifications, map[string]interface{}{
				"id":           notif.ID,
				"type":         notif.Type,
				"documentId":   notif.DocumentID,
				"documentType": notif.DocumentType,
				"subject":      notif.Subject,
				"body":         notif.Body,
				"sent":         notif.Sent,
				"sentAt":       notif.SentAt,
				"createdAt":    notif.CreatedAt,
				"updatedAt":    notif.UpdatedAt,
			})
		}
		total = int64(len(notifications))
	} else if notifType != "" {
		notifs, err := notificationService.GetNotificationsByType(userID, notifType)
		if err != nil {
			log.Printf("Error getting notifications by type: %v", err)
			return utils.SendInternalError(c, "Failed to fetch notifications", err)
		}
		for _, notif := range notifs {
			notifications = append(notifications, map[string]interface{}{
				"id":           notif.ID,
				"type":         notif.Type,
				"documentId":   notif.DocumentID,
				"documentType": notif.DocumentType,
				"subject":      notif.Subject,
				"body":         notif.Body,
				"sent":         notif.Sent,
				"sentAt":       notif.SentAt,
				"createdAt":    notif.CreatedAt,
				"updatedAt":    notif.UpdatedAt,
			})
		}
		total = int64(len(notifications))
	} else {
		since := time.Now().AddDate(0, -1, 0)
		if sinceStr := c.Query("since"); sinceStr != "" {
			if parsedSince, err := time.Parse(time.RFC3339, sinceStr); err == nil {
				since = parsedSince
			}
		}

		notifs, err := notificationService.GetNotificationsSince(userID, since)
		if err != nil {
			log.Printf("Error getting notifications since: %v", err)
			return utils.SendInternalError(c, "Failed to fetch notifications", err)
		}

		start := (page - 1) * limit
		end := start + limit
		total = int64(len(notifs))

		if start < len(notifs) {
			if end > len(notifs) {
				end = len(notifs)
			}
			for _, notif := range notifs[start:end] {
				notifications = append(notifications, map[string]interface{}{
					"id":           notif.ID,
					"type":         notif.Type,
					"documentId":   notif.DocumentID,
					"documentType": notif.DocumentType,
					"subject":      notif.Subject,
					"body":         notif.Body,
					"sent":         notif.Sent,
					"sentAt":       notif.SentAt,
					"createdAt":    notif.CreatedAt,
					"updatedAt":    notif.UpdatedAt,
				})
			}
		}
	}

	return utils.SendPaginatedSuccess(c, notifications, "Notifications retrieved successfully", page, limit, total)
}

// GetNotification returns a specific notification
func GetNotification(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	notificationID := c.Params("id")
	if notificationID == "" {
		return utils.SendBadRequestError(c, "Notification ID is required")
	}

	ctx := c.Context()
	row := map[string]interface{}{}
	var (
		id          pgtype.UUID
		nType       string
		documentID  *string
		documentTyp *string
		subject     string
		body        string
		isRead      *bool
		readAt      pgtype.Timestamptz
		createdAt   pgtype.Timestamptz
	)
	err := config.PgxDB.QueryRow(ctx, `
		SELECT id, type, document_id, document_type, subject, body, is_read, read_at, created_at
		FROM notifications
		WHERE id = $1 AND recipient_id = $2
	`, notificationID, userID).Scan(&id, &nType, &documentID, &documentTyp, &subject, &body, &isRead, &readAt, &createdAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFoundError(c, "Notification")
		}
		return utils.SendInternalError(c, "Failed to fetch notification", err)
	}

	idUUID, _ := uuid.FromBytes(id.Bytes[:])
	row["id"] = idUUID.String()
	row["type"] = nType
	row["documentId"] = documentID
	row["documentType"] = documentTyp
	row["subject"] = subject
	row["body"] = body
	row["isRead"] = isRead
	if readAt.Valid {
		row["readAt"] = readAt.Time
	}
	if createdAt.Valid {
		row["createdAt"] = createdAt.Time
	}

	return utils.SendSimpleSuccess(c, row, "Notification retrieved successfully")
}

// MarkNotificationAsRead marks a notification as read
func MarkNotificationAsRead(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	notificationID := c.Params("id")
	if notificationID == "" {
		return utils.SendBadRequestError(c, "Notification ID is required")
	}

	ctx := c.Context()

	// Verify notification belongs to user
	var count int
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE id = $1 AND recipient_id = $2`,
		notificationID, userID).Scan(&count); err != nil || count == 0 {
		return utils.SendNotFoundError(c, "Notification")
	}

	notificationService := services.NewNotificationService()
	if err := notificationService.MarkAsRead(notificationID); err != nil {
		log.Printf("Error marking notification as read: %v", err)
		return utils.SendInternalError(c, "Failed to mark notification as read", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Notification marked as read")
}

// MarkAllNotificationsAsRead marks all notifications as read for the user
func MarkAllNotificationsAsRead(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	notificationService := services.NewNotificationService()

	pendingNotifs, err := notificationService.GetPendingNotifications(userID)
	if err != nil {
		log.Printf("Error getting pending notifications: %v", err)
		return utils.SendInternalError(c, "Failed to fetch notifications", err)
	}

	if len(pendingNotifs) == 0 {
		return utils.SendSimpleSuccess(c, map[string]interface{}{
			"markedCount": 0,
		}, "No unread notifications found")
	}

	notificationIDs := make([]string, len(pendingNotifs))
	for i, notif := range pendingNotifs {
		notificationIDs[i] = notif.ID
	}

	if err := notificationService.MarkMultipleAsRead(notificationIDs); err != nil {
		log.Printf("Error marking notifications as read: %v", err)
		return utils.SendInternalError(c, "Failed to mark notifications as read", err)
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"markedCount": len(notificationIDs),
	}, "All notifications marked as read")
}

// GetNotificationStats returns notification statistics for the user
func GetNotificationStats(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	notificationService := services.NewNotificationService()
	stats, err := notificationService.GetNotificationStats(userID)
	if err != nil {
		log.Printf("Error getting notification stats: %v", err)
		return utils.SendInternalError(c, "Failed to fetch notification statistics", err)
	}

	return utils.SendSimpleSuccess(c, stats, "Notification statistics retrieved successfully")
}

// DeleteNotification deletes a notification
func DeleteNotification(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	notificationID := c.Params("id")
	if notificationID == "" {
		return utils.SendBadRequestError(c, "Notification ID is required")
	}

	ctx := c.Context()
	var count int
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE id = $1 AND recipient_id = $2`,
		notificationID, userID).Scan(&count); err != nil || count == 0 {
		return utils.SendNotFoundError(c, "Notification")
	}

	notificationService := services.NewNotificationService()
	if err := notificationService.DeleteNotification(notificationID); err != nil {
		log.Printf("Error deleting notification: %v", err)
		return utils.SendInternalError(c, "Failed to delete notification", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Notification deleted successfully")
}
