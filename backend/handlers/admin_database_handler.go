package handlers

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

const connectionID = "primary-postgresql"

func validateConnectionID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id != connectionID {
		return utils.SendNotFound(c, "Database connection not found")
	}
	return nil
}

// poolStats returns metrics from the pgxpool. Compared with the previous *sql.DB
// stats, OpenConnections ↔ TotalConns, InUse ↔ AcquiredConns, Idle ↔ IdleConns.
func poolStats(ctx context.Context) map[string]interface{} {
	out := map[string]interface{}{}
	if config.PgxDB == nil {
		return out
	}
	st := config.PgxDB.Stat()
	out["active"] = int(st.AcquiredConns())
	out["idle"] = int(st.IdleConns())
	out["total"] = int(st.TotalConns())
	out["max"] = int(st.MaxConns())
	return out
}

func getConnectionInfo(ctx context.Context) map[string]interface{} {
	now := time.Now().Format(time.RFC3339)

	info := map[string]interface{}{
		"id":                 connectionID,
		"name":               "Primary PostgreSQL",
		"type":               "postgresql",
		"host":               os.Getenv("DB_HOST"),
		"port":               os.Getenv("DB_PORT"),
		"database":           os.Getenv("DB_NAME"),
		"username":           os.Getenv("DB_USER"),
		"ssl_mode":           os.Getenv("DB_SSL_MODE"),
		"is_primary":         true,
		"is_replica":         false,
		"status":             "unknown",
		"active_connections": 0,
		"idle_connections":   0,
		"max_connections":    0,
		"last_health_check":  now,
		"created_at":         now,
		"updated_at":         now,
	}

	if config.PgxDB != nil {
		st := config.PgxDB.Stat()
		info["active_connections"] = int(st.AcquiredConns())
		info["idle_connections"] = int(st.IdleConns())
		info["open_connections"] = int(st.TotalConns())
		info["max_connections"] = int(st.MaxConns())

		if pingErr := config.PgxDB.Ping(ctx); pingErr == nil {
			info["status"] = "connected"
		} else {
			info["status"] = "error"
		}
	} else {
		info["status"] = "error"
	}
	return info
}

func GetDatabaseConnections(c *fiber.Ctx) error {
	connections := []map[string]interface{}{getConnectionInfo(c.Context())}
	return utils.SendSimpleSuccess(c, connections, "Database connections retrieved successfully")
}

func GetDatabaseConnection(c *fiber.Ctx) error {
	if err := validateConnectionID(c); err != nil {
		return err
	}
	return utils.SendSimpleSuccess(c, getConnectionInfo(c.Context()), "Database connection retrieved successfully")
}

func TestDatabaseConnection(c *fiber.Ctx) error {
	if err := validateConnectionID(c); err != nil {
		return err
	}

	result := map[string]interface{}{
		"connection_id": connectionID,
		"status":        "failed",
		"latency_ms":    0,
		"message":       "Connection test failed",
		"tested_at":     time.Now().Format(time.RFC3339),
	}

	if config.PgxDB == nil {
		result["message"] = "Failed to get database connection"
		return utils.SendSimpleSuccess(c, result, "Connection test completed")
	}

	start := time.Now()
	if err := config.PgxDB.Ping(c.Context()); err != nil {
		log.Printf("Error pinging database: %v", err)
		result["message"] = "Ping failed: " + err.Error()
		return utils.SendSimpleSuccess(c, result, "Connection test completed")
	}
	latency := time.Since(start).Milliseconds()
	result["status"] = "success"
	result["latency_ms"] = latency
	result["message"] = "Connection is healthy"
	return utils.SendSimpleSuccess(c, result, "Connection test completed successfully")
}

func GetDatabaseStats(c *fiber.Ctx) error {
	ctx := c.Context()
	now := time.Now().Format(time.RFC3339)

	stats := map[string]interface{}{
		"total_connections":   1,
		"active_connections":  0,
		"idle_connections":    0,
		"total_databases":     1,
		"total_tables":        0,
		"total_size_bytes":    int64(0),
		"total_size_pretty":   "0 bytes",
		"uptime_seconds":      0,
		"replication_enabled": false,
		"collected_at":        now,
	}

	if config.PgxDB != nil {
		st := config.PgxDB.Stat()
		stats["active_connections"] = int(st.AcquiredConns())
		stats["idle_connections"] = int(st.IdleConns())
		stats["total_connections"] = int(st.TotalConns())
		stats["max_open_connections"] = int(st.MaxConns())
	}

	var dbSize int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT pg_database_size(current_database())").Scan(&dbSize)
	stats["total_size_bytes"] = dbSize

	var dbSizePretty string
	_ = config.PgxDB.QueryRow(ctx, "SELECT pg_size_pretty(pg_database_size(current_database()))").Scan(&dbSizePretty)
	stats["total_size_pretty"] = dbSizePretty

	var tableCount int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'").Scan(&tableCount)
	stats["total_tables"] = tableCount

	var indexCount int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'").Scan(&indexCount)
	stats["total_indexes"] = indexCount

	var uptimeSeconds float64
	_ = config.PgxDB.QueryRow(ctx, "SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time()))").Scan(&uptimeSeconds)
	stats["uptime_seconds"] = int64(uptimeSeconds)

	var version string
	_ = config.PgxDB.QueryRow(ctx, "SELECT version()").Scan(&version)
	stats["version"] = version

	return utils.SendSimpleSuccess(c, stats, "Database stats retrieved successfully")
}

func GetDatabaseMetrics(c *fiber.Ctx) error {
	ctx := c.Context()
	now := time.Now().Format(time.RFC3339)

	metrics := map[string]interface{}{
		"collected_at": now,
	}

	if config.PgxDB != nil {
		st := config.PgxDB.Stat()
		metrics["connections"] = map[string]interface{}{
			"active": int(st.AcquiredConns()),
			"idle":   int(st.IdleConns()),
			"total":  int(st.TotalConns()),
			"max":    int(st.MaxConns()),
		}
	}

	var dbSize int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT pg_database_size(current_database())").Scan(&dbSize)
	var tableCount int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'").Scan(&tableCount)
	var indexCount int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'").Scan(&indexCount)

	metrics["storage"] = map[string]interface{}{
		"database_size_bytes": dbSize,
		"tables_count":        tableCount,
		"indexes_count":       indexCount,
	}

	var xactCommit, xactRollback, blksRead, blksHit, tupReturned, tupFetched, tupInserted, tupUpdated, tupDeleted, deadlocks int64
	_ = config.PgxDB.QueryRow(ctx, `SELECT xact_commit, xact_rollback, blks_read, blks_hit,
		tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted, deadlocks
		FROM pg_stat_database WHERE datname = current_database()`).
		Scan(&xactCommit, &xactRollback, &blksRead, &blksHit, &tupReturned, &tupFetched, &tupInserted, &tupUpdated, &tupDeleted, &deadlocks)

	metrics["queries"] = map[string]interface{}{
		"total_commits":   xactCommit,
		"total_rollbacks": xactRollback,
		"tuples_returned": tupReturned,
		"tuples_fetched":  tupFetched,
		"tuples_inserted": tupInserted,
		"tuples_updated":  tupUpdated,
		"tuples_deleted":  tupDeleted,
		"deadlocks":       deadlocks,
	}

	totalBlocks := blksRead + blksHit
	hitRatio := 0.0
	if totalBlocks > 0 {
		hitRatio = float64(blksHit) / float64(totalBlocks) * 100
	}
	metrics["cache"] = map[string]interface{}{
		"hit_ratio":   fmt.Sprintf("%.2f%%", hitRatio),
		"blocks_read": blksRead,
		"blocks_hit":  blksHit,
	}

	metrics["replication"] = map[string]interface{}{
		"enabled":  false,
		"lag_ms":   0,
		"replicas": 0,
	}
	return utils.SendSimpleSuccess(c, metrics, "Database metrics retrieved successfully")
}

func GetDatabaseTables(c *fiber.Ctx) error {
	if err := validateConnectionID(c); err != nil {
		return err
	}
	ctx := c.Context()

	rows, err := config.PgxDB.Query(ctx, `
		SELECT
			t.table_name,
			COALESCE(c.reltuples::bigint, 0) AS row_estimate,
			pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) AS total_size,
			pg_size_pretty(pg_relation_size(quote_ident(t.table_name))) AS data_size,
			pg_size_pretty(pg_indexes_size(quote_ident(t.table_name))) AS index_size,
			pg_total_relation_size(quote_ident(t.table_name)) AS total_bytes
		FROM information_schema.tables t
		LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relkind = 'r'
		WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
		ORDER BY pg_total_relation_size(quote_ident(t.table_name)) DESC
	`)
	if err != nil {
		log.Printf("Error fetching database tables: %v", err)
		return utils.SendInternalError(c, "Failed to fetch database tables", err)
	}
	defer rows.Close()

	type tableInfo struct {
		TableName, TotalSize, DataSize, IndexSize string
		RowEstimate, TotalBytes                   int64
	}
	var tables []tableInfo
	for rows.Next() {
		var t tableInfo
		if err := rows.Scan(&t.TableName, &t.RowEstimate, &t.TotalSize, &t.DataSize, &t.IndexSize, &t.TotalBytes); err != nil {
			return utils.SendInternalError(c, "Failed to scan table row", err)
		}
		tables = append(tables, t)
	}

	result := make([]map[string]interface{}, 0, len(tables))
	for _, t := range tables {
		var indexCount int64
		_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1", t.TableName).Scan(&indexCount)

		result = append(result, map[string]interface{}{
			"name":         t.TableName,
			"schema":       "public",
			"row_estimate": t.RowEstimate,
			"total_size":   t.TotalSize,
			"data_size":    t.DataSize,
			"index_size":   t.IndexSize,
			"total_bytes":  t.TotalBytes,
			"index_count":  indexCount,
		})
	}
	return utils.SendSimpleSuccess(c, result, "Database tables retrieved successfully")
}

func GetRunningQueries(c *fiber.Ctx) error {
	ctx := c.Context()
	rows, err := config.PgxDB.Query(ctx, `
		SELECT
			pid,
			usename,
			datname,
			COALESCE(state, 'unknown') AS state,
			COALESCE(query, '') AS query,
			query_start::text AS query_start,
			wait_event_type,
			COALESCE(EXTRACT(EPOCH FROM (now() - query_start)), 0) AS duration_sec,
			COALESCE(backend_type, 'unknown') AS backend_type
		FROM pg_stat_activity
		WHERE datname = current_database()
			AND pid != pg_backend_pid()
			AND state IS NOT NULL
		ORDER BY query_start ASC NULLS LAST
	`)
	if err != nil {
		log.Printf("Error fetching running queries: %v", err)
		return utils.SendInternalError(c, "Failed to fetch running queries", err)
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var (
			pid                                 int
			username, database, state, query, backendType string
			queryStart, waitEvent               *string
			durationSec                         float64
		)
		// usename can be nullable in some setups - use *string
		var usernameNull *string
		if err := rows.Scan(&pid, &usernameNull, &database, &state, &query, &queryStart, &waitEvent, &durationSec, &backendType); err != nil {
			return utils.SendInternalError(c, "Failed to scan query", err)
		}
		if usernameNull != nil {
			username = *usernameNull
		}
		queryText := query
		if len(queryText) > 500 {
			queryText = queryText[:500] + "..."
		}
		entry := map[string]interface{}{
			"pid":          pid,
			"username":     username,
			"database":     database,
			"state":        state,
			"query":        queryText,
			"duration_sec": fmt.Sprintf("%.2f", durationSec),
			"backend_type": backendType,
		}
		if queryStart != nil {
			entry["query_start"] = *queryStart
		}
		if waitEvent != nil {
			entry["wait_event_type"] = *waitEvent
		}
		result = append(result, entry)
	}
	return utils.SendSimpleSuccess(c, result, "Running queries retrieved successfully")
}

// ExecuteDatabaseQuery executes a read-only SQL query with a timeout.
// NOTE: result rows are returned as []map[string]string with column names from
// rows.FieldDescriptions(); types are stringified for safe JSON output.
func ExecuteDatabaseQuery(c *fiber.Ctx) error {
	if err := validateConnectionID(c); err != nil {
		return err
	}

	type queryRequest struct {
		Query   string `json:"query"`
		Timeout int    `json:"timeout"`
	}

	var req queryRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if strings.TrimSpace(req.Query) == "" {
		return utils.SendBadRequest(c, "Query cannot be empty")
	}

	normalized := strings.TrimSpace(strings.ToUpper(req.Query))
	if !strings.HasPrefix(normalized, "SELECT") &&
		!strings.HasPrefix(normalized, "EXPLAIN") &&
		!strings.HasPrefix(normalized, "SHOW") {
		return utils.SendBadRequest(c, "Only SELECT, EXPLAIN, and SHOW statements are allowed")
	}

	dangerous := []string{"DROP ", "DELETE ", "UPDATE ", "INSERT ", "ALTER ", "CREATE ",
		"TRUNCATE ", "GRANT ", "REVOKE ", "COPY ", "EXECUTE ",
		"INTO OUTFILE", "INTO DUMPFILE", "LOAD_FILE"}
	for _, p := range dangerous {
		if strings.Contains(normalized, p) {
			return utils.SendBadRequest(c, "Query contains disallowed operations")
		}
	}

	timeout := req.Timeout
	if timeout <= 0 || timeout > 30 {
		timeout = 5
	}

	start := time.Now()

	conn, err := config.PgxDB.Acquire(c.Context())
	if err != nil {
		return utils.SendInternalError(c, "Failed to acquire connection", err)
	}
	defer conn.Release()

	if _, err := conn.Exec(c.Context(), fmt.Sprintf("SET LOCAL statement_timeout = '%ds'", timeout)); err != nil {
		log.Printf("Error setting statement timeout: %v", err)
	}

	rows, err := conn.Query(c.Context(), req.Query)
	duration := time.Since(start).Milliseconds()
	if err != nil {
		return utils.SendSimpleSuccess(c, map[string]interface{}{
			"success":     false,
			"error":       err.Error(),
			"duration_ms": duration,
			"row_count":   0,
		}, "Query execution failed")
	}
	defer rows.Close()

	fds := rows.FieldDescriptions()
	colNames := make([]string, len(fds))
	for i, f := range fds {
		colNames[i] = string(f.Name)
	}

	out := []map[string]interface{}{}
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return utils.SendInternalError(c, "Failed to read row", err)
		}
		row := make(map[string]interface{}, len(colNames))
		for i, n := range colNames {
			row[n] = vals[i]
		}
		out = append(out, row)
		if len(out) >= 1000 {
			break
		}
	}
	truncated := len(out) >= 1000

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"success":     true,
		"rows":        out,
		"row_count":   len(out),
		"truncated":   truncated,
		"duration_ms": time.Since(start).Milliseconds(),
	}, "Query executed successfully")
}

func CancelDatabaseQuery(c *fiber.Ctx) error {
	pidStr := c.Params("id")
	pid, err := strconv.Atoi(pidStr)
	if err != nil {
		return utils.SendBadRequest(c, "Invalid PID")
	}

	var cancelled bool
	if err := config.PgxDB.QueryRow(c.Context(), "SELECT pg_cancel_backend($1::int)", pid).Scan(&cancelled); err != nil {
		log.Printf("Error cancelling query (pid=%d): %v", pid, err)
		return utils.SendInternalError(c, "Failed to cancel query", err)
	}

	if cancelled {
		return utils.SendSimpleSuccess(c, map[string]interface{}{
			"pid":       pidStr,
			"cancelled": true,
		}, "Query cancelled successfully")
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"pid":       pidStr,
		"cancelled": false,
		"message":   "Query could not be cancelled (may have already finished)",
	}, "Query cancellation attempted")
}

func GetDatabaseBackups(c *fiber.Ctx) error {
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"backups": []interface{}{},
		"message": "Backups are managed via pg_dump CLI or your hosting provider's backup system. This interface provides monitoring only.",
	}, "Database backups info retrieved")
}

func CreateDatabaseBackup(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Database backups should be created using pg_dump or your hosting provider's backup tools. Running backups through the web UI is not supported for safety reasons.")
}

func RestoreDatabaseBackup(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Database restores should be performed using pg_restore or your hosting provider's restore tools. Running restores through the web UI is not supported for safety reasons.")
}

// GetDatabaseMigrations returns migration history if available.
// We use goose's `goose_db_version` table when present, falling back to the
// list of public tables.
func GetDatabaseMigrations(c *fiber.Ctx) error {
	if err := validateConnectionID(c); err != nil {
		return err
	}
	ctx := c.Context()

	var tableExists bool
	_ = config.PgxDB.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goose_db_version')").Scan(&tableExists)

	if tableExists {
		rows, err := config.PgxDB.Query(ctx, "SELECT id, version_id, is_applied, tstamp FROM goose_db_version ORDER BY id ASC")
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch migrations", err)
		}
		defer rows.Close()
		migrations := []map[string]interface{}{}
		for rows.Next() {
			var id int64
			var version int64
			var isApplied bool
			var tstamp time.Time
			if err := rows.Scan(&id, &version, &isApplied, &tstamp); err == nil {
				status := "applied"
				if !isApplied {
					status = "pending"
				}
				migrations = append(migrations, map[string]interface{}{
					"id":         id,
					"version_id": version,
					"name":       fmt.Sprintf("v%d", version),
					"status":     status,
					"applied_at": tstamp,
					"engine":     "goose",
				})
			}
		}
		return utils.SendSimpleSuccess(c, map[string]interface{}{
			"migrations": migrations,
			"total":      len(migrations),
			"message":    "Migrations are managed by goose.",
		}, "Database migrations retrieved successfully")
	}

	// Fallback: list public tables
	rows, err := config.PgxDB.Query(ctx, `SELECT table_name FROM information_schema.tables
		WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`)
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch tables", err)
	}
	defer rows.Close()
	migrations := []map[string]interface{}{}
	i := 0
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			i++
			migrations = append(migrations, map[string]interface{}{
				"id":     i,
				"name":   fmt.Sprintf("create_%s", name),
				"table":  name,
				"status": "applied",
				"engine": "manual",
			})
		}
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"migrations": migrations,
		"total":      len(migrations),
		"message":    "No migration tracking table found. Showing current table state.",
	}, "Database migrations retrieved successfully")
}

func RunDatabaseMigration(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Running migrations through the web UI is not supported for safety reasons. Use the application's migration CLI.")
}

func RollbackDatabaseMigration(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Rolling back migrations through the web UI is not supported for safety reasons. Use the application's migration CLI or manual SQL scripts.")
}

func OptimizeDatabaseTable(c *fiber.Ctx) error {
	if err := validateConnectionID(c); err != nil {
		return err
	}
	tableName := c.Params("tableName")
	ctx := c.Context()

	var exists bool
	_ = config.PgxDB.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)", tableName).Scan(&exists)
	if !exists {
		return utils.SendNotFound(c, fmt.Sprintf("Table '%s' not found in public schema", tableName))
	}

	start := time.Now()
	_, err := config.PgxDB.Exec(ctx, fmt.Sprintf("ANALYZE %s", sanitizeIdentifier(tableName)))
	duration := time.Since(start).Milliseconds()
	if err != nil {
		log.Printf("Error analyzing table %s: %v", tableName, err)
		return utils.SendInternalError(c, "Failed to optimize table", err)
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"table":       tableName,
		"operation":   "ANALYZE",
		"duration_ms": duration,
		"message":     fmt.Sprintf("Table '%s' has been analyzed.", tableName),
	}, "Table optimized successfully")
}

func ExportDatabase(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Database export should be performed using pg_dump or your hosting provider's export tools.")
}

func GetDatabaseSchemas(c *fiber.Ctx) error {
	if err := validateConnectionID(c); err != nil {
		return err
	}
	ctx := c.Context()

	rows, err := config.PgxDB.Query(ctx, `
		SELECT schema_name, COALESCE(schema_owner, 'unknown') as schema_owner
		FROM information_schema.schemata
		WHERE schema_name NOT IN ('pg_toast', 'pg_catalog', 'information_schema')
		ORDER BY schema_name
	`)
	if err != nil {
		log.Printf("Error fetching schemas: %v", err)
		return utils.SendInternalError(c, "Failed to fetch database schemas", err)
	}
	defer rows.Close()

	type schemaInfo struct{ SchemaName, SchemaOwner string }
	var schemas []schemaInfo
	for rows.Next() {
		var s schemaInfo
		if err := rows.Scan(&s.SchemaName, &s.SchemaOwner); err == nil {
			schemas = append(schemas, s)
		}
	}

	result := make([]map[string]interface{}, 0, len(schemas))
	for _, s := range schemas {
		var tableCount int64
		_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'", s.SchemaName).Scan(&tableCount)

		var sizeBytes int64
		_ = config.PgxDB.QueryRow(ctx, `
			SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(t.table_name))), 0)
			FROM information_schema.tables t
			WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
		`, s.SchemaName).Scan(&sizeBytes)

		var sizePretty string
		_ = config.PgxDB.QueryRow(ctx, "SELECT pg_size_pretty($1::bigint)", sizeBytes).Scan(&sizePretty)

		result = append(result, map[string]interface{}{
			"name":         s.SchemaName,
			"owner":        s.SchemaOwner,
			"tables_count": tableCount,
			"size_bytes":   sizeBytes,
			"size_pretty":  sizePretty,
		})
	}
	return utils.SendSimpleSuccess(c, result, "Database schemas retrieved successfully")
}

func GetDatabasePerformance(c *fiber.Ctx) error {
	if err := validateConnectionID(c); err != nil {
		return err
	}
	ctx := c.Context()
	now := time.Now().Format(time.RFC3339)

	performance := map[string]interface{}{
		"connection_id": connectionID,
		"collected_at":  now,
	}

	if config.PgxDB != nil {
		st := config.PgxDB.Stat()
		performance["connections"] = map[string]interface{}{
			"active": int(st.AcquiredConns()),
			"idle":   int(st.IdleConns()),
			"total":  int(st.TotalConns()),
			"max":    int(st.MaxConns()),
		}
	}

	var xactCommit, xactRollback, blksRead, blksHit, deadlocks, conflicts int64
	_ = config.PgxDB.QueryRow(ctx, `SELECT xact_commit, xact_rollback, blks_read, blks_hit, deadlocks, conflicts
		FROM pg_stat_database WHERE datname = current_database()`).
		Scan(&xactCommit, &xactRollback, &blksRead, &blksHit, &deadlocks, &conflicts)

	performance["transactions"] = map[string]interface{}{
		"total_commits":   xactCommit,
		"total_rollbacks": xactRollback,
		"deadlocks":       deadlocks,
		"conflicts":       conflicts,
	}

	totalBlocks := blksRead + blksHit
	hitRatio := 0.0
	if totalBlocks > 0 {
		hitRatio = float64(blksHit) / float64(totalBlocks) * 100
	}
	performance["cache"] = map[string]interface{}{
		"hit_ratio_pct": fmt.Sprintf("%.2f", hitRatio),
		"blocks_read":   blksRead,
		"blocks_hit":    blksHit,
	}

	var locksTotal, locksWaiting int64
	_ = config.PgxDB.QueryRow(ctx, `SELECT
		COUNT(*) as total,
		COUNT(*) FILTER (WHERE NOT granted) as waiting
		FROM pg_locks WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())`).
		Scan(&locksTotal, &locksWaiting)

	performance["locks"] = map[string]interface{}{
		"total":   locksTotal,
		"waiting": locksWaiting,
	}

	var activeQueries int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database() AND state = 'active' AND pid != pg_backend_pid()").Scan(&activeQueries)
	performance["active_queries"] = activeQueries

	rows, err := config.PgxDB.Query(ctx, `SELECT relname, COALESCE(seq_scan, 0) as seq_scan, COALESCE(idx_scan, 0) as idx_scan
		FROM pg_stat_user_tables
		WHERE seq_scan > 0
		ORDER BY seq_scan DESC LIMIT 5`)
	seqScanResult := []map[string]interface{}{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var relname string
			var seqScan, idxScan int64
			if err := rows.Scan(&relname, &seqScan, &idxScan); err == nil {
				seqScanResult = append(seqScanResult, map[string]interface{}{
					"table":    relname,
					"seq_scan": seqScan,
					"idx_scan": idxScan,
				})
			}
		}
	}
	performance["top_sequential_scans"] = seqScanResult

	return utils.SendSimpleSuccess(c, performance, "Database performance data retrieved successfully")
}

func sanitizeIdentifier(name string) string {
	var safe strings.Builder
	for _, ch := range name {
		if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_' {
			safe.WriteRune(ch)
		}
	}
	return safe.String()
}

// silence unused-import complaints when no pgx-specific helpers are used elsewhere
var _ = pgx.ErrNoRows
