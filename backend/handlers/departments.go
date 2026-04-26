package handlers

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

// GetOrganizationDepartments retrieves all departments for the organization
// GET /api/v1/organization/departments
func GetOrganizationDepartments(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	// Parse query parameters
	active := c.Query("active")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "50"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}

	svc := services.NewDepartmentService()

	var departments []interface{}
	var total int64

	if active == "true" {
		departments, total, err = svc.GetActiveDepartments(tenant.OrganizationID, page, pageSize)
	} else if active == "false" {
		departments, total, err = svc.GetInactiveDepartments(tenant.OrganizationID, page, pageSize)
	} else {
		departments, total, err = svc.GetAllDepartments(tenant.OrganizationID, page, pageSize)
	}

	if err != nil {
		log.Printf("Error getting organization departments: %v", err)
		return utils.SendInternalError(c, "Failed to fetch departments", err)
	}

	return utils.SendPaginatedSuccess(c, departments, "Departments retrieved successfully", page, pageSize, total)
}

// GetOrganizationDepartment retrieves a specific department by ID
// GET /api/v1/organization/departments/:id
func GetOrganizationDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	departmentID := c.Params("id")
	if departmentID == "" {
		return utils.SendBadRequestError(c, "Department ID is required")
	}

	svc := services.NewDepartmentService()
	department, err := svc.GetDepartmentByID(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error getting department %s: %v", departmentID, err)
		return utils.SendNotFoundError(c, "Department")
	}

	return utils.SendSimpleSuccess(c, department, "Department retrieved successfully")
}

// CreateOrganizationDepartment creates a new department
// POST /api/v1/organization/departments
func CreateOrganizationDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	var req struct {
		Name        string  `json:"name" validate:"required,min=2,max=100"`
		Code        string  `json:"code" validate:"required,min=2,max=10"`
		Description *string `json:"description"`
		ManagerName *string `json:"manager_name"`
		ParentID    *string `json:"parent_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Basic validation - since ValidateStruct doesn't exist, do manual validation
	if req.Name == "" || len(req.Name) < 2 {
		return utils.SendValidationError(c, "Name is required and must be at least 2 characters")
	}
	if req.Code == "" || len(req.Code) < 2 {
		return utils.SendValidationError(c, "Code is required and must be at least 2 characters")
	}

	svc := services.NewDepartmentService()

	// Check if department code already exists
	exists, err := svc.DepartmentCodeExists(tenant.OrganizationID, req.Code)
	if err != nil {
		log.Printf("Error checking department code: %v", err)
		return utils.SendInternalError(c, "Failed to validate department code", err)
	}
	if exists {
		return utils.SendBadRequestError(c, "Department code already exists")
	}

	department, err := svc.CreateDepartment(tenant.OrganizationID, req.Name, req.Code, req.Description, req.ManagerName, req.ParentID)
	if err != nil {
		log.Printf("Error creating department: %v", err)
		return utils.SendInternalError(c, "Failed to create department", err)
	}

	return utils.SendCreatedSuccess(c, department, "Department created successfully")
}

// UpdateOrganizationDepartment updates an existing department
// PUT /api/v1/organization/departments/:id
func UpdateOrganizationDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	departmentID := c.Params("id")
	if departmentID == "" {
		return utils.SendBadRequestError(c, "Department ID is required")
	}

	var req struct {
		Name        *string `json:"name"`
		Code        *string `json:"code"`
		Description *string `json:"description"`
		ManagerName *string `json:"manager_name"`
		ParentID    *string `json:"parent_id"`
		IsActive    *bool   `json:"is_active"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	svc := services.NewDepartmentService()

	// Check if department exists and belongs to organization
	exists, err := svc.DepartmentExists(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error checking department existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate department", err)
	}
	if !exists {
		return utils.SendNotFoundError(c, "Department")
	}

	// If updating code, check for duplicates
	if req.Code != nil {
		codeExists, err := svc.DepartmentCodeExistsExcluding(tenant.OrganizationID, *req.Code, departmentID)
		if err != nil {
			log.Printf("Error checking department code: %v", err)
			return utils.SendInternalError(c, "Failed to validate department code", err)
		}
		if codeExists {
			return utils.SendBadRequestError(c, "Department code already exists")
		}
	}

	department, err := svc.UpdateDepartment(tenant.OrganizationID, departmentID, req.Name, req.Code, req.Description, req.ManagerName, req.ParentID, req.IsActive)
	if err != nil {
		log.Printf("Error updating department %s: %v", departmentID, err)
		return utils.SendInternalError(c, "Failed to update department", err)
	}

	return utils.SendSimpleSuccess(c, department, "Department updated successfully")
}

// DeleteOrganizationDepartment soft deletes a department
// DELETE /api/v1/organization/departments/:id
func DeleteOrganizationDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	departmentID := c.Params("id")
	if departmentID == "" {
		return utils.SendBadRequestError(c, "Department ID is required")
	}

	svc := services.NewDepartmentService()

	// Check if department exists and belongs to organization
	exists, err := svc.DepartmentExists(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error checking department existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate department", err)
	}
	if !exists {
		return utils.SendNotFoundError(c, "Department")
	}

	err = svc.DeleteDepartment(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error deleting department %s: %v", departmentID, err)
		return utils.SendInternalError(c, "Failed to delete department", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Department deleted successfully")
}

// RestoreOrganizationDepartment restores a soft deleted department
// POST /api/v1/organization/departments/:id/restore
func RestoreOrganizationDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	departmentID := c.Params("id")
	if departmentID == "" {
		return utils.SendBadRequestError(c, "Department ID is required")
	}

	svc := services.NewDepartmentService()

	department, err := svc.RestoreDepartment(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error restoring department %s: %v", departmentID, err)
		return utils.SendInternalError(c, "Failed to restore department", err)
	}

	return utils.SendSimpleSuccess(c, department, "Department restored successfully")
}

// GetDepartmentModules retrieves modules assigned to a department
// GET /api/v1/organization/departments/:id/modules
func GetDepartmentModules(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	departmentID := c.Params("id")
	if departmentID == "" {
		return utils.SendBadRequestError(c, "Department ID is required")
	}

	svc := services.NewDepartmentService()

	// Check if department exists and belongs to organization
	exists, err := svc.DepartmentExists(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error checking department existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate department", err)
	}
	if !exists {
		return utils.SendNotFoundError(c, "Department")
	}

	modules, err := svc.GetDepartmentModules(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error getting department modules: %v", err)
		return utils.SendInternalError(c, "Failed to fetch department modules", err)
	}

	return utils.SendSimpleSuccess(c, modules, "Department modules retrieved successfully")
}

// AssignModuleToDepartment assigns a module to a department
// POST /api/v1/organization/departments/:id/modules
func AssignModuleToDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	departmentID := c.Params("id")
	if departmentID == "" {
		return utils.SendBadRequestError(c, "Department ID is required")
	}

	var req struct {
		ModuleID string `json:"module_id" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Basic validation
	if req.ModuleID == "" {
		return utils.SendValidationError(c, "Module ID is required")
	}

	svc := services.NewDepartmentService()

	// Check if department exists and belongs to organization
	exists, err := svc.DepartmentExists(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error checking department existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate department", err)
	}
	if !exists {
		return utils.SendNotFoundError(c, "Department")
	}

	err = svc.AssignModuleToDepartment(tenant.OrganizationID, departmentID, req.ModuleID)
	if err != nil {
		log.Printf("Error assigning module to department: %v", err)
		return utils.SendInternalError(c, "Failed to assign module to department", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Module assigned to department successfully")
}

// RemoveModuleFromDepartment removes a module from a department
// DELETE /api/v1/organization/departments/:departmentId/modules/:moduleId
func RemoveModuleFromDepartment(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Invalid tenant context")
	}

	departmentID := c.Params("departmentId")
	moduleID := c.Params("moduleId")

	if departmentID == "" || moduleID == "" {
		return utils.SendBadRequestError(c, "Department ID and Module ID are required")
	}

	svc := services.NewDepartmentService()

	// Check if department exists and belongs to organization
	exists, err := svc.DepartmentExists(tenant.OrganizationID, departmentID)
	if err != nil {
		log.Printf("Error checking department existence: %v", err)
		return utils.SendInternalError(c, "Failed to validate department", err)
	}
	if !exists {
		return utils.SendNotFoundError(c, "Department")
	}

	err = svc.RemoveModuleFromDepartment(tenant.OrganizationID, departmentID, moduleID)
	if err != nil {
		log.Printf("Error removing module from department: %v", err)
		return utils.SendInternalError(c, "Failed to remove module from department", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Module removed from department successfully")
}
