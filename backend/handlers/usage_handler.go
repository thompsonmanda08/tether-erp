package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/utils"
)

// GetOrganizationUsage returns usage info. For internal apps, all limits are unlimited.
func GetOrganizationUsage(c *fiber.Ctx) error {
	orgID, _ := c.Locals("organizationID").(string)
	if orgID == "" {
		orgID = c.Params("id")
	}
	if orgID == "" {
		return utils.SendBadRequest(c, "Organization context required")
	}

	usage := map[string]interface{}{
		"organizationId": orgID,
		"message":        "No resource limits enforced for internal application",
	}

	return utils.SendSimpleSuccess(c, usage, "Usage retrieved successfully")
}
