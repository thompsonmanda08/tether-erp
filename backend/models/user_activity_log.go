package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// UserActivityLog records a single user action
type UserActivityLog struct {
	ID             uuid.UUID       `json:"id"`
	UserID         string          `json:"userId"`
	User           *User           `json:"user,omitempty"`
	OrganizationID *string         `json:"organizationId,omitempty"`
	ActionType     string          `json:"actionType"`
	ResourceType   string          `json:"resourceType,omitempty"`
	ResourceID     string          `json:"resourceId,omitempty"`
	IPAddress      string          `json:"ipAddress,omitempty"`
	UserAgent      string          `json:"userAgent,omitempty"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
	CreatedAt      time.Time       `json:"createdAt"`
}

// ActivityFilters holds query parameters for filtering activity logs
type ActivityFilters struct {
	Page         int        `query:"page"`
	Limit        int        `query:"limit"`
	StartDate    *time.Time `query:"start_date"`
	EndDate      *time.Time `query:"end_date"`
	ActionType   string     `query:"action_type"`
	ResourceType string     `query:"resource_type"`
	Search       string     `query:"search"`
}

// PaginationMetadata describes paginated response metadata
type PaginationMetadata struct {
	TotalRecords    int64 `json:"totalRecords"`
	TotalPages      int   `json:"totalPages"`
	CurrentPage     int   `json:"currentPage"`
	HasNextPage     bool  `json:"hasNextPage"`
	HasPreviousPage bool  `json:"hasPreviousPage"`
}

// ActivityResponse is the user-facing paginated activity response
type ActivityResponse struct {
	Activities []*UserActivityLog `json:"activities"`
	Pagination PaginationMetadata `json:"pagination"`
}

// ActivityStatistics aggregates activity metrics for a user
type ActivityStatistics struct {
	TotalActions     int64             `json:"totalActions"`
	ActionsByType    map[string]int64  `json:"actionsByType"`
	ActionsByDay     map[string]int64  `json:"actionsByDay"`
	MostCommonAction string            `json:"mostCommonAction"`
	LastActivityTime *time.Time        `json:"lastActivityTime,omitempty"`
	AveragePerDay    float64           `json:"averagePerDay"`
}

// AdminActivityResponse is the admin-facing paginated activity response with statistics
type AdminActivityResponse struct {
	Activities []*UserActivityLog  `json:"activities"`
	Statistics *ActivityStatistics `json:"statistics,omitempty"`
	Pagination PaginationMetadata  `json:"pagination"`
}

// SessionWithMetadata extends Session with parsed device/browser info
type SessionWithMetadata struct {
	ID           uuid.UUID  `json:"id"`
	UserID       string     `json:"userId"`
	IPAddress    string     `json:"ipAddress"`
	UserAgent    string     `json:"userAgent"`
	DeviceType   string     `json:"deviceType"`
	Browser      string     `json:"browser"`
	OS           string     `json:"os"`
	IsCurrent    bool       `json:"isCurrent"`
	IsExpired    bool       `json:"isExpired"`
	InactiveDays int        `json:"inactiveDays"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
	ExpiresAt    time.Time  `json:"expiresAt"`
	LastActiveAt *time.Time `json:"lastActiveAt,omitempty"`
}

// SecurityEvent represents a security-relevant activity entry
type SecurityEvent struct {
	ID           uuid.UUID       `json:"id"`
	UserID       string          `json:"userId"`
	EventType    string          `json:"eventType"`
	Severity     string          `json:"severity"` // low, medium, high, critical
	IPAddress    string          `json:"ipAddress,omitempty"`
	UserAgent    string          `json:"userAgent,omitempty"`
	Details      json.RawMessage `json:"details,omitempty"`
	CreatedAt    time.Time       `json:"createdAt"`
}

// Known action types for the activity logging system
const (
	ActionLogin              = "login"
	ActionFailedLogin        = "failed_login"
	ActionLogout             = "logout"
	ActionPasswordChange     = "password_change"
	ActionPasswordReset      = "password_reset_request"
	ActionProfileUpdate      = "profile_update"
	ActionPreferencesUpdate  = "preferences_update"
	ActionSessionTerminate   = "session_terminate"
	ActionRequisitionCreate  = "requisition_create"
	ActionRequisitionUpdate  = "requisition_update"
	ActionRequisitionSubmit  = "requisition_submit"
	ActionPurchaseOrderCreate = "purchase_order_create"
	ActionPurchaseOrderUpdate = "purchase_order_update"
	ActionPaymentVoucherCreate = "payment_voucher_create"
	ActionPaymentVoucherUpdate = "payment_voucher_update"
	ActionGRNCreate          = "grn_create"
	ActionGRNUpdate          = "grn_update"
	ActionApprovalAction     = "approval_action"
	ActionAccountLockout     = "account_lockout"
)

// SecurityActionTypes is the set of action types classified as security events
var SecurityActionTypes = map[string]bool{
	ActionLogin:          true,
	ActionFailedLogin:    true,
	ActionLogout:         true,
	ActionPasswordChange: true,
	ActionPasswordReset:  true,
	ActionSessionTerminate: true,
	ActionAccountLockout: true,
}
