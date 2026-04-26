package models

import (
	"encoding/json"
	"time"
)

// Organization represents a tenant/workspace
type Organization struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description,omitempty"`

	// Branding
	LogoURL      string `json:"logoUrl,omitempty"`
	Tagline      string `json:"tagline,omitempty"`
	PrimaryColor string `json:"primaryColor"`

	// Status
	Active bool `json:"active"`

	// Relationships
	CreatedBy string `json:"createdBy"`
	Creator   *User  `json:"creator,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// OrganizationSettings stores per-org configuration
type OrganizationSettings struct {
	ID             string `json:"id"`
	OrganizationID string `json:"organizationId"`
	Organization   *Organization `json:"organization,omitempty"`

	// Approval Settings
	RequireDigitalSignatures bool   `json:"requireDigitalSignatures"`
	DefaultApprovalChain     string `json:"defaultApprovalChain,omitempty"`

	// Financial Settings
	Currency                  string  `json:"currency"`
	FiscalYearStart          int     `json:"fiscalYearStart"`
	EnableBudgetValidation   bool    `json:"enableBudgetValidation"`
	BudgetVarianceThreshold  float64 `json:"budgetVarianceThreshold"`

	// Procurement Flow: "goods_first" (receive goods before payment) or "payment_first" (pay before receiving goods)
	ProcurementFlow string `json:"procurementFlow"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// OrganizationMember represents user-organization relationship
type OrganizationMember struct {
	ID             string `json:"id"`
	OrganizationID string `json:"organizationId"`
	Organization   *Organization `json:"organization,omitempty"`
	UserID         string `json:"userId"`
	User           *User  `json:"user,omitempty"`

	// Membership Details
	Role         string  `json:"role"` // admin, manager, approver, requester, viewer
	RoleID       string  `json:"roleId,omitempty"` // Computed field for role ID
	RoleName     string  `json:"roleName,omitempty"` // Computed field for role name
	Department   string  `json:"department,omitempty"`
	DepartmentID *string `json:"departmentId,omitempty"` // Foreign key to OrganizationDepartment
	BranchID     *string `json:"branchId,omitempty"`     // Foreign key to OrganizationBranch
	Title        string  `json:"title,omitempty"`

	// Status
	Active     bool       `json:"active"`
	InvitedAt  *time.Time `json:"invitedAt,omitempty"`
	JoinedAt   *time.Time `json:"joinedAt,omitempty"`
	InvitedBy  *string    `json:"invitedBy,omitempty"`

	// Custom permissions override
	CustomPermissions json.RawMessage `json:"customPermissions,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// OrganizationDepartment represents departments within an organization
type OrganizationDepartment struct {
	ID             string `json:"id"`
	OrganizationID string `json:"organizationId"`
	Organization   *Organization `json:"organization,omitempty"`

	Name        string  `json:"name"`
	Code        string  `json:"code,omitempty"`
	Description string  `json:"description,omitempty"`
	ManagerName string  `json:"manager_name,omitempty"`
	ParentID    *string `json:"parentId,omitempty"`

	IsActive bool `json:"is_active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// OrganizationBranch represents a physical branch/office location of an organization
type OrganizationBranch struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	Name           string    `json:"name"`
	Code           string    `json:"code"`
	ProvinceID     string    `json:"provinceId,omitempty"`
	TownID         string    `json:"townId,omitempty"`
	Address        string    `json:"address,omitempty"`
	ManagerID      *string   `json:"managerId,omitempty"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// Province represents a Zambian province (global reference data)
type Province struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

// Town represents a Zambian town/district (global reference data)
type Town struct {
	ID         string `json:"id"`
	ProvinceID string `json:"provinceId"`
	Name       string `json:"name"`
	Code       string `json:"code,omitempty"`
}

// Note: OrganizationRole, OrganizationPermission, and PermissionAssignment
// have been moved to enhanced_auth.go for the new RBAC system
