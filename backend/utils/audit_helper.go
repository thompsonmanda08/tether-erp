package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/tether-erp/config"
)

// AuditAction represents the type of action being audited
type AuditAction string

const (
	// Document lifecycle actions
	AuditActionCreated   AuditAction = "created"
	AuditActionUpdated   AuditAction = "updated"
	AuditActionDeleted   AuditAction = "deleted"
	AuditActionSubmitted AuditAction = "submitted"
	AuditActionApproved  AuditAction = "approved"
	AuditActionRejected  AuditAction = "rejected"
	AuditActionWithdrawn AuditAction = "withdrawn"
	AuditActionCancelled AuditAction = "cancelled"

	// Attachment and document actions
	AuditActionAttachmentUploaded AuditAction = "attachment_uploaded"
	AuditActionAttachmentDeleted  AuditAction = "attachment_deleted"
	AuditActionQuotationUploaded  AuditAction = "quotation_uploaded"
	AuditActionQuotationUpdated   AuditAction = "quotation_updated"
	AuditActionQuotationDeleted   AuditAction = "quotation_deleted"

	// Field update actions
	AuditActionFieldUpdated    AuditAction = "field_updated"
	AuditActionMetadataUpdated AuditAction = "metadata_updated"
	AuditActionStatusChanged   AuditAction = "status_changed"
	AuditActionPriorityChanged AuditAction = "priority_changed"

	// Procurement flow actions
	AuditActionQuotationGateBypassed AuditAction = "quotation_gate_bypassed"
	AuditActionVendorSelected        AuditAction = "vendor_selected"
	AuditActionVendorChanged         AuditAction = "vendor_changed"

	// Payment actions
	AuditActionMarkedPaid    AuditAction = "marked_paid"
	AuditActionPaymentFailed AuditAction = "payment_failed"

	// GRN actions
	AuditActionGoodsReceived  AuditAction = "goods_received"
	AuditActionGoodsConfirmed AuditAction = "goods_confirmed"
	AuditActionGoodsRejected  AuditAction = "goods_rejected"
)

// AuditLogParams contains parameters for creating an audit log entry
type AuditLogParams struct {
	OrganizationID string
	DocumentID     string
	DocumentType   string
	UserID         string
	ActorName      string
	ActorRole      string
	Action         AuditAction
	Changes        map[string]interface{}
	Details        map[string]interface{}
}

// CreateAuditLog inserts a new audit log row via pgx (no GORM).
func CreateAuditLog(params AuditLogParams) error {
	id := GenerateID()

	var changesJSON, detailsJSON []byte
	if params.Changes != nil {
		b, err := json.Marshal(params.Changes)
		if err != nil {
			return fmt.Errorf("audit_helper: marshal changes: %w", err)
		}
		changesJSON = b
	}
	if params.Details != nil {
		b, err := json.Marshal(params.Details)
		if err != nil {
			return fmt.Errorf("audit_helper: marshal details: %w", err)
		}
		detailsJSON = b
	}

	_, err := config.PgxDB.Exec(context.Background(), `
		INSERT INTO audit_logs (id, organization_id, document_id, document_type, user_id, actor_name, actor_role, action, changes, details, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		id,
		params.OrganizationID,
		params.DocumentID,
		params.DocumentType,
		params.UserID,
		params.ActorName,
		params.ActorRole,
		string(params.Action),
		changesJSON,
		detailsJSON,
		time.Now(),
	)
	if err != nil {
		return fmt.Errorf("audit_helper: insert audit log: %w", err)
	}
	return nil
}

// LogDocumentUpdate logs a document update with field-level changes
func LogDocumentUpdate(organizationID, documentID, documentType, userID, actorName, actorRole string, changes map[string]interface{}) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionUpdated,
		Changes:        changes,
	})
}

// LogAttachmentUpload logs when a supporting document is uploaded
func LogAttachmentUpload(organizationID, documentID, documentType, userID, actorName, actorRole, fileName string, fileSize int64) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionAttachmentUploaded,
		Details: map[string]interface{}{
			"fileName": fileName,
			"fileSize": fileSize,
		},
	})
}

// LogAttachmentDelete logs when a supporting document is deleted
func LogAttachmentDelete(organizationID, documentID, documentType, userID, actorName, actorRole, fileName string) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionAttachmentDeleted,
		Details: map[string]interface{}{
			"fileName": fileName,
		},
	})
}

// LogQuotationUpload logs when a quotation is uploaded
func LogQuotationUpload(organizationID, documentID, documentType, userID, actorName, actorRole, vendorName string, amount float64) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionQuotationUploaded,
		Details: map[string]interface{}{
			"vendorName": vendorName,
			"amount":     amount,
		},
	})
}

// LogQuotationUpdate logs when a quotation is updated
func LogQuotationUpdate(organizationID, documentID, documentType, userID, actorName, actorRole, vendorName string, oldAmount, newAmount float64) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionQuotationUpdated,
		Changes: map[string]interface{}{
			"amount": map[string]interface{}{
				"old": oldAmount,
				"new": newAmount,
			},
		},
		Details: map[string]interface{}{
			"vendorName": vendorName,
		},
	})
}

// LogQuotationDelete logs when a quotation is deleted
func LogQuotationDelete(organizationID, documentID, documentType, userID, actorName, actorRole, vendorName string) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionQuotationDeleted,
		Details: map[string]interface{}{
			"vendorName": vendorName,
		},
	})
}

// LogStatusChange logs when a document status changes
func LogStatusChange(organizationID, documentID, documentType, userID, actorName, actorRole, oldStatus, newStatus string) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionStatusChanged,
		Changes: map[string]interface{}{
			"status": map[string]interface{}{
				"old": oldStatus,
				"new": newStatus,
			},
		},
	})
}

// LogFieldChange logs when a specific field changes
func LogFieldChange(organizationID, documentID, documentType, userID, actorName, actorRole, fieldName string, oldValue, newValue interface{}) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionFieldUpdated,
		Changes: map[string]interface{}{
			fieldName: map[string]interface{}{
				"old": oldValue,
				"new": newValue,
			},
		},
	})
}

// LogMetadataUpdate logs when document metadata is updated
func LogMetadataUpdate(organizationID, documentID, documentType, userID, actorName, actorRole string, changes map[string]interface{}) error {
	return CreateAuditLog(AuditLogParams{
		OrganizationID: organizationID,
		DocumentID:     documentID,
		DocumentType:   documentType,
		UserID:         userID,
		ActorName:      actorName,
		ActorRole:      actorRole,
		Action:         AuditActionMetadataUpdated,
		Changes:        changes,
	})
}

// CompareAndLogChanges compares old and new values and logs changes
func CompareAndLogChanges(organizationID, documentID, documentType, userID, actorName, actorRole string, oldValues, newValues map[string]interface{}) error {
	changes := make(map[string]interface{})
	for key, newVal := range newValues {
		oldVal, exists := oldValues[key]
		if !exists || oldVal != newVal {
			changes[key] = map[string]interface{}{
				"old": oldVal,
				"new": newVal,
			}
		}
	}
	if len(changes) == 0 {
		return nil
	}
	return LogDocumentUpdate(organizationID, documentID, documentType, userID, actorName, actorRole, changes)
}
