package services

import (
	"context"
	"log"
	"runtime"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// SystemMetricsService handles system metrics collection
type SystemMetricsService struct {
	startTime time.Time
}

// NewSystemMetricsService creates a new system metrics service
func NewSystemMetricsService() *SystemMetricsService {
	return &SystemMetricsService{
		startTime: time.Now(),
	}
}

// SystemMetric represents a system metric record
type SystemMetric struct {
	ID         string    `json:"id"`
	MetricType string    `json:"metric_type"`
	Value      float64   `json:"value"`
	Unit       string    `json:"unit"`
	Metadata   string    `json:"metadata,omitempty"`
	RecordedAt time.Time `json:"recorded_at"`
	CreatedAt  time.Time `json:"created_at"`
}

func insertMetric(ctx context.Context, m SystemMetric) {
	_, err := config.PgxDB.Exec(ctx, `
		INSERT INTO system_metrics (id, metric_type, value, unit, metadata, recorded_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, m.ID, m.MetricType, m.Value, m.Unit, m.Metadata, m.RecordedAt, m.CreatedAt)
	if err != nil {
		log.Printf("system_metrics: insert %s: %v", m.MetricType, err)
	}
}

// CollectMetrics collects all system metrics and persists them.
func (s *SystemMetricsService) CollectMetrics() error {
	ctx := context.Background()

	cpuPercent, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuPercent) > 0 {
		insertMetric(ctx, SystemMetric{
			ID: utils.GenerateID(), MetricType: "cpu", Value: cpuPercent[0], Unit: "percent",
			RecordedAt: time.Now(), CreatedAt: time.Now(),
		})
	}

	if memInfo, err := mem.VirtualMemory(); err == nil {
		insertMetric(ctx, SystemMetric{
			ID: utils.GenerateID(), MetricType: "memory", Value: memInfo.UsedPercent, Unit: "percent",
			RecordedAt: time.Now(), CreatedAt: time.Now(),
		})
	}

	if diskInfo, err := disk.Usage("/"); err == nil {
		insertMetric(ctx, SystemMetric{
			ID: utils.GenerateID(), MetricType: "disk", Value: diskInfo.UsedPercent, Unit: "percent",
			RecordedAt: time.Now(), CreatedAt: time.Now(),
		})
	}

	if netIO, err := net.IOCounters(false); err == nil && len(netIO) > 0 {
		insertMetric(ctx, SystemMetric{
			ID: utils.GenerateID(), MetricType: "network_sent", Value: float64(netIO[0].BytesSent), Unit: "bytes",
			RecordedAt: time.Now(), CreatedAt: time.Now(),
		})
		insertMetric(ctx, SystemMetric{
			ID: utils.GenerateID(), MetricType: "network_received", Value: float64(netIO[0].BytesRecv), Unit: "bytes",
			RecordedAt: time.Now(), CreatedAt: time.Now(),
		})
	}

	return nil
}

func latestMetricValue(ctx context.Context, metricType string) (float64, bool) {
	var v float64
	err := config.PgxDB.QueryRow(ctx, `
		SELECT value FROM system_metrics
		WHERE metric_type = $1
		ORDER BY recorded_at DESC LIMIT 1
	`, metricType).Scan(&v)
	if err != nil {
		return 0, false
	}
	return v, true
}

// GetLatestMetrics returns the latest metrics for each type.
func (s *SystemMetricsService) GetLatestMetrics() (map[string]interface{}, error) {
	ctx := context.Background()
	metrics := make(map[string]interface{})

	if v, ok := latestMetricValue(ctx, "cpu"); ok {
		metrics["cpu_usage"] = v
	} else {
		metrics["cpu_usage"] = 0.0
	}
	if v, ok := latestMetricValue(ctx, "memory"); ok {
		metrics["memory_usage"] = v
	} else {
		metrics["memory_usage"] = 0.0
	}
	if v, ok := latestMetricValue(ctx, "disk"); ok {
		metrics["disk_usage"] = v
	} else {
		metrics["disk_usage"] = 0.0
	}

	if sent, ok := latestMetricValue(ctx, "network_sent"); ok {
		if recv, ok := latestMetricValue(ctx, "network_received"); ok {
			metrics["network_io"] = map[string]interface{}{
				"bytes_sent":     sent,
				"bytes_received": recv,
			}
		}
	}

	uptime := time.Since(s.startTime)
	metrics["uptime"] = uptime.String()
	metrics["uptime_seconds"] = uptime.Seconds()
	return metrics, nil
}

// GetMetricsHistory returns metrics history for a time range.
func (s *SystemMetricsService) GetMetricsHistory(metricType string, hours int) ([]SystemMetric, error) {
	ctx := context.Background()
	since := time.Now().Add(-time.Duration(hours) * time.Hour)

	rows, err := config.PgxDB.Query(ctx, `
		SELECT id, metric_type, value, unit, COALESCE(metadata, ''), recorded_at, created_at
		FROM system_metrics
		WHERE metric_type = $1 AND recorded_at >= $2
		ORDER BY recorded_at ASC
	`, metricType, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SystemMetric
	for rows.Next() {
		var m SystemMetric
		if err := rows.Scan(&m.ID, &m.MetricType, &m.Value, &m.Unit, &m.Metadata, &m.RecordedAt, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// CheckServiceHealth checks the health of a service.
func (s *SystemMetricsService) CheckServiceHealth(serviceName string) (string, error) {
	switch serviceName {
	case "database":
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := config.PgxDB.Ping(ctx); err != nil {
			return "unhealthy", err
		}
		return "healthy", nil
	case "api_server":
		return "healthy", nil
	default:
		return "unknown", nil
	}
}

// UpdateServiceStatus updates the status of a service.
func (s *SystemMetricsService) UpdateServiceStatus(serviceName, status string, responseTime float64) error {
	ctx := context.Background()
	_, err := config.PgxDB.Exec(ctx, `
		UPDATE system_services
		SET status = $1, response_time_ms = $2, last_check_at = NOW(), updated_at = NOW()
		WHERE service_name = $3
	`, status, responseTime, serviceName)
	return err
}

// StartMetricsCollection starts periodic metrics collection
func (s *SystemMetricsService) StartMetricsCollection(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			if err := s.CollectMetrics(); err != nil {
				log.Printf("Error collecting metrics: %v", err)
			}
			services := []string{"database", "api_server"}
			for _, service := range services {
				start := time.Now()
				status, _ := s.CheckServiceHealth(service)
				responseTime := time.Since(start).Milliseconds()
				if err := s.UpdateServiceStatus(service, status, float64(responseTime)); err != nil {
					log.Printf("Error updating service status: %v", err)
				}
			}
		}
	}()
	log.Printf("System metrics collection started (interval: %v)", interval)
}

// CleanupOldMetrics removes metrics older than specified days
func (s *SystemMetricsService) CleanupOldMetrics(days int) error {
	ctx := context.Background()
	cutoff := time.Now().AddDate(0, 0, -days)
	tag, err := config.PgxDB.Exec(ctx, `DELETE FROM system_metrics WHERE recorded_at < $1`, cutoff)
	if err != nil {
		return err
	}
	log.Printf("Cleaned up %d old metrics records", tag.RowsAffected())
	return nil
}

// GetGoRuntimeStats returns Go runtime statistics
func (s *SystemMetricsService) GetGoRuntimeStats() map[string]interface{} {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return map[string]interface{}{
		"goroutines":     runtime.NumGoroutine(),
		"alloc_mb":       float64(m.Alloc) / 1024 / 1024,
		"total_alloc_mb": float64(m.TotalAlloc) / 1024 / 1024,
		"sys_mb":         float64(m.Sys) / 1024 / 1024,
		"num_gc":         m.NumGC,
		"gc_pause_ns":    m.PauseNs[(m.NumGC+255)%256],
	}
}

var _ = pgx.ErrNoRows // keep import
