# Tether-ERP — root Makefile
# Orchestrates the Go backend and the pnpm-workspace frontend.

.PHONY: help \
        build build-backend build-frontend \
        dev-backend dev-frontend dev air \
        start-frontend \
        lint lint-frontend lint-backend \
        test test-backend test-frontend \
        migrate migrate-status migrate-down migrate-reset migrate-version \
        sqlc-gen \
        install install-backend install-frontend \
        clean check-env verify

# ----------------------------------------------------------------------------
# HELP
# ----------------------------------------------------------------------------
help:
	@echo "Tether-ERP — Available Commands"
	@echo ""
	@echo "Build:"
	@echo "  make build              - Build backend + frontend"
	@echo "  make build-backend      - Build backend binary"
	@echo "  make build-frontend     - Build frontend app"
	@echo ""
	@echo "Development:"
	@echo "  make dev-backend        - Run backend (go run)"
	@echo "  make air                - Run backend with air hot-reload"
	@echo "  make dev-frontend       - Run frontend dev server"
	@echo "  make start-frontend     - Run frontend in production mode"
	@echo ""
	@echo "Database:"
	@echo "  make migrate            - Apply pending goose migrations"
	@echo "  make migrate-status     - Show migration status"
	@echo "  make migrate-down       - Roll back one migration"
	@echo "  make migrate-version    - Print current DB version"
	@echo "  make migrate-reset      - Drop public schema then re-apply all migrations"
	@echo "  make sqlc-gen           - Regenerate sqlc Go code"
	@echo ""
	@echo "Lint / Test:"
	@echo "  make lint               - Lint backend + frontend"
	@echo "  make test               - Test backend + frontend"
	@echo ""
	@echo "Utilities:"
	@echo "  make install            - Install backend + frontend dependencies"
	@echo "  make clean              - Remove build artifacts"
	@echo "  make check-env          - Verify .env files exist"
	@echo "  make verify             - Build + test"

# ----------------------------------------------------------------------------
# BUILD
# ----------------------------------------------------------------------------
build: build-backend build-frontend
	@echo "✅ All apps built"

build-backend:
	@echo "🔨 Building backend..."
	@cd backend && go build -o tether-erp-backend .
	@echo "✅ Backend built: backend/tether-erp-backend"

build-frontend:
	@echo "🔨 Building frontend..."
	@pnpm --filter tether-erp-frontend run build
	@echo "✅ Frontend built: frontend/.next/"

# ----------------------------------------------------------------------------
# DEVELOPMENT
# ----------------------------------------------------------------------------
dev-backend:
	@echo "🔧 Starting backend (go run)..."
	@cd backend && go run main.go

air:
	@echo "🔥 Starting backend with air (hot-reload)..."
	@cd backend && air

dev-frontend:
	@echo "🔧 Starting frontend (port 3000)..."
	@pnpm --filter tether-erp-frontend run dev

start-frontend:
	@pnpm --filter tether-erp-frontend run start

# ----------------------------------------------------------------------------
# DATABASE (goose + sqlc)
# ----------------------------------------------------------------------------
migrate:
	@echo "🗄️  Applying migrations..."
	@cd backend && go run ./cmd/migrate

migrate-status:
	@cd backend && go run ./cmd/migrate -status

migrate-down:
	@cd backend && go run ./cmd/migrate -down

migrate-version:
	@cd backend && go run ./cmd/migrate -version

migrate-reset:
	@echo "⚠️  Dropping public schema and re-applying migrations..."
	@cd backend && go run ./cmd/migrate -reset

sqlc-gen:
	@echo "🛠  Regenerating sqlc..."
	@sqlc generate
	@echo "✅ sqlc regenerated"

# ----------------------------------------------------------------------------
# LINT
# ----------------------------------------------------------------------------
lint: lint-backend lint-frontend

lint-backend:
	@cd backend && (test -x "$$(command -v golangci-lint)" && golangci-lint run || go vet ./...)

lint-frontend:
	@pnpm --filter tether-erp-frontend run lint

# ----------------------------------------------------------------------------
# TEST
# ----------------------------------------------------------------------------
test: test-backend test-frontend

test-backend:
	@echo "🧪 Backend tests..."
	@cd backend && go test ./...

test-frontend:
	@echo "🧪 Frontend tests..."
	@pnpm --filter tether-erp-frontend run test:run

# ----------------------------------------------------------------------------
# UTILITIES
# ----------------------------------------------------------------------------
install: install-backend install-frontend

install-backend:
	@echo "📦 Installing Go dependencies..."
	@cd backend && go mod download

install-frontend:
	@echo "📦 Installing pnpm workspace dependencies..."
	@pnpm install

clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -f backend/tether-erp-backend
	@rm -rf backend/tmp
	@rm -rf frontend/.next
	@echo "✅ Clean complete"

check-env:
	@echo "🔍 Checking environment files..."
	@test -f backend/.env  && echo "  ✅ backend/.env"  || echo "  ❌ backend/.env missing"
	@test -f frontend/.env && echo "  ✅ frontend/.env" || echo "  ⚠️  frontend/.env missing"

verify: build test
	@echo "✅ All builds verified"
