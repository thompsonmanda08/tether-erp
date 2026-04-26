# Backend Setup

## Prerequisites

- Go 1.21+
- PostgreSQL 14+

## Quick Start

```bash
cd backend
cp .env.example .env
go mod download
make db-reset   # migrations + seed
make dev        # http://localhost:8080
```

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/tether_erp
JWT_SECRET=minimum-32-character-secret-key-here
PORT=8080
APP_ENV=development

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Optional
LOG_LEVEL=debug
EMAIL_ENABLED=false
```

## Make Commands

| Command         | Description                  |
| --------------- | ---------------------------- |
| `make dev`      | Start with hot reload (air)  |
| `make build`    | Compile binary               |
| `make test`     | Run all tests                |
| `make fmt`      | Format code                  |
| `make lint`     | Run linter                   |
| `make db-reset` | Drop + re-run all migrations |
| `make migrate`  | Run pending migrations       |
| `make db-down`  | Rollback last migration      |
| `make deploy`   | Deploy to Fly.io             |

## Project Structure

```
backend/
├── config/          # DB init, env loading
├── database/
│   └── migrations/  # 000-004 SQL migration files
├── handlers/        # HTTP handlers (one file per domain)
├── middleware/      # Auth, tenant, rate limiting
├── models/          # GORM model structs
├── routes/          # Route registration
├── services/        # Business logic
├── types/           # Request/response types
├── utils/           # Shared helpers
└── main.go
```
