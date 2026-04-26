package handlers

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// GetDashboard returns dashboard analytics
func GetDashboard(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok {
		return utils.SendBadRequestError(c, "Organization ID not found")
	}

	// Parse query parameters and include organization ID
	params := parseAnalyticsParams(c)
	params.OrganizationID = organizationID

	analyticsService := services.NewAnalyticsService()

	// Get requisition metrics
	reqMetrics, err := analyticsService.GetRequisitionMetrics(params)
	if err != nil {
		log.Printf("Error getting requisition metrics: %v", err)
		return utils.SendInternalError(c, "Failed to fetch dashboard data", err)
	}

	// Create dashboard response
	dashboard := map[string]interface{}{
		"organizationId":     organizationID,
		"period":             params.Period,
		"requisitionMetrics": reqMetrics,
		"generatedAt":        time.Now(),
	}

	return utils.SendSimpleSuccess(c, dashboard, "Dashboard data retrieved successfully")
}

// GetRequisitionMetrics returns detailed requisition analytics
func GetRequisitionMetrics(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok {
		return utils.SendBadRequestError(c, "Organization ID not found")
	}

	// Parse query parameters and include organization ID
	params := parseAnalyticsParams(c)
	params.OrganizationID = organizationID

	analyticsService := services.NewAnalyticsService()
	metrics, err := analyticsService.GetRequisitionMetrics(params)
	if err != nil {
		log.Printf("Error getting requisition metrics: %v", err)
		return utils.SendInternalError(c, "Failed to fetch requisition metrics", err)
	}

	return utils.SendSimpleSuccess(c, metrics, "Requisition metrics retrieved successfully")
}

// GetApprovalMetrics returns approval-related analytics
func GetApprovalMetrics(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok {
		return utils.SendBadRequestError(c, "Organization ID not found")
	}

	// Parse query parameters and include organization ID
	params := parseAnalyticsParams(c)
	params.OrganizationID = organizationID

	analyticsService := services.NewAnalyticsService()
	metrics, err := analyticsService.GetRequisitionMetrics(params)
	if err != nil {
		log.Printf("Error getting approval metrics: %v", err)
		return utils.SendInternalError(c, "Failed to fetch approval metrics", err)
	}

	// Extract approval-specific data
	approvalMetrics := map[string]interface{}{
		"rejectionRate":         metrics.RejectionRate,
		"rejectionsOverTime":    metrics.RejectionsOverTime,
		"rejectionReasons":      metrics.RejectionReasons,
		"topRejectingApprovers": metrics.TopRejectingApprovers,
		"period":                metrics.Period,
		"generatedAt":           time.Now(),
	}

	return utils.SendSimpleSuccess(c, approvalMetrics, "Approval metrics retrieved successfully")
}

// parseAnalyticsParams parses query parameters for analytics
func parseAnalyticsParams(c *fiber.Ctx) types.AnalyticsQueryParams {
	params := types.AnalyticsQueryParams{
		Period:     c.Query("period", "daily"),
		Department: c.Query("department"),
	}

	// Parse start date
	if startDateStr := c.Query("startDate"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			params.StartDate = &startDate
		}
	}

	// Parse end date
	if endDateStr := c.Query("endDate"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			params.EndDate = &endDate
		}
	}

	// Parse limit (not used in current analytics params)
	// if limitStr := c.Query("limit"); limitStr != "" {
	// 	if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
	// 		params.Limit = limit
	// 	}
	// }

	return params
}
