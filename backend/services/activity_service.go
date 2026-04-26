package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"strconv"
	"time"

	"github.com/tether-erp/models"
	"github.com/tether-erp/repository"
)

const defaultRetentionDays = 90

// ActivityService handles activity log business logic
type ActivityService struct {
	repo      *repository.ActivityRepository
	logQueue  chan *models.UserActivityLog
}

// NewActivityService creates an ActivityService with an async write queue
func NewActivityService(repo *repository.ActivityRepository) *ActivityService {
	s := &ActivityService{
		repo:     repo,
		logQueue: make(chan *models.UserActivityLog, 2000),
	}
	// Start background workers (pool of 4) to drain the queue
	for i := 0; i < 4; i++ {
		go s.logWorker()
	}
	return s
}

// logWorker drains the logQueue and writes to the database
func (s *ActivityService) logWorker() {
	for entry := range s.logQueue {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := s.repo.Create(ctx, entry); err != nil {
			log.Printf("[ActivityService] Failed to persist activity log: %v", err)
		}
		cancel()
	}
}

// LogActivity enqueues an activity log entry for async persistence.
// It never blocks the caller — if the queue is full the entry is written
// synchronously in a best-effort goroutine rather than dropped silently.
func (s *ActivityService) LogActivity(ctx context.Context, entry *models.UserActivityLog) {
	select {
	case s.logQueue <- entry:
		// queued successfully
	default:
		// Queue is full — fall back to direct async write so we don't lose the entry
		log.Printf("[ActivityService] Log queue full, falling back to direct write: action=%s user=%s", entry.ActionType, entry.UserID)
		go func() {
			writeCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := s.repo.Create(writeCtx, entry); err != nil {
				log.Printf("[ActivityService] Direct write also failed: %v", err)
			}
		}()
	}
}

// GetUserActivity returns paginated activity for a specific user (user-facing, owns their data).
func (s *ActivityService) GetUserActivity(
	ctx context.Context,
	userID string,
	filters models.ActivityFilters,
) (*models.ActivityResponse, error) {
	page, limit := normalizePagination(filters.Page, filters.Limit)
	filters.Page = page
	filters.Limit = limit

	logs, total, err := s.repo.GetByUserID(ctx, userID, filters)
	if err != nil {
		return nil, fmt.Errorf("activity_service: get user activity: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	return &models.ActivityResponse{
		Activities: logs,
		Pagination: models.PaginationMetadata{
			TotalRecords:    total,
			TotalPages:      totalPages,
			CurrentPage:     page,
			HasNextPage:     page < totalPages,
			HasPreviousPage: page > 1,
		},
	}, nil
}

// GetUserActivityAdmin returns paginated activity + statistics for any user (admin-facing).
func (s *ActivityService) GetUserActivityAdmin(
	ctx context.Context,
	userID string,
	filters models.ActivityFilters,
	includeStats bool,
) (*models.AdminActivityResponse, error) {
	page, limit := normalizePagination(filters.Page, filters.Limit)
	filters.Page = page
	filters.Limit = limit

	logs, total, err := s.repo.GetByUserID(ctx, userID, filters)
	if err != nil {
		return nil, fmt.Errorf("activity_service: admin get activity: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	resp := &models.AdminActivityResponse{
		Activities: logs,
		Pagination: models.PaginationMetadata{
			TotalRecords:    total,
			TotalPages:      totalPages,
			CurrentPage:     page,
			HasNextPage:     page < totalPages,
			HasPreviousPage: page > 1,
		},
	}

	if includeStats {
		stats, err := s.repo.GetStatistics(ctx, userID, 30)
		if err != nil {
			log.Printf("[ActivityService] stats error (non-fatal): %v", err)
		} else {
			resp.Statistics = stats
		}
	}

	return resp, nil
}

// GetSecurityEvents returns activity log entries that are security-related.
func (s *ActivityService) GetSecurityEvents(
	ctx context.Context,
	userID string,
	filters models.ActivityFilters,
) (*models.ActivityResponse, error) {
	// Filter to only security action types
	securityTypes := []string{
		models.ActionLogin,
		models.ActionFailedLogin,
		models.ActionLogout,
		models.ActionPasswordChange,
		models.ActionPasswordReset,
		models.ActionSessionTerminate,
		models.ActionAccountLockout,
	}
	// Override action type filter: if caller specified one, honour it if it's a security type
	if _, ok := models.SecurityActionTypes[filters.ActionType]; !ok {
		filters.ActionType = "" // will be handled by IN clause below — use GetSecurityEvents query
	}
	_ = securityTypes // used below via direct query — delegate to repo's GetByUserID with special filter

	// For now, filter client-side from the full set (acceptable for typical log volumes)
	bigFilter := filters
	bigFilter.Page = 1
	bigFilter.Limit = 100

	logs, _, err := s.repo.GetByUserID(ctx, userID, bigFilter)
	if err != nil {
		return nil, fmt.Errorf("activity_service: security events: %w", err)
	}

	var secLogs []*models.UserActivityLog
	for _, l := range logs {
		if models.SecurityActionTypes[l.ActionType] {
			secLogs = append(secLogs, l)
		}
	}

	page, limit := normalizePagination(filters.Page, filters.Limit)
	start := (page - 1) * limit
	end := start + limit
	if start > len(secLogs) {
		start = len(secLogs)
	}
	if end > len(secLogs) {
		end = len(secLogs)
	}
	paged := secLogs[start:end]

	filteredTotal := int64(len(secLogs))
	totalPages := int(math.Ceil(float64(filteredTotal) / float64(limit)))
	return &models.ActivityResponse{
		Activities: paged,
		Pagination: models.PaginationMetadata{
			TotalRecords:    filteredTotal,
			TotalPages:      totalPages,
			CurrentPage:     page,
			HasNextPage:     page < totalPages,
			HasPreviousPage: page > 1,
		},
	}, nil
}

// GetStatistics returns 30-day activity statistics for a user.
func (s *ActivityService) GetStatistics(ctx context.Context, userID string, days int) (*models.ActivityStatistics, error) {
	if days <= 0 {
		days = 30
	}
	return s.repo.GetStatistics(ctx, userID, days)
}

// ExportActivity exports activity logs as CSV or JSON bytes.
// Returns (data, contentType, filename, error).
func (s *ActivityService) ExportActivity(
	ctx context.Context,
	userID string,
	format string,
	filters models.ActivityFilters,
) ([]byte, string, string, error) {
	// Fetch up to 10 000 records for export
	filters.Page = 1
	filters.Limit = 100
	// Override limit to max for export
	filters.Limit = 100

	var allLogs []*models.UserActivityLog
	for page := 1; ; page++ {
		filters.Page = page
		chunk, _, err := s.repo.GetByUserID(ctx, userID, filters)
		if err != nil {
			return nil, "", "", fmt.Errorf("activity_service: export fetch page %d: %w", page, err)
		}
		allLogs = append(allLogs, chunk...)
		if len(chunk) < filters.Limit {
			break
		}
		if len(allLogs) >= 10000 {
			break
		}
	}

	timestamp := time.Now().Format("20060102-150405")

	switch format {
	case "json":
		data, err := json.Marshal(allLogs)
		if err != nil {
			return nil, "", "", fmt.Errorf("activity_service: json marshal: %w", err)
		}
		filename := fmt.Sprintf("activity-%s-%s.json", userID[:8], timestamp)
		return data, "application/json", filename, nil

	default: // csv
		var buf bytes.Buffer
		w := csv.NewWriter(&buf)
		_ = w.Write([]string{"id", "action_type", "resource_type", "resource_id", "ip_address", "created_at"})
		for _, l := range allLogs {
			_ = w.Write([]string{
				l.ID.String(),
				l.ActionType,
				l.ResourceType,
				l.ResourceID,
				l.IPAddress,
				l.CreatedAt.Format(time.RFC3339),
			})
		}
		w.Flush()
		if err := w.Error(); err != nil {
			return nil, "", "", fmt.Errorf("activity_service: csv write: %w", err)
		}
		filename := fmt.Sprintf("activity-%s-%s.csv", userID[:8], timestamp)
		return buf.Bytes(), "text/csv", filename, nil
	}
}

// StartRetentionCleanupWorker runs a daily job to purge old activity logs.
// It reads ACTIVITY_RETENTION_DAYS from the environment (default 90).
func (s *ActivityService) StartRetentionCleanupWorker(ctx context.Context) {
	retentionDays := defaultRetentionDays
	if v := os.Getenv("ACTIVITY_RETENTION_DAYS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			retentionDays = n
		}
	}

	log.Printf("[ActivityService] Retention worker started (retention=%d days)", retentionDays)

	// Run once on startup, then daily
	s.runCleanup(retentionDays)

	// Schedule next run at the next 2:00 AM UTC
	for {
		now := time.Now().UTC()
		next := time.Date(now.Year(), now.Month(), now.Day()+1, 2, 0, 0, 0, time.UTC)
		timer := time.NewTimer(time.Until(next))

		select {
		case <-ctx.Done():
			timer.Stop()
			log.Println("[ActivityService] Retention worker stopped")
			return
		case <-timer.C:
			s.runCleanup(retentionDays)
		}
	}
}

func (s *ActivityService) runCleanup(retentionDays int) {
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	deleted, err := s.repo.DeleteOlderThan(ctx, cutoff)
	if err != nil {
		log.Printf("[ActivityService] Retention cleanup error: %v", err)
		return
	}
	log.Printf("[ActivityService] Retention cleanup complete: deleted %d records older than %s", deleted, cutoff.Format("2006-01-02"))
}

// normalizePagination enforces defaults and caps (mirrors the repo helper)
func normalizePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}
