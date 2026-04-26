package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
)

// ActivityRepository handles persistence for user_activity_logs.
// Backed by pgxpool + sqlc-generated queries (no GORM).
type ActivityRepository struct {
	db      *pgxpool.Pool
	queries *sqlc.Queries
}

// NewActivityRepository creates a new ActivityRepository backed by pgxpool.
func NewActivityRepository(pgxDB *pgxpool.Pool) *ActivityRepository {
	return &ActivityRepository{
		db:      pgxDB,
		queries: sqlc.New(pgxDB),
	}
}

// Create inserts a new activity log entry. The provided log is mutated in
// place with the values returned by the database (id, created_at).
func (r *ActivityRepository) Create(ctx context.Context, logEntry *models.UserActivityLog) error {
	if logEntry == nil {
		return fmt.Errorf("activity_repository: create: nil log entry")
	}

	// ID: generate one if the caller didn't supply one.
	id := logEntry.ID
	if id == uuid.Nil {
		id = uuid.New()
	}

	params := sqlc.CreateActivityLogParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		UserID:         logEntry.UserID,
		OrganizationID: logEntry.OrganizationID,
		ActionType:     logEntry.ActionType,
		ResourceType:   stringPtrIfNotEmpty(logEntry.ResourceType),
		ResourceID:     stringPtrIfNotEmpty(logEntry.ResourceID),
		IpAddress:      stringPtrIfNotEmpty(logEntry.IPAddress),
		UserAgent:      stringPtrIfNotEmpty(logEntry.UserAgent),
		Metadata:       []byte(logEntry.Metadata),
	}

	row, err := r.queries.CreateActivityLog(ctx, params)
	if err != nil {
		return fmt.Errorf("activity_repository: create: %w", err)
	}

	created := activityLogFromSQLC(row)
	*logEntry = *created
	return nil
}

// GetByUserID returns paginated activity logs for a user with optional filters.
//
// Filter coverage notes:
//   - StartDate, EndDate, ActionType: passed through to the sqlc query.
//   - ResourceType, Search: not supported by the current sqlc query
//     (ListActivityLogsByUser). We apply these as in-memory filters over the
//     page returned by the DB. This is acceptable because the page is bounded
//     by `limit` (<= 100). The reported `total` count therefore reflects only
//     the DB-level filters; results trimmed in-memory may shrink the slice
//     below `total`. See TODO below for a proper fix.
//
// TODO: Extend `ListActivityLogsByUser` / `CountActivityLogsByUser` in
// `database/queries/user_activity_logs.sql` to accept resource_type and
// search params so total + result set match exactly.
func (r *ActivityRepository) GetByUserID(
	ctx context.Context,
	userID string,
	filters models.ActivityFilters,
) ([]*models.UserActivityLog, int64, error) {
	page, limit := normalizePagination(filters.Page, filters.Limit)
	offset := (page - 1) * limit

	startTs := timePtrToPgTimestamptz(filters.StartDate)
	endTs := timePtrToPgTimestamptz(filters.EndDate)

	listParams := sqlc.ListActivityLogsByUserParams{
		UserID:  userID,
		Column2: filters.ActionType,
		Column3: startTs,
		Column4: endTs,
		Limit:   int32(limit),
		Offset:  int32(offset),
	}

	rows, err := r.queries.ListActivityLogsByUser(ctx, listParams)
	if err != nil {
		return nil, 0, fmt.Errorf("activity_repository: list by user: %w", err)
	}

	countParams := sqlc.CountActivityLogsByUserParams{
		UserID:  userID,
		Column2: filters.ActionType,
		Column3: startTs,
		Column4: endTs,
	}
	total, err := r.queries.CountActivityLogsByUser(ctx, countParams)
	if err != nil {
		return nil, 0, fmt.Errorf("activity_repository: count by user: %w", err)
	}

	logs := make([]*models.UserActivityLog, 0, len(rows))
	for _, row := range rows {
		entry := activityLogFromSQLC(row)
		if !matchesUnsupportedFilters(entry, filters) {
			continue
		}
		logs = append(logs, entry)
	}

	return logs, total, nil
}

// GetStatistics calculates activity statistics for a user over the given
// number of days. The current sqlc bundle doesn't include aggregation
// queries, so we run them as raw pgx queries against the same pool.
//
// TODO: Add aggregation queries to `database/queries/user_activity_logs.sql`
// (e.g. `:many` queries returning action_type/count and date/count) and
// switch this method to use them.
func (r *ActivityRepository) GetStatistics(
	ctx context.Context,
	userID string,
	days int,
) (*models.ActivityStatistics, error) {
	since := time.Now().AddDate(0, 0, -days)

	stats := &models.ActivityStatistics{
		ActionsByType: make(map[string]int64),
		ActionsByDay:  make(map[string]int64),
	}

	// 1) Counts by action_type.
	const byTypeSQL = `
        SELECT action_type, COUNT(*) AS cnt
        FROM user_activity_logs
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY action_type
        ORDER BY cnt DESC`
	typeRows, err := r.db.Query(ctx, byTypeSQL, userID, since)
	if err != nil {
		return nil, fmt.Errorf("activity_repository: stats by type: %w", err)
	}
	func() {
		defer typeRows.Close()
		for typeRows.Next() {
			var actionType string
			var cnt int64
			if scanErr := typeRows.Scan(&actionType, &cnt); scanErr != nil {
				err = scanErr
				return
			}
			stats.TotalActions += cnt
			stats.ActionsByType[actionType] = cnt
			if stats.MostCommonAction == "" {
				stats.MostCommonAction = actionType
			}
		}
		err = typeRows.Err()
	}()
	if err != nil {
		return nil, fmt.Errorf("activity_repository: stats by type scan: %w", err)
	}

	// 2) Counts by day.
	const byDaySQL = `
        SELECT to_char(DATE(created_at), 'YYYY-MM-DD') AS day, COUNT(*) AS cnt
        FROM user_activity_logs
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY day
        ORDER BY day ASC`
	dayRows, err := r.db.Query(ctx, byDaySQL, userID, since)
	if err != nil {
		return nil, fmt.Errorf("activity_repository: stats by day: %w", err)
	}
	func() {
		defer dayRows.Close()
		for dayRows.Next() {
			var day string
			var cnt int64
			if scanErr := dayRows.Scan(&day, &cnt); scanErr != nil {
				err = scanErr
				return
			}
			stats.ActionsByDay[day] = cnt
		}
		err = dayRows.Err()
	}()
	if err != nil {
		return nil, fmt.Errorf("activity_repository: stats by day scan: %w", err)
	}

	// 3) Last activity time (across all-time, not just window).
	// MAX over zero rows yields a single NULL row, which scans cleanly into
	// an invalid pgtype.Timestamptz — no special "no rows" handling needed.
	const lastActSQL = `
        SELECT MAX(created_at) FROM user_activity_logs WHERE user_id = $1`
	var lastTs pgtype.Timestamptz
	if scanErr := r.db.QueryRow(ctx, lastActSQL, userID).Scan(&lastTs); scanErr != nil {
		return nil, fmt.Errorf("activity_repository: last activity: %w", scanErr)
	}
	if lastTs.Valid {
		t := lastTs.Time
		stats.LastActivityTime = &t
	}

	if days > 0 {
		stats.AveragePerDay = float64(stats.TotalActions) / float64(days)
	}

	return stats, nil
}

// DeleteOlderThan removes activity logs older than the given cutoff time and
// returns the number of rows deleted.
//
// TODO: The sqlc-generated `DeleteOldActivityLogs` discards the row count
// (`:exec`). Until that's regenerated as `:execrows`, we issue the DELETE
// directly against the pool to recover RowsAffected.
func (r *ActivityRepository) DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error) {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM user_activity_logs WHERE created_at < $1`, cutoff)
	if err != nil {
		return 0, fmt.Errorf("activity_repository: cleanup: %w", err)
	}
	return tag.RowsAffected(), nil
}

// normalizePagination enforces sensible defaults and a max-limit.
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

// matchesUnsupportedFilters returns true if the entry passes the filters that
// aren't expressible in the current sqlc query (ResourceType, Search). These
// are applied in-memory after the DB returns the page.
func matchesUnsupportedFilters(entry *models.UserActivityLog, f models.ActivityFilters) bool {
	if f.ResourceType != "" && entry.ResourceType != f.ResourceType {
		return false
	}
	if f.Search != "" {
		needle := f.Search
		if !containsFold(entry.ActionType, needle) &&
			!containsFold(entry.ResourceType, needle) &&
			!containsFold(entry.ResourceID, needle) {
			return false
		}
	}
	return true
}

// containsFold is a tiny case-insensitive substring check that avoids
// importing strings just for one helper.
func containsFold(haystack, needle string) bool {
	if needle == "" {
		return true
	}
	if len(haystack) < len(needle) {
		return false
	}
	// Lowercase both via simple ASCII fold; activity payloads are ASCII.
	hL := lowerASCII(haystack)
	nL := lowerASCII(needle)
	for i := 0; i+len(nL) <= len(hL); i++ {
		if hL[i:i+len(nL)] == nL {
			return true
		}
	}
	return false
}

func lowerASCII(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}

// stringPtrIfNotEmpty returns &s when s is non-empty, otherwise nil. Used to
// map model strings (zero-value "") to nullable pgx params.
func stringPtrIfNotEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// timePtrToPgTimestamptz converts an optional time.Time into a
// pgtype.Timestamptz suitable for sqlc's nullable timestamptz params.
func timePtrToPgTimestamptz(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

// activityLogFromSQLC converts the sqlc-generated UserActivityLog row into
// the public models.UserActivityLog used throughout the service layer.
func activityLogFromSQLC(row sqlc.UserActivityLog) *models.UserActivityLog {
	out := &models.UserActivityLog{
		UserID:         row.UserID,
		OrganizationID: row.OrganizationID,
		ActionType:     row.ActionType,
	}
	if row.ID.Valid {
		out.ID = uuid.UUID(row.ID.Bytes)
	}
	if row.ResourceType != nil {
		out.ResourceType = *row.ResourceType
	}
	if row.ResourceID != nil {
		out.ResourceID = *row.ResourceID
	}
	if row.IpAddress != nil {
		out.IPAddress = *row.IpAddress
	}
	if row.UserAgent != nil {
		out.UserAgent = *row.UserAgent
	}
	if len(row.Metadata) > 0 {
		out.Metadata = json.RawMessage(row.Metadata)
	}
	if row.CreatedAt.Valid {
		out.CreatedAt = row.CreatedAt.Time
	}
	return out
}
