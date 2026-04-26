package services

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/tether-erp/config"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/types"
)

// AnalyticsService handles analytics calculations.
//
// Migrated off GORM: aggregations now use raw config.PgxDB SQL with $n
// placeholders. The constructor signature changed: it no longer takes
// *gorm.DB. All callers must drop that argument.
type AnalyticsService struct {
	cache *CacheService
}

// NewAnalyticsService creates a new analytics service.
//
// Constructor signature changed: takes no arguments. All DB access goes via
// config.PgxDB / config.Queries.
func NewAnalyticsService() *AnalyticsService {
	return &AnalyticsService{
		cache: NewCacheService(time.Minute * 15), // 15-minute cache for analytics
	}
}

// requisitionFilter holds the prepared WHERE-fragment + arg list reused across
// every aggregation.  Each aggregation appends to this base WHERE.
type requisitionFilter struct {
	where string
	args  []interface{}
}

// buildFilter produces a WHERE clause filtering requisitions by org / dates /
// department. Always includes a deleted_at IS NULL guard.
func buildFilter(p types.AnalyticsQueryParams) requisitionFilter {
	var (
		clauses = []string{"deleted_at IS NULL"}
		args    []interface{}
		idx     = 1
	)
	if p.OrganizationID != "" {
		clauses = append(clauses, fmt.Sprintf("organization_id = $%d", idx))
		args = append(args, p.OrganizationID)
		idx++
	}
	if p.StartDate != nil {
		clauses = append(clauses, fmt.Sprintf("created_at >= $%d", idx))
		args = append(args, *p.StartDate)
		idx++
	}
	if p.EndDate != nil {
		clauses = append(clauses, fmt.Sprintf("created_at <= $%d", idx))
		args = append(args, *p.EndDate)
		idx++
	}
	if p.Department != "" {
		clauses = append(clauses, fmt.Sprintf("department = $%d", idx))
		args = append(args, p.Department)
		idx++
	}
	return requisitionFilter{
		where: strings.Join(clauses, " AND "),
		args:  args,
	}
}

// GetRequisitionMetrics calculates all requisition metrics with caching.
func (s *AnalyticsService) GetRequisitionMetrics(params types.AnalyticsQueryParams) (*types.RequisitionMetricsResponse, error) {
	cacheKey := s.generateCacheKey(params)

	if cached, found := s.cache.Get(cacheKey); found {
		if metrics, ok := cached.(*types.RequisitionMetricsResponse); ok {
			return metrics, nil
		}
	}

	ctx := context.Background()
	filter := buildFilter(params)

	statusCounts, err := s.getStatusCounts(ctx, filter)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "get_status_counts",
		}).WithError(err).Error("failed_to_get_status_counts")
		statusCounts = make(map[string]int64)
	}

	rejectionRate, err := s.calculateRejectionRate(ctx, filter)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "calculate_rejection_rate",
		}).WithError(err).Error("failed_to_calculate_rejection_rate")
		rejectionRate = 0
	}

	rejectionsOverTime, err := s.getRejectionsOverTime(ctx, filter, params.Period)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "get_rejections_over_time",
			"period":    params.Period,
		}).WithError(err).Error("failed_to_get_rejections_over_time")
		rejectionsOverTime = []types.RejectionTimeData{}
	}

	rejectionReasons, err := s.getRejectionReasons(ctx, filter)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "get_rejection_reasons",
		}).WithError(err).Error("failed_to_get_rejection_reasons")
		rejectionReasons = []types.RejectionReason{}
	}

	topRejectingApprovers, err := s.getTopRejectingApprovers(ctx, filter)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "get_top_rejecting_approvers",
		}).WithError(err).Error("failed_to_get_top_rejecting_approvers")
		topRejectingApprovers = []types.ApproverStats{}
	}

	var total int64
	for _, count := range statusCounts {
		total += count
	}

	result := &types.RequisitionMetricsResponse{
		StatusCounts:          statusCounts,
		RejectionRate:         rejectionRate,
		RejectionsOverTime:    rejectionsOverTime,
		RejectionReasons:      rejectionReasons,
		TopRejectingApprovers: topRejectingApprovers,
		TotalRequisitions:     total,
		Period:                params.Period,
	}

	s.cache.Set(cacheKey, result)
	return result, nil
}

// generateCacheKey creates a unique cache key for analytics parameters.
func (s *AnalyticsService) generateCacheKey(params types.AnalyticsQueryParams) string {
	data, _ := json.Marshal(params)
	hash := fmt.Sprintf("%x", md5.Sum(data))
	return s.cache.AnalyticsKey(params.OrganizationID, hash)
}

// getStatusCounts counts requisitions by status — single GROUP BY scan.
func (s *AnalyticsService) getStatusCounts(ctx context.Context, f requisitionFilter) (map[string]int64, error) {
	query := fmt.Sprintf(
		`SELECT COALESCE(status,'') AS status, COUNT(*) AS count
		 FROM requisitions
		 WHERE %s
		 GROUP BY status`,
		f.where,
	)
	rows, err := config.PgxDB.Query(ctx, query, f.args...)
	if err != nil {
		return nil, fmt.Errorf("analytics: get status counts: %w", err)
	}
	defer rows.Close()

	out := make(map[string]int64)
	for rows.Next() {
		var (
			status string
			count  int64
		)
		if err := rows.Scan(&status, &count); err != nil {
			return nil, fmt.Errorf("analytics: scan status count row: %w", err)
		}
		out[status] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("analytics: iterate status counts: %w", err)
	}
	return out, nil
}

// calculateRejectionRate calculates overall rejection rate.
func (s *AnalyticsService) calculateRejectionRate(ctx context.Context, f requisitionFilter) (float64, error) {
	query := fmt.Sprintf(
		`SELECT COUNT(*) AS total_count,
		        COUNT(CASE WHEN UPPER(status) = 'REJECTED' THEN 1 END) AS rejected_count
		 FROM requisitions
		 WHERE %s`,
		f.where,
	)
	var total, rejected int64
	if err := config.PgxDB.QueryRow(ctx, query, f.args...).Scan(&total, &rejected); err != nil {
		return 0, fmt.Errorf("analytics: calculate rejection rate: %w", err)
	}
	if total == 0 {
		return 0, nil
	}
	return float64(rejected) / float64(total) * 100, nil
}

// getRejectionsOverTime groups rejections by time period.
//
// Aggregation is intentionally done in Go (matching the original behaviour)
// so that ISO-week formatting matches Go's time.Format conventions.
func (s *AnalyticsService) getRejectionsOverTime(ctx context.Context, f requisitionFilter, period string) ([]types.RejectionTimeData, error) {
	if period == "" {
		period = "daily"
	}

	var dateFormat string
	switch period {
	case "weekly":
		dateFormat = "2006-W02"
	case "monthly":
		dateFormat = "2006-01"
	default:
		dateFormat = "2006-01-02"
	}

	query := fmt.Sprintf(
		`SELECT created_at, COALESCE(status,'')
		 FROM requisitions
		 WHERE %s`,
		f.where,
	)
	rows, err := config.PgxDB.Query(ctx, query, f.args...)
	if err != nil {
		return nil, fmt.Errorf("analytics: list requisitions for time bucketing: %w", err)
	}
	defer rows.Close()

	timeGroupMap := make(map[string]*types.RejectionTimeData)
	for rows.Next() {
		var (
			createdAt time.Time
			status    string
		)
		if err := rows.Scan(&createdAt, &status); err != nil {
			return nil, fmt.Errorf("analytics: scan rejection time row: %w", err)
		}
		dateStr := createdAt.Format(dateFormat)
		if _, ok := timeGroupMap[dateStr]; !ok {
			timeGroupMap[dateStr] = &types.RejectionTimeData{Date: dateStr}
		}
		timeGroupMap[dateStr].Total++
		if strings.ToUpper(status) == "REJECTED" {
			timeGroupMap[dateStr].Rejections++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("analytics: iterate rejection time rows: %w", err)
	}

	results := make([]types.RejectionTimeData, 0, len(timeGroupMap))
	for _, data := range timeGroupMap {
		if data.Total > 0 {
			data.Rate = float64(data.Rejections) / float64(data.Total) * 100
		}
		results = append(results, *data)
	}
	return results, nil
}

// getRejectionReasons extracts reasons from approval_history JSONB.
func (s *AnalyticsService) getRejectionReasons(ctx context.Context, f requisitionFilter) ([]types.RejectionReason, error) {
	// Add the rejected-status filter on top of the base WHERE.
	query := fmt.Sprintf(
		`SELECT approval_history
		 FROM requisitions
		 WHERE %s AND UPPER(status) = 'REJECTED'`,
		f.where,
	)
	rows, err := config.PgxDB.Query(ctx, query, f.args...)
	if err != nil {
		return nil, fmt.Errorf("analytics: list rejected requisitions: %w", err)
	}
	defer rows.Close()

	reasonCounts := make(map[string]int64)
	var totalRejections int64

	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return nil, fmt.Errorf("analytics: scan approval_history: %w", err)
		}
		if len(raw) == 0 {
			continue
		}
		var records []types.ApprovalRecord
		if err := json.Unmarshal(raw, &records); err != nil {
			continue
		}
		for _, rec := range records {
			if strings.ToUpper(rec.Status) == "REJECTED" {
				reason := strings.TrimSpace(rec.Comments)
				if reason == "" {
					reason = "No reason provided"
				}
				reasonCounts[reason]++
				totalRejections++
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("analytics: iterate rejected requisitions: %w", err)
	}

	results := make([]types.RejectionReason, 0, len(reasonCounts))
	for reason, count := range reasonCounts {
		percentage := 0.0
		if totalRejections > 0 {
			percentage = float64(count) / float64(totalRejections) * 100
		}
		results = append(results, types.RejectionReason{
			Reason:     reason,
			Count:      count,
			Percentage: percentage,
		})
	}
	return results, nil
}

// getTopRejectingApprovers identifies approvers with highest rejection rates.
//
// We previously preloaded the Requester relation — that information isn't
// used in the aggregation, so the new pass just streams approval_history
// blobs.
func (s *AnalyticsService) getTopRejectingApprovers(ctx context.Context, f requisitionFilter) ([]types.ApproverStats, error) {
	query := fmt.Sprintf(
		`SELECT approval_history FROM requisitions WHERE %s`,
		f.where,
	)
	rows, err := config.PgxDB.Query(ctx, query, f.args...)
	if err != nil {
		return nil, fmt.Errorf("analytics: list requisitions for approver stats: %w", err)
	}
	defer rows.Close()

	approverStatsMap := make(map[string]*types.ApproverStats)
	if err := scanApproverStats(rows, approverStatsMap); err != nil {
		return nil, err
	}

	results := make([]types.ApproverStats, 0, len(approverStatsMap))
	for _, stats := range approverStatsMap {
		total := stats.Rejections + stats.Approvals
		if total > 0 {
			stats.RejectionRate = float64(stats.Rejections) / float64(total) * 100
		}
		results = append(results, *stats)
	}
	return results, nil
}

// scanApproverStats reads each approval_history JSONB blob and folds its
// approver-level counters into the running map.
func scanApproverStats(rows pgx.Rows, statsMap map[string]*types.ApproverStats) error {
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return fmt.Errorf("analytics: scan approval_history: %w", err)
		}
		if len(raw) == 0 {
			continue
		}
		var records []types.ApprovalRecord
		if err := json.Unmarshal(raw, &records); err != nil {
			continue
		}
		for _, rec := range records {
			id := rec.ApproverID
			if _, ok := statsMap[id]; !ok {
				statsMap[id] = &types.ApproverStats{
					ApproverID:   id,
					ApproverName: rec.ApproverName,
				}
			}
			switch strings.ToUpper(rec.Status) {
			case "REJECTED":
				statsMap[id].Rejections++
			case "APPROVED":
				statsMap[id].Approvals++
			}
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("analytics: iterate approver stats: %w", err)
	}
	return nil
}
