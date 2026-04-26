package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/tether-erp/config"
	"github.com/tether-erp/logging"
)

// AuditService handles audit logging and compliance features.
//
// Migrated off GORM: writes/reads use the package-global pgx pool
// (config.PgxDB) and sqlc-generated queries (config.Queries).
type AuditService struct {
	// No dependencies — uses package-global config.PgxDB / config.Queries.
}

// NewAuditService creates a new audit service.
//
// Constructor takes no arguments; the previous *gorm.DB parameter has been
// removed as part of the GORM → sqlc + pgxpool migration.
func NewAuditService() *AuditService {
	return &AuditService{}
}

// DocumentEvent holds all fields needed to write one audit_log row.
type DocumentEvent struct {
	OrganizationID string
	DocumentID     string
	DocumentType   string // "requisition", "purchase_order", "payment_voucher", "grn"
	UserID         string
	ActorName      string
	ActorRole      string
	Action         string                 // "created", "updated", "submitted", "approved", "rejected", "attachment_uploaded", ...
	Changes        map[string]interface{} // field-level changes: {"field": {"old": "value1", "new": "value2"}}
	Details        map[string]interface{} // arbitrary context; stored as JSONB
	Snapshot       map[string]interface{} // complete snapshot of document state after change
}

// FieldChange represents a change to a specific field.
type FieldChange struct {
	Field    string      `json:"field"`
	OldValue interface{} `json:"oldValue"`
	NewValue interface{} `json:"newValue"`
	Changed  bool        `json:"changed"`
}

// LogDocumentEvent persists a single audit event for a document via direct
// pgx INSERT against config.PgxDB. The previous *gorm.DB argument has been
// removed; writes always go through the package-global pgx pool.
//
// The function is fire-and-forget: failures are logged but not returned, so
// callers do not have to thread an error through every audit call site.
func LogDocumentEvent(ctx context.Context, evt DocumentEvent) {
	// Marshal changes JSON.
	var changesJSON []byte
	if len(evt.Changes) > 0 {
		if b, err := json.Marshal(evt.Changes); err == nil {
			changesJSON = b
		} else {
			logging.WithFields(map[string]interface{}{
				"operation":     "log_document_event",
				"document_id":   evt.DocumentID,
				"document_type": evt.DocumentType,
				"action":        evt.Action,
				"error":         fmt.Errorf("audit_service: marshal changes: %w", err).Error(),
			}).Warn("audit_log_changes_marshal_failed")
		}
	}

	// Include snapshot in details if provided.
	if len(evt.Snapshot) > 0 {
		if evt.Details == nil {
			evt.Details = make(map[string]interface{})
		}
		evt.Details["snapshot"] = evt.Snapshot
	}

	// Marshal details JSON.
	var detailsJSON []byte
	if len(evt.Details) > 0 {
		if b, err := json.Marshal(evt.Details); err == nil {
			detailsJSON = b
		} else {
			logging.WithFields(map[string]interface{}{
				"operation":     "log_document_event",
				"document_id":   evt.DocumentID,
				"document_type": evt.DocumentType,
				"action":        evt.Action,
				"error":         fmt.Errorf("audit_service: marshal details: %w", err).Error(),
			}).Warn("audit_log_details_marshal_failed")
		}
	}

	if config.PgxDB == nil {
		logging.WithFields(map[string]interface{}{
			"operation":     "log_document_event",
			"document_id":   evt.DocumentID,
			"document_type": evt.DocumentType,
			"action":        evt.Action,
		}).Error("audit_log_write_skipped_pgxdb_nil")
		return
	}

	const insertSQL = `
		INSERT INTO audit_logs (
			id, organization_id, document_id, document_type,
			user_id, actor_name, actor_role, action,
			changes, details, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
		)
	`

	_, err := config.PgxDB.Exec(ctx, insertSQL,
		uuid.New().String(),
		evt.OrganizationID,
		evt.DocumentID,
		evt.DocumentType,
		evt.UserID,
		evt.ActorName,
		evt.ActorRole,
		evt.Action,
		changesJSON,
		detailsJSON,
	)
	if err != nil {
		wrapped := fmt.Errorf("audit_service: insert audit_log: %w", err)
		logging.WithFields(map[string]interface{}{
			"operation":     "log_document_event",
			"document_id":   evt.DocumentID,
			"document_type": evt.DocumentType,
			"action":        evt.Action,
			"error":         wrapped.Error(),
		}).Error("audit_log_write_failed")
	}
}

// CompareAndBuildChanges compares old and new values and builds a changes map.
func CompareAndBuildChanges(oldValues, newValues map[string]interface{}) map[string]interface{} {
	changes := make(map[string]interface{})

	// Check for changed and new fields.
	for key, newVal := range newValues {
		oldVal, exists := oldValues[key]

		// Skip if values are equal.
		if exists {
			// Convert to JSON for comparison to handle complex types.
			oldJSON, _ := json.Marshal(oldVal)
			newJSON, _ := json.Marshal(newVal)
			if string(oldJSON) == string(newJSON) {
				continue
			}
		}

		changes[key] = map[string]interface{}{
			"old": oldVal,
			"new": newVal,
		}
	}

	// Check for deleted fields.
	for key, oldVal := range oldValues {
		if _, exists := newValues[key]; !exists {
			changes[key] = map[string]interface{}{
				"old": oldVal,
				"new": nil,
			}
		}
	}

	return changes
}

// CreateDocumentSnapshot creates a snapshot of the current document state.
func CreateDocumentSnapshot(doc interface{}) map[string]interface{} {
	snapshot := make(map[string]interface{})

	// Convert document to JSON and back to map for snapshot.
	docJSON, err := json.Marshal(doc)
	if err != nil {
		return snapshot
	}

	if err := json.Unmarshal(docJSON, &snapshot); err != nil {
		return snapshot
	}

	// Add timestamp.
	snapshot["snapshotTimestamp"] = time.Now().Format(time.RFC3339)

	return snapshot
}

// LogAuthEvent logs an authentication-related event by writing a row to audit_logs.
func (s *AuditService) LogAuthEvent(ctx context.Context, userID, email string, organizationID *string, action string, success bool, details, ipAddress, userAgent string) error {
	orgID := ""
	if organizationID != nil {
		orgID = *organizationID
	}

	detailsMap := map[string]interface{}{
		"email":     email,
		"success":   success,
		"details":   details,
		"ipAddress": ipAddress,
		"userAgent": userAgent,
	}

	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: orgID,
		DocumentID:     userID,
		DocumentType:   "auth",
		UserID:         userID,
		Action:         action,
		Details:        detailsMap,
	})

	logging.WithFields(map[string]interface{}{
		"operation":       "audit_auth_event",
		"user_id":         userID,
		"action":          action,
		"success":         success,
		"organization_id": orgID,
	}).Info("audit_auth_event_logged")
	return nil
}

// LogEvent logs a general audit event by writing a row to audit_logs.
func (s *AuditService) LogEvent(ctx context.Context, userID, organizationID, action, resourceType, resourceID, details, ipAddress, userAgent string) error {
	detailsMap := map[string]interface{}{
		"details":   details,
		"ipAddress": ipAddress,
		"userAgent": userAgent,
	}

	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     resourceID,
		DocumentType:   resourceType,
		UserID:         userID,
		Action:         action,
		Details:        detailsMap,
	})

	logging.WithFields(map[string]interface{}{
		"operation":       "audit_event",
		"user_id":         userID,
		"organization_id": organizationID,
		"action":          action,
		"resource_type":   resourceType,
		"resource_id":     resourceID,
	}).Info("audit_event_logged")
	return nil
}

// LogAttachmentUpload logs when a supporting document is uploaded.
func LogAttachmentUpload(ctx context.Context, organizationID, documentID, documentType, userID, actorName, actorRole, fileName string, fileSize int64) {
	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         "attachment_uploaded",
		Details: map[string]interface{}{
			"fileName": fileName,
			"fileSize": fileSize,
		},
	})
}

// LogAttachmentDelete logs when a supporting document is deleted.
func LogAttachmentDelete(ctx context.Context, organizationID, documentID, documentType, userID, actorName, actorRole, fileName string) {
	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         "attachment_deleted",
		Details: map[string]interface{}{
			"fileName": fileName,
		},
	})
}

// LogQuotationUpload logs when a quotation is uploaded.
func LogQuotationUpload(ctx context.Context, organizationID, documentID, documentType, userID, actorName, actorRole, vendorName string, amount float64, currency string) {
	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         "quotation_uploaded",
		Details: map[string]interface{}{
			"vendorName": vendorName,
			"amount":     amount,
			"currency":   currency,
		},
	})
}

// LogQuotationUpdate logs when a quotation is updated.
func LogQuotationUpdate(ctx context.Context, organizationID, documentID, documentType, userID, actorName, actorRole, vendorName string, oldAmount, newAmount float64, currency string) {
	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         "quotation_updated",
		Changes: map[string]interface{}{
			"amount": map[string]interface{}{
				"old": oldAmount,
				"new": newAmount,
			},
		},
		Details: map[string]interface{}{
			"vendorName": vendorName,
			"currency":   currency,
		},
	})
}

// LogQuotationDelete logs when a quotation is deleted.
func LogQuotationDelete(ctx context.Context, organizationID, documentID, documentType, userID, actorName, actorRole, vendorName string) {
	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         "quotation_deleted",
		Details: map[string]interface{}{
			"vendorName": vendorName,
		},
	})
}

// LogStatusChange logs when a document status changes.
func LogStatusChange(ctx context.Context, organizationID, documentID, documentType, userID, actorName, actorRole, oldStatus, newStatus string) {
	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         "status_changed",
		Changes: map[string]interface{}{
			"status": map[string]interface{}{
				"old": oldStatus,
				"new": newStatus,
			},
		},
	})
}

// LogFieldChange logs when a specific field changes.
func LogFieldChange(ctx context.Context, organizationID, documentID, documentType, userID, actorName, actorRole, fieldName string, oldValue, newValue interface{}) {
	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         "field_updated",
		Changes: map[string]interface{}{
			fieldName: map[string]interface{}{
				"old": oldValue,
				"new": newValue,
			},
		},
	})
}

// LogMetadataUpdate logs when document metadata is updated.
func LogMetadataUpdate(ctx context.Context, organizationID, documentID, documentType, userID, actorName, actorRole string, changes map[string]interface{}) {
	LogDocumentEvent(ctx, DocumentEvent{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         "metadata_updated",
		Changes:        changes,
	})
}
