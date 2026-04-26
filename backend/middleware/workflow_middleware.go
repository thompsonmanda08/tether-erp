package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/services"
)

// InjectWorkflowExecutionService injects the workflow execution service into the context
func InjectWorkflowExecutionService(workflowExecutionService *services.WorkflowExecutionService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Locals("workflowExecutionService", workflowExecutionService)
		return c.Next()
	}
}