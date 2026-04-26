package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/tether-erp/database/sqlc"
)

var (
	PgxDB   *pgxpool.Pool
	Queries *db.Queries
)

// InitDatabase initializes a pgx connection pool and the sqlc query interface.
func InitDatabase() {
	dsn := buildDSN()

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		log.Fatalf("parse pgx config: %v", err)
	}

	if v, err := strconv.Atoi(os.Getenv("DB_MAX_CONNECTIONS")); err == nil && v > 0 {
		cfg.MaxConns = int32(v)
	} else {
		cfg.MaxConns = 25
	}
	if v, err := strconv.Atoi(os.Getenv("DB_MIN_CONNECTIONS")); err == nil && v > 0 {
		cfg.MinConns = int32(v)
	} else {
		cfg.MinConns = 2
	}
	if d, err := time.ParseDuration(os.Getenv("DB_CONN_MAX_LIFETIME")); err == nil && d > 0 {
		cfg.MaxConnLifetime = d
	} else {
		cfg.MaxConnLifetime = 30 * time.Minute
	}
	if d, err := time.ParseDuration(os.Getenv("DB_CONN_MAX_IDLE_TIME")); err == nil && d > 0 {
		cfg.MaxConnIdleTime = d
	} else {
		cfg.MaxConnIdleTime = 5 * time.Minute
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		log.Fatalf("connect pgx pool: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping pgx pool: %v", err)
	}

	PgxDB = pool
	Queries = db.New(pool)

	log.Println("✓ Database connected (pgx + sqlc)")
}

// Close releases pool resources. Safe to call multiple times.
func Close() {
	if PgxDB != nil {
		PgxDB.Close()
	}
}

func buildDSN() string {
	if v := os.Getenv("DATABASE_URL"); v != "" {
		return v
	}
	host := def(os.Getenv("DB_HOST"), "localhost")
	port := def(os.Getenv("DB_PORT"), "5432")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASSWORD")
	name := os.Getenv("DB_NAME")
	ssl := def(os.Getenv("DB_SSL_MODE"), "disable")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, port, name, ssl)
}

func def(v, d string) string {
	if v == "" {
		return d
	}
	return v
}
