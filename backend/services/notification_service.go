package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/models"
)

// NotificationEvent represents a trigger event
type NotificationEvent struct {
	Type           string // approval_required, document_approved, document_rejected, assignment, status_change
	DocumentID     string
	DocumentType   string
	OrganizationID string // Required for org-scoped queries (e.g. notifyStatusChange)
	Action         string
	ActorID        string // User who triggered the event
	Details        string
	Timestamp      time.Time
}

// NotificationService handles notification creation and management.
// All DB access goes through config.Queries / config.PgxDB.
//
// Caller breakage: NewNotificationService no longer accepts a *gorm.DB argument.
type NotificationService struct{}

// NewNotificationService creates a new notification service. The signature no
// longer takes any arguments — all DB access goes through config.Queries /
// config.PgxDB. Callers that previously passed a *gorm.DB must drop that
// argument.
func NewNotificationService() *NotificationService {
	return &NotificationService{}
}

// HandleWorkflowEvent processes workflow events and creates notifications
func (ns *NotificationService) HandleWorkflowEvent(event NotificationEvent) error {
	switch event.Type {
	case "approval_required":
		return ns.notifyApprovalRequired(event)
	case "document_approved":
		return ns.notifyDocumentApproved(event)
	case "document_rejected":
		return ns.notifyDocumentRejected(event)
	case "assignment":
		return ns.notifyDocumentAssignment(event)
	case "status_change":
		return ns.notifyStatusChange(event)
	case "document_returned_for_revision", "document_returned_to_draft":
		return ns.notifyDocumentReturnedForRevision(event)
	default:
		logging.WithFields(map[string]interface{}{
			"event_type": event.Type,
			"operation":  "handle_notification_event",
		}).Warn("unknown_notification_event_type")
		return nil
	}
}

// notifyApprovalRequired creates notifications for approvers.
// When a task is assigned to a role (by UUID or plain name), all users with that role are notified.
func (ns *NotificationService) notifyApprovalRequired(event NotificationEvent) error {
	ctx := context.Background()

	// Fetch pending workflow tasks for this document via direct SQL (no
	// dedicated sqlc query for entity_id + status filter exists today).
	const tasksQuery = `
		SELECT id, organization_id, workflow_assignment_id, entity_id, entity_type,
		       stage_number, stage_name, assignment_type, assigned_role, assigned_user_id,
		       status, priority, claimed_at, claimed_by, claim_expiry, completed_at,
		       due_date, version, updated_by, created_at, updated_at
		FROM workflow_tasks
		WHERE entity_id = $1 AND status = $2
	`
	rows, err := config.PgxDB.Query(ctx, tasksQuery, event.DocumentID, "pending")
	if err != nil {
		return fmt.Errorf("notification_service: fetch workflow tasks: %w", err)
	}

	var tasks []sqlc.WorkflowTask
	for rows.Next() {
		var t sqlc.WorkflowTask
		if err := rows.Scan(
			&t.ID, &t.OrganizationID, &t.WorkflowAssignmentID, &t.EntityID, &t.EntityType,
			&t.StageNumber, &t.StageName, &t.AssignmentType, &t.AssignedRole, &t.AssignedUserID,
			&t.Status, &t.Priority, &t.ClaimedAt, &t.ClaimedBy, &t.ClaimExpiry, &t.CompletedAt,
			&t.DueDate, &t.Version, &t.UpdatedBy, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			rows.Close()
			return fmt.Errorf("notification_service: scan workflow task: %w", err)
		}
		tasks = append(tasks, t)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("notification_service: iter workflow tasks: %w", err)
	}

	totalNotified := 0

	for _, task := range tasks {
		// Collect recipient IDs for this task
		var recipientIDs []string

		if task.AssignedUserID != nil && *task.AssignedUserID != "" {
			// Specific user assignment
			recipientIDs = append(recipientIDs, *task.AssignedUserID)
		} else if task.AssignedRole != nil && *task.AssignedRole != "" {
			// Role-based assignment — notify all users with this role
			assignedRole := *task.AssignedRole
			if _, perr := uuid.Parse(assignedRole); perr == nil {
				// It's a UUID — resolve the org role via sqlc
				pgID := pgtype.UUID{Bytes: uuid.MustParse(assignedRole), Valid: true}
				if orgRole, rerr := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{ID: pgID}); rerr == nil {
					if orgRole.IsSystemRole != nil && *orgRole.IsSystemRole {
						// Notify all users with this system role name in the org
						if ids, uerr := ns.findUsersByRoleName(ctx, orgRole.Name, task.OrganizationID); uerr == nil {
							recipientIDs = append(recipientIDs, ids...)
						}
					} else {
						// Notify all users with this custom org role
						if ids, uerr := ns.findUsersByCustomRoleID(ctx, assignedRole, task.OrganizationID); uerr == nil {
							recipientIDs = append(recipientIDs, ids...)
						}
					}
				}
			} else {
				// Plain role name — notify all users with this system role in the org
				if ids, uerr := ns.findUsersByRoleName(ctx, assignedRole, task.OrganizationID); uerr == nil {
					recipientIDs = append(recipientIDs, ids...)
				}
			}
		} else if task.ClaimedBy != nil {
			recipientIDs = append(recipientIDs, *task.ClaimedBy)
		}

		if len(recipientIDs) == 0 {
			continue // no one to notify for this task
		}

		for _, recipientID := range recipientIDs {
			subject := fmt.Sprintf("Action Required: %s Needs Approval (Stage %d)", event.DocumentType, task.StageNumber)
			body := fmt.Sprintf(
				"A %s (ID: %s) requires your approval at stage %d: %s.\nPlease review and take action.",
				event.DocumentType, event.DocumentID, task.StageNumber, task.StageName,
			)

			if err := ns.createNotification(ctx, task.OrganizationID, recipientID, "approval_required",
				event.DocumentID, event.DocumentType, subject, body); err != nil {
				logging.WithFields(map[string]interface{}{
					"operation":     "create_approval_notification",
					"recipient_id":  recipientID,
					"document_id":   event.DocumentID,
					"document_type": event.DocumentType,
				}).WithError(err).Error("failed_to_create_approval_notification")
				return err
			}
			totalNotified++
		}
	}

	logging.WithFields(map[string]interface{}{
		"operation":       "create_approval_notifications",
		"document_id":     event.DocumentID,
		"document_type":   event.DocumentType,
		"approvers_count": totalNotified,
	}).Info("created_approval_notifications_for_approvers")
	return nil
}

// findUsersByRoleName returns user IDs whose plain-name role matches in the org.
func (ns *NotificationService) findUsersByRoleName(ctx context.Context, roleName, orgID string) ([]string, error) {
	const q = `
		SELECT id FROM users
		WHERE role = $1 AND current_organization_id = $2 AND active = true AND deleted_at IS NULL
	`
	rows, err := config.PgxDB.Query(ctx, q, roleName, orgID)
	if err != nil {
		return nil, fmt.Errorf("notification_service: find users by role name: %w", err)
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("notification_service: scan user id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// findUsersByCustomRoleID returns user IDs assigned to a custom org role UUID.
func (ns *NotificationService) findUsersByCustomRoleID(ctx context.Context, roleID, orgID string) ([]string, error) {
	const q = `
		SELECT user_id FROM user_organization_roles
		WHERE role_id = $1 AND organization_id = $2 AND active = true
	`
	rows, err := config.PgxDB.Query(ctx, q, roleID, orgID)
	if err != nil {
		return nil, fmt.Errorf("notification_service: find users by custom role: %w", err)
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("notification_service: scan user_id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// notifyDocumentApproved creates notifications when document is approved
func (ns *NotificationService) notifyDocumentApproved(event NotificationEvent) error {
	ctx := context.Background()

	recipientID, orgID, err := ns.resolveRecipientForDocument(ctx, event.DocumentType, event.DocumentID)
	if err != nil {
		// resolveRecipientForDocument returns nil/"" when the type is unknown
		if errors.Is(err, errUnknownDocumentType) {
			logging.WithFields(map[string]interface{}{
				"operation":     "notify_document_approved",
				"document_type": event.DocumentType,
			}).Warn("notification_for_approval_not_configured")
			return nil
		}
		return fmt.Errorf("notification_service: resolve recipient: %w", err)
	}
	if recipientID == "" {
		return fmt.Errorf("could not determine notification recipient for %s", event.DocumentType)
	}
	if orgID == "" {
		orgID = event.OrganizationID
	}

	subject := fmt.Sprintf("%s Approved", event.DocumentType)
	body := fmt.Sprintf(
		"Your %s (ID: %s) has been approved and is ready for the next stage.",
		event.DocumentType, event.DocumentID,
	)
	if err := ns.createNotification(ctx, orgID, recipientID, "document_approved",
		event.DocumentID, event.DocumentType, subject, body); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":     "create_approval_notification",
			"recipient_id":  recipientID,
			"document_id":   event.DocumentID,
			"document_type": event.DocumentType,
		}).WithError(err).Error("failed_to_create_approval_notification")
		return err
	}

	logging.WithFields(map[string]interface{}{
		"operation":     "create_approval_notification",
		"recipient_id":  recipientID,
		"document_id":   event.DocumentID,
		"document_type": event.DocumentType,
	}).Info("created_approval_notification_for_recipient")
	return nil
}

// notifyDocumentRejected creates notifications when document is rejected
func (ns *NotificationService) notifyDocumentRejected(event NotificationEvent) error {
	ctx := context.Background()

	recipientID, orgID, err := ns.resolveRecipientForDocument(ctx, event.DocumentType, event.DocumentID)
	if err != nil {
		if errors.Is(err, errUnknownDocumentType) {
			logging.WithFields(map[string]interface{}{
				"operation":     "notify_document_rejected",
				"document_type": event.DocumentType,
			}).Warn("notification_for_rejection_not_configured")
			return nil
		}
		return fmt.Errorf("notification_service: resolve recipient: %w", err)
	}
	if recipientID == "" {
		return fmt.Errorf("could not determine notification recipient for %s", event.DocumentType)
	}
	if orgID == "" {
		orgID = event.OrganizationID
	}

	subject := fmt.Sprintf("%s Rejected", event.DocumentType)
	body := fmt.Sprintf(
		"Your %s (ID: %s) has been rejected. Details: %s\nPlease review and resubmit if needed.",
		event.DocumentType, event.DocumentID, event.Details,
	)
	if err := ns.createNotification(ctx, orgID, recipientID, "document_rejected",
		event.DocumentID, event.DocumentType, subject, body); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":     "create_rejection_notification",
			"recipient_id":  recipientID,
			"document_id":   event.DocumentID,
			"document_type": event.DocumentType,
		}).WithError(err).Error("failed_to_create_rejection_notification")
		return err
	}

	logging.WithFields(map[string]interface{}{
		"operation":     "create_rejection_notification",
		"recipient_id":  recipientID,
		"document_id":   event.DocumentID,
		"document_type": event.DocumentType,
	}).Info("created_rejection_notification_for_recipient")
	return nil
}

// notifyDocumentReturnedForRevision notifies the document owner when their submission is returned for changes
func (ns *NotificationService) notifyDocumentReturnedForRevision(event NotificationEvent) error {
	ctx := context.Background()

	recipientID, orgID, err := ns.resolveRecipientForDocument(ctx, event.DocumentType, event.DocumentID)
	if err != nil {
		if errors.Is(err, errUnknownDocumentType) {
			logging.WithFields(map[string]interface{}{
				"operation":     "notify_document_returned",
				"document_type": event.DocumentType,
			}).Warn("notification_for_revision_not_configured")
			return nil
		}
		return fmt.Errorf("notification_service: resolve recipient: %w", err)
	}
	if recipientID == "" {
		return fmt.Errorf("could not determine notification recipient for %s revision", event.DocumentType)
	}
	if orgID == "" {
		orgID = event.OrganizationID
	}

	subject := fmt.Sprintf("Revision Required — %s", event.DocumentType)
	body := fmt.Sprintf(
		"Your %s (ID: %s) has been returned for revision. Reason: %s\nPlease review and resubmit.",
		event.DocumentType, event.DocumentID, event.Details,
	)
	if err := ns.createNotification(ctx, orgID, recipientID, "document_rejected",
		event.DocumentID, event.DocumentType, subject, body); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":     "create_revision_notification",
			"recipient_id":  recipientID,
			"document_id":   event.DocumentID,
			"document_type": event.DocumentType,
		}).WithError(err).Error("failed_to_create_revision_notification")
		return err
	}

	logging.WithFields(map[string]interface{}{
		"operation":     "create_revision_notification",
		"recipient_id":  recipientID,
		"document_id":   event.DocumentID,
		"document_type": event.DocumentType,
	}).Info("created_revision_notification_for_recipient")
	return nil
}

// notifyDocumentAssignment creates notifications when a document is assigned
func (ns *NotificationService) notifyDocumentAssignment(event NotificationEvent) error {
	ctx := context.Background()

	subject := fmt.Sprintf("%s Assigned to You", event.DocumentType)
	body := fmt.Sprintf(
		"A %s (ID: %s) has been assigned to you for review or action.",
		event.DocumentType, event.DocumentID,
	)

	if err := ns.createNotification(ctx, event.OrganizationID, event.ActorID, "assignment",
		event.DocumentID, event.DocumentType, subject, body); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":   "create_assignment_notification",
			"actor_id":    event.ActorID,
			"document_id": event.DocumentID,
		}).WithError(err).Error("failed_to_create_assignment_notification")
		return err
	}

	logging.WithFields(map[string]interface{}{
		"operation":   "create_assignment_notification",
		"actor_id":    event.ActorID,
		"document_id": event.DocumentID,
	}).Info("created_assignment_notification_for_user")
	return nil
}

// notifyStatusChange creates notifications for status changes — fan-out to
// finance + admin role users in the same organization.
func (ns *NotificationService) notifyStatusChange(event NotificationEvent) error {
	ctx := context.Background()

	const q = `
		SELECT id FROM users
		WHERE role = ANY($1::text[]) AND active = true
		  AND current_organization_id = $2 AND deleted_at IS NULL
	`
	rows, err := config.PgxDB.Query(ctx, q, []string{"finance", "admin"}, event.OrganizationID)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "fetch_admin_users",
		}).WithError(err).Error("failed_to_fetch_admin_users")
		return nil
	}
	var adminIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return fmt.Errorf("notification_service: scan admin id: %w", err)
		}
		adminIDs = append(adminIDs, id)
	}
	rows.Close()

	subject := fmt.Sprintf("%s Status Updated", event.DocumentType)
	body := fmt.Sprintf(
		"A %s (ID: %s) status has changed. Details: %s",
		event.DocumentType, event.DocumentID, event.Details,
	)
	for _, adminID := range adminIDs {
		if err := ns.createNotification(ctx, event.OrganizationID, adminID, "status_change",
			event.DocumentID, event.DocumentType, subject, body); err != nil {
			logging.WithFields(map[string]interface{}{
				"operation":   "create_status_change_notification",
				"admin_id":    adminID,
				"document_id": event.DocumentID,
			}).WithError(err).Error("failed_to_create_status_change_notification")
		}
	}

	logging.WithFields(map[string]interface{}{
		"operation":    "create_status_change_notifications",
		"admins_count": len(adminIDs),
		"document_id":  event.DocumentID,
	}).Info("created_status_change_notifications_for_admins")
	return nil
}

// errUnknownDocumentType signals to callers that the document type is not
// configured for notification recipient resolution.
var errUnknownDocumentType = errors.New("unknown document type")

// resolveRecipientForDocument finds the document owner/requester to notify and
// returns (recipientID, organizationID, error). Returns errUnknownDocumentType
// for unconfigured types so callers can decide whether to log+skip.
func (ns *NotificationService) resolveRecipientForDocument(ctx context.Context, docType, docID string) (string, string, error) {
	switch docType {
	case "requisition":
		req, err := config.Queries.GetRequisitionByID(ctx, sqlc.GetRequisitionByIDParams{ID: docID})
		if err != nil {
			return "", "", fmt.Errorf("fetch requisition: %w", err)
		}
		return req.RequesterID, req.OrganizationID, nil

	case "budget":
		// budgets table has no owner_id column in the sqlc-generated row; the
		// model exposes OwnerID. Use direct SQL for portability across schemas.
		var ownerID, orgID string
		if err := config.PgxDB.QueryRow(ctx,
			`SELECT COALESCE(owner_id, ''), organization_id FROM budgets WHERE id = $1`,
			docID,
		).Scan(&ownerID, &orgID); err != nil {
			return "", "", fmt.Errorf("fetch budget: %w", err)
		}
		return ownerID, orgID, nil

	case "po", "purchase_order":
		po, err := config.Queries.GetPurchaseOrderByID(ctx, sqlc.GetPurchaseOrderByIDParams{ID: docID})
		if err != nil {
			return "", "", fmt.Errorf("fetch purchase order: %w", err)
		}
		// Trace back through linked requisition for requester
		reqID := ""
		if po.LinkedRequisition != nil {
			reqID = *po.LinkedRequisition
		}
		if reqID == "" && po.SourceRequisitionID != nil {
			reqID = *po.SourceRequisitionID
		}
		if reqID != "" {
			if req, rerr := config.Queries.GetRequisitionByID(ctx, sqlc.GetRequisitionByIDParams{ID: reqID}); rerr == nil {
				return req.RequesterID, po.OrganizationID, nil
			}
		}
		// Fall back to PO creator if no linked requisition
		if po.CreatedBy != nil {
			return *po.CreatedBy, po.OrganizationID, nil
		}
		return "", po.OrganizationID, nil

	case "payment_voucher":
		pv, err := config.Queries.GetPaymentVoucherByID(ctx, sqlc.GetPaymentVoucherByIDParams{ID: docID})
		if err != nil {
			return "", "", fmt.Errorf("fetch payment voucher: %w", err)
		}
		// Traces back through linked PO → requisition
		if pv.LinkedPo != nil && *pv.LinkedPo != "" {
			if po, perr := config.Queries.GetPurchaseOrderByID(ctx, sqlc.GetPurchaseOrderByIDParams{ID: *pv.LinkedPo}); perr == nil {
				reqID := ""
				if po.LinkedRequisition != nil {
					reqID = *po.LinkedRequisition
				}
				if reqID == "" && po.SourceRequisitionID != nil {
					reqID = *po.SourceRequisitionID
				}
				if reqID != "" {
					if req, rerr := config.Queries.GetRequisitionByID(ctx, sqlc.GetRequisitionByIDParams{ID: reqID}); rerr == nil {
						return req.RequesterID, pv.OrganizationID, nil
					}
				}
			}
		}
		if pv.CreatedBy != nil {
			return *pv.CreatedBy, pv.OrganizationID, nil
		}
		return "", pv.OrganizationID, nil

	case "grn":
		grn, err := config.Queries.GetGRNByID(ctx, sqlc.GetGRNByIDParams{ID: docID})
		if err != nil {
			return "", "", fmt.Errorf("fetch GRN: %w", err)
		}
		if grn.ReceivedBy != nil && *grn.ReceivedBy != "" {
			return *grn.ReceivedBy, grn.OrganizationID, nil
		}
		if grn.CreatedBy != nil {
			return *grn.CreatedBy, grn.OrganizationID, nil
		}
		return "", grn.OrganizationID, nil

	default:
		return "", "", errUnknownDocumentType
	}
}

// createNotification inserts a row using the sqlc CreateNotification query.
// orgID is required by the schema but tolerates empty string (will store "").
func (ns *NotificationService) createNotification(ctx context.Context, orgID, recipientID, notifType,
	documentID, documentType, subject, body string) error {
	notifID := pgtype.UUID{Bytes: uuid.New(), Valid: true}
	sent := false
	isRead := false

	var docIDPtr *string
	if documentID != "" {
		docIDPtr = &documentID
	}
	var docTypePtr *string
	if documentType != "" {
		docTypePtr = &documentType
	}

	if _, err := config.Queries.CreateNotification(ctx, sqlc.CreateNotificationParams{
		ID:             notifID,
		OrganizationID: orgID,
		RecipientID:    recipientID,
		Type:           notifType,
		DocumentID:     docIDPtr,
		DocumentType:   docTypePtr,
		Subject:        subject,
		Body:           body,
		Sent:           &sent,
		IsRead:         &isRead,
	}); err != nil {
		return fmt.Errorf("notification_service: create notification: %w", err)
	}
	return nil
}

// GetPendingNotifications returns undelivered notifications for a user (limit 50).
func (ns *NotificationService) GetPendingNotifications(userID string) ([]models.Notification, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	ctx := context.Background()

	rows, err := config.Queries.ListNotifications(ctx, sqlc.ListNotificationsParams{
		RecipientID: userID,
		Column2:     "", // organization filter (any)
		Column3:     "", // type filter (any)
		Column4:     false,
		Column5:     pgtype.Timestamptz{},
		Column6:     pgtype.Timestamptz{},
		Limit:       50,
		Offset:      0,
	})
	if err != nil {
		return nil, fmt.Errorf("notification_service: list notifications: %w", err)
	}

	out := make([]models.Notification, 0, len(rows))
	for _, r := range rows {
		// Filter unsent client-side (sqlc query doesn't expose a sent filter)
		if r.Sent != nil && *r.Sent {
			continue
		}
		out = append(out, *notificationFromSQLC(r))
	}
	return out, nil
}

// GetNotificationsSince returns notifications since a specific time.
func (ns *NotificationService) GetNotificationsSince(userID string, since time.Time) ([]models.Notification, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	ctx := context.Background()

	rows, err := config.Queries.ListNotifications(ctx, sqlc.ListNotificationsParams{
		RecipientID: userID,
		Column2:     "",
		Column3:     "",
		Column4:     false,
		Column5:     pgtype.Timestamptz{Time: since, Valid: true},
		Column6:     pgtype.Timestamptz{},
		Limit:       1000,
		Offset:      0,
	})
	if err != nil {
		return nil, fmt.Errorf("notification_service: list notifications since: %w", err)
	}

	out := make([]models.Notification, 0, len(rows))
	for _, r := range rows {
		out = append(out, *notificationFromSQLC(r))
	}
	return out, nil
}

// MarkAsRead marks a notification as read (and sent).
func (ns *NotificationService) MarkAsRead(notificationID string) error {
	if notificationID == "" {
		return errors.New("notification ID is required")
	}
	ctx := context.Background()

	pgID, err := parseNotificationID(notificationID)
	if err != nil {
		return fmt.Errorf("notification_service: invalid notification ID: %w", err)
	}

	if err := config.Queries.MarkNotificationRead(ctx, sqlc.MarkNotificationReadParams{ID: pgID}); err != nil {
		return fmt.Errorf("notification_service: mark notification read: %w", err)
	}
	if err := config.Queries.MarkNotificationSent(ctx, sqlc.MarkNotificationSentParams{ID: pgID}); err != nil {
		return fmt.Errorf("notification_service: mark notification sent: %w", err)
	}

	logging.WithFields(map[string]interface{}{
		"operation":       "mark_notification_as_read",
		"notification_id": notificationID,
	}).Info("marked_notification_as_read")
	return nil
}

// MarkMultipleAsRead marks multiple notifications as read and sent in bulk.
func (ns *NotificationService) MarkMultipleAsRead(notificationIDs []string) error {
	if len(notificationIDs) == 0 {
		return nil
	}
	ctx := context.Background()

	if err := config.Queries.MarkNotificationsReadBulk(ctx, sqlc.MarkNotificationsReadBulkParams{
		Column1: notificationIDs,
	}); err != nil {
		return fmt.Errorf("notification_service: mark notifications read bulk: %w", err)
	}

	// Bulk "sent" marker: there's no sqlc bulk-sent query, so issue a single SQL.
	if _, err := config.PgxDB.Exec(ctx, `
		UPDATE notifications
		SET sent = true, sent_at = NOW(), updated_at = NOW()
		WHERE id::text = ANY($1::text[])
	`, notificationIDs); err != nil {
		return fmt.Errorf("notification_service: mark notifications sent bulk: %w", err)
	}

	logging.WithFields(map[string]interface{}{
		"operation":           "mark_multiple_notifications_as_read",
		"notifications_count": len(notificationIDs),
	}).Info("marked_multiple_notifications_as_read")
	return nil
}

// DeleteNotification deletes a single notification by ID.
func (ns *NotificationService) DeleteNotification(notificationID string) error {
	if notificationID == "" {
		return errors.New("notification ID is required")
	}
	ctx := context.Background()

	pgID, err := parseNotificationID(notificationID)
	if err != nil {
		return fmt.Errorf("notification_service: invalid notification ID: %w", err)
	}

	if err := config.Queries.DeleteNotification(ctx, sqlc.DeleteNotificationParams{ID: pgID}); err != nil {
		return fmt.Errorf("notification_service: delete notification: %w", err)
	}

	logging.WithFields(map[string]interface{}{
		"operation":       "delete_notification",
		"notification_id": notificationID,
	}).Info("deleted_notification")
	return nil
}

// GetNotificationStats returns notification statistics for a user.
func (ns *NotificationService) GetNotificationStats(userID string) (map[string]interface{}, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	ctx := context.Background()

	var pendingCount, readCount, totalCount int64

	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND sent = false`,
		userID,
	).Scan(&pendingCount); err != nil {
		return nil, fmt.Errorf("notification_service: count pending: %w", err)
	}
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND sent = true`,
		userID,
	).Scan(&readCount); err != nil {
		return nil, fmt.Errorf("notification_service: count read: %w", err)
	}
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE recipient_id = $1`,
		userID,
	).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("notification_service: count total: %w", err)
	}

	return map[string]interface{}{
		"pending": pendingCount,
		"read":    readCount,
		"total":   totalCount,
	}, nil
}

// GetNotificationsByType returns notifications of a specific type.
func (ns *NotificationService) GetNotificationsByType(userID, notifType string) ([]models.Notification, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	ctx := context.Background()

	rows, err := config.Queries.ListNotifications(ctx, sqlc.ListNotificationsParams{
		RecipientID: userID,
		Column2:     "",
		Column3:     notifType,
		Column4:     false,
		Column5:     pgtype.Timestamptz{},
		Column6:     pgtype.Timestamptz{},
		Limit:       1000,
		Offset:      0,
	})
	if err != nil {
		return nil, fmt.Errorf("notification_service: list notifications by type: %w", err)
	}

	out := make([]models.Notification, 0, len(rows))
	for _, r := range rows {
		out = append(out, *notificationFromSQLC(r))
	}
	return out, nil
}

// ProcessPendingNotifications fetches up to 100 unsent notifications and marks
// them sent. In production, real delivery (email/SMS) would happen here.
func (ns *NotificationService) ProcessPendingNotifications() error {
	ctx := context.Background()

	rows, err := config.Queries.ListUnsentNotifications(ctx, sqlc.ListUnsentNotificationsParams{Limit: 100})
	if err != nil {
		return fmt.Errorf("notification_service: list unsent: %w", err)
	}

	notifIDs := make([]string, 0, len(rows))
	for _, n := range rows {
		var idStr string
		if n.ID.Valid {
			idStr = uuid.UUID(n.ID.Bytes).String()
		}
		notifIDs = append(notifIDs, idStr)
		// Real delivery (email/SMS) would happen here.
		logging.WithFields(map[string]interface{}{
			"operation":    "send_notification",
			"recipient_id": n.RecipientID,
			"subject":      n.Subject,
		}).Info("notification_sent")
	}

	if len(notifIDs) > 0 {
		if err := ns.MarkMultipleAsRead(notifIDs); err != nil {
			logging.WithFields(map[string]interface{}{
				"operation":           "mark_notifications_as_sent",
				"notifications_count": len(notifIDs),
			}).WithError(err).Error("failed_to_mark_notifications_as_sent")
		}
	}

	logging.WithFields(map[string]interface{}{
		"operation":           "process_pending_notifications",
		"notifications_count": len(notifIDs),
	}).Info("processed_pending_notifications")
	return nil
}

// ----- helpers -----

// parseNotificationID converts a string UUID into a pgtype.UUID for sqlc.
func parseNotificationID(id string) (pgtype.UUID, error) {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return pgtype.UUID{}, err
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}, nil
}

// notificationFromSQLC converts a sqlc Notification row to the API model.
func notificationFromSQLC(n sqlc.Notification) *models.Notification {
	out := &models.Notification{
		OrganizationID: n.OrganizationID,
		RecipientID:    n.RecipientID,
		Type:           n.Type,
		Subject:        n.Subject,
		Body:           n.Body,
	}
	if n.ID.Valid {
		out.ID = uuid.UUID(n.ID.Bytes).String()
	}
	if n.DocumentID != nil {
		out.DocumentID = *n.DocumentID
	}
	if n.DocumentType != nil {
		out.DocumentType = *n.DocumentType
	}
	if n.Sent != nil {
		out.Sent = *n.Sent
	}
	if n.SentAt.Valid {
		t := n.SentAt.Time
		out.SentAt = &t
	}
	if n.EntityID != nil {
		out.EntityID = *n.EntityID
	}
	if n.EntityType != nil {
		out.EntityType = *n.EntityType
	}
	if n.EntityNumber != nil {
		out.EntityNumber = *n.EntityNumber
	}
	if n.RelatedUserID != nil {
		out.RelatedUserID = *n.RelatedUserID
	}
	if n.RelatedUserName != nil {
		out.RelatedUserName = *n.RelatedUserName
	}
	if n.IsRead != nil {
		out.IsRead = *n.IsRead
	}
	if n.ReadAt.Valid {
		t := n.ReadAt.Time
		out.ReadAt = &t
	}
	if n.ActionTaken != nil {
		out.ActionTaken = *n.ActionTaken
	}
	if n.ActionTakenAt.Valid {
		t := n.ActionTakenAt.Time
		out.ActionTakenAt = &t
	}
	if n.Importance != nil {
		out.Importance = *n.Importance
	}
	out.QuickAction = n.QuickAction
	if n.ReassignmentReason != nil {
		out.ReassignmentReason = *n.ReassignmentReason
	}
	if n.Message != nil {
		out.Message = *n.Message
	}
	if n.CreatedAt.Valid {
		out.CreatedAt = n.CreatedAt.Time
	}
	if n.UpdatedAt.Valid {
		out.UpdatedAt = n.UpdatedAt.Time
	}
	return out
}

// pgx import is required for ErrNoRows in pattern matching; preserve via blank
// reference if not directly used.
var _ = pgx.ErrNoRows
