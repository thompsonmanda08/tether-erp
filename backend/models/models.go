package models

import (
	"encoding/json"
	"time"

	"github.com/tether-erp/types"
)

// User represents a system user
type User struct {
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	Name      string     `json:"name"`
	Password  string     `json:"-"` // Hidden from JSON responses
	Role      string     `json:"role"` // admin, approver, requester, finance, viewer
	Active    bool       `json:"active"`
	LastLogin *time.Time `json:"lastLogin,omitempty"`

	// Profile fields
	Position  string `json:"position,omitempty"`
	ManNumber string `json:"manNumber,omitempty"`
	NrcNumber string `json:"nrcNumber,omitempty"`
	Contact   string `json:"contact,omitempty"`

	// Multi-tenancy fields
	CurrentOrganizationID *string         `json:"currentOrganizationId,omitempty"`
	CurrentOrganization   *Organization   `json:"currentOrganization,omitempty"`
	IsSuperAdmin          bool            `json:"isSuperAdmin"`
	MustChangePassword    bool            `json:"mustChangePassword"`
	Preferences           json.RawMessage `json:"preferences,omitempty"`

	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"` // Soft delete

	// Computed fields (not stored in DB)
	OrgRoleIds []string `json:"orgRoleIds,omitempty"` // Active custom org role UUIDs for current org (populated at request time)
}

// Requisition workflow document
type Requisition struct {
	ID                string                  `json:"id"`
	OrganizationID    string                  `json:"organizationId"`
	Organization      *Organization           `json:"organization,omitempty"`
	DocumentNumber    string                  `json:"documentNumber"`
	RequesterId       string                  `json:"requesterId"`
	Requester         *User                   `json:"requester,omitempty"`
	RequesterName     string                  `json:"requesterName"`
	Title             string                  `json:"title"`
	Description       string                  `json:"description"`
	Department        string                  `json:"department"`
	DepartmentId      string                  `json:"departmentId"`
	Status            string                  `json:"status"` // draft, pending, approved, rejected, completed, cancelled
	Priority          string                  `json:"priority"` // low, medium, high, urgent
	Items             []types.RequisitionItem `json:"items"`
	TotalAmount       float64                 `json:"totalAmount"`
	Currency          string                  `json:"currency"`
	ApprovalStage     int                     `json:"approvalStage"`
	ApprovalHistory   []types.ApprovalRecord  `json:"approvalHistory"`
	CategoryID        *string                 `json:"categoryId,omitempty"`
	Category          *Category               `json:"category,omitempty"`
	CategoryName      string                  `json:"categoryName"`
	PreferredVendorID *string                 `json:"preferredVendorId,omitempty"`
	PreferredVendor   *Vendor                 `json:"preferredVendor,omitempty"`
	PreferredVendorName string                `json:"preferredVendorName"`
	IsEstimate        bool                    `json:"isEstimate"`

	// Business requirement fields
	BudgetCode          string                       `json:"budgetCode"`
	SourceOfFunds       string                       `json:"sourceOfFunds,omitempty"` // Source of funding for the requisition
	RequestedByName     string                       `json:"requestedByName"`     // Computed from RequesterName
	RequestedByRole     string                       `json:"requestedByRole"`     // Computed from Requester.Role
	RequestedBy         string                       `json:"requestedBy"`         // Computed from RequesterId
	TotalApprovalStages int                          `json:"totalApprovalStages"` // Computed
	RequestedDate       time.Time                    `json:"requestedDate"`       // Computed from CreatedAt
	RequiredByDate      time.Time                    `json:"requiredByDate"`
	CostCenter          string                       `json:"costCenter"`
	ProjectCode         string                       `json:"projectCode"`
	CreatedBy           string                       `json:"createdBy"`           // Computed from RequesterId
	CreatedByName       string                       `json:"createdByName"`       // Computed from RequesterName
	CreatedByRole       string                       `json:"createdByRole"`       // Computed from Requester.Role

	// Automation fields
	AutomationUsed      bool                         `json:"automationUsed,omitempty"`     // Whether automation was used
	AutoCreatedPO       json.RawMessage              `json:"autoCreatedPO,omitempty"` // Auto-created Purchase Order

	ActionHistory       []types.ActionHistoryEntry   `json:"actionHistory,omitempty"` // Action history for UI
	Metadata            json.RawMessage              `json:"metadata"`

	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// Budget workflow document
type Budget struct {
	ID              string                     `json:"id"`
	OrganizationID  string                     `json:"organizationId"`
	Organization    *Organization              `json:"organization,omitempty"`
	OwnerID         string                     `json:"ownerId"`
	Owner           *User                      `json:"owner,omitempty"`
	BudgetCode      string                     `json:"budgetCode"`
	Department      string                     `json:"department"`
	Status          string                     `json:"status"` // draft, pending, approved, rejected, completed, cancelled
	FiscalYear      string                     `json:"fiscalYear"`
	TotalBudget     float64                    `json:"totalBudget"`
	AllocatedAmount float64                    `json:"allocatedAmount"`
	RemainingAmount float64                    `json:"remainingAmount"`
	ApprovalStage   int                        `json:"approvalStage"`
	ApprovalHistory []types.ApprovalRecord     `json:"approvalHistory"`

	// Extended fields for UI compatibility and business requirements
	Name            string                     `json:"name,omitempty"`        // Budget name/title
	Description     string                     `json:"description,omitempty"` // Budget description
	DepartmentID    string                     `json:"departmentId,omitempty"` // Department ID
	Currency        string                     `json:"currency,omitempty"`    // Currency
	OwnerName       string                     `json:"ownerName,omitempty"`   // Computed from Owner.Name
	CreatedBy       string                     `json:"createdBy,omitempty"`   // Creator user ID
	Items           json.RawMessage            `json:"items,omitempty"` // Budget items breakdown
	ActionHistory   []types.ActionHistoryEntry `json:"actionHistory,omitempty"` // Action history for UI
	Metadata        json.RawMessage            `json:"metadata,omitempty"` // Generic metadata

	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// PurchaseOrder workflow document
type PurchaseOrder struct {
	ID                string                     `json:"id"`
	OrganizationID    string                     `json:"organizationId"`
	Organization      *Organization              `json:"organization,omitempty"`
	DocumentNumber    string                     `json:"documentNumber"`
	VendorID          *string                    `json:"vendorId"`
	Vendor            *Vendor                    `json:"vendor,omitempty"`
	Status            string                     `json:"status"` // draft, pending, approved, rejected, fulfilled, completed, cancelled
	Items             []types.POItem             `json:"items"`
	TotalAmount       float64                    `json:"totalAmount"`
	Currency          string                     `json:"currency"`
	DeliveryDate      time.Time                  `json:"deliveryDate"`
	ApprovalStage     int                        `json:"approvalStage"`
	ApprovalHistory   []types.ApprovalRecord     `json:"approvalHistory"`
	LinkedRequisition string                     `json:"linkedRequisition"`

	// Frontend compatibility fields - CRITICAL: These must match frontend exactly
	VendorName    string     `json:"vendorName,omitempty"`    // Computed from Vendor.Name
	Department    string     `json:"department,omitempty"`    // Department
	DepartmentID  string     `json:"departmentId,omitempty"`  // Department ID
	GLCode        string     `json:"glCode,omitempty"`        // GL Code - ADDED
	Title         string     `json:"title,omitempty"`         // PO title
	Description   string     `json:"description,omitempty"`   // PO description
	Priority      string     `json:"priority,omitempty"`      // Priority level
	Subtotal      *float64   `json:"subtotal,omitempty"`      // Subtotal amount
	Tax           *float64   `json:"tax,omitempty"`           // Tax amount
	Total         *float64   `json:"total,omitempty"`         // Total amount
	BudgetCode    string     `json:"budgetCode,omitempty"`    // Budget code - ADDED
	CostCenter    string     `json:"costCenter,omitempty"`    // Cost center - ADDED
	ProjectCode   string     `json:"projectCode,omitempty"`   // Project code - ADDED
	CreatedBy     string     `json:"createdBy,omitempty"`     // Creator user ID - ADDED

	// Procurement flow override: "goods_first", "payment_first", or "" (inherit from org)
	ProcurementFlow string `json:"procurementFlow"`

	// Automation fields
	AutomationUsed    bool            `json:"automationUsed,omitempty"`    // Whether automation was used
	AutoCreatedGRN    json.RawMessage `json:"autoCreatedGRN,omitempty"` // Auto-created GRN

	ActionHistory []types.ActionHistoryEntry `json:"actionHistory,omitempty"` // Action history for UI

	// Metadata: attachments, quotations, and other JSONB extras
	Metadata json.RawMessage `json:"metadata,omitempty"`

	// Cost tracking
	EstimatedCost float64 `json:"estimatedCost,omitempty"`

	// Quotation bypass
	QuotationGateOverridden bool   `json:"quotationGateOverridden,omitempty"`
	BypassJustification     string `json:"bypassJustification,omitempty"`

	// Legacy aliases for backward compatibility
	RequiredByDate          *time.Time `json:"requiredByDate,omitempty"`          // Required delivery date
	SourceRequisitionId     *string    `json:"sourceRequisitionId,omitempty"`     // Source requisition ID

	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// PaymentVoucher workflow document
type PaymentVoucher struct {
	ID              string                     `json:"id"`
	OrganizationID  string                     `json:"organizationId"`
	Organization    *Organization              `json:"organization,omitempty"`
	DocumentNumber  string                     `json:"documentNumber"`
	VendorID        *string                    `json:"vendorId"`
	Vendor          *Vendor                    `json:"vendor,omitempty"`
	InvoiceNumber   string                     `json:"invoiceNumber"`
	Status          string                     `json:"status"` // draft, pending, approved, rejected, paid, completed, cancelled
	Amount          float64                    `json:"amount"`
	Currency        string                     `json:"currency"`
	PaymentMethod   string                     `json:"paymentMethod"` // bank_transfer, cash
	GLCode          string                     `json:"glCode"`
	Description     string                     `json:"description"`
	ApprovalStage   int                        `json:"approvalStage"`
	ApprovalHistory []types.ApprovalRecord     `json:"approvalHistory"`
	LinkedPO        string                     `json:"linkedPO"`
	LinkedGRN       string                     `json:"linkedGRN"` // Goods-first flow: GRN approved before this PV

	// Frontend compatibility fields - CRITICAL: These must match frontend exactly
	VendorName              string                     `json:"vendorName,omitempty"`              // Computed from Vendor.Name
	Title                   string                     `json:"title,omitempty"`                   // Payment voucher title
	Department              string                     `json:"department,omitempty"`              // Department
	DepartmentID            string                     `json:"departmentId,omitempty"`            // Department ID
	Priority                string                     `json:"priority,omitempty"`                // Priority level
	CreatedBy               string                     `json:"createdBy,omitempty"`               // Creator user ID - ADDED
	RequestedByName         string                     `json:"requestedByName,omitempty"`         // Name of requester
	RequestedDate           *time.Time                 `json:"requestedDate,omitempty"`           // When payment was requested
	SubmittedAt             *time.Time                 `json:"submittedAt,omitempty"`             // Submission date
	ApprovedAt              *time.Time                 `json:"approvedAt,omitempty"`              // Approval date
	PaidDate                *time.Time                 `json:"paidDate,omitempty"`                // Payment date
	PaymentDueDate          *time.Time                 `json:"paymentDueDate,omitempty"`          // Payment due date - ADDED
	BudgetCode              string                     `json:"budgetCode,omitempty"`              // Budget code
	CostCenter              string                     `json:"costCenter,omitempty"`              // Cost center
	ProjectCode             string                     `json:"projectCode,omitempty"`             // Project code
	TaxAmount               *float64                   `json:"taxAmount,omitempty"`               // Tax amount
	WithholdingTaxAmount    *float64                   `json:"withholdingTaxAmount,omitempty"`    // Withholding tax
	PaidAmount              *float64                   `json:"paidAmount,omitempty"`              // Amount actually paid
	BankDetails             json.RawMessage            `json:"bankDetails,omitempty"` // Bank details for payment
	Items                   []types.PaymentItem        `json:"items,omitempty"`       // Payment items breakdown
	ActionHistory           []types.ActionHistoryEntry `json:"actionHistory,omitempty"` // Action history for UI

	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// GoodsReceivedNote workflow document
type GoodsReceivedNote struct {
	ID                string                     `json:"id"`
	OrganizationID    string                     `json:"organizationId"`
	Organization      *Organization              `json:"organization,omitempty"`
	DocumentNumber    string                     `json:"documentNumber"`
	PODocumentNumber  string                     `json:"poDocumentNumber"`
	PurchaseOrder     *PurchaseOrder             `json:"purchaseOrder,omitempty"`
	Status            string                     `json:"status"` // draft, pending, approved, rejected, paid, completed, cancelled
	ReceivedDate      time.Time                  `json:"receivedDate"`
	ReceivedBy        string                     `json:"receivedBy"`
	Items             []types.GRNItem            `json:"items"`
	QualityIssues     []types.QualityIssue       `json:"qualityIssues"`
	ApprovalStage     int                        `json:"approvalStage"`
	ApprovalHistory   []types.ApprovalRecord     `json:"approvalHistory"`

	// Budget tracking fields (propagated from linked PO)
	BudgetCode        string                     `json:"budgetCode,omitempty"`
	CostCenter        string                     `json:"costCenter,omitempty"`
	ProjectCode       string                     `json:"projectCode,omitempty"`

	// Extended fields for UI compatibility and business requirements
	CreatedBy         string                     `json:"createdBy,omitempty"`         // Creator user ID
	OwnerID           string                     `json:"ownerId,omitempty"`           // Owner user ID (maps to createdBy)
	WarehouseLocation string                     `json:"warehouseLocation,omitempty"` // Warehouse location
	Notes             string                     `json:"notes,omitempty"`             // Additional notes
	CurrentStage      int                        `json:"currentStage,omitempty"`      // Maps to ApprovalStage
	StageName         string                     `json:"stageName,omitempty"`         // Current stage name
	ApprovedBy        string                     `json:"approvedBy,omitempty"`        // Who approved the GRN
	// Payment-First flow: references the PV that was paid before goods were received
	LinkedPV          string                     `json:"linkedPV"`

	AutomationUsed    bool                       `json:"automationUsed,omitempty"`    // Whether automation was used
	AutoCreatedPV     json.RawMessage            `json:"autoCreatedPV,omitempty"` // Auto-created Payment Voucher
	ActionHistory     []types.ActionHistoryEntry `json:"actionHistory,omitempty"` // Action history for UI
	Metadata          json.RawMessage            `json:"metadata,omitempty"` // Generic metadata

	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// Category master data for requisition categorization
type Category struct {
	ID             string        `json:"id"`
	OrganizationID string        `json:"organizationId"`
	Organization   *Organization `json:"organization,omitempty"`
	Name           string        `json:"name"`
	Description    string        `json:"description"`
	Active         bool          `json:"active"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

// CategoryBudgetCode links categories to budget codes (one-to-many relationship)
type CategoryBudgetCode struct {
	ID         string    `json:"id"`
	CategoryID string    `json:"categoryId"`
	Category   *Category `json:"category,omitempty"`
	BudgetCode string    `json:"budgetCode"`
	Active     bool      `json:"active"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// Vendor master data - Organization-scoped vendors
type Vendor struct {
	ID             string        `json:"id"`
	OrganizationID string        `json:"organizationId"`
	Organization   *Organization `json:"organization,omitempty"`
	VendorCode     string        `json:"vendorCode"`
	Name           string        `json:"name"`
	Email          string        `json:"email"`
	Phone          string        `json:"phone"`
	Country        string        `json:"country"`
	City           string        `json:"city"`
	BankAccount    string        `json:"bankAccount"` // Legacy — kept for backward compat
	TaxID          string        `json:"taxId"`
	Active         bool          `json:"active"`
	CreatedBy      string        `json:"createdBy"` // User who created the vendor

	// Bank details
	BankName      string `json:"bankName,omitempty"`
	AccountName   string `json:"accountName,omitempty"`
	AccountNumber string `json:"accountNumber,omitempty"`
	BranchCode    string `json:"branchCode,omitempty"`
	SwiftCode     string `json:"swiftCode,omitempty"`

	// Contact & address
	ContactPerson   string `json:"contactPerson,omitempty"`
	PhysicalAddress string `json:"physicalAddress,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// AuditLog tracks all document changes (organization-scoped)
type AuditLog struct {
	ID             string                 `json:"id"`
	OrganizationID string                 `json:"organizationId"`
	DocumentID     string                 `json:"documentId"`
	DocumentType   string                 `json:"documentType"`
	UserID         string                 `json:"userId"`
	ActorName      string                 `json:"actorName"`
	ActorRole      string                 `json:"actorRole"`
	Action         string                 `json:"action"` // created, updated, submitted, approved, rejected, attachment_uploaded, quotation_gate_bypassed
	Changes        map[string]interface{} `json:"changes"`
	Details        json.RawMessage        `json:"details,omitempty"` // Arbitrary context: field deltas, old/new values, etc.
	CreatedAt      time.Time              `json:"createdAt"`
}

// Notification for email/SMS delivery
type Notification struct {
	ID             string        `json:"id"`
	OrganizationID string        `json:"organizationId"`
	Organization   *Organization `json:"organization,omitempty"`
	RecipientID    string        `json:"recipientId"`
	Recipient      *User         `json:"recipient,omitempty"`
	Type           string        `json:"type"` // approval_required, approved, rejected, assigned
	DocumentID     string        `json:"documentId"`
	DocumentType   string        `json:"documentType"`
	Subject        string        `json:"subject"`
	Body           string        `json:"body"`
	Sent           bool          `json:"sent"`
	SentAt         *time.Time    `json:"sentAt,omitempty"`

	// Frontend compatibility fields
	EntityID           string                 `json:"entityId,omitempty"`           // Maps to documentId for backward compatibility
	EntityType         string                 `json:"entityType,omitempty"`         // Maps to documentType for backward compatibility
	EntityNumber       string                 `json:"entityNumber,omitempty"`       // Document reference number
	RelatedUserID      string                 `json:"relatedUserId,omitempty"`      // User who triggered the notification
	RelatedUserName    string                 `json:"relatedUserName,omitempty"`    // Name of the user who triggered the notification
	IsRead             bool                   `json:"isRead,omitempty"`             // Read status
	ReadAt             *time.Time             `json:"readAt,omitempty"`             // When notification was read
	ActionTaken        bool                   `json:"actionTaken,omitempty"`        // Whether action was taken
	ActionTakenAt      *time.Time             `json:"actionTakenAt,omitempty"`      // When action was taken
	Importance         string                 `json:"importance,omitempty"`         // Notification importance (HIGH, MEDIUM, LOW)
	QuickAction        json.RawMessage        `json:"quickAction,omitempty"` // Quick action configuration
	ReassignmentReason string                 `json:"reassignmentReason,omitempty"` // Reason for reassignment (if applicable)
	Message            string                 `json:"message,omitempty"`            // Message content for filtering

	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

// NotificationPreferences stores user notification preferences
type NotificationPreferences struct {
	ID                     string    `json:"id"`
	UserID                 string    `json:"userId"`
	User                   *User     `json:"user,omitempty"`
	OrganizationID         string    `json:"organizationId"`
	Organization           *Organization `json:"organization,omitempty"`
	EmailEnabled           bool      `json:"emailEnabled"`
	PushEnabled            bool      `json:"pushEnabled"`
	InAppEnabled           bool      `json:"inAppEnabled"`
	NotifyTaskAssigned     bool      `json:"notifyTaskAssigned"`
	NotifyTaskReassigned   bool      `json:"notifyTaskReassigned"`
	NotifyTaskApproved     bool      `json:"notifyTaskApproved"`
	NotifyTaskRejected     bool      `json:"notifyTaskRejected"`
	NotifyWorkflowComplete bool      `json:"notifyWorkflowComplete"`
	NotifyApprovalOverdue  bool      `json:"notifyApprovalOverdue"`
	NotifyCommentsAdded    bool      `json:"notifyCommentsAdded"`
	QuietHoursEnabled      bool      `json:"quietHoursEnabled"`
	QuietHoursStart        int       `json:"quietHoursStart"` // 22 = 10 PM
	QuietHoursEnd          int       `json:"quietHoursEnd"`    // 8 = 8 AM
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}
