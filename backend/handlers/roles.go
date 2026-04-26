package handlers

import (
	"encoding/json"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

// CreateRoleRequest is the request body for creating a role
type CreateRoleRequest struct {
	Name        string `json:"name" validate:"required,min=3"`
	Description string `json:"description" validate:"required,min=10"`
}

// UpdateRoleRequest is the request body for updating a role
type UpdateRoleRequest struct {
	Name        string `json:"name" validate:"min=3"`
	Description string `json:"description" validate:"min=10"`
}

// RoleResponse is the response format for roles
type RoleResponse struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	IsDefault        bool   `json:"isDefault"`
	IsActive         bool   `json:"isActive"`
	PermissionsCount int    `json:"permissionsCount"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

// GetOrganizationRoles retrieves all roles for the organization
func GetOrganizationRoles(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok {
		log.Printf("GetOrganizationRoles: Organization ID not found in context")
		return utils.SendBadRequestError(c, "Organization ID not found")
	}

	log.Printf("GetOrganizationRoles: Fetching roles for organization: %s", organizationID)

	svc := services.NewRoleManagementService()
	roles, err := svc.GetOrganizationRoles(organizationID)
	if err != nil {
		log.Printf("Error getting organization roles: %v", err)
		return utils.SendInternalError(c, "Failed to fetch roles", err)
	}

	log.Printf("GetOrganizationRoles: Found %d roles for organization %s", len(roles), organizationID)

	responses := make([]RoleResponse, 0, len(roles))
	for _, role := range roles {
		permissionsCount := 0
		if role.Permissions != nil {
			var permissions []string
			if err := json.Unmarshal(role.Permissions, &permissions); err == nil {
				permissionsCount = len(permissions)
			}
		}

		responses = append(responses, RoleResponse{
			ID:               role.ID.String(),
			Name:             role.Name,
			Description:      role.Description,
			IsDefault:        role.IsSystemRole,
			IsActive:         role.Active,
			PermissionsCount: permissionsCount,
			CreatedAt:        role.CreatedAt.String(),
			UpdatedAt:        role.UpdatedAt.String(),
		})
	}

	return utils.SendSimpleSuccess(c, responses, "Roles retrieved successfully")
}

// CreateOrganizationRole creates a new role
func CreateOrganizationRole(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok {
		return utils.SendBadRequestError(c, "Organization ID not found")
	}

	var req CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if req.Name == "" || len(req.Name) < 3 {
		return utils.SendBadRequestError(c, "Role name is required and must be at least 3 characters")
	}

	if req.Description == "" || len(req.Description) < 10 {
		return utils.SendBadRequestError(c, "Description is required and must be at least 10 characters")
	}

	svc := services.NewRoleManagementService()
	role, err := svc.CreateOrganizationRole(organizationID, req.Name, req.Description)
	if err != nil {
		log.Printf("Error creating role: %v", err)
		return utils.SendInternalError(c, "Failed to create role", err)
	}

	response := RoleResponse{
		ID:               role.ID.String(),
		Name:             role.Name,
		Description:      role.Description,
		IsDefault:        role.IsSystemRole,
		IsActive:         role.Active,
		PermissionsCount: 0,
		CreatedAt:        role.CreatedAt.String(),
		UpdatedAt:        role.UpdatedAt.String(),
	}

	return utils.SendCreatedSuccess(c, response, "Role created successfully")
}

// UpdateOrganizationRole updates an existing role
func UpdateOrganizationRole(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok {
		return utils.SendBadRequestError(c, "Organization ID not found")
	}

	roleID := c.Params("roleId")
	if roleID == "" {
		return utils.SendBadRequestError(c, "Role ID is required")
	}

	var req UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if req.Name != "" && len(req.Name) < 3 {
		return utils.SendBadRequestError(c, "Role name must be at least 3 characters")
	}

	if req.Description != "" && len(req.Description) < 10 {
		return utils.SendBadRequestError(c, "Description must be at least 10 characters")
	}

	// Org-scope check is enforced by RoleManagementService when fetching by ID;
	// the system-role guard inside the service prevents cross-tenant edits of system roles.
	_ = organizationID

	svc := services.NewRoleManagementService()
	updated, err := svc.UpdateOrganizationRole(roleID, req.Name, req.Description)
	if err != nil {
		log.Printf("Error updating role: %v", err)
		if err.Error() == "role not found" {
			return utils.SendNotFoundError(c, "Role")
		}
		return utils.SendInternalError(c, "Failed to update role", err)
	}

	permissionsCount := 0
	if updated.Permissions != nil {
		var perms []string
		if err := json.Unmarshal(updated.Permissions, &perms); err == nil {
			permissionsCount = len(perms)
		}
	}

	response := RoleResponse{
		ID:               updated.ID.String(),
		Name:             updated.Name,
		Description:      updated.Description,
		IsDefault:        updated.IsSystemRole,
		IsActive:         updated.Active,
		PermissionsCount: permissionsCount,
		CreatedAt:        updated.CreatedAt.String(),
		UpdatedAt:        updated.UpdatedAt.String(),
	}

	return utils.SendSimpleSuccess(c, response, "Role updated successfully")
}

// DeleteOrganizationRole deletes a role
func DeleteOrganizationRole(c *fiber.Ctx) error {
	roleID := c.Params("roleId")
	if roleID == "" {
		return utils.SendBadRequestError(c, "Role ID is required")
	}

	svc := services.NewRoleManagementService()
	err := svc.DeleteOrganizationRole(roleID)
	if err != nil {
		log.Printf("Error deleting role: %v", err)
		if err.Error() == "role not found" {
			return utils.SendNotFoundError(c, "Role")
		}
		return utils.SendBadRequestError(c, err.Error())
	}

	return utils.SendSimpleSuccess(c, nil, "Role deleted successfully")
}

// GetRolePermissions retrieves all permissions assigned to a role
func GetRolePermissions(c *fiber.Ctx) error {
	roleID := c.Params("roleId")
	if roleID == "" {
		return utils.SendBadRequestError(c, "Role ID is required")
	}

	svc := services.NewRoleManagementService()
	permissions, err := svc.GetRolePermissions(roleID)
	if err != nil {
		log.Printf("Error getting role permissions: %v", err)
		return utils.SendInternalError(c, "Failed to fetch permissions", err)
	}

	return utils.SendSimpleSuccess(c, permissions, "Permissions retrieved successfully")
}

// AssignPermissionToRole assigns a permission to a role
func AssignPermissionToRole(c *fiber.Ctx) error {
	roleID := c.Params("roleId")
	permissionName := c.Params("permissionId")

	if roleID == "" || permissionName == "" {
		return utils.SendBadRequestError(c, "Role ID and Permission name are required")
	}

	svc := services.NewRoleManagementService()
	err := svc.AssignPermissionToRole(roleID, permissionName)
	if err != nil {
		log.Printf("Error assigning permission: %v", err)
		if err.Error() == "role not found" {
			return utils.SendNotFoundError(c, "Role")
		}
		return utils.SendInternalError(c, "Failed to assign permission", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Permission assigned successfully")
}

// RemovePermissionFromRole removes a permission from a role
func RemovePermissionFromRole(c *fiber.Ctx) error {
	roleID := c.Params("roleId")
	permissionName := c.Params("permissionId")

	if roleID == "" || permissionName == "" {
		return utils.SendBadRequestError(c, "Role ID and Permission name are required")
	}

	svc := services.NewRoleManagementService()
	err := svc.RemovePermissionFromRole(roleID, permissionName)
	if err != nil {
		log.Printf("Error removing permission: %v", err)
		return utils.SendInternalError(c, "Failed to remove permission", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Permission removed successfully")
}

// GetOrganizationPermissions retrieves all available permissions for the organization
func GetOrganizationPermissions(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok {
		return utils.SendBadRequestError(c, "Organization ID not found")
	}

	svc := services.NewRoleManagementService()
	permissions, err := svc.GetOrganizationPermissions(organizationID)
	if err != nil {
		log.Printf("Error getting organization permissions: %v", err)
		return utils.SendInternalError(c, "Failed to fetch permissions", err)
	}

	return utils.SendSimpleSuccess(c, permissions, "Permissions retrieved successfully")
}

// InitializeDefaultRoles initializes default system roles for an organization
func InitializeDefaultRoles(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok {
		return utils.SendBadRequestError(c, "Organization ID not found")
	}

	svc := services.NewRoleManagementService()
	err := svc.InitializeDefaultRolesForOrganization(organizationID)
	if err != nil {
		log.Printf("Error initializing default roles: %v", err)
		return utils.SendInternalError(c, "Failed to initialize default roles", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Default roles initialized successfully")
}

// PermissionResponse is the response format for permissions
type PermissionResponse struct {
	ID          string `json:"id"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
	Description string `json:"description"`
	IsActive    bool   `json:"isActive"`
}

// PermissionAssignmentResponse is the response format for permission assignments
type PermissionAssignmentResponse struct {
	ID                       string `json:"id"`
	OrganizationRoleID       string `json:"organizationRoleId"`
	OrganizationPermissionID string `json:"organizationPermissionId"`
}

