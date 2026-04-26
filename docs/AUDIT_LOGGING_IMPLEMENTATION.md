# Audit Logging Implementation Guide

## Overview

This document describes how to implement comprehensive audit logging for all document updates, quotation uploads, and supporting document uploads across the procurement system.

## Architecture

### Components

1. **Audit Helper** (`backend/utils/audit_helper.go`)
   - Centralized functions for creating audit log entries
   - Type-safe audit actions
   - Field-level change tracking

2. **Audit Log Model** (`backend/models/models.go`)
   - Stores all document changes
   - Organization-scoped
   - Includes changes (field deltas) and details (context)

3. **Database Queries** (`backend/database/queries/audit_logs.sql`)
   - Efficient queries for retrieving audit logs
   - Supports filtering by action, document type, user

## Implementation Steps

### 1. Document Updates

When updating any document (REQ, PO, PV, GRN), log the changes:

```go
// Example: Update Purchase Order
func UpdatePurchaseOrder(c *fiber.Ctx) error {
    // ... existing code to get order and parse request ...

    // Capture old values before update
    oldValues := map[string]interface{}{
        "title":       order.Title,
        "description": order.Description,
        "priority":    order.Priority,
        "vendorId":    order.VendorID,
        "vendorName":  order.VendorName,
        "totalAmount": order.TotalAmount,
    }

    // Apply updates
    order.Title = req.Title
    order.Description = req.Description
    order.Priority = req.Priority
    // ... other updates ...

    // Save to database
    if err := config.DB.Save(&order).Error; err != nil {
        return utils.SendInternalError(c, "Failed to update purchase order", err)
    }

    // Log the changes
    newValues := map[string]interface{}{
        "title":       order.Title,
        "description": order.Description,
        "priority":    order.Priority,
        "vendorId":    order.VendorID,
        "vendorName":  order.VendorName,
        "totalAmount": order.TotalAmount,
    }

    utils.CompareAndLogChanges(
        organizationID,
        order.ID,
        "purchase_order",
        userID,
        userName,
        userRole,
        oldValues,
        newValues,
    )

    return utils.SendSimpleSuccess(c, order, "Purchase order updated successfully")
}
```

### 2. Supporting Document Uploads

When uploading attachments to documents:

```go
// Example: Upload Supporting Document to Purchase Order
func UploadPOAttachment(c *fiber.Ctx) error {
    // ... existing code to handle file upload ...

    // Upload to ImageKit or storage
    result, err := uploadToImageKit(file, "purchase-orders/attachments")
    if err != nil {
        return utils.SendInternalError(c, "Failed to upload file", err)
    }

    // Add attachment to PO metadata
    attachment := PurchaseOrderAttachment{
        FileID:     result.FileID,
        FileName:   result.Name,
        FileURL:    result.URL,
        FileSize:   result.Size,
        MimeType:   file.Header.Get("Content-Type"),
        UploadedAt: time.Now().Format(time.RFC3339),
    }

    // Update PO metadata
    metadata := order.Metadata.Data()
    attachments := metadata["attachments"].([]PurchaseOrderAttachment)
    attachments = append(attachments, attachment)
    metadata["attachments"] = attachments
    order.Metadata = datatypes.NewJSONType(metadata)

    if err := config.DB.Save(&order).Error; err != nil {
        return utils.SendInternalError(c, "Failed to save attachment", err)
    }

    // Log the attachment upload
    utils.LogAttachmentUpload(
        organizationID,
        order.ID,
        "purchase_order",
        userID,
        userName,
        userRole,
        attachment.FileName,
        attachment.FileSize,
    )

    return utils.SendSimpleSuccess(c, attachment, "Attachment uploaded successfully")
}
```

### 3. Quotation Uploads

When uploading or updating quotations:

```go
// Example: Upload Quotation to Requisition
func UploadQuotation(c *fiber.Ctx) error {
    // ... existing code to parse quotation data ...

    quotation := Quotation{
        VendorID:    req.VendorID,
        VendorName:  req.VendorName,
        Amount:      req.Amount,
        Currency:    req.Currency,
        QuoteFileID: req.QuoteFileID,
        QuoteFileURL: req.QuoteFileURL,
        UploadedAt:  time.Now().Format(time.RFC3339),
    }

    // Add quotation to requisition metadata
    metadata := requisition.Metadata.Data()
    quotations := metadata["quotations"].([]Quotation)
    quotations = append(quotations, quotation)
    metadata["quotations"] = quotations
    requisition.Metadata = datatypes.NewJSONType(metadata)

    if err := config.DB.Save(&requisition).Error; err != nil {
        return utils.SendInternalError(c, "Failed to save quotation", err)
    }

    // Log the quotation upload
    utils.LogQuotationUpload(
        organizationID,
        requisition.ID,
        "requisition",
        userID,
        userName,
        userRole,
        quotation.VendorName,
        quotation.Amount,
    )

    return utils.SendSimpleSuccess(c, quotation, "Quotation uploaded successfully")
}
```

### 4. Quotation Updates

When updating existing quotations:

```go
// Example: Update Quotation
func UpdateQuotation(c *fiber.Ctx) error {
    // ... existing code to find and parse quotation ...

    oldAmount := quotation.Amount
    quotation.Amount = req.Amount
    quotation.UpdatedAt = time.Now().Format(time.RFC3339)

    // Save updated quotation
    metadata := requisition.Metadata.Data()
    quotations := metadata["quotations"].([]Quotation)
    for i, q := range quotations {
        if q.VendorID == quotation.VendorID {
            quotations[i] = quotation
            break
        }
    }
    metadata["quotations"] = quotations
    requisition.Metadata = datatypes.NewJSONType(metadata)

    if err := config.DB.Save(&requisition).Error; err != nil {
        return utils.SendInternalError(c, "Failed to update quotation", err)
    }

    // Log the quotation update
    utils.LogQuotationUpdate(
        organizationID,
        requisition.ID,
        "requisition",
        userID,
        userName,
        userRole,
        quotation.VendorName,
        oldAmount,
        quotation.Amount,
    )

    return utils.SendSimpleSuccess(c, quotation, "Quotation updated successfully")
}
```

### 5. Quotation Deletion

When deleting quotations:

```go
// Example: Delete Quotation
func DeleteQuotation(c *fiber.Ctx) error {
    // ... existing code to find quotation ...

    vendorName := quotation.VendorName

    // Remove quotation from metadata
    metadata := requisition.Metadata.Data()
    quotations := metadata["quotations"].([]Quotation)
    filtered := []Quotation{}
    for _, q := range quotations {
        if q.VendorID != quotation.VendorID {
            filtered = append(filtered, q)
        }
    }
    metadata["quotations"] = filtered
    requisition.Metadata = datatypes.NewJSONType(metadata)

    if err := config.DB.Save(&requisition).Error; err != nil {
        return utils.SendInternalError(c, "Failed to delete quotation", err)
    }

    // Log the quotation deletion
    utils.LogQuotationDelete(
        organizationID,
        requisition.ID,
        "requisition",
        userID,
        userName,
        userRole,
        vendorName,
    )

    return utils.SendSimpleSuccess(c, nil, "Quotation deleted successfully")
}
```

### 6. Status Changes

When document status changes:

```go
// Example: Submit Document for Approval
func SubmitForApproval(c *fiber.Ctx) error {
    // ... existing code ...

    oldStatus := document.Status
    document.Status = "PENDING"

    if err := config.DB.Save(&document).Error; err != nil {
        return utils.SendInternalError(c, "Failed to submit document", err)
    }

    // Log the status change
    utils.LogStatusChange(
        organizationID,
        document.ID,
        documentType,
        userID,
        userName,
        userRole,
        oldStatus,
        document.Status,
    )

    return utils.SendSimpleSuccess(c, document, "Document submitted successfully")
}
```

### 7. Metadata Updates

When updating document metadata (quotations, attachments, etc.):

```go
// Example: Update PO Metadata
func UpdatePOMetadata(c *fiber.Ctx) error {
    // ... existing code ...

    oldMetadata := order.Metadata.Data()

    // Apply metadata updates
    newMetadata := req.Metadata
    order.Metadata = datatypes.NewJSONType(newMetadata)

    if err := config.DB.Save(&order).Error; err != nil {
        return utils.SendInternalError(c, "Failed to update metadata", err)
    }

    // Log metadata changes
    changes := make(map[string]interface{})

    // Compare quotations
    oldQuotations := oldMetadata["quotations"]
    newQuotations := newMetadata["quotations"]
    if !reflect.DeepEqual(oldQuotations, newQuotations) {
        changes["quotations"] = map[string]interface{}{
            "old": oldQuotations,
            "new": newQuotations,
        }
    }

    // Compare attachments
    oldAttachments := oldMetadata["attachments"]
    newAttachments := newMetadata["attachments"]
    if !reflect.DeepEqual(oldAttachments, newAttachments) {
        changes["attachments"] = map[string]interface{}{
            "old": oldAttachments,
            "new": newAttachments,
        }
    }

    if len(changes) > 0 {
        utils.LogMetadataUpdate(
            organizationID,
            order.ID,
            "purchase_order",
            userID,
            userName,
            userRole,
            changes,
        )
    }

    return utils.SendSimpleSuccess(c, order, "Metadata updated successfully")
}
```

## Audit Actions Reference

### Document Lifecycle

- `created` - Document created
- `updated` - Document updated
- `deleted` - Document deleted
- `submitted` - Document submitted for approval
- `approved` - Document approved
- `rejected` - Document rejected
- `withdrawn` - Document withdrawn
- `cancelled` - Document cancelled

### Attachments

- `attachment_uploaded` - Supporting document uploaded
- `attachment_deleted` - Supporting document deleted

### Quotations

- `quotation_uploaded` - Quotation uploaded
- `quotation_updated` - Quotation updated
- `quotation_deleted` - Quotation deleted

### Field Updates

- `field_updated` - Specific field updated
- `metadata_updated` - Metadata updated
- `status_changed` - Status changed
- `priority_changed` - Priority changed

### Procurement Flow

- `quotation_gate_bypassed` - Quotation gate bypassed
- `vendor_selected` - Vendor selected
- `vendor_changed` - Vendor changed

### Payment

- `marked_paid` - Payment voucher marked as paid
- `payment_failed` - Payment failed

### GRN

- `goods_received` - Goods received
- `goods_confirmed` - Goods confirmed
- `goods_rejected` - Goods rejected

## Frontend Integration

The frontend already has the activity log display component. The audit logs will automatically appear in the "Activity Log" tab on document detail pages.

### Example Activity Log Display

```typescript
// The activity log is fetched using the existing API
const { data: auditEventsData } = useQuery({
  queryKey: ["audit-events", "purchase_order", purchaseOrderId],
  queryFn: async () => {
    const res = await getAuditEvents("purchase_order", purchaseOrderId);
    return res.success ? ((res.data as AuditEvent[]) ?? []) : [];
  },
  enabled: !!purchaseOrderId,
});

// Display in the Activity Log tab
<TabsContent value="activity">
  <ActivityLogContent
    activities={auditEventsData || []}
    documentType="purchase_order"
  />
</TabsContent>
```

## Testing

### Manual Testing Checklist

1. **Document Updates**
   - [ ] Update REQ title - verify audit log entry
   - [ ] Update PO vendor - verify audit log entry
   - [ ] Update PV amount - verify audit log entry
   - [ ] Update GRN notes - verify audit log entry

2. **Supporting Documents**
   - [ ] Upload attachment to REQ - verify audit log entry
   - [ ] Upload attachment to PO - verify audit log entry
   - [ ] Upload attachment to PV - verify audit log entry
   - [ ] Delete attachment - verify audit log entry

3. **Quotations**
   - [ ] Upload quotation to REQ - verify audit log entry
   - [ ] Update quotation amount - verify audit log entry
   - [ ] Delete quotation - verify audit log entry
   - [ ] Upload multiple quotations - verify all logged

4. **Status Changes**
   - [ ] Submit REQ for approval - verify status change logged
   - [ ] Approve PO - verify status change logged
   - [ ] Reject PV - verify status change logged
   - [ ] Withdraw document - verify status change logged

5. **Metadata Updates**
   - [ ] Update PO metadata - verify changes logged
   - [ ] Update quotations in metadata - verify logged
   - [ ] Update attachments in metadata - verify logged

### Automated Testing

```go
func TestAuditLogCreation(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer teardownTestDB(t, db)

    // Create test document
    order := createTestPurchaseOrder(t, db)

    // Update document
    oldTitle := order.Title
    order.Title = "Updated Title"
    db.Save(&order)

    // Log the change
    err := utils.LogFieldChange(
        order.OrganizationID,
        order.ID,
        "purchase_order",
        "user-123",
        "Test User",
        "PROCUREMENT_OFFICER",
        "title",
        oldTitle,
        order.Title,
    )
    assert.NoError(t, err)

    // Verify audit log was created
    var auditLog models.AuditLog
    err = db.Where("document_id = ? AND action = ?", order.ID, "field_updated").First(&auditLog).Error
    assert.NoError(t, err)
    assert.Equal(t, "purchase_order", auditLog.DocumentType)
    assert.Equal(t, "user-123", auditLog.UserID)

    // Verify changes were recorded
    changes := auditLog.Changes.Data()
    assert.NotNil(t, changes["title"])
}
```

## Performance Considerations

1. **Async Logging**: Consider making audit log creation asynchronous for high-traffic operations
2. **Batch Logging**: For bulk operations, batch audit log inserts
3. **Indexing**: Ensure proper indexes on `document_id`, `document_type`, `action`, and `created_at`
4. **Retention**: Implement retention policies to archive old audit logs

## Security Considerations

1. **Immutability**: Audit logs should never be updated or deleted (except by retention policies)
2. **Access Control**: Only authorized users should view audit logs
3. **PII Protection**: Be careful not to log sensitive personal information
4. **Encryption**: Consider encrypting sensitive data in the `details` field

## Migration Plan

1. **Phase 1**: Implement audit helper functions ✅
2. **Phase 2**: Add audit logging to document update handlers
3. **Phase 3**: Add audit logging to attachment upload handlers
4. **Phase 4**: Add audit logging to quotation handlers
5. **Phase 5**: Add audit logging to status change handlers
6. **Phase 6**: Test and verify all audit logs are working
7. **Phase 7**: Deploy to production

## Rollout Strategy

1. Deploy audit helper functions
2. Enable audit logging for one document type (e.g., Purchase Orders)
3. Monitor for performance impact
4. Gradually enable for other document types
5. Monitor audit log volume and adjust retention policies

## Monitoring

Monitor the following metrics:

1. **Audit Log Volume**: Number of audit logs created per day
2. **Audit Log Size**: Total size of audit logs table
3. **Query Performance**: Performance of audit log queries
4. **Missing Logs**: Operations that should have audit logs but don't

## Support

For questions or issues with audit logging implementation:

1. Check this documentation
2. Review the audit helper functions in `backend/utils/audit_helper.go`
3. Check existing implementations in document handlers
4. Contact the development team
