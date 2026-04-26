package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

// GetMyPermissions returns the current authenticated user's permissions.
// The rbacService must be properly initialized (with roleRepo).
// GET /api/v1/me/permissions — no specific permission required, just authentication
func GetMyPermissions(c *fiber.Ctx, rbacService *services.RBACService) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return utils.SendUnauthorizedError(c, "Authentication required")
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendBadRequestError(c, "Organization context required")
	}

	permissions, err := rbacService.GetUserPermissions(c.Context(), userID, tenant.OrganizationID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to get permissions", err)
	}

	return utils.SendSimpleSuccess(c, permissions, "Permissions retrieved successfully")
}

// GetUserPermissions returns all permissions for a user
// GET /api/v1/users/:userId/permissions
func GetUserPermissions(c *fiber.Ctx) error {
	userID := c.Params("userId")
	if userID == "" {
		return utils.SendBadRequestError(c, "User ID is required")
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendBadRequestError(c, "Organization context required")
	}

	rbacService := services.NewRBACService(
		// TODO: inject these dependencies properly via the handler registry
		nil, nil,
	)

	permissions, err := rbacService.GetUserPermissions(c.Context(), userID, tenant.OrganizationID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to get user permissions", err)
	}

	deniedPermissions, err := rbacService.GetUserDeniedPermissions(c.Context(), userID, tenant.OrganizationID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to get denied permissions", err)
	}

	response := map[string]interface{}{
		"userId":            userID,
		"organizationId":    tenant.OrganizationID,
		"permissions":       permissions,
		"deniedPermissions": deniedPermissions,
	}

	return utils.SendSimpleSuccess(c, response, "User permissions retrieved successfully")
}

// RevokeUserPermission revokes a specific permission from a user
// DELETE /api/v1/users/:userId/permissions/:resource/:action
func RevokeUserPermission(c *fiber.Ctx) error {
	userID := c.Params("userId")
	resource := c.Params("resource")
	action := c.Params("action")

	if userID == "" || resource == "" || action == "" {
		return utils.SendBadRequestError(c, "User ID, resource, and action are required")
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendBadRequestError(c, "Organization context required")
	}

	// Get the current user (who is performing the revocation)
	currentUserID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User context required")
	}

	rbacService := services.NewRBACService(
		// TODO: inject these dependencies properly via the handler registry
		nil, nil,
	)

	err = rbacService.RevokeUserPermission(c.Context(), userID, tenant.OrganizationID, resource, action, currentUserID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to revoke permission", err)
	}

	response := map[string]interface{}{
		"userId":         userID,
		"organizationId": tenant.OrganizationID,
		"resource":       resource,
		"action":         action,
		"status":         "revoked",
		"revokedBy":      currentUserID,
	}

	return utils.SendSimpleSuccess(c, response, "Permission revoked successfully")
}

// GrantUserPermission grants a specific permission to a user
// POST /api/v1/users/:userId/permissions/:resource/:action
func GrantUserPermission(c *fiber.Ctx) error {
	userID := c.Params("userId")
	resource := c.Params("resource")
	action := c.Params("action")

	if userID == "" || resource == "" || action == "" {
		return utils.SendBadRequestError(c, "User ID, resource, and action are required")
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendBadRequestError(c, "Organization context required")
	}

	// Get the current user (who is performing the grant)
	currentUserID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User context required")
	}

	rbacService := services.NewRBACService(
		// TODO: inject these dependencies properly via the handler registry
		nil, nil,
	)

	err = rbacService.GrantUserPermission(c.Context(), userID, tenant.OrganizationID, resource, action, currentUserID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to grant permission", err)
	}

	response := map[string]interface{}{
		"userId":         userID,
		"organizationId": tenant.OrganizationID,
		"resource":       resource,
		"action":         action,
		"status":         "granted",
		"grantedBy":      currentUserID,
	}

	return utils.SendSimpleSuccess(c, response, "Permission granted successfully")
}

// ListAllPermissions returns all available permissions in the system
// GET /api/v1/permissions
func ListAllPermissions(c *fiber.Ctx) error {
	permissions := make([]map[string]interface{}, 0)

	for id, permission := range services.SystemPermissions {
		permissions = append(permissions, map[string]interface{}{
			"id":          id,
			"name":        permission.Name,
			"description": permission.Description,
			"resource":    permission.Resource,
			"action":      permission.Action,
			"category":    permission.Category,
		})
	}

	response := map[string]interface{}{
		"permissions": permissions,
		"total":       len(permissions),
	}

	return utils.SendSimpleSuccess(c, response, "Permissions retrieved successfully")
}
