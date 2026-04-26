package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

// AssignUserToDepartment assigns a user to a department
// POST /api/v1/users/:userId/department/:departmentId
func AssignUserToDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	userID := c.Params("userId")
	departmentID := c.Params("departmentId")

	if userID == "" || departmentID == "" {
		return utils.SendBadRequestError(c, "User ID and Department ID are required")
	}

	userSvc := services.NewUserService()
	deptSvc := services.NewDepartmentService()

	// Check if user exists and belongs to organization
	userExists, err := userSvc.UserExistsInOrganization(tenant.OrganizationID, userID)
	if err != nil {
		log.Printf("Error checking user existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate user", err)
	}
	if !userExists {
		return utils.SendNotFoundError(c, "User not found in organization")
	}

	// Check if department exists and belongs to organization
	deptExists, err := deptSvc.DepartmentExists(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error checking department existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate department", err)
	}
	if !deptExists {
		return utils.SendNotFoundError(c, "Department")
	}

	// Assign user to department
	err = userSvc.AssignUserToDepartment(tenant.OrganizationID, userID, departmentID)
	if err != nil {
		log.Printf("Error assigning user to department: %v", err)
		return utils.SendInternalError(c, "Failed to assign user to department", err)
	}

	return utils.SendSimpleSuccess(c, nil, "User assigned to department successfully")
}

// GetUserDepartment retrieves the department assigned to a user
// GET /api/v1/users/:userId/department
func GetUserDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	userID := c.Params("userId")
	if userID == "" {
		return utils.SendBadRequestError(c, "User ID is required")
	}

	userSvc := services.NewUserService()

	// Check if user exists and belongs to organization
	userExists, err := userSvc.UserExistsInOrganization(tenant.OrganizationID, userID)
	if err != nil {
		log.Printf("Error checking user existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate user", err)
	}
	if !userExists {
		return utils.SendNotFoundError(c, "User not found in organization")
	}

	// Get user's department
	department, err := userSvc.GetUserDepartment(tenant.OrganizationID, userID)
	if err != nil {
		log.Printf("Error getting user department: %v", err)
		return utils.SendInternalError(c, "Failed to fetch user department", err)
	}

	return utils.SendSimpleSuccess(c, department, "User department retrieved successfully")
}

// RemoveUserFromDepartment removes a user from their current department
// DELETE /api/v1/users/:userId/department
func RemoveUserFromDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	userID := c.Params("userId")
	if userID == "" {
		return utils.SendBadRequestError(c, "User ID is required")
	}

	userSvc := services.NewUserService()

	// Check if user exists and belongs to organization
	userExists, err := userSvc.UserExistsInOrganization(tenant.OrganizationID, userID)
	if err != nil {
		log.Printf("Error checking user existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate user", err)
	}
	if !userExists {
		return utils.SendNotFoundError(c, "User not found in organization")
	}

	// Remove user from department
	err = userSvc.RemoveUserFromDepartment(tenant.OrganizationID, userID)
	if err != nil {
		log.Printf("Error removing user from department: %v", err)
		return utils.SendInternalError(c, "Failed to remove user from department", err)
	}

	return utils.SendSimpleSuccess(c, nil, "User removed from department successfully")
}

// GetDepartmentUsers retrieves all users in a specific department
// GET /api/v1/organization/departments/:departmentId/users
func GetDepartmentUsers(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	departmentID := c.Params("departmentId")
	if departmentID == "" {
		return utils.SendBadRequestError(c, "Department ID is required")
	}

	deptSvc := services.NewDepartmentService()
	userSvc := services.NewUserService()

	// Check if department exists and belongs to organization
	deptExists, err := deptSvc.DepartmentExists(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error checking department existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate department", err)
	}
	if !deptExists {
		return utils.SendNotFoundError(c, "Department")
	}

	// Get users in department
	users, err := userSvc.GetDepartmentUsers(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error getting department users: %v", err)
		return utils.SendInternalError(c, "Failed to fetch department users", err)
	}

	return utils.SendSimpleSuccess(c, users, "Department users retrieved successfully")
}
