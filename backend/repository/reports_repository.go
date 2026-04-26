package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tether-erp/models"
)

type ReportsRepository struct {
	db *pgxpool.Pool
}

func NewReportsRepository(db *pgxpool.Pool) *ReportsRepository {
	return &ReportsRepository{db: db}
}

// QueryDocumentStats aggregates document statistics across all document types
func (r *ReportsRepository) QueryDocumentStats(
	ctx context.Context,
	organizationID string,
	startDate string,
	endDate string,
) (*models.ReportDocumentStats, error) {
	// Convert empty strings to nil for SQL NULL handling
	var startDateParam, endDateParam interface{}
	if startDate == "" {
		startDateParam = nil
	} else {
		startDateParam = startDate
	}
	if endDate == "" {
		endDateParam = nil
	} else {
		endDateParam = endDate
	}

	query := `
		WITH all_documents AS (
			SELECT id, status, created_at, 'requisition' as doc_type FROM requisitions WHERE organization_id = $1
			UNION ALL
			SELECT id, status, created_at, 'purchase_order' FROM purchase_orders WHERE organization_id = $1
			UNION ALL
			SELECT id, status, created_at, 'payment_voucher' FROM payment_vouchers WHERE organization_id = $1
			UNION ALL
			SELECT id, status, created_at, 'grn' FROM goods_received_notes WHERE organization_id = $1
			UNION ALL
			SELECT id, status, created_at, 'budget' FROM budgets WHERE organization_id = $1
		),
		filtered_docs AS (
			SELECT * FROM all_documents
			WHERE ($2::timestamp IS NULL OR created_at >= $2)
			  AND ($3::timestamp IS NULL OR created_at <= $3)
		),
		approval_times AS (
			SELECT
				wt.entity_id as document_id,
				EXTRACT(EPOCH FROM (MAX(sar.approved_at) - MIN(sar.approved_at))) / 86400 as days
			FROM workflow_tasks wt
			INNER JOIN stage_approval_records sar ON wt.id = sar.workflow_task_id
			INNER JOIN filtered_docs fd ON wt.entity_id = fd.id
			WHERE sar.action IN ('approved', 'rejected')
			  AND wt.organization_id = $1
			GROUP BY wt.entity_id
		)
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE UPPER(status) = 'APPROVED') as approved,
			COUNT(*) FILTER (WHERE UPPER(status) = 'REJECTED') as rejected,
			COUNT(*) FILTER (WHERE UPPER(status) = 'DRAFT') as draft,
			COUNT(*) FILTER (WHERE UPPER(status) = 'SUBMITTED') as submitted,
			COUNT(*) FILTER (WHERE UPPER(status) IN ('IN_REVIEW', 'PENDING')) as pending,
			COALESCE(AVG(at.days), 0) as avg_approval_days,
			COUNT(*) FILTER (WHERE doc_type = 'requisition') as requisitions,
			COUNT(*) FILTER (WHERE doc_type = 'purchase_order') as purchase_orders,
			COUNT(*) FILTER (WHERE doc_type = 'payment_voucher') as payment_vouchers,
			COUNT(*) FILTER (WHERE doc_type = 'grn') as grn_count,
			COUNT(*) FILTER (WHERE doc_type = 'budget') as budgets
		FROM filtered_docs fd
		LEFT JOIN approval_times at ON fd.id = at.document_id
	`

	var stats models.ReportDocumentStats
	err := r.db.QueryRow(ctx, query, organizationID, startDateParam, endDateParam).Scan(
		&stats.Total,
		&stats.Approved,
		&stats.Rejected,
		&stats.Draft,
		&stats.Submitted,
		&stats.Pending,
		&stats.AvgApprovalDays,
		&stats.TypeBreakdown.Requisitions,
		&stats.TypeBreakdown.PurchaseOrders,
		&stats.TypeBreakdown.PaymentVouchers,
		&stats.TypeBreakdown.GRN,
		&stats.TypeBreakdown.Budgets,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to query document stats: %w", err)
	}

	// Calculate status breakdown
	stats.StatusBreakdown.Draft = stats.Draft
	stats.StatusBreakdown.Submitted = stats.Submitted
	stats.StatusBreakdown.InReview = stats.Pending
	stats.StatusBreakdown.Approved = stats.Approved
	stats.StatusBreakdown.Rejected = stats.Rejected

	return &stats, nil
}

// QueryApprovalActivity retrieves recent approval actions
func (r *ReportsRepository) QueryApprovalActivity(
	ctx context.Context,
	organizationID string,
	limit int,
) ([]models.ApprovalActivity, error) {
	query := `
		SELECT
			sar.id,
			wt.entity_id as document_id,
			wt.entity_type as document_type,
			sar.action,
			sar.comments,
			sar.approved_at as created_at,
			sar.approver_name,
			sar.approver_role,
			CASE
				WHEN wt.entity_type = 'REQUISITION' THEN COALESCE(r.document_number, 'REQ-' || wt.entity_id)
				WHEN wt.entity_type = 'PURCHASE_ORDER' THEN COALESCE(po.document_number, 'PO-' || wt.entity_id)
				WHEN wt.entity_type = 'PAYMENT_VOUCHER' THEN COALESCE(pv.document_number, 'PV-' || wt.entity_id)
				WHEN wt.entity_type = 'GRN' THEN COALESCE(g.document_number, 'GRN-' || wt.entity_id)
				WHEN wt.entity_type = 'BUDGET' THEN COALESCE(b.budget_code, 'BUD-' || wt.entity_id)
				ELSE 'DOC-' || wt.entity_id
			END as document_number
		FROM stage_approval_records sar
		INNER JOIN workflow_tasks wt ON sar.workflow_task_id = wt.id
		LEFT JOIN requisitions r ON wt.entity_id = r.id AND wt.entity_type = 'REQUISITION'
		LEFT JOIN purchase_orders po ON wt.entity_id = po.id AND wt.entity_type = 'PURCHASE_ORDER'
		LEFT JOIN payment_vouchers pv ON wt.entity_id = pv.id AND wt.entity_type = 'PAYMENT_VOUCHER'
		LEFT JOIN goods_received_notes g ON wt.entity_id = g.id AND wt.entity_type = 'GRN'
		LEFT JOIN budgets b ON wt.entity_id = b.id AND wt.entity_type = 'BUDGET'
		WHERE sar.organization_id = $1
		  AND sar.action IN ('approved', 'rejected')
		ORDER BY sar.approved_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(ctx, query, organizationID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query approval activity: %w", err)
	}
	defer rows.Close()

	var activities []models.ApprovalActivity
	for rows.Next() {
		var activity models.ApprovalActivity
		err := rows.Scan(
			&activity.ID,
			&activity.DocumentID,
			&activity.DocumentType,
			&activity.Action,
			&activity.Comments,
			&activity.CreatedAt,
			&activity.ApproverName,
			&activity.ApproverRole,
			&activity.DocumentNumber,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan approval activity: %w", err)
		}
		activities = append(activities, activity)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating approval activities: %w", err)
	}

	return activities, nil
}

// QueryUserActivity retrieves user activity statistics
func (r *ReportsRepository) QueryUserActivity(
	ctx context.Context,
	organizationID string,
) ([]models.UserActivity, error) {
	query := `
		WITH user_approvals AS (
			SELECT
				u.id,
				u.name,
				u.email,
				u.role,
				COUNT(*) FILTER (WHERE sar.action = 'approved') as approval_count,
				COUNT(*) FILTER (WHERE sar.action = 'rejected') as rejection_count,
				MAX(sar.approved_at) as last_activity
			FROM users u
			INNER JOIN organization_members om ON u.id = om.user_id
			LEFT JOIN stage_approval_records sar ON u.id = sar.approver_id AND sar.organization_id = $1
			WHERE om.organization_id = $1
			  AND om.active = true
			GROUP BY u.id, u.name, u.email, u.role
		),
		active_docs AS (
			SELECT
				created_by,
				COUNT(*) as active_count
			FROM (
				SELECT created_by FROM requisitions WHERE organization_id = $1 AND UPPER(status) IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW')
				UNION ALL
				SELECT created_by FROM purchase_orders WHERE organization_id = $1 AND UPPER(status) IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW')
				UNION ALL
				SELECT created_by FROM payment_vouchers WHERE organization_id = $1 AND UPPER(status) IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW')
				UNION ALL
				SELECT created_by FROM budgets WHERE organization_id = $1 AND UPPER(status) IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW')
			) docs
			GROUP BY created_by
		)
		SELECT
			ua.id,
			ua.name,
			ua.email,
			ua.role,
			COALESCE(ua.approval_count, 0) as approval_count,
			COALESCE(ua.rejection_count, 0) as rejection_count,
			COALESCE(ad.active_count, 0) as active_documents,
			ua.last_activity
		FROM user_approvals ua
		LEFT JOIN active_docs ad ON ua.id = ad.created_by
		ORDER BY ua.approval_count DESC
	`

	rows, err := r.db.Query(ctx, query, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user activity: %w", err)
	}
	defer rows.Close()

	var users []models.UserActivity
	for rows.Next() {
		var user models.UserActivity
		err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Email,
			&user.Role,
			&user.ApprovalCount,
			&user.RejectionCount,
			&user.ActiveDocuments,
			&user.LastActivity,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user activity: %w", err)
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating user activities: %w", err)
	}

	return users, nil
}

// QueryApprovalTrends retrieves approval trends for the last 7 days
func (r *ReportsRepository) QueryApprovalTrends(
	ctx context.Context,
	organizationID string,
) ([]models.ApprovalTrend, error) {
	query := `
		WITH date_series AS (
			SELECT generate_series(
				CURRENT_DATE - INTERVAL '6 days',
				CURRENT_DATE,
				'1 day'::interval
			)::date as date
		),
		daily_approvals AS (
			SELECT
				DATE(sar.approved_at) as approval_date,
				COUNT(*) FILTER (WHERE sar.action = 'approved') as approved,
				COUNT(*) FILTER (WHERE sar.action = 'rejected') as rejected
			FROM stage_approval_records sar
			WHERE sar.organization_id = $1
			  AND sar.approved_at >= CURRENT_DATE - INTERVAL '6 days'
			GROUP BY DATE(sar.approved_at)
		),
		daily_pending AS (
			SELECT
				ds.date,
				COUNT(*) as pending
			FROM date_series ds
			CROSS JOIN (
				SELECT id FROM requisitions WHERE organization_id = $1 AND UPPER(status) IN ('IN_REVIEW', 'PENDING')
				UNION ALL
				SELECT id FROM purchase_orders WHERE organization_id = $1 AND UPPER(status) IN ('IN_REVIEW', 'PENDING')
				UNION ALL
				SELECT id FROM payment_vouchers WHERE organization_id = $1 AND UPPER(status) IN ('IN_REVIEW', 'PENDING')
				UNION ALL
				SELECT id FROM budgets WHERE organization_id = $1 AND UPPER(status) IN ('IN_REVIEW', 'PENDING')
			) docs
			GROUP BY ds.date
		)
		SELECT
			TO_CHAR(ds.date, 'Mon DD') as date,
			COALESCE(da.approved, 0) as approved,
			COALESCE(da.rejected, 0) as rejected,
			COALESCE(dp.pending, 0) as pending
		FROM date_series ds
		LEFT JOIN daily_approvals da ON ds.date = da.approval_date
		LEFT JOIN daily_pending dp ON ds.date = dp.date
		ORDER BY ds.date
	`

	rows, err := r.db.Query(ctx, query, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to query approval trends: %w", err)
	}
	defer rows.Close()

	var trends []models.ApprovalTrend
	for rows.Next() {
		var trend models.ApprovalTrend
		err := rows.Scan(
			&trend.Date,
			&trend.Approved,
			&trend.Rejected,
			&trend.Pending,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan approval trend: %w", err)
		}
		trends = append(trends, trend)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating approval trends: %w", err)
	}

	return trends, nil
}

// QueryStageMetrics retrieves performance metrics for each approval stage
func (r *ReportsRepository) QueryStageMetrics(
	ctx context.Context,
	organizationID string,
	slaThresholdDays float64,
) ([]models.StageMetric, error) {
	query := `
		WITH stage_times AS (
			SELECT
				wt.stage_number,
				wt.stage_name,
				EXTRACT(EPOCH FROM (sar.approved_at - wt.created_at)) / 86400 as processing_days
			FROM workflow_tasks wt
			INNER JOIN stage_approval_records sar ON wt.id = sar.workflow_task_id
			WHERE wt.organization_id = $1
			  AND sar.action IN ('approved', 'rejected')
			  AND wt.created_at IS NOT NULL
		)
		SELECT
			stage_name,
			AVG(processing_days) as avg_processing_time,
			COUNT(*) as document_count,
			(COUNT(*) FILTER (WHERE processing_days <= $2)::float / COUNT(*) * 100) as sla_compliance
		FROM stage_times
		GROUP BY stage_number, stage_name
		ORDER BY stage_number
	`

	rows, err := r.db.Query(ctx, query, organizationID, slaThresholdDays)
	if err != nil {
		return nil, fmt.Errorf("failed to query stage metrics: %w", err)
	}
	defer rows.Close()

	var metrics []models.StageMetric
	for rows.Next() {
		var metric models.StageMetric
		err := rows.Scan(
			&metric.StageName,
			&metric.AvgProcessingTime,
			&metric.DocumentCount,
			&metric.SLACompliance,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan stage metric: %w", err)
		}
		metrics = append(metrics, metric)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating stage metrics: %w", err)
	}

	return metrics, nil
}

// QueryBottleneck identifies the slowest approval stage
func (r *ReportsRepository) QueryBottleneck(
	ctx context.Context,
	organizationID string,
) (*models.BottleneckInfo, error) {
	query := `
		WITH stage_times AS (
			SELECT
				wt.stage_name,
				EXTRACT(EPOCH FROM (sar.approved_at - wt.created_at)) / 86400 as processing_days
			FROM workflow_tasks wt
			INNER JOIN stage_approval_records sar ON wt.id = sar.workflow_task_id
			WHERE wt.organization_id = $1
			  AND sar.action IN ('approved', 'rejected')
			  AND wt.created_at IS NOT NULL
		)
		SELECT
			stage_name,
			AVG(processing_days) as avg_days,
			COUNT(*) as document_count
		FROM stage_times
		GROUP BY stage_name
		ORDER BY avg_days DESC
		LIMIT 1
	`

	var bottleneck models.BottleneckInfo
	err := r.db.QueryRow(ctx, query, organizationID).Scan(
		&bottleneck.StageName,
		&bottleneck.AvgDays,
		&bottleneck.DocumentCount,
	)

	if err == pgx.ErrNoRows {
		return nil, nil // No bottleneck data available
	}

	if err != nil {
		return nil, fmt.Errorf("failed to query bottleneck: %w", err)
	}

	return &bottleneck, nil
}

// QueryBudgetUtilization calculates budget utilization percentage
func (r *ReportsRepository) QueryBudgetUtilization(
	ctx context.Context,
	organizationID string,
) (float64, error) {
	query := `
		SELECT
			CASE
				WHEN SUM(total_budget) = 0 THEN 0
				ELSE (SUM(allocated_amount) / SUM(total_budget)) * 100
			END as utilization_percentage
		FROM budgets
		WHERE organization_id = $1
		  AND status NOT IN ('rejected', 'cancelled')
	`

	var utilization float64
	err := r.db.QueryRow(ctx, query, organizationID).Scan(&utilization)
	if err != nil {
		return 0, fmt.Errorf("failed to query budget utilization: %w", err)
	}

	return utilization, nil
}

// QueryAverageProcessingTime calculates average time from document creation to completion
func (r *ReportsRepository) QueryAverageProcessingTime(
	ctx context.Context,
	organizationID string,
	startDate string,
	endDate string,
) (float64, error) {
	// Convert empty strings to nil for SQL NULL handling
	var startDateParam, endDateParam interface{}
	if startDate == "" {
		startDateParam = nil
	} else {
		startDateParam = startDate
	}
	if endDate == "" {
		endDateParam = nil
	} else {
		endDateParam = endDate
	}

	query := `
		WITH completed_documents AS (
			SELECT 
				created_at,
				updated_at,
				EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 as processing_days
			FROM (
				SELECT created_at, updated_at FROM requisitions 
				WHERE organization_id = $1 
				  AND UPPER(status) IN ('APPROVED', 'REJECTED', 'COMPLETED')
				  AND ($2::timestamp IS NULL OR created_at >= $2)
				  AND ($3::timestamp IS NULL OR created_at <= $3)
				UNION ALL
				SELECT created_at, updated_at FROM purchase_orders 
				WHERE organization_id = $1 
				  AND UPPER(status) IN ('APPROVED', 'REJECTED', 'COMPLETED')
				  AND ($2::timestamp IS NULL OR created_at >= $2)
				  AND ($3::timestamp IS NULL OR created_at <= $3)
				UNION ALL
				SELECT created_at, updated_at FROM payment_vouchers 
				WHERE organization_id = $1 
				  AND UPPER(status) IN ('APPROVED', 'REJECTED', 'COMPLETED')
				  AND ($2::timestamp IS NULL OR created_at >= $2)
				  AND ($3::timestamp IS NULL OR created_at <= $3)
				UNION ALL
				SELECT created_at, updated_at FROM goods_received_notes 
				WHERE organization_id = $1 
				  AND UPPER(status) IN ('APPROVED', 'REJECTED', 'COMPLETED')
				  AND ($2::timestamp IS NULL OR created_at >= $2)
				  AND ($3::timestamp IS NULL OR created_at <= $3)
				UNION ALL
				SELECT created_at, updated_at FROM budgets 
				WHERE organization_id = $1 
				  AND UPPER(status) IN ('APPROVED', 'REJECTED')
				  AND ($2::timestamp IS NULL OR created_at >= $2)
				  AND ($3::timestamp IS NULL OR created_at <= $3)
			) all_docs
		)
		SELECT COALESCE(AVG(processing_days), 0) as avg_processing_time
		FROM completed_documents
		WHERE processing_days > 0
	`

	var avgProcessingTime float64
	err := r.db.QueryRow(ctx, query, organizationID, startDateParam, endDateParam).Scan(&avgProcessingTime)
	if err != nil {
		return 0, fmt.Errorf("failed to query average processing time: %w", err)
	}

	return avgProcessingTime, nil
}
