.PHONY: help build run test test-unit test-integration test-verbose bench clean deps lint fmt air

# Variables
APP_NAME=tether-erp
PORT?=8080
GO_VERSION=1.21

help:
	@echo "$(APP_NAME) - Tether-ERP Backend"
	@echo ""
	@echo "Available targets:"
	@echo "  build              - Build the application"
	@echo "  build-windows      - Build for Windows (amd64)"
	@echo "  run                - Run the application"
	@echo "  test               - Run all tests"
	@echo "  test-unit          - Run unit tests only"
	@echo "  test-integration   - Run integration tests only"
	@echo "  test-verbose       - Run tests with verbose output"
	@echo "  test-comprehensive - Run comprehensive API test suite (47 endpoints)"
	@echo "  test-api           - Run API test suite (alias for test-comprehensive)"
	@echo "  test-api-help      - Show help for running API tests"
	@echo "  bench              - Run benchmarks"
	@echo "  coverage           - Generate coverage report"
	@echo "  deps               - Download dependencies"
	@echo "  lint               - Run linter"
	@echo "  fmt                - Format code"
	@echo "  clean              - Clean build artifacts"
	@echo "  clean-all          - Deep clean (including caches)"
	@echo "  db-migrate         - Run database migrations (excludes cleanup migrations)"
	@echo "  db-migrate-single  - Run a single migration file (FILE=filename)"
	@echo "  db-reset           - Reset database (runs cleanup + all migrations)"
	@echo "  dev                - Start development environment"
	@echo "  dev-fresh          - Start fresh development environment"
	@echo "  air                - Run with Air live reload"
	@echo "  air-install        - Install Air live reload tool"
	@echo "  watch              - Alias for air"
	@echo "  verify-separation  - Verify multi-tenant data separation"
	@echo "  ci                 - Run full CI checks"
	@echo "  ci-quick           - Run quick CI checks"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  make run"
	@echo "  make test"
	@echo "  make test-api"
	@echo "  make test-comprehensive"
	@echo "  make dev-fresh"
	@echo "  PORT=8085 make run"

deps:
	@echo "Downloading dependencies..."
	go mod download
	go mod tidy
	@echo "Dependencies installed successfully"

build:
	@echo "Building $(APP_NAME)..."
	go build -o bin/$(APP_NAME) main.go
	@echo "Build complete: bin/$(APP_NAME)"

build-windows:
	@echo "Building $(APP_NAME) for Windows..."
	GOOS=windows GOARCH=amd64 go build -o bin/$(APP_NAME).exe main.go
	@echo "Build complete: bin/$(APP_NAME).exe"

run:
	@echo "Running $(APP_NAME) on port $(PORT)..."
	go run main.go

test:
	@echo "Running all tests..."
	CGO_ENABLED=0 go test -v ./tests/...

test-unit:
	@echo "Running unit tests..."
	CGO_ENABLED=0 go test -v ./tests/unit/...

test-integration:
	@echo "Running integration tests..."
	CGO_ENABLED=0 go test -v ./tests/integration/...

test-verbose:
	@echo "Running tests with verbose output..."
	CGO_ENABLED=0 go test -v -count=1 ./tests/...

test-comprehensive:
	@echo "Running comprehensive API test suite..."
	@chmod +x scripts/run_tests.sh
	@./scripts/run_tests.sh

test-api:
	@echo "Running API test suite..."
	@chmod +x scripts/run_tests.sh
	@./scripts/run_tests.sh

test-api-help:
	@echo "API Test Suite Help"
	@echo "==================="
	@echo ""
	@echo "The API test suite requires the backend server to be running."
	@echo ""
	@echo "To run API tests:"
	@echo "1. Start the server in one terminal:"
	@echo "   make run"
	@echo ""
	@echo "2. Run API tests in another terminal:"
	@echo "   make test-api"
	@echo ""
	@echo "Or run specific test modules:"
	@echo "   ./scripts/run_tests.sh auth rbac"
	@echo "   ./scripts/run_tests.sh workflows documents"
	@echo ""
	@echo "Available test modules:"
	@echo "- auth: Authentication and session management"
	@echo "- rbac: Role-based access control"
	@echo "- documents: Document management (requisitions, budgets, etc.)"
	@echo "- workflows: Workflow and approval system"
	@echo "- custom-roles: Custom organization roles"
	@echo "- departments: Department management"
	@echo "- analytics: Analytics and notifications"
	@echo "- errors: Error handling and security"
	@echo ""
	@echo "For more details: ./scripts/run_tests.sh --help"

test-coverage:
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./tests/...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

test-services:
	@echo "Running service tests..."
	go test -v ./tests/unit/*service*

test-handlers:
	@echo "Running handler tests..."
	go test -v ./tests/unit/*handler*

bench:
	@echo "Running benchmarks..."
	go test -bench=. -benchmem -run=^$ ./tests/...

bench-services:
	@echo "Running service benchmarks..."
	go test -bench=. -benchmem -run=^$ ./tests/unit/*service*

lint:
	@echo "Running linter..."
	golangci-lint run

fmt:
	@echo "Formatting code..."
	go fmt ./...
	goimports -w .

clean:
	@echo "Cleaning up..."
	rm -f bin/$(APP_NAME)
	rm -rf tmp/
	rm -f coverage.out coverage.html
	rm -f *.test
	go clean
	@echo "Clean complete"

clean-all:
	@echo "Deep cleaning..."
	make clean
	go clean -cache
	go clean -modcache
	@echo "Deep clean complete"

# Database targets (goose migrations + sqlc codegen)
db-migrate:
	@echo "Running database migrations (goose up)..."
	go run ./cmd/migrate

db-migrate-status:
	@echo "Showing migration status..."
	go run ./cmd/migrate -status

db-migrate-down:
	@echo "Rolling back one migration..."
	go run ./cmd/migrate -down

db-reset:
	@echo "Resetting database: drop public schema + re-apply all migrations..."
	go run ./cmd/migrate -reset

db-version:
	@echo "Current DB version:"
	@go run ./cmd/migrate -version

sqlc-gen:
	@echo "Generating sqlc code..."
	sqlc generate

sqlc-verify:
	@echo "Verifying sqlc queries..."
	sqlc vet

# Development targets
air-install:
	@echo "Installing Air live reload tool..."
	go install github.com/air-verse/air@latest
	@echo "Air installed successfully"

air:
	@echo "Starting with Air live reload..."
	air

watch: air

dev:
	@echo "Starting development environment..."
	make deps
	make db-migrate
	make build
	make run

dev-fresh:
	@echo "Starting fresh development environment..."
	make clean
	make deps
	make db-reset
	make build
	make run

# Docker targets
docker-build:
	@echo "Building Docker image..."
	docker build -t $(APP_NAME):latest .

docker-run:
	@echo "Running Docker container..."
	docker run -p $(PORT):$(PORT) $(APP_NAME):latest

docker-clean:
	@echo "Removing Docker image..."
	docker rmi $(APP_NAME):latest

# CI/CD targets
ci:
	@echo "Running CI checks..."
	make deps
	make fmt
	make lint
	make test
	make test-api
	make build

ci-quick:
	@echo "Running quick CI checks..."
	make deps
	make fmt
	make lint
	make test-unit
	make build

# Code generation
generate:
	@echo "Running code generation..."
	go generate ./...

# Version info
version:
	@echo "Go version: $$(go version)"
	@echo "App: $(APP_NAME)"
	@echo "Port: $(PORT)"

.PHONY: help build build-windows run test test-unit test-integration test-verbose test-comprehensive test-api test-api-help test-coverage test-services test-handlers \
        bench bench-services lint fmt clean clean-all deps db-migrate db-reset air air-install watch dev dev-fresh version \
        docker-build docker-run docker-clean ci ci-quick generate verify-separation
