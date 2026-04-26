package handlers

import (
	"strconv"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

type WorkflowHandler struct {
	workflowService *services.WorkflowService
	validate        *validator.Validate
}

func NewWorkflowHandler(workflowService *services.WorkflowService) *WorkflowHandler {
	return &WorkflowHandler{
		workflowService: workflowService,
		validate:        validator.New(),
	}
}

// GetWorkflows retrieves all workflows with optional filtering
// GET /api/v1/workflows
func (h *WorkflowHandler) GetWorkflows(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_workflows_request")

	organizationIDRaw := c.Locals("organizationID")
	if organizationIDRaw == nil {
		logging.LogWarn(c, "organization_id_missing_from_context")
		return utils.SendBadRequestError(c, "Organization ID not found in context")
	}
	
	organizationID, ok := organizationIDRaw.(string)
	if !ok {
		logging.LogWarn(c, "invalid_organization_id_format")
		return utils.SendBadRequestError(c, "Invalid organization ID format")
	}

	// Add organization context
	logging.AddFieldToRequest(c, "organization_id", organizationID)

	logger.Debug("retrieving_workflows")

	// Use the new API implementation
	return h.getWorkflowsNew(c, organizationID)
}

// getWorkflowsNew handles the new frontend-compatible API
func (h *WorkflowHandler) getWorkflowsNew(c *fiber.Ctx, organizationID string) error {
	logger := logging.FromContext(c)
	logger.Debug("get_workflows_new_api")

	// Parse query parameters
	filter := services.WorkflowListFilter{
		EntityType: c.Query("entityType"),
	}

	// Add filter context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"entity_type": filter.EntityType,
		"api_version": "new",
	})

	// Parse boolean parameters
	if isActiveStr := c.Query("isActive"); isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			filter.IsActive = &isActive
			logging.AddFieldToRequest(c, "is_active_filter", isActive)
		}
	}

	if isDefaultStr := c.Query("isDefault"); isDefaultStr != "" {
		if isDefault, err := strconv.ParseBool(isDefaultStr); err == nil {
			filter.IsDefault = &isDefault
			logging.AddFieldToRequest(c, "is_default_filter", isDefault)
		}
	}

	logger.Debug("fetching_workflows_with_filter")

	// Get workflows
	workflows, err := h.workflowService.GetWorkflows(c.Context(), organizationID, filter)
	if err != nil {
		logging.LogError(c, err, "failed_to_fetch_workflows", map[string]interface{}{
			"filter": filter,
		})
		return utils.SendInternalError(c, "Failed to retrieve workflows", err)
	}

	logger.WithField("workflow_count", len(workflows)).Info("workflows_fetched_successfully")
	return c.JSON(workflows)
}

// getWorkflowsLegacy handles the old API for backward compatibility
func (h *WorkflowHandler) getWorkflowsLegacy(c *fiber.Ctx, organizationID string) error {
	logger := logging.FromContext(c)
	logger.Debug("get_workflows_legacy_api")

	// Get query parameters
	documentType := c.Query("documentType", "")
	activeOnlyStr := c.Query("activeOnly", "false")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	activeOnly := activeOnlyStr == "true"
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Add pagination and filter context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"document_type": documentType,
		"active_only":   activeOnly,
		"page":          page,
		"limit":         limit,
		"api_version":   "legacy",
	})

	logger.Debug("fetching_workflows_legacy")

	// Get workflows using entityType instead of documentType
	entityType := documentType
	workflows, total, err := h.workflowService.ListWorkflows(c.Context(), organizationID, entityType, activeOnly, limit, offset)
	if err != nil {
		logging.LogError(c, err, "failed_to_fetch_workflows_legacy", map[string]interface{}{
			"entity_type": entityType,
			"active_only": activeOnly,
		})
		return utils.SendInternalError(c, "Failed to retrieve workflows", err)
	}

	logger.WithFields(map[string]interface{}{
		"workflow_count": len(workflows),
		"total_count":    total,
	}).Info("workflows_fetched_successfully_legacy")

	return utils.SendPaginatedSuccess(c, workflows, "Workflows retrieved successfully", page, limit, total)
}

// GetWorkflowByID retrieves a single workflow by ID
// GET /api/v1/workflows/:id
func (h *WorkflowHandler) GetWorkflowByID(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_workflow_by_id_request")

	organizationID := c.Locals("organizationID").(string)

	// Get workflow ID from params
	workflowIDStr := c.Params("id")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		logging.LogWarn(c, "invalid_workflow_id", map[string]interface{}{
			"workflow_id_str": workflowIDStr,
			"parse_error":     err.Error(),
		})
		return utils.SendBadRequestError(c, "Invalid workflow ID")
	}

	// Add workflow context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_id":     workflowID.String(),
		"organization_id": organizationID,
	})

	logger.Debug("fetching_workflow_by_id")

	// Get workflow
	workflow, err := h.workflowService.GetWorkflow(c.Context(), workflowID, organizationID)
	if err != nil {
		logging.LogError(c, err, "failed_to_fetch_workflow", map[string]interface{}{
			"workflow_id": workflowID.String(),
		})
		return utils.SendNotFoundError(c, "Workflow not found")
	}

	logger.Info("workflow_retrieved_successfully")
	return utils.SendSimpleSuccess(c, workflow, "Workflow retrieved successfully")
}

// GetDefaultWorkflow retrieves the default workflow for a document type
// GET /api/v1/workflows/default/:documentType
func (h *WorkflowHandler) GetDefaultWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_default_workflow_request")

	organizationID := c.Locals("organizationID").(string)

	// Get document type from params
	documentType := c.Params("documentType")
	if documentType == "" {
		logging.LogWarn(c, "missing_document_type")
		return utils.SendBadRequestError(c, "Document type is required")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"document_type":   documentType,
		"organization_id": organizationID,
	})

	logger.Debug("fetching_default_workflow")

	// Get default workflow
	workflow, err := h.workflowService.GetDefaultWorkflow(c.Context(), organizationID, documentType)
	if err != nil {
		logging.LogError(c, err, "failed_to_fetch_default_workflow", map[string]interface{}{
			"document_type": documentType,
		})
		return utils.SendNotFoundError(c, "No default workflow found for this document type")
	}

	logger.Info("default_workflow_retrieved_successfully")
	return utils.SendSimpleSuccess(c, workflow, "Default workflow retrieved successfully")
}

// CreateWorkflow creates a new workflow
// POST /api/v1/workflows
func (h *WorkflowHandler) CreateWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("create_workflow_request")

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"organization_id": organizationID,
		"user_id":         userID,
		"operation":       "create_workflow",
	})

	// Parse request body
	var req services.CreateWorkflowRequest
	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_create_workflow_request")
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Add workflow details to context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_name":        req.Name,
		"workflow_entity_type": req.EntityType,
		"stage_count":          len(req.Stages),
	})

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "create_workflow_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendBadRequestError(c, "Validation failed: "+err.Error())
	}

	// Handle legacy documentType field
	if req.EntityType == "" && req.DocumentType != "" {
		req.EntityType = req.DocumentType
		logging.AddFieldToRequest(c, "legacy_document_type_used", true)
	}

	// Validate that we have an entity type
	if req.EntityType == "" {
		logging.LogWarn(c, "missing_entity_type_and_document_type")
		return utils.SendBadRequestError(c, "Either entityType or documentType is required")
	}

	logger.Debug("validating_workflow_stages")

	// Validate workflow stages
	if err := h.workflowService.ValidateWorkflowStages(req.Stages); err != nil {
		logging.LogWarn(c, "workflow_stages_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendBadRequestError(c, "Invalid workflow stages: "+err.Error())
	}

	logger.Debug("creating_workflow")

	// Create workflow
	workflow, err := h.workflowService.CreateWorkflow(c.Context(), organizationID, userID, req)
	if err != nil {
		logging.LogError(c, err, "failed_to_create_workflow", map[string]interface{}{
			"workflow_name": req.Name,
			"entity_type":   req.EntityType,
		})
		return utils.SendInternalError(c, "Failed to create workflow", err)
	}

	// Add created workflow ID to context
	logging.AddFieldToRequest(c, "created_workflow_id", workflow.ID)

	logger.Info("workflow_created_successfully")
	return utils.SendCreatedSuccess(c, workflow, "Workflow created successfully")
}

// UpdateWorkflow updates an existing workflow
// PUT /api/v1/workflows/:id
func (h *WorkflowHandler) UpdateWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("update_workflow_request")

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get workflow ID from params
	workflowIDStr := c.Params("id")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		logging.LogWarn(c, "invalid_workflow_id_for_update", map[string]interface{}{
			"workflow_id_str": workflowIDStr,
		})
		return utils.SendBadRequestError(c, "Invalid workflow ID")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_id":     workflowID.String(),
		"organization_id": organizationID,
		"user_id":         userID,
		"operation":       "update_workflow",
	})

	// Parse request body
	var req services.UpdateWorkflowRequest
	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_update_workflow_request")
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Validate workflow stages if provided
	if req.Stages != nil {
		logging.AddFieldToRequest(c, "stage_count", len(req.Stages))
		logger.Debug("validating_updated_workflow_stages")
		
		if err := h.workflowService.ValidateWorkflowStages(req.Stages); err != nil {
			logging.LogWarn(c, "updated_workflow_stages_validation_failed", map[string]interface{}{
				"validation_error": err.Error(),
			})
			return utils.SendBadRequestError(c, "Invalid workflow stages: "+err.Error())
		}
	}

	logger.Debug("updating_workflow")

	// Update workflow
	workflow, err := h.workflowService.UpdateWorkflow(c.Context(), workflowID, organizationID, userID, req)
	if err != nil {
		logging.LogError(c, err, "failed_to_update_workflow")
		return utils.SendInternalError(c, "Failed to update workflow", err)
	}

	logger.Info("workflow_updated_successfully")
	return utils.SendSimpleSuccess(c, workflow, "Workflow updated successfully")
}

// ActivateWorkflow activates a workflow
// POST /api/v1/workflows/:id/activate
func (h *WorkflowHandler) ActivateWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("activate_workflow_request")

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get workflow ID from params
	workflowIDStr := c.Params("id")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		logging.LogWarn(c, "invalid_workflow_id_for_activation", map[string]interface{}{
			"workflow_id_str": workflowIDStr,
		})
		return utils.SendBadRequestError(c, "Invalid workflow ID")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_id":     workflowID.String(),
		"organization_id": organizationID,
		"user_id":         userID,
		"operation":       "activate_workflow",
	})

	logger.Debug("activating_workflow")

	// Activate workflow
	workflow, err := h.workflowService.ActivateWorkflow(c.Context(), workflowID, organizationID, userID)
	if err != nil {
		logging.LogError(c, err, "failed_to_activate_workflow")
		return utils.SendInternalError(c, "Failed to activate workflow", err)
	}

	logger.Info("workflow_activated_successfully")
	return utils.SendSimpleSuccess(c, workflow, "Workflow activated successfully")
}

// DeactivateWorkflow deactivates a workflow
// POST /api/v1/workflows/:id/deactivate
func (h *WorkflowHandler) DeactivateWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("deactivate_workflow_request")

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get workflow ID from params
	workflowIDStr := c.Params("id")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		logging.LogWarn(c, "invalid_workflow_id_for_deactivation", map[string]interface{}{
			"workflow_id_str": workflowIDStr,
		})
		return utils.SendBadRequestError(c, "Invalid workflow ID")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_id":     workflowID.String(),
		"organization_id": organizationID,
		"user_id":         userID,
		"operation":       "deactivate_workflow",
	})

	logger.Debug("deactivating_workflow")

	// Deactivate workflow
	workflow, err := h.workflowService.DeactivateWorkflow(c.Context(), workflowID, organizationID, userID)
	if err != nil {
		logging.LogError(c, err, "failed_to_deactivate_workflow")
		return utils.SendInternalError(c, "Failed to deactivate workflow", err)
	}

	logger.Info("workflow_deactivated_successfully")
	return utils.SendSimpleSuccess(c, workflow, "Workflow deactivated successfully")
}

// DeleteWorkflow deletes a workflow
// DELETE /api/v1/workflows/:id
func (h *WorkflowHandler) DeleteWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("delete_workflow_request")

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get workflow ID from params
	workflowIDStr := c.Params("id")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		logging.LogWarn(c, "invalid_workflow_id_for_deletion", map[string]interface{}{
			"workflow_id_str": workflowIDStr,
		})
		return utils.SendBadRequestError(c, "Invalid workflow ID")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_id":     workflowID.String(),
		"organization_id": organizationID,
		"user_id":         userID,
		"operation":       "delete_workflow",
	})

	logger.Debug("deleting_workflow")

	// Delete workflow
	if err := h.workflowService.DeleteWorkflow(c.Context(), workflowID, organizationID, userID); err != nil {
		logging.LogError(c, err, "failed_to_delete_workflow")
		return utils.SendInternalError(c, "Failed to delete workflow", err)
	}

	logger.Info("workflow_deleted_successfully")
	return utils.SendSimpleSuccess(c, nil, "Workflow deleted successfully")
}

// DuplicateWorkflow creates a copy of an existing workflow
// POST /api/v1/workflows/:id/duplicate
func (h *WorkflowHandler) DuplicateWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("duplicate_workflow_request")

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get workflow ID from params
	workflowIDStr := c.Params("id")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		logging.LogWarn(c, "invalid_workflow_id_for_duplication", map[string]interface{}{
			"workflow_id_str": workflowIDStr,
		})
		return utils.SendBadRequestError(c, "Invalid workflow ID")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"source_workflow_id": workflowID.String(),
		"organization_id":    organizationID,
		"user_id":            userID,
		"operation":          "duplicate_workflow",
	})

	// Parse request body for new name
	var req struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_duplicate_workflow_request")
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Generate default name if not provided
	if req.Name == "" {
		logger.Debug("generating_default_name_for_duplicate")
		// Get original workflow to generate name
		original, err := h.workflowService.GetWorkflow(c.Context(), workflowID, organizationID)
		if err != nil {
			logging.LogError(c, err, "failed_to_fetch_original_workflow_for_duplication")
			return utils.SendNotFoundError(c, "Original workflow not found")
		}
		req.Name = original.Name + " (Copy)"
	}

	// Add new name to context
	logging.AddFieldToRequest(c, "new_workflow_name", req.Name)

	logger.Debug("duplicating_workflow")

	// Duplicate workflow
	workflow, err := h.workflowService.DuplicateWorkflow(c.Context(), workflowID, organizationID, userID, req.Name)
	if err != nil {
		logging.LogError(c, err, "failed_to_duplicate_workflow")
		return utils.SendInternalError(c, "Failed to duplicate workflow", err)
	}

	// Add duplicated workflow ID to context
	logging.AddFieldToRequest(c, "duplicated_workflow_id", workflow.ID)

	logger.Info("workflow_duplicated_successfully")
	return utils.SendCreatedSuccess(c, workflow, "Workflow duplicated successfully")
}

// SetDefaultWorkflow sets a workflow as default for an entity type
// POST /api/v1/workflows/:id/set-default
func (h *WorkflowHandler) SetDefaultWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("set_default_workflow_request")

	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get workflow ID from params
	workflowIDStr := c.Params("id")
	if workflowIDStr == "" {
		logging.LogWarn(c, "missing_workflow_id_for_set_default")
		return utils.SendBadRequestError(c, "Workflow ID is required")
	}

	// Parse request body
	var req struct {
		EntityType string `json:"entityType" validate:"required"`
	}
	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_set_default_workflow_request")
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_id":     workflowIDStr,
		"entity_type":     req.EntityType,
		"organization_id": organizationID,
		"user_id":         userID,
		"operation":       "set_default_workflow",
	})

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "set_default_workflow_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendBadRequestError(c, "Validation failed: "+err.Error())
	}

	logger.Debug("setting_default_workflow")

	// Set default workflow
	if err := h.workflowService.SetDefaultWorkflow(c.Context(), organizationID, req.EntityType, workflowIDStr, userID); err != nil {
		logging.LogError(c, err, "failed_to_set_default_workflow")
		return utils.SendInternalError(c, "Failed to set default workflow", err)
	}

	logger.Info("default_workflow_set_successfully")
	return utils.SendSimpleSuccess(c, nil, "Default workflow set successfully")
}

// ResolveWorkflow finds the appropriate workflow for an entity
// POST /api/v1/workflows/resolve
func (h *WorkflowHandler) ResolveWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("resolve_workflow_request")

	organizationID := c.Locals("organizationID").(string)

	// Parse request body
	var req struct {
		EntityType string      `json:"entityType" validate:"required"`
		Document   interface{} `json:"document"`
	}
	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_resolve_workflow_request")
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"entity_type":     req.EntityType,
		"organization_id": organizationID,
		"operation":       "resolve_workflow",
	})

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "resolve_workflow_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendBadRequestError(c, "Validation failed: "+err.Error())
	}

	logger.Debug("resolving_workflow_for_entity")

	// Resolve workflow
	workflow, err := h.workflowService.ResolveWorkflowForEntity(c.Context(), organizationID, req.EntityType, req.Document)
	if err != nil {
		logging.LogError(c, err, "failed_to_resolve_workflow", map[string]interface{}{
			"entity_type": req.EntityType,
		})
		return utils.SendNotFoundError(c, "No workflow found for entity type")
	}

	// Add resolved workflow ID to context
	logging.AddFieldToRequest(c, "resolved_workflow_id", workflow.ID)

	logger.Info("workflow_resolved_successfully")
	return utils.SendSimpleSuccess(c, workflow, "Workflow resolved successfully")
}

// GetWorkflowUsage gets usage statistics for a workflow
// GET /api/v1/workflows/:id/usage
func (h *WorkflowHandler) GetWorkflowUsage(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_workflow_usage_request")

	organizationID := c.Locals("organizationID").(string)

	// Get workflow ID from params
	workflowIDStr := c.Params("id")
	if workflowIDStr == "" {
		logging.LogWarn(c, "missing_workflow_id_for_usage")
		return utils.SendBadRequestError(c, "Workflow ID is required")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_id":     workflowIDStr,
		"organization_id": organizationID,
		"operation":       "get_workflow_usage",
	})

	logger.Debug("fetching_workflow_usage_count")

	// Get usage count
	count, err := h.workflowService.GetWorkflowUsageCount(c.Context(), organizationID, workflowIDStr)
	if err != nil {
		logging.LogError(c, err, "failed_to_get_workflow_usage")
		return utils.SendInternalError(c, "Failed to get workflow usage", err)
	}

	// Add usage count to context
	logging.AddFieldToRequest(c, "usage_count", count)

	logger.Info("workflow_usage_retrieved_successfully")
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"workflowId": workflowIDStr,
		"usageCount": count,
		"canDelete":  count == 0,
	}, "Workflow usage retrieved successfully")
}

// ValidateWorkflow validates a workflow configuration without saving
// POST /api/v1/workflows/validate
func (h *WorkflowHandler) ValidateWorkflow(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("validate_workflow_request")

	// Parse request body
	var req services.CreateWorkflowRequest
	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_validate_workflow_request")
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Add context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"workflow_name": req.Name,
		"entity_type":   req.EntityType,
		"stage_count":   len(req.Stages),
		"operation":     "validate_workflow",
	})

	logger.Debug("validating_workflow_configuration")

	// Validate workflow structure
	if err := h.workflowService.ValidateWorkflowStages(req.Stages); err != nil {
		logging.LogWarn(c, "workflow_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendBadRequestError(c, "Workflow validation failed: "+err.Error())
	}

	logger.Info("workflow_validation_successful")
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"valid":   true,
		"message": "Workflow configuration is valid",
	}, "Workflow validation successful")
}