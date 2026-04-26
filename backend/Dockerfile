# Multi-stage build for Go backend
FROM golang:1.22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies with retry and without verify for initial download
RUN go mod download

# Copy source code
COPY . .

# Tidy and verify after copying all files
RUN go mod tidy && go mod verify

# Build the main application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -a \
    -installsuffix cgo \
    -ldflags="-w -s" \
    -o main .

# Build the migration tool as part of the main application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -a \
    -installsuffix cgo \
    -ldflags="-w -s" \
    -o migrate \
    -tags migrate \
    ./cmd/migrate

# Final stage - minimal image
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata wget && \
    addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Set working directory
WORKDIR /app

# Copy the binaries from builder
COPY --from=builder /app/main .
COPY --from=builder /app/migrate .

# Copy config files if needed
COPY --from=builder /app/config ./config

# Copy database migrations
COPY --from=builder /app/database ./database

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./main"]
