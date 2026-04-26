package main

import (
	"context"
	"database/sql"
	_ "embed"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"
	"github.com/tether-erp/database/migrations"
)

//go:embed reset.sql
var resetSQL string

func main() {
	_ = godotenv.Load(".env")

	var (
		reset   bool
		status  bool
		down    bool
		downTo  int
		target  int
		version bool
	)
	flag.BoolVar(&reset, "reset", false, "drop public schema then re-apply all migrations")
	flag.BoolVar(&status, "status", false, "show migration status")
	flag.BoolVar(&down, "down", false, "roll back one migration")
	flag.IntVar(&downTo, "down-to", -1, "roll back to specific version")
	flag.IntVar(&target, "up-to", -1, "migrate up to specific version")
	flag.BoolVar(&version, "version", false, "print current DB version")
	flag.Parse()

	dsn := resolveDSN()
	if dsn == "" {
		log.Fatal("DATABASE_URL (or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME) is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(context.Background()); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	if reset {
		log.Println("resetting public schema…")
		if _, err := db.ExecContext(context.Background(), resetSQL); err != nil {
			log.Fatalf("reset schema: %v", err)
		}
	}

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("set dialect: %v", err)
	}
	goose.SetLogger(stdLogger{})

	switch {
	case version:
		v, err := goose.GetDBVersion(db)
		if err != nil {
			log.Fatalf("version: %v", err)
		}
		fmt.Println(v)
	case status:
		if err := goose.Status(db, "."); err != nil {
			log.Fatalf("status: %v", err)
		}
	case down:
		if err := goose.Down(db, "."); err != nil {
			log.Fatalf("down: %v", err)
		}
	case downTo >= 0:
		if err := goose.DownTo(db, ".", int64(downTo)); err != nil {
			log.Fatalf("down-to: %v", err)
		}
	case target >= 0:
		if err := goose.UpTo(db, ".", int64(target)); err != nil {
			log.Fatalf("up-to: %v", err)
		}
	default:
		if err := goose.Up(db, "."); err != nil {
			if errors.Is(err, goose.ErrNoCurrentVersion) {
				log.Println("no current version — fresh database")
			} else {
				log.Fatalf("up: %v", err)
			}
		}
	}

	log.Println("done.")
}

func resolveDSN() string {
	if v := strings.TrimSpace(os.Getenv("DATABASE_URL")); v != "" {
		return v
	}
	host := def(os.Getenv("DB_HOST"), "localhost")
	port := def(os.Getenv("DB_PORT"), "5432")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASSWORD")
	name := os.Getenv("DB_NAME")
	ssl := def(os.Getenv("DB_SSL_MODE"), "disable")
	if user == "" || name == "" {
		return ""
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, port, name, ssl)
}

func def(v, d string) string {
	if v == "" {
		return d
	}
	return v
}

type stdLogger struct{}

func (stdLogger) Fatal(v ...interface{})                 { log.Fatal(v...) }
func (stdLogger) Fatalf(format string, v ...interface{}) { log.Fatalf(format, v...) }
func (stdLogger) Print(v ...interface{})                 { log.Print(v...) }
func (stdLogger) Println(v ...interface{})               { log.Println(v...) }
func (stdLogger) Printf(format string, v ...interface{}) { log.Printf(format, v...) }
