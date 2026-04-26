package logging

import (
	"context"
	"time"
)

// LogEntry represents a structured log entry for persistence
type LogEntry struct {
	// Core fields
	Timestamp time.Time              `json:"timestamp"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	RequestID string                 `json:"request_id,omitempty"`
	
	// Request context
	Method     string `json:"method,omitempty"`
	Path       string `json:"path,omitempty"`
	StatusCode int    `json:"status_code,omitempty"`
	LatencyMs  float64 `json:"latency_ms,omitempty"`
	IP         string `json:"ip,omitempty"`
	UserAgent  string `json:"user_agent,omitempty"`
	
	// User context
	UserID         string `json:"user_id,omitempty"`
	OrganizationID string `json:"organization_id,omitempty"`
	SessionID      string `json:"session_id,omitempty"`
	
	// Error context
	Error      string `json:"error,omitempty"`
	StackTrace string `json:"stack_trace,omitempty"`
	
	// Custom fields
	Fields map[string]interface{} `json:"fields,omitempty"`
	
	// Metadata
	Environment string `json:"environment,omitempty"`
	Service     string `json:"service,omitempty"`
	Version     string `json:"version,omitempty"`
}

// LogWriter defines the interface for log persistence
type LogWriter interface {
	// Write writes a single log entry
	Write(ctx context.Context, entry LogEntry) error
	
	// WriteBatch writes multiple log entries in a batch
	WriteBatch(ctx context.Context, entries []LogEntry) error
	
	// Rotate rotates log files or storage (if applicable)
	Rotate(ctx context.Context) error
	
	// Close closes the writer and releases resources
	Close() error
	
	// Flush ensures all pending writes are completed
	Flush(ctx context.Context) error
}

// LogReader defines the interface for reading logs (for future log analysis)
type LogReader interface {
	// Read reads log entries based on criteria
	Read(ctx context.Context, criteria LogReadCriteria) ([]LogEntry, error)
	
	// ReadStream returns a channel of log entries for streaming
	ReadStream(ctx context.Context, criteria LogReadCriteria) (<-chan LogEntry, error)
	
	// Count returns the number of log entries matching criteria
	Count(ctx context.Context, criteria LogReadCriteria) (int64, error)
	
	// Close closes the reader and releases resources
	Close() error
}

// LogReadCriteria defines criteria for reading logs
type LogReadCriteria struct {
	// Time range
	StartTime *time.Time `json:"start_time,omitempty"`
	EndTime   *time.Time `json:"end_time,omitempty"`
	
	// Filtering
	Level      []string `json:"level,omitempty"`
	RequestID  string   `json:"request_id,omitempty"`
	UserID     string   `json:"user_id,omitempty"`
	Method     []string `json:"method,omitempty"`
	Path       string   `json:"path,omitempty"`
	StatusCode []int    `json:"status_code,omitempty"`
	
	// Search
	MessageContains string                 `json:"message_contains,omitempty"`
	FieldFilters    map[string]interface{} `json:"field_filters,omitempty"`
	
	// Pagination
	Limit  int `json:"limit,omitempty"`
	Offset int `json:"offset,omitempty"`
	
	// Sorting
	SortBy    string `json:"sort_by,omitempty"`    // "timestamp", "level", "latency_ms"
	SortOrder string `json:"sort_order,omitempty"` // "asc", "desc"
}

// LogStorage combines reader and writer interfaces
type LogStorage interface {
	LogWriter
	LogReader
}

// FileLogWriter defines interface for file-based log storage
type FileLogWriter interface {
	LogWriter
	
	// GetCurrentFile returns the current log file path
	GetCurrentFile() string
	
	// GetLogFiles returns all log file paths
	GetLogFiles() ([]string, error)
	
	// SetMaxFileSize sets maximum file size before rotation
	SetMaxFileSize(size int64)
	
	// SetMaxFiles sets maximum number of log files to keep
	SetMaxFiles(count int)
}

// RemoteLogWriter defines interface for remote log storage (e.g., cloud services)
type RemoteLogWriter interface {
	LogWriter
	
	// SetEndpoint sets the remote endpoint
	SetEndpoint(endpoint string)
	
	// SetCredentials sets authentication credentials
	SetCredentials(credentials map[string]string)
	
	// SetRetryPolicy sets retry policy for failed writes
	SetRetryPolicy(policy RetryPolicy)
	
	// GetStatus returns the connection status
	GetStatus() RemoteStatus
}

// DatabaseLogWriter defines interface for database-based log storage
type DatabaseLogWriter interface {
	LogWriter
	
	// CreateTables creates necessary database tables
	CreateTables(ctx context.Context) error
	
	// Migrate runs database migrations
	Migrate(ctx context.Context) error
	
	// Cleanup removes old log entries based on retention policy
	Cleanup(ctx context.Context, retentionDays int) error
	
	// GetStats returns storage statistics
	GetStats(ctx context.Context) (DatabaseStats, error)
}

// RetryPolicy defines retry behavior for remote log writers
type RetryPolicy struct {
	MaxRetries    int           `json:"max_retries"`
	InitialDelay  time.Duration `json:"initial_delay"`
	MaxDelay      time.Duration `json:"max_delay"`
	BackoffFactor float64       `json:"backoff_factor"`
}

// RemoteStatus represents the status of a remote log writer
type RemoteStatus struct {
	Connected     bool      `json:"connected"`
	LastError     string    `json:"last_error,omitempty"`
	LastWriteTime time.Time `json:"last_write_time"`
	PendingWrites int       `json:"pending_writes"`
}

// DatabaseStats represents database storage statistics
type DatabaseStats struct {
	TotalEntries    int64     `json:"total_entries"`
	SizeBytes       int64     `json:"size_bytes"`
	OldestEntry     time.Time `json:"oldest_entry"`
	NewestEntry     time.Time `json:"newest_entry"`
	EntriesByLevel  map[string]int64 `json:"entries_by_level"`
	EntriesByHour   map[string]int64 `json:"entries_by_hour"`
}

// LogStorageConfig defines configuration for log storage
type LogStorageConfig struct {
	Type   string                 `json:"type"`   // "file", "remote", "database", "multi"
	Config map[string]interface{} `json:"config"`
}

// FileStorageConfig defines configuration for file storage
type FileStorageConfig struct {
	Directory    string `json:"directory"`
	Filename     string `json:"filename"`
	MaxFileSize  int64  `json:"max_file_size"`  // bytes
	MaxFiles     int    `json:"max_files"`
	Compress     bool   `json:"compress"`
	Format       string `json:"format"` // "json", "text"
}

// RemoteStorageConfig defines configuration for remote storage
type RemoteStorageConfig struct {
	Endpoint    string            `json:"endpoint"`
	Credentials map[string]string `json:"credentials"`
	Timeout     time.Duration     `json:"timeout"`
	BatchSize   int               `json:"batch_size"`
	RetryPolicy RetryPolicy       `json:"retry_policy"`
}

// DatabaseStorageConfig defines configuration for database storage
type DatabaseStorageConfig struct {
	ConnectionString string `json:"connection_string"`
	TableName        string `json:"table_name"`
	RetentionDays    int    `json:"retention_days"`
	BatchSize        int    `json:"batch_size"`
	IndexFields      []string `json:"index_fields"`
}

// MultiStorageConfig defines configuration for multiple storage backends
type MultiStorageConfig struct {
	Writers []LogStorageConfig `json:"writers"`
	Readers []LogStorageConfig `json:"readers"`
}

// LogStorageFactory creates log storage instances
type LogStorageFactory interface {
	// CreateWriter creates a log writer based on configuration
	CreateWriter(config LogStorageConfig) (LogWriter, error)
	
	// CreateReader creates a log reader based on configuration
	CreateReader(config LogStorageConfig) (LogReader, error)
	
	// CreateStorage creates a log storage (reader + writer) based on configuration
	CreateStorage(config LogStorageConfig) (LogStorage, error)
}

// Example implementations (interfaces only - not implemented)

// ConsoleLogWriter writes logs to console (already implemented via zerolog)
type ConsoleLogWriter struct{}

// FileLogWriterImpl implements file-based log storage
type FileLogWriterImpl struct {
	config FileStorageConfig
}

// RemoteLogWriterImpl implements remote log storage
type RemoteLogWriterImpl struct {
	config RemoteStorageConfig
}

// DatabaseLogWriterImpl implements database log storage
type DatabaseLogWriterImpl struct {
	config DatabaseStorageConfig
}

// MultiLogWriter implements multiple storage backends
type MultiLogWriter struct {
	writers []LogWriter
}

// Usage examples for future implementation:

/*
// File storage example
fileConfig := FileStorageConfig{
	Directory:   "/var/log/tether-erp",
	Filename:    "app.log",
	MaxFileSize: 100 * 1024 * 1024, // 100MB
	MaxFiles:    10,
	Compress:    true,
	Format:      "json",
}

// Remote storage example (e.g., AWS CloudWatch, ELK Stack)
remoteConfig := RemoteStorageConfig{
	Endpoint: "https://logs.example.com/api/v1/logs",
	Credentials: map[string]string{
		"api_key": "your-api-key",
	},
	Timeout:   30 * time.Second,
	BatchSize: 100,
	RetryPolicy: RetryPolicy{
		MaxRetries:    3,
		InitialDelay:  1 * time.Second,
		MaxDelay:      30 * time.Second,
		BackoffFactor: 2.0,
	},
}

// Database storage example
dbConfig := DatabaseStorageConfig{
	ConnectionString: "postgres://user:pass@localhost/logs",
	TableName:        "application_logs",
	RetentionDays:    30,
	BatchSize:        1000,
	IndexFields:      []string{"timestamp", "level", "request_id"},
}
*/