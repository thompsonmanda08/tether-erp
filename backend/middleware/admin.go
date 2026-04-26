package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/utils"
)

// AdminMiddleware ensures the user has admin privileges
func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		
		// Get user role from context (set by auth middleware)
		userRole, ok := c.Locals("userRole").(string)
		if !ok {
			logger.Error("User role not found in context")
			return c.Status(fiber.StatusUnauthorized).JSON(utils.ErrorResponse("Authentication required"))
		}

		// Check if user has admin privileges
		// Allow admin, super_admin, or compliance_officer roles
		adminRoles := []string{"admin", "super_admin", "compliance_officer"}
		isAdmin := false
		
		for _, role := range adminRoles {
			if userRole == role {
				isAdmin = true
				break
			}
		}

		if !isAdmin {
			logger.WithFields(map[string]interface{}{
				"user_role": userRole,
				"required_roles": adminRoles,
			}).Warn("User attempted to access admin endpoint without proper role")
			
			return c.Status(fiber.StatusForbidden).JSON(utils.ErrorResponse("Admin privileges required"))
		}

		logger.WithFields(map[string]interface{}{
			"user_role": userRole,
		}).Info("Admin access granted")

		return c.Next()
	}
}

// SuperAdminMiddleware ensures the user has super admin privileges
func SuperAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		
		// Get user role from context (set by auth middleware)
		userRole, ok := c.Locals("userRole").(string)
		if !ok {
			logger.Error("User role not found in context")
			return c.Status(fiber.StatusUnauthorized).JSON(utils.ErrorResponse("Authentication required"))
		}

		// Check if user has super admin privileges
		if userRole != "super_admin" {
			logger.WithFields(map[string]interface{}{
				"user_role": userRole,
				"required_role": "super_admin",
			}).Warn("User attempted to access super admin endpoint without proper role")
			
			return c.Status(fiber.StatusForbidden).JSON(utils.ErrorResponse("Super admin privileges required"))
		}

		logger.WithFields(map[string]interface{}{
			"user_role": userRole,
		}).Info("Super admin access granted")

		return c.Next()
	}
}

// OrganizationAdminMiddleware ensures the user is an admin of the specific organization
func OrganizationAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		
		// Get organization ID from URL params
		organizationID := c.Params("id")
		if organizationID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(utils.ErrorResponse("Organization ID is required"))
		}

		// Get user ID and role from context (set by auth middleware)
		userID, ok := c.Locals("userID").(string)
		if !ok {
			logger.Error("User ID not found in context")
			return c.Status(fiber.StatusUnauthorized).JSON(utils.ErrorResponse("Authentication required"))
		}

		userRole, ok := c.Locals("userRole").(string)
		if !ok {
			logger.Error("User role not found in context")
			return c.Status(fiber.StatusUnauthorized).JSON(utils.ErrorResponse("Authentication required"))
		}

		// Super admins can access any organization
		if userRole == "super_admin" {
			logger.WithFields(map[string]interface{}{
				"user_id": userID,
				"user_role": userRole,
				"organization_id": organizationID,
			}).Info("Super admin access granted for organization")
			
			return c.Next()
		}

		// For regular users, check if they are admin of this specific organization
		// This would require a database check, but for now we'll allow admin role users
		// TODO: Implement proper organization membership check
		if userRole == "admin" {
			logger.WithFields(map[string]interface{}{
				"user_id": userID,
				"user_role": userRole,
				"organization_id": organizationID,
			}).Info("Admin access granted for organization")
			
			return c.Next()
		}

		logger.WithFields(map[string]interface{}{
			"user_id": userID,
			"user_role": userRole,
			"organization_id": organizationID,
		}).Warn("User attempted to access organization admin endpoint without proper permissions")

		return c.Status(fiber.StatusForbidden).JSON(utils.ErrorResponse("Organization admin privileges required"))
	}
}