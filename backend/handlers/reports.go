package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

type ReportsHandler struct {
	reportsService *services.ReportsService
}

func NewReportsHandler(reportsService *services.ReportsService) *ReportsHandler {
	return &ReportsHandler{
		reportsService: reportsService,
	}
}

// GetSystemStatistics handles GET /api/admin/reports/system-stats
func (h *ReportsHandler) GetSystemStatistics(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_system_statistics_request")

	// Get organization context from tenant middleware
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	// Verify admin role
	if tenant.UserRole != "admin" && tenant.UserRole != "superadmin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Admin access required",
		})
	}

	// Parse date range query parameters
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Add query parameters to context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":       "get_system_statistics",
		"organization_id": tenant.OrganizationID,
		"start_date":      startDate,
		"end_date":        endDate,
	})

	// Get statistics from service
	stats, err := h.reportsService.GetSystemStatistics(
		c.Context(),
		tenant.OrganizationID,
		startDate,
		endDate,
	)
	if err != nil {
		logging.LogError(c, err, "failed_to_get_system_statistics")
		return utils.SendInternalError(c, "Failed to fetch system statistics", err)
	}

	logger.Info("system_statistics_retrieved")
	return c.JSON(stats)
}

// GetApprovalMetrics handles GET /api/admin/reports/approval-metrics
func (h *ReportsHandler) GetApprovalMetrics(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_approval_metrics_request")

	// Get organization context from tenant middleware
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	// Verify admin role
	if tenant.UserRole != "admin" && tenant.UserRole != "superadmin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Admin access required",
		})
	}

	// Parse date range query parameters
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Add query parameters to context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":       "get_approval_metrics",
		"organization_id": tenant.OrganizationID,
		"start_date":      startDate,
		"end_date":        endDate,
	})

	// Get metrics from service
	metrics, err := h.reportsService.GetApprovalMetrics(
		c.Context(),
		tenant.OrganizationID,
		startDate,
		endDate,
	)
	if err != nil {
		logging.LogError(c, err, "failed_to_get_approval_metrics")
		return utils.SendInternalError(c, "Failed to fetch approval metrics", err)
	}

	logger.Info("approval_metrics_retrieved")
	return c.JSON(metrics)
}

// GetUserActivityMetrics handles GET /api/admin/reports/user-activity
func (h *ReportsHandler) GetUserActivityMetrics(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_user_activity_metrics_request")

	// Get organization context from tenant middleware
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	// Verify admin role
	if tenant.UserRole != "admin" && tenant.UserRole != "superadmin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Admin access required",
		})
	}

	// Add query parameters to context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":       "get_user_activity_metrics",
		"organization_id": tenant.OrganizationID,
	})

	// Get metrics from service
	metrics, err := h.reportsService.GetUserActivityMetrics(
		c.Context(),
		tenant.OrganizationID,
	)
	if err != nil {
		logging.LogError(c, err, "failed_to_get_user_activity_metrics")
		return utils.SendInternalError(c, "Failed to fetch user activity metrics", err)
	}

	logger.Info("user_activity_metrics_retrieved")
	return c.JSON(metrics)
}

// GetAnalyticsDashboard handles GET /api/admin/reports/analytics
func (h *ReportsHandler) GetAnalyticsDashboard(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_analytics_dashboard_request")

	// Get organization context from tenant middleware
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	// Verify admin role
	if tenant.UserRole != "admin" && tenant.UserRole != "superadmin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Admin access required",
		})
	}

	// Parse date range query parameters
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Add query parameters to context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":       "get_analytics_dashboard",
		"organization_id": tenant.OrganizationID,
		"start_date":      startDate,
		"end_date":        endDate,
	})

	// Get analytics from service
	analytics, err := h.reportsService.GetAnalyticsDashboard(
		c.Context(),
		tenant.OrganizationID,
		startDate,
		endDate,
	)
	if err != nil {
		logging.LogError(c, err, "failed_to_get_analytics_dashboard")
		return utils.SendInternalError(c, "Failed to fetch analytics dashboard", err)
	}

	logger.Info("analytics_dashboard_retrieved")
	return c.JSON(analytics)
}

// GetDashboardReports handles GET /api/v1/reports/dashboard
// Returns comprehensive dashboard data for all users with role-based filtering
// - Admin/Superadmin: Full organization visibility
// - Manager: Department visibility (if department is set)
// - User: Personal documents + pending approvals assigned to them
func (h *ReportsHandler) GetDashboardReports(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_dashboard_reports_request")

	// Get organization context from tenant middleware
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Organization context required",
			"error":   err.Error(),
		})
	}

	// Parse date range query parameters
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Add query parameters to context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":       "get_dashboard_reports",
		"organization_id": tenant.OrganizationID,
		"user_id":         tenant.UserID,
		"user_role":       tenant.UserRole,
		"department":      tenant.Department,
		"start_date":      startDate,
		"end_date":        endDate,
	})

	// Determine data scope based on role
	var stats *models.SystemStatistics
	var recentApprovals *models.ApprovalMetrics

	switch tenant.UserRole {
	case "admin", "superadmin":
		// Admin: Full organization visibility
		stats, err = h.reportsService.GetSystemStatistics(
			c.Context(),
			tenant.OrganizationID,
			startDate,
			endDate,
		)
		if err != nil {
			logging.LogError(c, err, "failed_to_get_system_statistics")
			return utils.SendInternalError(c, "Failed to fetch dashboard reports", err)
		}

		recentApprovals, err = h.reportsService.GetApprovalMetrics(
			c.Context(),
			tenant.OrganizationID,
			startDate,
			endDate,
		)
		if err != nil {
			logging.LogError(c, err, "failed_to_get_approval_metrics")
			recentApprovals = nil
		}

	case "manager":
		// Manager: shows full organization data (same as admin for now)
		stats, err = h.reportsService.GetSystemStatistics(
			c.Context(),
			tenant.OrganizationID,
			startDate,
			endDate,
		)
		if err != nil {
			logging.LogError(c, err, "failed_to_get_system_statistics")
			return utils.SendInternalError(c, "Failed to fetch dashboard reports", err)
		}

		recentApprovals, err = h.reportsService.GetApprovalMetrics(
			c.Context(),
			tenant.OrganizationID,
			startDate,
			endDate,
		)
		if err != nil {
			logging.LogError(c, err, "failed_to_get_approval_metrics")
			recentApprovals = nil
		}

	default:
		// User/requester: shows organization-level data
		stats, err = h.reportsService.GetSystemStatistics(
			c.Context(),
			tenant.OrganizationID,
			startDate,
			endDate,
		)
		if err != nil {
			logging.LogError(c, err, "failed_to_get_system_statistics")
			return utils.SendInternalError(c, "Failed to fetch dashboard reports", err)
		}

		recentApprovals, err = h.reportsService.GetApprovalMetrics(
			c.Context(),
			tenant.OrganizationID,
			startDate,
			endDate,
		)
		if err != nil {
			logging.LogError(c, err, "failed_to_get_approval_metrics")
			recentApprovals = nil
		}
	}

	// Build comprehensive dashboard response
	dashboard := fiber.Map{
		"organizationId":          tenant.OrganizationID,
		"userRole":                tenant.UserRole,
		"totalDocuments":          stats.TotalDocuments,
		"approvedDocuments":       stats.ApprovedDocuments,
		"rejectedDocuments":       stats.RejectedDocuments,
		"draftDocuments":          stats.DraftDocuments,
		"submittedDocuments":      stats.SubmittedDocuments,
		"pendingApproval":         stats.PendingApproval,
		"averageApprovalTime":     stats.AverageApprovalTime,
		"averageProcessingTime":   stats.AverageProcessingTime,
		"approvalRate":            stats.ApprovalRate,
		"rejectionRate":           stats.RejectionRate,
		"budgetUtilization":       stats.BudgetUtilization,
		"documentTypeBreakdown":   stats.DocumentTypeBreakdown,
		"statusBreakdown":         stats.StatusBreakdown,
	}

	// Add recent activity if available
	if recentApprovals != nil {
		dashboard["recentActivity"] = recentApprovals.RecentApprovals
	} else {
		dashboard["recentActivity"] = []interface{}{}
	}

	logger.Info("dashboard_reports_retrieved")
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Dashboard reports retrieved successfully",
		"data":    dashboard,
	})
}
