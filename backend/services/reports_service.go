package services

import (
	"context"
	"fmt"

	"github.com/tether-erp/models"
	"github.com/tether-erp/repository"
)

const (
	// DEFAULT_SLA_DAYS is the SLA threshold in days for approval processing
	DEFAULT_SLA_DAYS = 3.0
)

type ReportsService struct {
	reportsRepo *repository.ReportsRepository
}

func NewReportsService(reportsRepo *repository.ReportsRepository) *ReportsService {
	return &ReportsService{
		reportsRepo: reportsRepo,
	}
}

// GetSystemStatistics retrieves overall system statistics
func (s *ReportsService) GetSystemStatistics(
	ctx context.Context,
	organizationID string,
	startDate string,
	endDate string,
) (*models.SystemStatistics, error) {
	// Query document stats from repository
	docStats, err := s.reportsRepo.QueryDocumentStats(ctx, organizationID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get document stats: %w", err)
	}

	// Calculate rates
	approvalRate := calculateRate(docStats.Approved, docStats.Total)
	rejectionRate := calculateRate(docStats.Rejected, docStats.Total)

	// Get budget utilization
	budgetUtilization, err := s.reportsRepo.QueryBudgetUtilization(ctx, organizationID)
	if err != nil {
		// Don't fail the entire request if budget utilization fails
		// Just log the error and set to 0
		budgetUtilization = 0
	}

	// Get average processing time
	avgProcessingTime, err := s.reportsRepo.QueryAverageProcessingTime(ctx, organizationID, startDate, endDate)
	if err != nil {
		// Don't fail the entire request if processing time fails
		avgProcessingTime = 0
	}

	// Build response
	stats := &models.SystemStatistics{
		TotalDocuments:        docStats.Total,
		ApprovedDocuments:     docStats.Approved,
		RejectedDocuments:     docStats.Rejected,
		DraftDocuments:        docStats.Draft,
		SubmittedDocuments:    docStats.Submitted,
		PendingApproval:       docStats.Pending,
		AverageApprovalTime:   docStats.AvgApprovalDays,
		AverageProcessingTime: avgProcessingTime,
		ApprovalRate:          approvalRate,
		RejectionRate:         rejectionRate,
		BudgetUtilization:     budgetUtilization,
		DocumentTypeBreakdown: docStats.TypeBreakdown,
		StatusBreakdown:       docStats.StatusBreakdown,
	}

	return stats, nil
}

// GetApprovalMetrics retrieves approval-related metrics
func (s *ReportsService) GetApprovalMetrics(
	ctx context.Context,
	organizationID string,
	startDate string,
	endDate string,
) (*models.ApprovalMetrics, error) {
	// Get document stats for counts
	docStats, err := s.reportsRepo.QueryDocumentStats(ctx, organizationID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get document stats: %w", err)
	}

	// Get recent approval activity
	recentApprovals, err := s.reportsRepo.QueryApprovalActivity(ctx, organizationID, 50)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval activity: %w", err)
	}

	// Calculate approval rate
	approvalRate := calculateRate(docStats.Approved, docStats.Total)

	metrics := &models.ApprovalMetrics{
		TotalApproved:   docStats.Approved,
		TotalRejected:   docStats.Rejected,
		TotalPending:    docStats.Pending,
		ApprovalRate:    approvalRate,
		RecentApprovals: recentApprovals,
	}

	return metrics, nil
}

// GetUserActivityMetrics retrieves user activity statistics
func (s *ReportsService) GetUserActivityMetrics(
	ctx context.Context,
	organizationID string,
) (*models.UserActivityMetrics, error) {
	// Query user activity
	users, err := s.reportsRepo.QueryUserActivity(ctx, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user activity: %w", err)
	}

	// Calculate aggregate metrics
	activeUsers := 0
	totalActions := 0
	documentsInProgress := 0

	for _, user := range users {
		if user.ApprovalCount > 0 || user.RejectionCount > 0 || user.ActiveDocuments > 0 {
			activeUsers++
		}
		totalActions += user.ApprovalCount + user.RejectionCount
		documentsInProgress += user.ActiveDocuments
	}

	metrics := &models.UserActivityMetrics{
		ActiveUsers:         activeUsers,
		TotalActions:        totalActions,
		DocumentsInProgress: documentsInProgress,
		Users:               users,
	}

	return metrics, nil
}

// GetAnalyticsDashboard retrieves comprehensive analytics
func (s *ReportsService) GetAnalyticsDashboard(
	ctx context.Context,
	organizationID string,
	startDate string,
	endDate string,
) (*models.AnalyticsDashboard, error) {
	// Get document stats
	docStats, err := s.reportsRepo.QueryDocumentStats(ctx, organizationID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get document stats: %w", err)
	}

	// Get approval trends
	approvalTrends, err := s.reportsRepo.QueryApprovalTrends(ctx, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval trends: %w", err)
	}

	// Get stage metrics
	stageMetrics, err := s.reportsRepo.QueryStageMetrics(ctx, organizationID, DEFAULT_SLA_DAYS)
	if err != nil {
		return nil, fmt.Errorf("failed to get stage metrics: %w", err)
	}

	// Get bottleneck
	bottleneck, err := s.reportsRepo.QueryBottleneck(ctx, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bottleneck: %w", err)
	}

	// Calculate document distribution
	documentDistribution := calculateDocumentDistribution(docStats)

	// Calculate SLA compliance
	slaCompliance := calculateSLACompliance(stageMetrics)

	dashboard := &models.AnalyticsDashboard{
		TotalPending:         docStats.Pending,
		TotalApproved:        docStats.Approved,
		TotalRejected:        docStats.Rejected,
		AvgApprovalTime:      docStats.AvgApprovalDays,
		SLACompliance:        slaCompliance,
		ApprovalTrends:       approvalTrends,
		DocumentDistribution: documentDistribution,
		StageMetrics:         stageMetrics,
		Bottleneck:           bottleneck,
	}

	return dashboard, nil
}

// Helper functions

// calculateRate calculates percentage rate
func calculateRate(numerator, denominator int) float64 {
	if denominator == 0 {
		return 0.0
	}
	return (float64(numerator) / float64(denominator)) * 100.0
}

// calculateDocumentDistribution calculates document type distribution with percentages
func calculateDocumentDistribution(stats *models.ReportDocumentStats) []models.DocumentDistribution {
	total := stats.Total
	if total == 0 {
		return []models.DocumentDistribution{}
	}

	distribution := []models.DocumentDistribution{
		{
			Type:       "Requisition",
			Count:      stats.TypeBreakdown.Requisitions,
			Percentage: (float64(stats.TypeBreakdown.Requisitions) / float64(total)) * 100.0,
		},
		{
			Type:       "Purchase Order",
			Count:      stats.TypeBreakdown.PurchaseOrders,
			Percentage: (float64(stats.TypeBreakdown.PurchaseOrders) / float64(total)) * 100.0,
		},
		{
			Type:       "Payment Voucher",
			Count:      stats.TypeBreakdown.PaymentVouchers,
			Percentage: (float64(stats.TypeBreakdown.PaymentVouchers) / float64(total)) * 100.0,
		},
		{
			Type:       "GRN",
			Count:      stats.TypeBreakdown.GRN,
			Percentage: (float64(stats.TypeBreakdown.GRN) / float64(total)) * 100.0,
		},
		{
			Type:       "Budget",
			Count:      stats.TypeBreakdown.Budgets,
			Percentage: (float64(stats.TypeBreakdown.Budgets) / float64(total)) * 100.0,
		},
	}

	return distribution
}

// calculateSLACompliance calculates overall SLA compliance from stage metrics
func calculateSLACompliance(stageMetrics []models.StageMetric) float64 {
	if len(stageMetrics) == 0 {
		return 0.0
	}

	totalCompliance := 0.0
	for _, metric := range stageMetrics {
		totalCompliance += metric.SLACompliance
	}

	return totalCompliance / float64(len(stageMetrics))
}
