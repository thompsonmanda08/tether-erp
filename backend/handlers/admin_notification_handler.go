package handlers

import (
	"encoding/json"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// notificationListRow projects a small subset of notifications for admin views.
type notificationListRow struct {
	ID             string
	OrganizationID string
	RecipientID    string
	Type           string
	Subject        string
	Body           string
	DocumentID     *string
	DocumentType   *string
	Sent           bool
	SentAt         *time.Time
	Importance     *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// GetAdminNotifications returns all notifications across the platform with filtering
func GetAdminNotifications(c *fiber.Ctx) error {
	ctx := c.Context()
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	notificationType := c.Query("type", "")
	search := c.Query("search", "")
	status := c.Query("status", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	conds := []string{}
	args := []interface{}{}
	add := func(c string, a ...interface{}) {
		for _, v := range a {
			args = append(args, v)
			c = strings.Replace(c, "?", "$"+strconv.Itoa(len(args)), 1)
		}
		conds = append(conds, c)
	}

	if notificationType != "" {
		add("type = ?", notificationType)
	}
	if search != "" {
		p := "%" + search + "%"
		add("(subject ILIKE ? OR body ILIKE ?)", p, p)
	}
	if status == "read" {
		conds = append(conds, "sent = true")
	} else if status == "unread" {
		conds = append(conds, "sent = false")
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM notifications"+where, args...).Scan(&total); err != nil {
		log.Printf("Error counting notifications: %v", err)
		return utils.SendInternalError(c, "Failed to count notifications", err)
	}

	args = append(args, limit, offset)
	q := "SELECT id, organization_id, recipient_id, type, subject, body, document_id, document_type, sent, sent_at, importance, created_at, updated_at FROM notifications" +
		where + " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		log.Printf("Error fetching admin notifications: %v", err)
		return utils.SendInternalError(c, "Failed to fetch notifications", err)
	}
	defer rows.Close()

	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var n notificationListRow
		if err := rows.Scan(&n.ID, &n.OrganizationID, &n.RecipientID, &n.Type, &n.Subject, &n.Body,
			&n.DocumentID, &n.DocumentType, &n.Sent, &n.SentAt, &n.Importance, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return utils.SendInternalError(c, "Failed to scan notification", err)
		}
		result = append(result, map[string]interface{}{
			"id":              n.ID,
			"organization_id": n.OrganizationID,
			"recipient_id":    n.RecipientID,
			"type":            n.Type,
			"subject":         n.Subject,
			"body":            n.Body,
			"document_id":     n.DocumentID,
			"document_type":   n.DocumentType,
			"is_read":         n.Sent,
			"read_at":         n.SentAt,
			"importance":      n.Importance,
			"created_at":      n.CreatedAt,
			"updated_at":      n.UpdatedAt,
		})
	}

	return utils.SendPaginatedSuccess(c, result, "Admin notifications retrieved successfully", page, limit, total)
}

// GetAdminNotificationStats returns platform-wide notification statistics
func GetAdminNotificationStats(c *fiber.Ctx) error {
	ctx := c.Context()
	var totalCount, unreadCount, readCount, todayCount int64

	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM notifications").Scan(&totalCount)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM notifications WHERE sent = false").Scan(&unreadCount)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM notifications WHERE sent = true").Scan(&readCount)

	today := time.Now().Truncate(24 * time.Hour)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM notifications WHERE created_at >= $1", today).Scan(&todayCount)

	byType := make(map[string]int64)
	rows, err := config.PgxDB.Query(ctx, "SELECT type, COUNT(*) FROM notifications GROUP BY type")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t string
			var c int64
			if err := rows.Scan(&t, &c); err == nil {
				byType[t] = c
			}
		}
	}

	stats := map[string]interface{}{
		"total":        totalCount,
		"unread":       unreadCount,
		"read":         readCount,
		"today":        todayCount,
		"by_type":      byType,
		"collected_at": time.Now().Format(time.RFC3339),
	}
	return utils.SendSimpleSuccess(c, stats, "Notification stats retrieved successfully")
}

// CreateAdminNotification creates a broadcast notification for admin use
func CreateAdminNotification(c *fiber.Ctx) error {
	ctx := c.Context()
	type createRequest struct {
		Subject        string   `json:"subject"`
		Body           string   `json:"body"`
		Type           string   `json:"type"`
		Importance     string   `json:"importance"`
		RecipientIDs   []string `json:"recipient_ids"`
		OrganizationID string   `json:"organization_id"`
		Broadcast      bool     `json:"broadcast"`
	}

	var req createRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}

	if req.Subject == "" || req.Body == "" {
		return utils.SendBadRequest(c, "Subject and body are required")
	}
	if req.Type == "" {
		req.Type = "admin_announcement"
	}
	if req.Importance == "" {
		req.Importance = "MEDIUM"
	}

	var recipientIDs []string
	if req.Broadcast {
		rows, err := config.PgxDB.Query(ctx, "SELECT id FROM users WHERE active = true")
		if err != nil {
			return utils.SendInternalError(c, "Failed to load recipients", err)
		}
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err == nil {
				recipientIDs = append(recipientIDs, id)
			}
		}
		rows.Close()
	} else if req.OrganizationID != "" {
		rows, err := config.PgxDB.Query(ctx,
			`SELECT u.id FROM users u
			 JOIN organization_members m ON m.user_id = u.id
			 WHERE m.organization_id = $1 AND m.active = true AND u.active = true`,
			req.OrganizationID)
		if err != nil {
			return utils.SendInternalError(c, "Failed to load org members", err)
		}
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err == nil {
				recipientIDs = append(recipientIDs, id)
			}
		}
		rows.Close()
	} else if len(req.RecipientIDs) > 0 {
		recipientIDs = req.RecipientIDs
	} else {
		return utils.SendBadRequest(c, "Must specify recipients: recipient_ids, organization_id, or broadcast=true")
	}

	if len(recipientIDs) == 0 {
		return utils.SendBadRequest(c, "No recipients found matching criteria")
	}

	// Build a multi-row INSERT in batches of 100
	now := time.Now()
	created := 0
	const batch = 100
	for i := 0; i < len(recipientIDs); i += batch {
		end := i + batch
		if end > len(recipientIDs) {
			end = len(recipientIDs)
		}
		chunk := recipientIDs[i:end]
		// id is uuid - generate per row
		args := []interface{}{}
		valueClauses := []string{}
		for _, rid := range chunk {
			id := uuid.New().String()
			args = append(args, id, req.OrganizationID, rid, req.Type, req.Subject, req.Body, req.Importance, false, now, now)
			n := len(args)
			valueClauses = append(valueClauses, "($"+strconv.Itoa(n-9)+", $"+strconv.Itoa(n-8)+", $"+strconv.Itoa(n-7)+", $"+strconv.Itoa(n-6)+", $"+strconv.Itoa(n-5)+", $"+strconv.Itoa(n-4)+", $"+strconv.Itoa(n-3)+", $"+strconv.Itoa(n-2)+", $"+strconv.Itoa(n-1)+", $"+strconv.Itoa(n)+")")
		}
		q := "INSERT INTO notifications (id, organization_id, recipient_id, type, subject, body, importance, sent, created_at, updated_at) VALUES " + strings.Join(valueClauses, ", ")
		ct, err := config.PgxDB.Exec(ctx, q, args...)
		if err != nil {
			log.Printf("Error creating admin notifications batch: %v", err)
			return utils.SendInternalError(c, "Failed to create notifications", err)
		}
		created += int(ct.RowsAffected())
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"created_count":   created,
		"recipient_count": len(recipientIDs),
	}, "Notifications created successfully")
}

// DeleteAdminNotification deletes a notification by ID (admin)
func DeleteAdminNotification(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequest(c, "Notification ID is required")
	}

	tag, err := config.PgxDB.Exec(c.Context(), "DELETE FROM notifications WHERE id = $1", id)
	if err != nil {
		log.Printf("Error deleting notification %s: %v", id, err)
		return utils.SendInternalError(c, "Failed to delete notification", err)
	}
	if tag.RowsAffected() == 0 {
		return utils.SendNotFound(c, "Notification not found")
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"deleted_id": id}, "Notification deleted successfully")
}

// BulkDeleteAdminNotifications deletes multiple notifications
func BulkDeleteAdminNotifications(c *fiber.Ctx) error {
	type bulkRequest struct {
		IDs []string `json:"ids"`
	}
	var req bulkRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if len(req.IDs) == 0 {
		return utils.SendBadRequest(c, "At least one notification ID is required")
	}

	idsJSON, _ := json.Marshal(req.IDs)
	_ = idsJSON
	tag, err := config.PgxDB.Exec(c.Context(), "DELETE FROM notifications WHERE id = ANY($1)", req.IDs)
	if err != nil {
		log.Printf("Error bulk deleting notifications: %v", err)
		return utils.SendInternalError(c, "Failed to delete notifications", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"deleted_count": tag.RowsAffected()}, "Notifications deleted successfully")
}

// MarkAdminNotificationRead marks a notification as read (admin)
func MarkAdminNotificationRead(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequest(c, "Notification ID is required")
	}

	now := time.Now()
	tag, err := config.PgxDB.Exec(c.Context(),
		"UPDATE notifications SET sent = true, sent_at = $1 WHERE id = $2", now, id)
	if err != nil {
		return utils.SendInternalError(c, "Failed to mark notification as read", err)
	}
	if tag.RowsAffected() == 0 {
		return utils.SendNotFound(c, "Notification not found")
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Notification marked as read")
}
