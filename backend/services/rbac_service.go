package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/repository"
)

// RBACService with custom organization roles.
//
// Migrated off GORM: organization_members lookups now go through the
// package-global sqlc Queries handle (config.Queries) — see GetMember
// in organization_members.sql.go. Role CRUD continues to use the
// existing OrganizationRoleRepository (already sqlc-backed).
type RBACService struct {
	roleRepo     repository.OrganizationRoleRepositoryInterface
	auditService *AuditService
}

// Permission structure
type Permission struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
	Category    string `json:"category"`
}

// Role creation request
type CreateRoleRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	PermissionIDs []string `json:"permissionIds"`
}

// Role update request
type UpdateRoleRequest struct {
	Name          *string  `json:"name,omitempty"`
	Description   *string  `json:"description,omitempty"`
	PermissionIDs []string `json:"permissionIds,omitempty"`
}

// System permissions definition
var SystemPermissions = map[string]Permission{
	// User Management
	"user.view":     {ID: "user.view", Name: "View Users", Description: "View user profiles and information", Resource: "user", Action: "view", Category: "User Management"},
	"user.create":   {ID: "user.create", Name: "Create Users", Description: "Create new user accounts", Resource: "user", Action: "create", Category: "User Management"},
	"user.edit":     {ID: "user.edit", Name: "Edit Users", Description: "Edit user profiles and information", Resource: "user", Action: "edit", Category: "User Management"},
	"user.delete":   {ID: "user.delete", Name: "Delete Users", Description: "Delete user accounts", Resource: "user", Action: "delete", Category: "User Management"},
	"user.activate": {ID: "user.activate", Name: "Activate Users", Description: "Activate/deactivate user accounts", Resource: "user", Action: "activate", Category: "User Management"},

	// Role Management
	"role.view":   {ID: "role.view", Name: "View Roles", Description: "View organization roles", Resource: "role", Action: "view", Category: "Role Management"},
	"role.create": {ID: "role.create", Name: "Create Roles", Description: "Create custom organization roles", Resource: "role", Action: "create", Category: "Role Management"},
	"role.edit":   {ID: "role.edit", Name: "Edit Roles", Description: "Edit custom organization roles", Resource: "role", Action: "edit", Category: "Role Management"},
	"role.delete": {ID: "role.delete", Name: "Delete Roles", Description: "Delete custom organization roles", Resource: "role", Action: "delete", Category: "Role Management"},
	"role.assign": {ID: "role.assign", Name: "Assign Roles", Description: "Assign roles to users", Resource: "role", Action: "assign", Category: "Role Management"},

	// Requisition Management
	"requisition.view":    {ID: "requisition.view", Name: "View Requisitions", Description: "View requisitions", Resource: "requisition", Action: "view", Category: "Procurement"},
	"requisition.create":  {ID: "requisition.create", Name: "Create Requisitions", Description: "Create new requisitions", Resource: "requisition", Action: "create", Category: "Procurement"},
	"requisition.edit":    {ID: "requisition.edit", Name: "Edit Requisitions", Description: "Edit requisitions", Resource: "requisition", Action: "edit", Category: "Procurement"},
	"requisition.delete":  {ID: "requisition.delete", Name: "Delete Requisitions", Description: "Delete requisitions", Resource: "requisition", Action: "delete", Category: "Procurement"},
	"requisition.approve": {ID: "requisition.approve", Name: "Approve Requisitions", Description: "Approve requisitions", Resource: "requisition", Action: "approve", Category: "Procurement"},
	"requisition.reject":  {ID: "requisition.reject", Name: "Reject Requisitions", Description: "Reject requisitions", Resource: "requisition", Action: "reject", Category: "Procurement"},

	// Budget Management
	"budget.view":    {ID: "budget.view", Name: "View Budgets", Description: "View budget information", Resource: "budget", Action: "view", Category: "Financial"},
	"budget.create":  {ID: "budget.create", Name: "Create Budgets", Description: "Create new budgets", Resource: "budget", Action: "create", Category: "Financial"},
	"budget.edit":    {ID: "budget.edit", Name: "Edit Budgets", Description: "Edit budget information", Resource: "budget", Action: "edit", Category: "Financial"},
	"budget.delete":  {ID: "budget.delete", Name: "Delete Budgets", Description: "Delete budgets", Resource: "budget", Action: "delete", Category: "Financial"},
	"budget.approve": {ID: "budget.approve", Name: "Approve Budgets", Description: "Approve budget allocations", Resource: "budget", Action: "approve", Category: "Financial"},
	"budget.reject":  {ID: "budget.reject", Name: "Reject Budgets", Description: "Reject budget allocations", Resource: "budget", Action: "reject", Category: "Financial"},

	// Purchase Order Management
	"purchase_order.view":    {ID: "purchase_order.view", Name: "View Purchase Orders", Description: "View purchase orders", Resource: "purchase_order", Action: "view", Category: "Procurement"},
	"purchase_order.create":  {ID: "purchase_order.create", Name: "Create Purchase Orders", Description: "Create new purchase orders", Resource: "purchase_order", Action: "create", Category: "Procurement"},
	"purchase_order.edit":    {ID: "purchase_order.edit", Name: "Edit Purchase Orders", Description: "Edit purchase orders", Resource: "purchase_order", Action: "edit", Category: "Procurement"},
	"purchase_order.delete":  {ID: "purchase_order.delete", Name: "Delete Purchase Orders", Description: "Delete purchase orders", Resource: "purchase_order", Action: "delete", Category: "Procurement"},
	"purchase_order.approve": {ID: "purchase_order.approve", Name: "Approve Purchase Orders", Description: "Approve purchase orders", Resource: "purchase_order", Action: "approve", Category: "Procurement"},
	"purchase_order.reject":  {ID: "purchase_order.reject", Name: "Reject Purchase Orders", Description: "Reject purchase orders", Resource: "purchase_order", Action: "reject", Category: "Procurement"},

	// Payment Voucher Management
	"payment_voucher.view":    {ID: "payment_voucher.view", Name: "View Payment Vouchers", Description: "View payment vouchers", Resource: "payment_voucher", Action: "view", Category: "Financial"},
	"payment_voucher.create":  {ID: "payment_voucher.create", Name: "Create Payment Vouchers", Description: "Create new payment vouchers", Resource: "payment_voucher", Action: "create", Category: "Financial"},
	"payment_voucher.edit":    {ID: "payment_voucher.edit", Name: "Edit Payment Vouchers", Description: "Edit payment vouchers", Resource: "payment_voucher", Action: "edit", Category: "Financial"},
	"payment_voucher.delete":  {ID: "payment_voucher.delete", Name: "Delete Payment Vouchers", Description: "Delete payment vouchers", Resource: "payment_voucher", Action: "delete", Category: "Financial"},
	"payment_voucher.approve": {ID: "payment_voucher.approve", Name: "Approve Payment Vouchers", Description: "Approve payment vouchers", Resource: "payment_voucher", Action: "approve", Category: "Financial"},
	"payment_voucher.reject":  {ID: "payment_voucher.reject", Name: "Reject Payment Vouchers", Description: "Reject payment vouchers", Resource: "payment_voucher", Action: "reject", Category: "Financial"},

	// GRN Management
	"grn.view":    {ID: "grn.view", Name: "View GRNs", Description: "View goods received notes", Resource: "grn", Action: "view", Category: "Procurement"},
	"grn.create":  {ID: "grn.create", Name: "Create GRNs", Description: "Create new goods received notes", Resource: "grn", Action: "create", Category: "Procurement"},
	"grn.edit":    {ID: "grn.edit", Name: "Edit GRNs", Description: "Edit goods received notes", Resource: "grn", Action: "edit", Category: "Procurement"},
	"grn.delete":  {ID: "grn.delete", Name: "Delete GRNs", Description: "Delete goods received notes", Resource: "grn", Action: "delete", Category: "Procurement"},
	"grn.approve": {ID: "grn.approve", Name: "Approve GRNs", Description: "Approve goods received notes", Resource: "grn", Action: "approve", Category: "Procurement"},
	"grn.reject":  {ID: "grn.reject", Name: "Reject GRNs", Description: "Reject goods received notes", Resource: "grn", Action: "reject", Category: "Procurement"},

	// Vendor Management
	"vendor.view":   {ID: "vendor.view", Name: "View Vendors", Description: "View vendor information", Resource: "vendor", Action: "view", Category: "Master Data"},
	"vendor.create": {ID: "vendor.create", Name: "Create Vendors", Description: "Create new vendors", Resource: "vendor", Action: "create", Category: "Master Data"},
	"vendor.edit":   {ID: "vendor.edit", Name: "Edit Vendors", Description: "Edit vendor information", Resource: "vendor", Action: "edit", Category: "Master Data"},
	"vendor.delete": {ID: "vendor.delete", Name: "Delete Vendors", Description: "Delete vendors", Resource: "vendor", Action: "delete", Category: "Master Data"},

	// Category Management
	"category.view":   {ID: "category.view", Name: "View Categories", Description: "View categories", Resource: "category", Action: "view", Category: "Master Data"},
	"category.create": {ID: "category.create", Name: "Create Categories", Description: "Create new categories", Resource: "category", Action: "create", Category: "Master Data"},
	"category.edit":   {ID: "category.edit", Name: "Edit Categories", Description: "Edit categories", Resource: "category", Action: "edit", Category: "Master Data"},
	"category.delete": {ID: "category.delete", Name: "Delete Categories", Description: "Delete categories", Resource: "category", Action: "delete", Category: "Master Data"},

	// Approval Management
	"approval.view":     {ID: "approval.view", Name: "View Approvals", Description: "View approval tasks", Resource: "approval", Action: "view", Category: "Workflow"},
	"approval.approve":  {ID: "approval.approve", Name: "Approve Tasks", Description: "Approve workflow tasks", Resource: "approval", Action: "approve", Category: "Workflow"},
	"approval.reject":   {ID: "approval.reject", Name: "Reject Tasks", Description: "Reject workflow tasks", Resource: "approval", Action: "reject", Category: "Workflow"},
	"approval.reassign": {ID: "approval.reassign", Name: "Reassign Tasks", Description: "Reassign approval tasks", Resource: "approval", Action: "reassign", Category: "Workflow"},
	"approval.comment":  {ID: "approval.comment", Name: "Comment on Tasks", Description: "Add comments to approval tasks", Resource: "approval", Action: "comment", Category: "Workflow"},

	// Workflow Management
	"workflow.view":   {ID: "workflow.view", Name: "View Workflows", Description: "View workflow definitions", Resource: "workflow", Action: "view", Category: "Workflow"},
	"workflow.create": {ID: "workflow.create", Name: "Create Workflows", Description: "Create new workflow definitions", Resource: "workflow", Action: "create", Category: "Workflow"},
	"workflow.edit":   {ID: "workflow.edit", Name: "Edit Workflows", Description: "Edit workflow definitions", Resource: "workflow", Action: "edit", Category: "Workflow"},
	"workflow.delete": {ID: "workflow.delete", Name: "Delete Workflows", Description: "Delete workflow definitions", Resource: "workflow", Action: "delete", Category: "Workflow"},
	"workflow.manage": {ID: "workflow.manage", Name: "Manage Workflows", Description: "Full workflow management", Resource: "workflow", Action: "manage", Category: "Workflow"},

	// Document Management
	"document.view":   {ID: "document.view", Name: "View Documents", Description: "View documents", Resource: "document", Action: "view", Category: "Document Management"},
	"document.create": {ID: "document.create", Name: "Create Documents", Description: "Create new documents", Resource: "document", Action: "create", Category: "Document Management"},
	"document.edit":   {ID: "document.edit", Name: "Edit Documents", Description: "Edit documents", Resource: "document", Action: "edit", Category: "Document Management"},
	"document.delete": {ID: "document.delete", Name: "Delete Documents", Description: "Delete documents", Resource: "document", Action: "delete", Category: "Document Management"},
	"document.submit": {ID: "document.submit", Name: "Submit Documents", Description: "Submit documents for approval", Resource: "document", Action: "submit", Category: "Document Management"},

	// Analytics & Reporting
	"analytics.view":     {ID: "analytics.view", Name: "View Analytics", Description: "View analytics and reports", Resource: "analytics", Action: "view", Category: "Analytics"},
	"analytics.export":   {ID: "analytics.export", Name: "Export Reports", Description: "Export analytics and reports", Resource: "analytics", Action: "export", Category: "Analytics"},
	"analytics.advanced": {ID: "analytics.advanced", Name: "Advanced Analytics", Description: "Access advanced analytics features", Resource: "analytics", Action: "advanced", Category: "Analytics"},

	// Audit & Compliance
	"audit.view":   {ID: "audit.view", Name: "View Audit Logs", Description: "View audit logs and compliance reports", Resource: "audit", Action: "view", Category: "Compliance"},
	"audit.export": {ID: "audit.export", Name: "Export Audit Logs", Description: "Export audit logs", Resource: "audit", Action: "export", Category: "Compliance"},

	// Organization Management
	"organization.view":   {ID: "organization.view", Name: "View Organization", Description: "View organization settings", Resource: "organization", Action: "view", Category: "Organization"},
	"organization.edit":   {ID: "organization.edit", Name: "Edit Organization", Description: "Edit organization settings", Resource: "organization", Action: "edit", Category: "Organization"},
	"organization.manage": {ID: "organization.manage", Name: "Manage Organization", Description: "Full organization management", Resource: "organization", Action: "manage", Category: "Organization"},
}

// System roles with predefined permissions
var SystemRoles = map[string][]string{
	"super_admin": {
		"user.view", "user.create", "user.edit", "user.delete", "user.activate",
		"role.view", "role.create", "role.edit", "role.delete", "role.assign",
		"requisition.view", "requisition.create", "requisition.edit", "requisition.delete", "requisition.approve", "requisition.reject",
		"budget.view", "budget.create", "budget.edit", "budget.delete", "budget.approve", "budget.reject",
		"purchase_order.view", "purchase_order.create", "purchase_order.edit", "purchase_order.delete", "purchase_order.approve", "purchase_order.reject",
		"payment_voucher.view", "payment_voucher.create", "payment_voucher.edit", "payment_voucher.delete", "payment_voucher.approve", "payment_voucher.reject",
		"grn.view", "grn.create", "grn.edit", "grn.delete", "grn.approve", "grn.reject",
		"vendor.view", "vendor.create", "vendor.edit", "vendor.delete",
		"category.view", "category.create", "category.edit", "category.delete",
		"approval.view", "approval.approve", "approval.reject", "approval.reassign", "approval.comment",
		"workflow.view", "workflow.create", "workflow.edit", "workflow.delete", "workflow.manage",
		"document.view", "document.create", "document.edit", "document.delete", "document.submit",
		"analytics.view", "analytics.export", "analytics.advanced",
		"audit.view", "audit.export",
		"organization.view", "organization.edit", "organization.manage",
	},
	"admin": {
		"user.view", "user.create", "user.edit", "user.delete", "user.activate",
		"role.view", "role.create", "role.edit", "role.delete", "role.assign",
		"requisition.view", "requisition.create", "requisition.edit", "requisition.delete", "requisition.approve", "requisition.reject",
		"budget.view", "budget.create", "budget.edit", "budget.delete", "budget.approve", "budget.reject",
		"purchase_order.view", "purchase_order.create", "purchase_order.edit", "purchase_order.delete", "purchase_order.approve", "purchase_order.reject",
		"payment_voucher.view", "payment_voucher.create", "payment_voucher.edit", "payment_voucher.delete", "payment_voucher.approve", "payment_voucher.reject",
		"grn.view", "grn.create", "grn.edit", "grn.delete", "grn.approve", "grn.reject",
		"vendor.view", "vendor.create", "vendor.edit", "vendor.delete",
		"category.view", "category.create", "category.edit", "category.delete",
		"approval.view", "approval.approve", "approval.reject", "approval.reassign", "approval.comment",
		"workflow.view", "workflow.create", "workflow.edit", "workflow.delete", "workflow.manage",
		"document.view", "document.create", "document.edit", "document.delete", "document.submit",
		"analytics.view", "analytics.export", "analytics.advanced",
		"audit.view", "audit.export",
		"organization.view", "organization.edit", "organization.manage",
	},
	"manager": {
		"user.view",
		"requisition.view", "requisition.create", "requisition.edit", "requisition.approve", "requisition.reject",
		"budget.view", "budget.approve", "budget.reject",
		"purchase_order.view", "purchase_order.approve", "purchase_order.reject",
		"payment_voucher.view", "payment_voucher.approve", "payment_voucher.reject",
		"grn.view", "grn.approve", "grn.reject",
		"vendor.view",
		"category.view",
		"approval.view", "approval.approve", "approval.reject", "approval.reassign", "approval.comment",
		"workflow.view",
		"document.view", "document.create", "document.edit", "document.submit",
		"analytics.view", "analytics.export",
		"audit.view",
		"organization.view",
	},
	"department_manager": {
		"user.view",
		"requisition.view", "requisition.create", "requisition.edit", "requisition.approve", "requisition.reject",
		"budget.view", "budget.approve", "budget.reject",
		"purchase_order.view", "purchase_order.approve", "purchase_order.reject",
		"payment_voucher.view", "payment_voucher.approve", "payment_voucher.reject",
		"grn.view", "grn.approve", "grn.reject",
		"vendor.view",
		"category.view",
		"approval.view", "approval.approve", "approval.reject", "approval.reassign", "approval.comment",
		"workflow.view",
		"document.view", "document.create", "document.edit", "document.submit",
		"analytics.view", "analytics.export",
		"audit.view",
		"organization.view",
	},
	"approver": {
		"requisition.view", "requisition.approve", "requisition.reject",
		"budget.view", "budget.approve", "budget.reject",
		"purchase_order.view", "purchase_order.approve", "purchase_order.reject",
		"payment_voucher.view", "payment_voucher.approve", "payment_voucher.reject",
		"grn.view", "grn.approve", "grn.reject",
		"vendor.view",
		"category.view",
		"approval.view", "approval.approve", "approval.reject", "approval.comment",
		"analytics.view",
		"organization.view",
		"workflow.view",
	},
	"finance": {
		"requisition.view",
		"budget.view", "budget.create", "budget.edit", "budget.approve", "budget.reject",
		"purchase_order.view", "purchase_order.create", "purchase_order.edit", "purchase_order.approve", "purchase_order.reject",
		"payment_voucher.view", "payment_voucher.create", "payment_voucher.edit", "payment_voucher.approve", "payment_voucher.reject",
		"vendor.view",
		"category.view",
		"approval.view", "approval.approve", "approval.reject", "approval.comment",
		"analytics.view", "analytics.export",
		"audit.view",
		"organization.view",
		"workflow.view",
	},
	"requester": {
		"requisition.view", "requisition.create", "requisition.edit",
		"budget.view",
		"purchase_order.view",
		"vendor.view",
		"category.view",
		"approval.view", "approval.comment",
		"document.view", "document.create", "document.edit", "document.submit",
		"organization.view",
		"workflow.view",
	},
	"viewer": {
		"requisition.view",
		"budget.view",
		"purchase_order.view",
		"payment_voucher.view",
		"grn.view",
		"vendor.view",
		"category.view",
		"approval.view",
		"document.view",
		"analytics.view",
		"organization.view",
		"workflow.view",
	},
}

// Custom errors
var (
	ErrRoleNotFound         = errors.New("role not found")
	ErrRoleAlreadyExists    = errors.New("role already exists")
	ErrCannotEditSystemRole = errors.New("cannot edit system role")
	ErrInvalidPermission    = errors.New("invalid permission")
)

// NewRBACService creates a new RBAC service.
//
// The previous *gorm.DB parameter has been removed as part of the
// GORM → sqlc + pgxpool migration; ad-hoc DB access goes through
// config.PgxDB / config.Queries.
func NewRBACService(
	roleRepo repository.OrganizationRoleRepositoryInterface,
	auditService *AuditService,
) *RBACService {
	return &RBACService{
		roleRepo:     roleRepo,
		auditService: auditService,
	}
}

// CreateCustomRole creates a new custom role for an organization
func (s *RBACService) CreateCustomRole(ctx context.Context, organizationID string, req CreateRoleRequest, createdBy string) (*sqlc.OrganizationRole, error) {
	// Check if role name already exists
	existingRole, err := s.roleRepo.GetByName(ctx, organizationID, req.Name)
	if err == nil && existingRole != nil {
		return nil, ErrRoleAlreadyExists
	}

	// Validate permissions
	if err := s.validatePermissions(req.PermissionIDs); err != nil {
		return nil, err
	}

	// Convert permissions to JSON
	permissionsJSON, err := json.Marshal(req.PermissionIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal permissions: %w", err)
	}

	// Create role
	role, err := s.roleRepo.Create(ctx, organizationID, req.Name, req.Description, false, permissionsJSON, createdBy)
	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Created custom role '%s' with %d permissions", req.Name, len(req.PermissionIDs))
		var roleIDStr string
		if role.ID.Valid {
			roleIDStr = uuid.UUID(role.ID.Bytes).String()
		}
		s.auditService.LogEvent(ctx, createdBy, organizationID, "role_created", "organization_role", roleIDStr, details, "", "")
	}

	return role, nil
}

// UpdateCustomRole updates a custom role
func (s *RBACService) UpdateCustomRole(ctx context.Context, roleID uuid.UUID, req UpdateRoleRequest, updatedBy string) (*sqlc.OrganizationRole, error) {
	// Get existing role
	existingRole, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return nil, ErrRoleNotFound
	}

	// Check if it's a system role
	if existingRole.IsSystemRole != nil && *existingRole.IsSystemRole {
		return nil, ErrCannotEditSystemRole
	}

	// Validate permissions if provided
	if req.PermissionIDs != nil {
		if err := s.validatePermissions(req.PermissionIDs); err != nil {
			return nil, err
		}
	}

	// Prepare update data
	name := existingRole.Name
	var description string
	if existingRole.Description != nil {
		description = *existingRole.Description
	}
	var permissionsJSON []byte

	if req.Name != nil {
		name = *req.Name
	}
	if req.Description != nil {
		description = *req.Description
	}
	if req.PermissionIDs != nil {
		permissionsJSON, err = json.Marshal(req.PermissionIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal permissions: %w", err)
		}
	}

	// Update role
	role, err := s.roleRepo.Update(ctx, roleID, name, description, permissionsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Updated custom role '%s'", name)
		var roleIDStr string
		if role.ID.Valid {
			roleIDStr = uuid.UUID(role.ID.Bytes).String()
		}
		orgID := ""
		if existingRole.OrganizationID != nil {
			orgID = *existingRole.OrganizationID
		}
		s.auditService.LogEvent(ctx, updatedBy, orgID, "role_updated", "organization_role", roleIDStr, details, "", "")
	}

	return role, nil
}

// DeleteCustomRole deletes a custom role
func (s *RBACService) DeleteCustomRole(ctx context.Context, roleID uuid.UUID, deletedBy string) error {
	// Get existing role
	existingRole, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return ErrRoleNotFound
	}

	// Check if it's a system role
	if existingRole.IsSystemRole != nil && *existingRole.IsSystemRole {
		return ErrCannotEditSystemRole
	}

	// Delete role (soft delete)
	if err := s.roleRepo.Delete(ctx, roleID); err != nil {
		return fmt.Errorf("failed to delete role: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Deleted custom role '%s'", existingRole.Name)
		orgID := ""
		if existingRole.OrganizationID != nil {
			orgID = *existingRole.OrganizationID
		}
		s.auditService.LogEvent(ctx, deletedBy, orgID, "role_deleted", "organization_role", roleID.String(), details, "", "")
	}

	return nil
}

// GetOrganizationRoles gets all roles for an organization
func (s *RBACService) GetOrganizationRoles(ctx context.Context, organizationID string, limit, offset int) ([]*sqlc.OrganizationRole, error) {
	return s.roleRepo.List(ctx, organizationID, limit, offset)
}

// GetCustomRoles gets only custom roles for an organization
func (s *RBACService) GetCustomRoles(ctx context.Context, organizationID string, limit, offset int) ([]*sqlc.OrganizationRole, error) {
	return s.roleRepo.ListCustom(ctx, organizationID, limit, offset)
}

// AssignUserRole assigns a role to a user
func (s *RBACService) AssignUserRole(ctx context.Context, userID, organizationID string, roleID uuid.UUID, assignedBy string) error {
	// Check if role exists
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return ErrRoleNotFound
	}

	// Assign role
	_, err = s.roleRepo.AssignUserRole(ctx, userID, organizationID, roleID, assignedBy)
	if err != nil {
		return fmt.Errorf("failed to assign role: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Assigned role '%s' to user", role.Name)
		s.auditService.LogEvent(ctx, assignedBy, organizationID, "role_assigned", "user", userID, details, "", "")
	}

	return nil
}

// RemoveUserRole removes a role from a user
func (s *RBACService) RemoveUserRole(ctx context.Context, userID, organizationID string, roleID uuid.UUID, removedBy string) error {
	// Get role for audit logging
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return ErrRoleNotFound
	}

	// Remove role
	if err := s.roleRepo.RemoveUserRole(ctx, userID, organizationID, roleID); err != nil {
		return fmt.Errorf("failed to remove role: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Removed role '%s' from user", role.Name)
		s.auditService.LogEvent(ctx, removedBy, organizationID, "role_removed", "user", userID, details, "", "")
	}

	return nil
}

// GetUserRoles gets all roles assigned to a user in an organization
func (s *RBACService) GetUserRoles(ctx context.Context, userID, organizationID string) ([]*sqlc.OrganizationRole, error) {
	return s.roleRepo.GetUserRoles(ctx, userID, organizationID)
}

// GetUserPermissions gets all permissions for a user in an organization
func (s *RBACService) GetUserPermissions(ctx context.Context, userID, organizationID string) ([]string, error) {
	// Get custom organization roles from database
	roles, err := s.roleRepo.GetUserRoles(ctx, userID, organizationID)
	if err != nil {
		return nil, err
	}

	permissionSet := make(map[string]bool)
	deniedPermissions := make(map[string]bool)

	// DEFAULT PERMISSIONS: Grant minimal view permissions to all users
	// This follows the principle of least privilege
	defaultViewPermissions := []string{
		"user.view",         // Needed for profile
		"notification.view", // Needed for basic UI interaction
	}

	// Grant default view permissions to all users
	for _, permission := range defaultViewPermissions {
		permissionSet[permission] = true
	}

	// Add permissions from custom organization roles (can override defaults)
	for _, role := range roles {
		var permissions []string
		if err := json.Unmarshal(role.Permissions, &permissions); err != nil {
			logging.WithFields(map[string]interface{}{
				"operation": "unmarshal_role_permissions",
				"role_name": role.Name,
				"role_id":   role.ID,
			}).WithError(err).Warn("failed_to_unmarshal_permissions_for_role")
			continue
		}

		for _, permission := range permissions {
			// Support for denied permissions (prefixed with "!")
			if len(permission) > 0 && permission[0] == '!' {
				// This is a denied permission
				deniedPermission := permission[1:] // Remove the "!" prefix
				deniedPermissions[deniedPermission] = true
				delete(permissionSet, deniedPermission) // Remove from granted permissions
			} else {
				// This is a granted permission
				permissionSet[permission] = true
			}
		}
	}

	// IMPORTANT: Also check system roles based on user's organization membership role.
	// Get user's role in the organization via the sqlc GetMember query. If the
	// member is inactive or no row is found, we skip system-role permissions.
	if config.Queries != nil {
		member, mErr := config.Queries.GetMember(ctx, sqlc.GetMemberParams{
			OrganizationID: organizationID,
			UserID:         userID,
		})
		if mErr == nil && (member.Active == nil || *member.Active) {
			if systemPermissions, exists := SystemRoles[member.Role]; exists {
				for _, permission := range systemPermissions {
					// System role permissions override denials (admins and super_admins can't be denied)
					if member.Role == "admin" || member.Role == "super_admin" || !deniedPermissions[permission] {
						permissionSet[permission] = true
					}
				}
			}
		}
	}

	// Remove any permissions that are explicitly denied
	for deniedPermission := range deniedPermissions {
		delete(permissionSet, deniedPermission)
	}

	// Convert set to slice
	permissions := make([]string, 0, len(permissionSet))
	for permission := range permissionSet {
		permissions = append(permissions, permission)
	}

	return permissions, nil
}

// HasPermission checks if a user has a specific permission
func (s *RBACService) HasPermission(ctx context.Context, userID, organizationID, resource, action string) (bool, error) {
	permissions, err := s.GetUserPermissions(ctx, userID, organizationID)
	if err != nil {
		return false, err
	}

	permissionID := fmt.Sprintf("%s.%s", resource, action)
	for _, permission := range permissions {
		if permission == permissionID {
			return true, nil
		}
	}

	return false, nil
}

// HasAnyPermission checks if a user has any of the specified permissions
func (s *RBACService) HasAnyPermission(ctx context.Context, userID, organizationID string, requiredPermissions []string) (bool, error) {
	for i := 0; i < len(requiredPermissions); i += 2 {
		if i+1 >= len(requiredPermissions) {
			break // Skip if we don't have a complete pair
		}

		resource := requiredPermissions[i]
		action := requiredPermissions[i+1]

		hasPermission, err := s.HasPermission(ctx, userID, organizationID, resource, action)
		if err != nil {
			return false, err
		}
		if hasPermission {
			return true, nil
		}
	}

	return false, nil
}

// InitializeSystemRoles creates system roles for an organization
func (s *RBACService) InitializeSystemRoles(ctx context.Context, organizationID, createdBy string) error {
	for roleName, permissions := range SystemRoles {
		// Check if role already exists
		existingRole, err := s.roleRepo.GetByName(ctx, organizationID, roleName)
		if err == nil && existingRole != nil {
			continue // Role already exists
		}

		// Create system role
		permissionsJSON, err := json.Marshal(permissions)
		if err != nil {
			logging.WithFields(map[string]interface{}{
				"operation": "marshal_system_role_permissions",
				"role_name": roleName,
			}).WithError(err).Warn("failed_to_marshal_permissions_for_system_role")
			continue
		}

		description := s.getSystemRoleDescription(roleName)
		_, err = s.roleRepo.Create(ctx, organizationID, roleName, description, true, permissionsJSON, createdBy)
		if err != nil {
			logging.WithFields(map[string]interface{}{
				"operation":       "create_system_role",
				"role_name":       roleName,
				"organization_id": organizationID,
			}).WithError(err).Warn("failed_to_create_system_role")
			continue
		}

		logging.WithFields(map[string]interface{}{
			"operation":       "create_system_role",
			"role_name":       roleName,
			"organization_id": organizationID,
		}).Info("created_system_role_for_organization")
	}

	return nil
}

// GetAllPermissions returns all available system permissions
func (s *RBACService) GetAllPermissions() []Permission {
	permissions := make([]Permission, 0, len(SystemPermissions))
	for _, permission := range SystemPermissions {
		permissions = append(permissions, permission)
	}
	return permissions
}

// GetPermissionsByCategory returns permissions grouped by category
func (s *RBACService) GetPermissionsByCategory() map[string][]Permission {
	categories := make(map[string][]Permission)

	for _, permission := range SystemPermissions {
		categories[permission.Category] = append(categories[permission.Category], permission)
	}

	return categories
}

// Helper methods

func (s *RBACService) validatePermissions(permissionIDs []string) error {
	for _, permissionID := range permissionIDs {
		if _, exists := SystemPermissions[permissionID]; !exists {
			return fmt.Errorf("%w: %s", ErrInvalidPermission, permissionID)
		}
	}
	return nil
}

func (s *RBACService) getSystemRoleDescription(roleName string) string {
	descriptions := map[string]string{
		"super_admin": "Full platform access with all permissions",
		"admin":       "Full system administrator with all permissions",
		"manager":     "Department manager with approval and oversight permissions",
		"approver":    "Approval authority for workflow tasks",
		"finance":     "Financial management and budget oversight",
		"requester":   "Can create and manage own requisitions",
		"viewer":      "Read-only access to system information",
	}

	if desc, exists := descriptions[roleName]; exists {
		return desc
	}
	return fmt.Sprintf("System role: %s", roleName)
}

// RevokeUserPermission revokes a specific permission from a user by creating a denial role
func (s *RBACService) RevokeUserPermission(ctx context.Context, userID, organizationID, resource, action, revokedBy string) error {
	permissionID := fmt.Sprintf("!%s.%s", resource, action) // Prefix with "!" to indicate denial

	// Create or update a "denied permissions" role for this user
	roleName := fmt.Sprintf("denied-permissions-%s", userID)

	// Check if the role already exists
	existingRole, err := s.roleRepo.GetByName(ctx, organizationID, roleName)
	if err != nil {
		// Role doesn't exist, create it
		permissions := []string{permissionID}
		permissionsJSON, _ := json.Marshal(permissions)

		_, err = s.roleRepo.Create(ctx, organizationID, roleName, "Auto-generated role for denied permissions", false, permissionsJSON, revokedBy)
		if err != nil {
			return fmt.Errorf("failed to create denied permissions role: %w", err)
		}

		// Assign the role to the user
		roleID := uuid.New() // This would need to be the actual role ID from the create response
		_, err = s.roleRepo.AssignUserRole(ctx, userID, organizationID, roleID, revokedBy)
		if err != nil {
			return fmt.Errorf("failed to assign denied permissions role: %w", err)
		}
	} else {
		// Role exists, add the denied permission to it
		var existingPermissions []string
		if err := json.Unmarshal(existingRole.Permissions, &existingPermissions); err != nil {
			return fmt.Errorf("failed to unmarshal existing permissions: %w", err)
		}

		// Add the new denied permission if not already present
		found := false
		for _, perm := range existingPermissions {
			if perm == permissionID {
				found = true
				break
			}
		}

		if !found {
			existingPermissions = append(existingPermissions, permissionID)
			permissionsJSON, _ := json.Marshal(existingPermissions)

			// Convert pgtype.UUID to uuid.UUID and handle nullable string
			roleUUID := uuid.UUID(existingRole.ID.Bytes)
			description := ""
			if existingRole.Description != nil {
				description = *existingRole.Description
			}

			_, err = s.roleRepo.Update(ctx, roleUUID, existingRole.Name, description, permissionsJSON)
			if err != nil {
				return fmt.Errorf("failed to update denied permissions role: %w", err)
			}
		}
	}

	// Log the permission revocation
	if s.auditService != nil {
		s.auditService.LogEvent(ctx, revokedBy, organizationID, "permission_revoked", "user", userID,
			fmt.Sprintf("Revoked permission %s.%s from user %s", resource, action, userID), "", "")
	}

	return nil
}

// GrantUserPermission grants a specific permission to a user by removing it from denials and/or adding it explicitly
func (s *RBACService) GrantUserPermission(ctx context.Context, userID, organizationID, resource, action, grantedBy string) error {
	permissionID := fmt.Sprintf("%s.%s", resource, action)
	deniedPermissionID := fmt.Sprintf("!%s", permissionID)

	// First, remove any denial of this permission
	roleName := fmt.Sprintf("denied-permissions-%s", userID)
	existingRole, err := s.roleRepo.GetByName(ctx, organizationID, roleName)
	if err == nil {
		// Role exists, remove the denied permission from it
		var existingPermissions []string
		if err := json.Unmarshal(existingRole.Permissions, &existingPermissions); err == nil {
			// Remove the denied permission
			updatedPermissions := make([]string, 0)
			for _, perm := range existingPermissions {
				if perm != deniedPermissionID {
					updatedPermissions = append(updatedPermissions, perm)
				}
			}

			if len(updatedPermissions) != len(existingPermissions) {
				// Permission was removed, update the role
				permissionsJSON, _ := json.Marshal(updatedPermissions)

				// Convert pgtype.UUID to uuid.UUID and handle nullable string
				roleUUID := uuid.UUID(existingRole.ID.Bytes)
				description := ""
				if existingRole.Description != nil {
					description = *existingRole.Description
				}

				_, err = s.roleRepo.Update(ctx, roleUUID, existingRole.Name, description, permissionsJSON)
				if err != nil {
					return fmt.Errorf("failed to update denied permissions role: %w", err)
				}
			}
		}
	}

	// Log the permission grant
	if s.auditService != nil {
		s.auditService.LogEvent(ctx, grantedBy, organizationID, "permission_granted", "user", userID,
			fmt.Sprintf("Granted permission %s.%s to user %s", resource, action, userID), "", "")
	}

	return nil
}

// GetUserDeniedPermissions returns a list of permissions that have been explicitly denied for a user
func (s *RBACService) GetUserDeniedPermissions(ctx context.Context, userID, organizationID string) ([]string, error) {
	roleName := fmt.Sprintf("denied-permissions-%s", userID)
	role, err := s.roleRepo.GetByName(ctx, organizationID, roleName)
	if err != nil {
		// No denied permissions role exists
		return []string{}, nil
	}

	var permissions []string
	if err := json.Unmarshal(role.Permissions, &permissions); err != nil {
		return nil, fmt.Errorf("failed to unmarshal denied permissions: %w", err)
	}

	// Remove the "!" prefix from denied permissions
	deniedPermissions := make([]string, 0)
	for _, perm := range permissions {
		if len(perm) > 0 && perm[0] == '!' {
			deniedPermissions = append(deniedPermissions, perm[1:])
		}
	}

	return deniedPermissions, nil
}
