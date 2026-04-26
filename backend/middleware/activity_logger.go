package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
)

// ActivityLoggerMiddleware logs significant user actions asynchronously
type ActivityLoggerMiddleware struct {
	activityService *services.ActivityService
}

// NewActivityLoggerMiddleware creates an ActivityLoggerMiddleware
func NewActivityLoggerMiddleware(activityService *services.ActivityService) *ActivityLoggerMiddleware {
	return &ActivityLoggerMiddleware{activityService: activityService}
}

// LogActivity returns a Fiber handler that queues an activity log entry after the request completes.
// Only logs authenticated requests (userID must be in locals).
// Only logs mutating requests (POST, PUT, PATCH, DELETE) — GET requests are not logged.
// Skips health/metrics endpoints and returns in < 1ms overhead (async).
func (m *ActivityLoggerMiddleware) LogActivity() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Run handler first
		err := c.Next()

		// Only log authenticated users
		userID, ok := c.Locals("userID").(string)
		if !ok || userID == "" {
			return err
		}

		// Only log mutating methods
		method := strings.ToUpper(c.Method())
		if method == fiber.MethodGet || method == fiber.MethodOptions || method == fiber.MethodHead {
			return err
		}

		// Skip non-200 range responses (errors are logged elsewhere)
		// We still log 201 (created) and 204 (no content) etc.
		statusCode := c.Response().StatusCode()
		if statusCode >= 400 {
			return err
		}

		path := c.Path()
		actionType := resolveActionType(method, path)
		if actionType == "" {
			return err // route not tracked
		}

		orgID, _ := c.Locals("organizationID").(string)
		var orgPtr *string
		if orgID != "" {
			orgPtr = &orgID
		}

		entry := &models.UserActivityLog{
			UserID:         userID,
			OrganizationID: orgPtr,
			ActionType:     actionType,
			ResourceType:   resolveResourceType(path),
			ResourceID:     resolveResourceID(c),
			IPAddress:      c.IP(),
			UserAgent:      c.Get("User-Agent"),
			CreatedAt:      time.Now().UTC(),
		}

		m.activityService.LogActivity(c.Context(), entry)
		return err
	}
}

// resolveActionType maps HTTP method + path to a known action type constant.
// Returns "" if the route should not be logged.
func resolveActionType(method, path string) string {
	// Normalize trailing slashes
	path = strings.TrimRight(path, "/")

	type rule struct {
		method  string
		prefix  string
		action  string
	}

	rules := []rule{
		// Auth events (also logged explicitly in handlers for login/logout)
		{"POST", "/api/v1/auth/logout-all", models.ActionLogout},
		{"POST", "/api/v1/auth/logout", models.ActionLogout},
		{"POST", "/api/v1/auth/change-password", models.ActionPasswordChange},
		{"POST", "/api/v1/auth/forgot-password", models.ActionPasswordReset},
		{"PUT", "/api/v1/auth/profile", models.ActionProfileUpdate},
		{"PATCH", "/api/v1/auth/profile", models.ActionProfileUpdate},
		{"PATCH", "/api/v1/auth/preferences", models.ActionPreferencesUpdate},
		{"DELETE", "/api/v1/auth/sessions/", models.ActionSessionTerminate},

		// Requisitions
		{"POST", "/api/v1/requisitions", models.ActionRequisitionCreate},
		{"PUT", "/api/v1/requisitions/", models.ActionRequisitionUpdate},
		{"PATCH", "/api/v1/requisitions/", models.ActionRequisitionUpdate},

		// Purchase Orders
		{"POST", "/api/v1/purchase-orders", models.ActionPurchaseOrderCreate},
		{"PUT", "/api/v1/purchase-orders/", models.ActionPurchaseOrderUpdate},
		{"PATCH", "/api/v1/purchase-orders/", models.ActionPurchaseOrderUpdate},

		// Payment Vouchers
		{"POST", "/api/v1/payment-vouchers", models.ActionPaymentVoucherCreate},
		{"PUT", "/api/v1/payment-vouchers/", models.ActionPaymentVoucherUpdate},
		{"PATCH", "/api/v1/payment-vouchers/", models.ActionPaymentVoucherUpdate},

		// GRNs
		{"POST", "/api/v1/grns", models.ActionGRNCreate},
		{"PUT", "/api/v1/grns/", models.ActionGRNUpdate},
		{"PATCH", "/api/v1/grns/", models.ActionGRNUpdate},

		// Workflow tasks (approvals/rejections)
		{"POST", "/api/v1/workflow-tasks/", models.ActionApprovalAction},
	}

	for _, r := range rules {
		if r.method != method {
			continue
		}
		if strings.HasSuffix(r.prefix, "/") {
			// prefix match
			if strings.HasPrefix(path, r.prefix) || path == strings.TrimRight(r.prefix, "/") {
				return r.action
			}
		} else {
			// exact match
			if path == r.prefix {
				return r.action
			}
		}
	}

	return ""
}

// resolveResourceType extracts a resource name from the path
func resolveResourceType(path string) string {
	parts := strings.Split(strings.TrimPrefix(path, "/api/v1/"), "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// resolveResourceID extracts the resource ID from path params when present.
// Tries common param names used across different route groups.
func resolveResourceID(c *fiber.Ctx) string {
	for _, name := range []string{"id", "sessionId", "userId", "taskId", "docId"} {
		if v := c.Params(name); v != "" {
			return v
		}
	}
	return ""
}
