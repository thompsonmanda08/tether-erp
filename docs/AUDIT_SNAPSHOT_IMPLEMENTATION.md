# Audit Snapshot Implementation Guide

## Overview

This guide shows how to implement comprehensive audit logging with complete snapshots of document changes, making the audit trail fully transparent by capturing:

1. **What changed** - Field-level changes with before/after values
2. **Who changed it** - User ID, name, and role
3. **When it changed** - Timestamp
4. **Complete snapshot** - Full document state after the change

## Key Features

### 1. Field-Level Change Tracking

Every field change is captured with old and new values:

```json
{
  "title": {
    "old": "Office Supplies Request",
    "new": "Updated Office Supplies Request"
  },
  "priority": {
    "old": "MEDIUM",
    "new": "HIGH"
  }
}
```

### 2. Actor Information

Every change records who made it:

```json
{
  "userId": "user-123",
  "actorName": "John Doe",
  "actorRole": "PROCUREMENT_OFFICER"
}
```

### 3. Document Snapshot

Complete state of the document after the change:

```json
{
  "snapshot": {
    "id": "po-456",
    "documentNumber": "PO-2025-001",
    "title": "Updated Office Supplies Request",
    "status": "DRAFT",
    "totalAmount": 5000.00,
    "currency": "ZMW",
    "vendorName": "Office Supplies Inc.",
    "items": [...],
    "snapshotTimestamp": "2025-04-03T10:30:00Z"
  }
}
```

## Implementation Examples

### Example 1: Update Purchase Order with Snapshot

```go
func UpdatePurchaseOrder(c *fiber.Ctx) error {
    id := c.Params("id")
    organizationID := c.Locals("organizationID").(string)
    userID := c.Locals("userID").(string)
    userRole := c.Locals("userRole").(string)

    var order models.PurchaseOrder
    if err := config.DB.Where("id = ?", id).First(&order).Error; err != nil {
        return utils.SendNotFoundError(c, "Purchase order not found")
    }

    var req UpdatePurchaseOrderRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.SendBadRequestError(c, "Invalid request body")
    }

    // Get user info for audit
    var user models.User
    config.DB.Where("id = ?", userID).First(&user)

    // Capture old values BEFORE making changes
    oldValues := map[string]interface{}{
        "title":         order.Title,
        "description":   order.Description,
        "priority":      order.Priority,
        "vendorId":      order.VendorID,
        "vendorName":    order.VendorName,
        "totalAmount":   order.TotalAmount,
        "deliveryDate":  order.DeliveryDate,
        "status":        order.Status,
        "budgetCode":    order.BudgetCode,
        "costCenter":    order.CostCenter,
        "projectCode":   order.ProjectCode,
    }

    // Apply updates
    if req.Title != "" {
        order.Title = req.Title
    }
    if req.Description != "" {
        order.Description = req.Description
    }
    if req.Priority != "" {
        order.Priority = req.Priority
    }
    if req.VendorID != "" {
        order.VendorID = req.VendorID
    }
    if req.VendorName != "" {
        order.VendorName = req.VendorName
    }
    if req.TotalAmount > 0 {
        order.TotalAmount = req.TotalAmount
    }
    if !req.DeliveryDate.IsZero() {
        order.DeliveryDate = req.DeliveryDate.Time
    }
    if req.BudgetCode != "" {
        order.BudgetCode = req.BudgetCode
    }
    if req.CostCenter != "" {
        order.CostCenter = req.CostCenter
    }
    if req.ProjectCode != "" {
        order.ProjectCode = req.ProjectCode
    }

    order.UpdatedAt = time.Now()

    // Save to database
    if err := config.DB.Save(&order).Error; err != nil {
        return utils.SendInternalError(c, "Failed to update purchase order", err)
    }

    // Capture new values AFTER changes
    newValues := map[string]interface{}{
        "title":         order.Title,
        "description":   order.Description,
        "priority":      order.Priority,
        "vendorId":      order.VendorID,
        "vendorName":    order.VendorName,
        "totalAmount":   order.TotalAmount,
        "deliveryDate":  order.DeliveryDate,
        "status":        order.Status,
        "budgetCode":    order.BudgetCode,
        "costCenter":    order.CostCenter,
        "projectCode":   order.ProjectCode,
    }

    // Compare and build changes
    changes := services.CompareAndBuildChanges(oldValues, newValues)

    // Only log if there are actual changes
    if len(changes) > 0 {
        // Create snapshot of current state
        snapshot := services.CreateDocumentSnapshot(order)

        // Log the audit event with changes and snapshot
        go services.LogDocumentEvent(config.DB, services.DocumentEvent{
            OrganizationID: organizationID,
            DocumentID:     order.ID,
            DocumentType:   "purchase_order",
            UserID:         userID,
            ActorName:      user.Name,
            ActorRole:      userRole,
            Action:         "updated",
            Changes:        changes,
            Snapshot:       snapshot,
            Details: map[string]interface{}{
                "documentNumber": order.DocumentNumber,
                "updateType":     "manual_edit",
            },
        })
    }

    return utils.SendSimpleSuccess(c, order, "Purchase order updated successfully")
}
```

### Example 2: Upload Supporting Document with Snapshot

```go
func UploadPOAttachment(c *fiber.Ctx) error {
    poID := c.Params("id")
    organizationID := c.Locals("organizationID").(string)
    userID := c.Locals("userID").(string)
    userRole := c.Locals("userRole").(string)

    var order models.PurchaseOrder
    if err := config.DB.Where("id = ?", poID).First(&order).Error; err != nil {
        return utils.SendNotFoundError(c, "Purchase order not found")
    }

    // Get user info
    var user models.User
    config.DB.Where("id = ?", userID).First(&user)

    // Handle file upload
    file, err := c.FormFile("file")
    if err != nil {
        return utils.SendBadRequestError(c, "No file uploaded")
    }

    // Upload to storage (ImageKit, S3, etc.)
    result, err := uploadToImageKit(file, "purchase-orders/attachments")
    if err != nil {
        return utils.SendInternalError(c, "Failed to upload file", err)
    }

    // Create attachment record
    attachment := PurchaseOrderAttachment{
        FileID:     result.FileID,
        FileName:   result.Name,
        FileURL:    result.URL,
        FileSize:   result.Size,
        MimeType:   file.Header.Get("Content-Type"),
        UploadedAt: time.Now().Format(time.RFC3339),
        UploadedBy: userID,
        UploadedByName: user.Name,
    }

    // Add to PO metadata
    metadata := order.Metadata.Data()
    if metadata == nil {
        metadata = make(map[string]interface{})
    }

    attachments, ok := metadata["attachments"].([]interface{})
    if !ok {
        attachments = []interface{}{}
    }

    attachments = append(attachments, attachment)
    metadata["attachments"] = attachments
    order.Metadata = datatypes.NewJSONType(metadata)

    if err := config.DB.Save(&order).Error; err != nil {
        return utils.SendInternalError(c, "Failed to save attachment", err)
    }

    // Create snapshot
    snapshot := services.CreateDocumentSnapshot(order)

    // Log the attachment upload with snapshot
    go services.LogDocumentEvent(config.DB, services.DocumentEvent{
        OrganizationID: organizationID,
        DocumentID:     order.ID,
        DocumentType:   "purchase_order",
        UserID:         userID,
        ActorName:      user.Name,
        ActorRole:      userRole,
        Action:         "attachment_uploaded",
        Snapshot:       snapshot,
        Details: map[string]interface{}{
            "fileName":      attachment.FileName,
            "fileSize":      attachment.FileSize,
            "mimeType":      attachment.MimeType,
            "fileURL":       attachment.FileURL,
            "documentNumber": order.DocumentNumber,
            "attachmentCount": len(attachments),
        },
    })

    return utils.SendSimpleSuccess(c, attachment, "Attachment uploaded successfully")
}
```

### Example 3: Upload Quotation with Snapshot

```go
func UploadQuotation(c *fiber.Ctx) error {
    reqID := c.Params("id")
    organizationID := c.Locals("organizationID").(string)
    userID := c.Locals("userID").(string)
    userRole := c.Locals("userRole").(string)

    var requisition models.Requisition
    if err := config.DB.Where("id = ?", reqID).First(&requisition).Error; err != nil {
        return utils.SendNotFoundError(c, "Requisition not found")
    }

    var req UploadQuotationRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.SendBadRequestError(c, "Invalid request body")
    }

    // Get user info
    var user models.User
    config.DB.Where("id = ?", userID).First(&user)

    // Create quotation record
    quotation := Quotation{
        VendorID:     req.VendorID,
        VendorName:   req.VendorName,
        Amount:       req.Amount,
        Currency:     req.Currency,
        QuoteFileID:  req.QuoteFileID,
        QuoteFileURL: req.QuoteFileURL,
        ValidUntil:   req.ValidUntil,
        Notes:        req.Notes,
        UploadedAt:   time.Now().Format(time.RFC3339),
        UploadedBy:   userID,
        UploadedByName: user.Name,
    }

    // Add to requisition metadata
    metadata := requisition.Metadata.Data()
    if metadata == nil {
        metadata = make(map[string]interface{})
    }

    quotations, ok := metadata["quotations"].([]interface{})
    if !ok {
        quotations = []interface{}{}
    }

    quotations = append(quotations, quotation)
    metadata["quotations"] = quotations
    requisition.Metadata = datatypes.NewJSONType(metadata)

    if err := config.DB.Save(&requisition).Error; err != nil {
        return utils.SendInternalError(c, "Failed to save quotation", err)
    }

    // Create snapshot
    snapshot := services.CreateDocumentSnapshot(requisition)

    // Log the quotation upload with snapshot
    go services.LogDocumentEvent(config.DB, services.DocumentEvent{
        OrganizationID: organizationID,
        DocumentID:     requisition.ID,
        DocumentType:   "requisition",
        UserID:         userID,
        ActorName:      user.Name,
        ActorRole:      userRole,
        Action:         "quotation_uploaded",
        Snapshot:       snapshot,
        Details: map[string]interface{}{
            "vendorName":     quotation.VendorName,
            "amount":         quotation.Amount,
            "currency":       quotation.Currency,
            "quoteFileURL":   quotation.QuoteFileURL,
            "documentNumber": requisition.DocumentNumber,
            "quotationCount": len(quotations),
        },
    })

    return utils.SendSimpleSuccess(c, quotation, "Quotation uploaded successfully")
}
```

### Example 4: Update Quotation with Change Tracking

```go
func UpdateQuotation(c *fiber.Ctx) error {
    reqID := c.Params("id")
    vendorID := c.Params("vendorId")
    organizationID := c.Locals("organizationID").(string)
    userID := c.Locals("userID").(string)
    userRole := c.Locals("userRole").(string)

    var requisition models.Requisition
    if err := config.DB.Where("id = ?", reqID).First(&requisition).Error; err != nil {
        return utils.SendNotFoundError(c, "Requisition not found")
    }

    var req UpdateQuotationRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.SendBadRequestError(c, "Invalid request body")
    }

    // Get user info
    var user models.User
    config.DB.Where("id = ?", userID).First(&user)

    // Find and update quotation
    metadata := requisition.Metadata.Data()
    quotations, ok := metadata["quotations"].([]interface{})
    if !ok {
        return utils.SendNotFoundError(c, "No quotations found")
    }

    var oldQuotation, newQuotation Quotation
    found := false

    for i, q := range quotations {
        qMap := q.(map[string]interface{})
        if qMap["vendorId"] == vendorID {
            // Capture old values
            oldQuotation = Quotation{
                VendorID:   qMap["vendorId"].(string),
                VendorName: qMap["vendorName"].(string),
                Amount:     qMap["amount"].(float64),
                Currency:   qMap["currency"].(string),
            }

            // Apply updates
            if req.Amount > 0 {
                qMap["amount"] = req.Amount
            }
            if req.ValidUntil != "" {
                qMap["validUntil"] = req.ValidUntil
            }
            if req.Notes != "" {
                qMap["notes"] = req.Notes
            }
            qMap["updatedAt"] = time.Now().Format(time.RFC3339)
            qMap["updatedBy"] = userID
            qMap["updatedByName"] = user.Name

            quotations[i] = qMap

            // Capture new values
            newQuotation = Quotation{
                VendorID:   qMap["vendorId"].(string),
                VendorName: qMap["vendorName"].(string),
                Amount:     qMap["amount"].(float64),
                Currency:   qMap["currency"].(string),
            }

            found = true
            break
        }
    }

    if !found {
        return utils.SendNotFoundError(c, "Quotation not found")
    }

    metadata["quotations"] = quotations
    requisition.Metadata = datatypes.NewJSONType(metadata)

    if err := config.DB.Save(&requisition).Error; err != nil {
        return utils.SendInternalError(c, "Failed to update quotation", err)
    }

    // Build changes
    changes := map[string]interface{}{}
    if oldQuotation.Amount != newQuotation.Amount {
        changes["amount"] = map[string]interface{}{
            "old": oldQuotation.Amount,
            "new": newQuotation.Amount,
        }
    }

    // Create snapshot
    snapshot := services.CreateDocumentSnapshot(requisition)

    // Log the quotation update with changes and snapshot
    go services.LogDocumentEvent(config.DB, services.DocumentEvent{
        OrganizationID: organizationID,
        DocumentID:     requisition.ID,
        DocumentType:   "requisition",
        UserID:         userID,
        ActorName:      user.Name,
        ActorRole:      userRole,
        Action:         "quotation_updated",
        Changes:        changes,
        Snapshot:       snapshot,
        Details: map[string]interface{}{
            "vendorName":     newQuotation.VendorName,
            "currency":       newQuotation.Currency,
            "documentNumber": requisition.DocumentNumber,
        },
    })

    return utils.SendSimpleSuccess(c, newQuotation, "Quotation updated successfully")
}
```

### Example 5: Delete Quotation with Snapshot

```go
func DeleteQuotation(c *fiber.Ctx) error {
    reqID := c.Params("id")
    vendorID := c.Params("vendorId")
    organizationID := c.Locals("organizationID").(string)
    userID := c.Locals("userID").(string)
    userRole := c.Locals("userRole").(string)

    var requisition models.Requisition
    if err := config.DB.Where("id = ?", reqID).First(&requisition).Error; err != nil {
        return utils.SendNotFoundError(c, "Requisition not found")
    }

    // Get user info
    var user models.User
    config.DB.Where("id = ?", userID).First(&user)

    // Find and remove quotation
    metadata := requisition.Metadata.Data()
    quotations, ok := metadata["quotations"].([]interface{})
    if !ok {
        return utils.SendNotFoundError(c, "No quotations found")
    }

    var deletedQuotation Quotation
    filtered := []interface{}{}
    found := false

    for _, q := range quotations {
        qMap := q.(map[string]interface{})
        if qMap["vendorId"] == vendorID {
            // Capture deleted quotation
            deletedQuotation = Quotation{
                VendorID:   qMap["vendorId"].(string),
                VendorName: qMap["vendorName"].(string),
                Amount:     qMap["amount"].(float64),
                Currency:   qMap["currency"].(string),
            }
            found = true
            continue // Skip this quotation (delete it)
        }
        filtered = append(filtered, q)
    }

    if !found {
        return utils.SendNotFoundError(c, "Quotation not found")
    }

    metadata["quotations"] = filtered
    requisition.Metadata = datatypes.NewJSONType(metadata)

    if err := config.DB.Save(&requisition).Error; err != nil {
        return utils.SendInternalError(c, "Failed to delete quotation", err)
    }

    // Create snapshot
    snapshot := services.CreateDocumentSnapshot(requisition)

    // Log the quotation deletion with snapshot
    go services.LogDocumentEvent(config.DB, services.DocumentEvent{
        OrganizationID: organizationID,
        DocumentID:     requisition.ID,
        DocumentType:   "requisition",
        UserID:         userID,
        ActorName:      user.Name,
        ActorRole:      userRole,
        Action:         "quotation_deleted",
        Snapshot:       snapshot,
        Details: map[string]interface{}{
            "vendorName":      deletedQuotation.VendorName,
            "amount":          deletedQuotation.Amount,
            "currency":        deletedQuotation.Currency,
            "documentNumber":  requisition.DocumentNumber,
            "remainingCount":  len(filtered),
        },
    })

    return utils.SendSimpleSuccess(c, nil, "Quotation deleted successfully")
}
```

## Audit Log Structure

Each audit log entry contains:

```json
{
  "id": "audit-log-uuid",
  "organizationId": "org-123",
  "documentId": "po-456",
  "documentType": "purchase_order",
  "userId": "user-789",
  "actorName": "John Doe",
  "actorRole": "PROCUREMENT_OFFICER",
  "action": "updated",
  "changes": {
    "title": {
      "old": "Office Supplies Request",
      "new": "Updated Office Supplies Request"
    },
    "priority": {
      "old": "MEDIUM",
      "new": "HIGH"
    },
    "totalAmount": {
      "old": 3000.00,
      "new": 5000.00
    }
  },
  "details": {
    "documentNumber": "PO-2025-001",
    "updateType": "manual_edit",
    "snapshot": {
      "id": "po-456",
      "documentNumber": "PO-2025-001",
      "title": "Updated Office Supplies Request",
      "status": "DRAFT",
      "priority": "HIGH",
      "totalAmount": 5000.00,
      "currency": "ZMW",
      "vendorName": "Office Supplies Inc.",
      "items": [...],
      "metadata": {...},
      "snapshotTimestamp": "2025-04-03T10:30:00Z"
    }
  },
  "createdAt": "2025-04-03T10:30:00Z"
}
```

## Frontend Display

The audit logs are displayed in the Activity Log tab with full transparency:

```typescript
// Activity log entry display
<div className="audit-entry">
  <div className="audit-header">
    <span className="actor">{entry.actorName}</span>
    <span className="action">{entry.action}</span>
    <span className="timestamp">{formatDate(entry.createdAt)}</span>
  </div>

  {/* Show changes */}
  {entry.changes && Object.keys(entry.changes).length > 0 && (
    <div className="changes">
      <h4>Changes:</h4>
      {Object.entries(entry.changes).map(([field, change]) => (
        <div key={field} className="field-change">
          <span className="field-name">{field}:</span>
          <span className="old-value">{change.old}</span>
          <span className="arrow">→</span>
          <span className="new-value">{change.new}</span>
        </div>
      ))}
    </div>
  )}

  {/* Show snapshot link */}
  {entry.details?.snapshot && (
    <button onClick={() => viewSnapshot(entry.details.snapshot)}>
      View Full Snapshot
    </button>
  )}
</div>
```

## Benefits

1. **Complete Transparency**: Every change is tracked with before/after values
2. **Actor Accountability**: Know exactly who made each change
3. **Point-in-Time Recovery**: Snapshots allow viewing document state at any point
4. **Audit Compliance**: Meets regulatory requirements for audit trails
5. **Debugging**: Easy to trace when and why issues occurred
6. **Dispute Resolution**: Clear evidence of what happened and when

## Best Practices

1. **Always capture old values before making changes**
2. **Always capture new values after making changes**
3. **Always include actor information (user ID, name, role)**
4. **Always create a snapshot for significant changes**
5. **Use descriptive action names**
6. **Include relevant context in details**
7. **Log asynchronously to avoid blocking the main request**
8. **Handle errors gracefully - don't fail the main operation if logging fails**

## Testing

Test that audit logs are created for:

- [ ] Document updates (all fields)
- [ ] Supporting document uploads
- [ ] Supporting document deletions
- [ ] Quotation uploads
- [ ] Quotation updates
- [ ] Quotation deletions
- [ ] Status changes
- [ ] Metadata updates
- [ ] Vendor changes
- [ ] Amount changes

Verify each log contains:

- [ ] Correct actor information
- [ ] Complete changes map
- [ ] Full snapshot
- [ ] Accurate timestamps
