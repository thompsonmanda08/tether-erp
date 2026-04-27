package handlers

import (
	"github.com/tether-erp/logging"
	"github.com/tether-erp/services"
)

// HandlerRegistry holds all application handlers
type HandlerRegistry struct {
	Auth                     *AuthHandler
	Approval                 *ApprovalHandler
	Workflow                 *WorkflowHandler
	Document                 *DocumentHandler
	Notification             *NotificationHandler
	Reports                  *ReportsHandler
	WorkflowExecutionService *services.WorkflowExecutionService
}

// NewHandlerRegistry creates a new handler registry with all handlers
func NewHandlerRegistry(
	authService *services.AuthService,
	rbacService *services.RBACService,
	workflowService *services.WorkflowService,
	workflowExecutionService *services.WorkflowExecutionService,
	documentService *services.DocumentService,
	reportsService *services.ReportsService,
	logger *logging.Logger,
) *HandlerRegistry {
	return &HandlerRegistry{
		Auth:                     NewAuthHandler(authService, rbacService),
		Approval:                 NewApprovalHandler(),
		Workflow:                 NewWorkflowHandler(workflowService),
		Document:                 NewDocumentHandler(documentService),
		Notification:             NewNotificationHandler(),
		Reports:                  NewReportsHandler(reportsService),
		WorkflowExecutionService: workflowExecutionService,
	}
}
