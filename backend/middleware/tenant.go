package middleware

import (
	"context"
	"errors"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// TenantMiddleware extracts and validates organization context.
// Must be used after AuthMiddleware.
// super_admin bypasses org membership — they have platform-wide access.
func TenantMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userIDRaw := c.Locals("userID")
		if userIDRaw == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User context required - userID is nil"})
		}
		userID, ok := userIDRaw.(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": fmt.Sprintf("User context required - userID is not a string, got %T", userIDRaw)})
		}
		if userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User context required - userID is empty string"})
		}

		orgID := c.Get("X-Organization-ID")
		ctx := context.Background()

		userRole, _ := c.Locals("userRole").(string)
		if userRole == "super_admin" {
			if orgID == "" {
				var currentOrg *string
				err := config.PgxDB.QueryRow(ctx,
					`SELECT current_organization_id FROM users WHERE id = $1`, userID,
				).Scan(&currentOrg)
				if err == nil && currentOrg != nil {
					orgID = *currentOrg
				}
			}
			tenantCtx := &utils.TenantContext{
				OrganizationID: orgID,
				UserID:         userID,
				UserRole:       "super_admin",
				Department:     "",
			}
			c.Locals("tenant", tenantCtx)
			c.Locals("organizationID", orgID)
			return c.Next()
		}

		if orgID == "" {
			var currentOrg *string
			err := config.PgxDB.QueryRow(ctx,
				`SELECT current_organization_id FROM users WHERE id = $1`, userID,
			).Scan(&currentOrg)
			if err != nil {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not found"})
			}
			if currentOrg == nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No organization context. Please select an organization."})
			}
			orgID = *currentOrg
		}

		var memberRole, memberDepartment string
		err := config.PgxDB.QueryRow(ctx, `
			SELECT role, COALESCE(department, '')
			FROM organization_members
			WHERE organization_id = $1 AND user_id = $2 AND active = true
		`, orgID, userID).Scan(&memberRole, &memberDepartment)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "You are not a member of this organization"})
			}
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fmt.Sprintf("You are not a member of this organization: %v", err)})
		}

		tenantCtx := &utils.TenantContext{
			OrganizationID: orgID,
			UserID:         userID,
			UserRole:       memberRole,
			Department:     memberDepartment,
		}
		c.Locals("tenant", tenantCtx)
		c.Locals("organizationID", orgID)
		return c.Next()
	}
}

// GetTenantContext retrieves tenant context from Fiber context
func GetTenantContext(c *fiber.Ctx) (*utils.TenantContext, error) {
	tenant, ok := c.Locals("tenant").(*utils.TenantContext)
	if !ok {
		return nil, errors.New("tenant context not found")
	}
	return tenant, nil
}
