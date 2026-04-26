package middleware

import (
	"github.com/gofiber/fiber/v2"
)

// RequireFeature is a no-op for internal apps - all features are available to all organizations.
func RequireFeature(featureName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.Next()
	}
}

// CheckFeatureAccess always returns true for internal apps.
func CheckFeatureAccess(orgID, featureName string) (bool, error) {
	return true, nil
}

// GetOrganizationFeatures returns an empty slice - feature gating removed for internal app.
func GetOrganizationFeatures(orgID string) ([]string, error) {
	return []string{}, nil
}
