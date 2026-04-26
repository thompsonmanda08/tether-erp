package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/models"
)

// CheckLimit is a no-op for internal apps - no resource limits are enforced.
func CheckLimit(resourceType string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.Next()
	}
}

// GetEffectiveLimits returns unlimited limits for all resources.
func GetEffectiveLimits(orgID string) (*models.EffectiveLimits, error) {
	return &models.EffectiveLimits{
		OrganizationID:     orgID,
		TierName:           "internal",
		MaxWorkspaces:      models.UnlimitedLimit,
		MaxTeamMembers:     models.UnlimitedLimit,
		MaxDocuments:       models.UnlimitedLimit,
		MaxWorkflows:       models.UnlimitedLimit,
		MaxCustomRoles:     models.UnlimitedLimit,
		MaxRequisitions:    models.UnlimitedLimit,
		MaxBudgets:         models.UnlimitedLimit,
		MaxPurchaseOrders:  models.UnlimitedLimit,
		MaxPaymentVouchers: models.UnlimitedLimit,
		MaxGRNs:            models.UnlimitedLimit,
		MaxDepartments:     models.UnlimitedLimit,
		MaxVendors:         models.UnlimitedLimit,
		HasOverrides:       false,
	}, nil
}

// GetCurrentUsage returns 0 for all resource types (limits not enforced).
func GetCurrentUsage(orgID, resourceType string) (int, error) {
	return 0, nil
}

// GetOrganizationUsage returns empty usage for all resource types.
func GetOrganizationUsage(orgID string) (*models.OrganizationUsage, error) {
	return &models.OrganizationUsage{
		OrganizationID: orgID,
	}, nil
}
