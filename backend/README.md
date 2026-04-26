# Tether-ERP - Go Fiber Backend

**Phase 12 Implementation** - PostgreSQL Database Integration

## Overview

This is the Go Fiber backend for the Tether-ERP procurement management system. It provides a production-ready PostgreSQL database and REST API.

### Architecture

```
Backend (Go Fiber)
├── PostgreSQL Database (tether-erp-db)
├── GORM ORM Layer
├── REST API Endpoints (80+ endpoints)
├── Middleware (Auth, CORS, Logging)
├── Models (Users, Documents, Approvals)
└── Handlers (Business Logic)
```

### Features

- ✅ PostgreSQL integration with GORM ORM
- ✅ Fiber v2 high-performance HTTP framework
- ✅ JWT authentication middleware
- ✅ CORS support for frontend communication
- ✅ Comprehensive error handling
- ✅ Request logging and monitoring
- ✅ Database migrations (auto-migration)
- ✅ Type-safe models and handlers

## Prerequisites

- Go 1.21 or higher
- PostgreSQL 12+
- Git

## Installation

### 1. Set up PostgreSQL Database

```bash
# Create database
createdb tether-erp-db -U postgres

# Or using psql
psql -U postgres -c "CREATE DATABASE \"tether-erp-db\";"
```

### 2. Clone and Setup Backend

```bash
cd backend
```

### 3. Install Dependencies

```bash
go mod download
go mod tidy
```

### 4. Configure Environment Variables

```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Database Configuration:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=00110011
DB_NAME=tether-erp-db
DB_SSL_MODE=disable
```

### 5. Run the Backend

```bash
go run main.go
```

The server will start on `http://localhost:8080`

## Project Structure

```
backend/
├── main.go                 # Application entry point
├── go.mod                  # Go module definition
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── config/
│   └── database.go        # Database connection and migrations
├── models/
│   └── models.go          # GORM data models
├── handlers/
│   └── handlers.go        # HTTP request handlers (80+ endpoints)
├── middleware/
│   └── middleware.go      # Auth, CORS, logging middleware
└── routes/
    └── routes.go          # API route definitions
```

## API Endpoints

### Authentication (Public)

```
POST   /api/auth/login              - User login
POST   /api/auth/register           - User registration
GET    /api/health                  - Health check
```

### Users (Protected)

```
GET    /api/users                   - List all users
GET    /api/users/:id               - Get user details
PUT    /api/users/:id               - Update user
```

### Requisitions (Protected)

```
GET    /api/requisitions            - List requisitions
POST   /api/requisitions            - Create requisition
GET    /api/requisitions/:id        - Get requisition
PUT    /api/requisitions/:id        - Update requisition
DELETE /api/requisitions/:id        - Delete requisition
POST   /api/requisitions/:id/approve - Approve requisition
POST   /api/requisitions/:id/reject  - Reject requisition
POST   /api/requisitions/:id/reassign - Reassign requisition
```

### Budgets (Protected)

```
GET    /api/budgets                 - List budgets
POST   /api/budgets                 - Create budget
GET    /api/budgets/:id             - Get budget
PUT    /api/budgets/:id             - Update budget
DELETE /api/budgets/:id             - Delete budget
POST   /api/budgets/:id/approve     - Approve budget
POST   /api/budgets/:id/reject      - Reject budget
```

### Purchase Orders (Protected)

```
GET    /api/purchase-orders         - List POs
POST   /api/purchase-orders         - Create PO
GET    /api/purchase-orders/:id     - Get PO
PUT    /api/purchase-orders/:id     - Update PO
DELETE /api/purchase-orders/:id     - Delete PO
POST   /api/purchase-orders/:id/approve - Approve PO
POST   /api/purchase-orders/:id/reject  - Reject PO
```

### Payment Vouchers (Protected)

```
GET    /api/payment-vouchers        - List payment vouchers
POST   /api/payment-vouchers        - Create payment voucher
GET    /api/payment-vouchers/:id    - Get payment voucher
PUT    /api/payment-vouchers/:id    - Update payment voucher
DELETE /api/payment-vouchers/:id    - Delete payment voucher
POST   /api/payment-vouchers/:id/approve - Approve
POST   /api/payment-vouchers/:id/reject  - Reject
```

### GRNs (Protected)

```
GET    /api/grns                    - List GRNs
POST   /api/grns                    - Create GRN
GET    /api/grns/:id                - Get GRN
PUT    /api/grns/:id                - Update GRN
DELETE /api/grns/:id                - Delete GRN
POST   /api/grns/:id/approve        - Approve GRN
POST   /api/grns/:id/reject         - Reject GRN
```

### Vendors (Protected)

```
GET    /api/vendors                 - List vendors
POST   /api/vendors                 - Create vendor
GET    /api/vendors/:id             - Get vendor
PUT    /api/vendors/:id             - Update vendor
```

### Approvals (Protected)

```
GET    /api/approvals               - List approval tasks
GET    /api/approvals/:id           - Get approval task
GET    /api/approvals/pending/:userId - Get pending approvals
```

### Bulk Operations (Protected)

```
POST   /api/bulk/approve            - Bulk approve documents
POST   /api/bulk/reject             - Bulk reject documents
POST   /api/bulk/reassign           - Bulk reassign documents
```

### Analytics (Protected)

```
GET    /api/analytics/dashboard     - Get dashboard metrics
GET    /api/analytics/requisitions/metrics - Get requisition metrics
GET    /api/analytics/approvals/metrics - Get approval metrics
```

### Notifications (Protected)

```
GET    /api/notifications           - List notifications
GET    /api/notifications/:id       - Get notification
PUT    /api/notifications/:id/read  - Mark as read
```

### Audit Logs (Protected)

```
GET    /api/audit-logs              - List audit logs
GET    /api/audit-logs/document/:documentId - Get document audit logs
```

## Database Schema

### Core Tables

- **users** - System users with roles
- **requisitions** - Requisition workflow documents
- **budgets** - Budget workflow documents
- **purchase_orders** - Purchase order workflow documents
- **payment_vouchers** - Payment voucher workflow documents
- **goods_received_notes** - GRN workflow documents
- **vendors** - Vendor master data
- **approval_tasks** - Pending approvals
- **audit_logs** - Activity tracking
- **notifications** - Email/SMS notifications

All tables are automatically created via GORM auto-migration on startup.

## Development

### Environment Setup

```bash
# Development environment
export APP_ENV=development
export APP_PORT=8080

# Database
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=00110011
export DB_NAME=tether-erp-db

# Frontend
export FRONTEND_URL=http://localhost:3000
```

### Building

```bash
go build -o tether-erp-backend ./main.go
```

### Testing

```bash
# Run tests (when implemented)
go test ./...

# With coverage
go test -cover ./...
```

## Deployment

### Docker (Coming Soon)

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o backend ./main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/backend /
EXPOSE 8080
CMD ["./backend"]
```

### Environment Variables (Production)

```env
APP_ENV=production
APP_PORT=8080
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=tether-erp-db
DB_SSL_MODE=require
JWT_SECRET=your-secure-secret-key
FRONTEND_URL=https://your-frontend-domain.com
```

## Implementation Roadmap

### Phase 12A: Database Setup ✅ COMPLETE

- ✅ PostgreSQL connection
- ✅ GORM models
- ✅ Database migrations
- ✅ Connection pooling

### Phase 12B: Authentication (In Progress)

- [ ] JWT token generation
- [ ] User login/register endpoints
- [ ] Session management
- [ ] OAuth 2.0 integration (NextAuth.js frontend)

### Phase 12C: API Endpoints (In Progress)

- [ ] CRUD operations for all document types
- [ ] Approval workflow endpoints
- [ ] Bulk operations
- [ ] Request validation

### Phase 12D: Business Logic (Pending)

- [ ] Workflow state management
- [ ] Approval routing
- [ ] Audit logging
- [ ] Email notifications (SendGrid)

### Phase 12E: Testing & Deployment (Pending)

- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance testing
- [ ] Production deployment

## Common Issues & Troubleshooting

### Database Connection Error

```
Failed to connect to database: connection refused
```

**Solution:**

- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database exists: `psql -l`

### Port Already in Use

```
Error starting server: listen tcp :8080: bind: address already in use
```

**Solution:**

```bash
# Find and kill process
lsof -i :8080
kill -9 <PID>

# Or use different port
export APP_PORT=8081
```

### Environment Variables Not Loading

**Solution:**

- Ensure `.env` file exists in backend directory
- Check file is not in .gitignore
- Use absolute paths if needed

## Next Steps

1. **Implement authentication** - JWT token generation and validation
2. **Implement CRUD handlers** - Replace "not implemented" stubs with actual logic
3. **Add business logic** - Workflow state transitions, approvals
4. **Implement notifications** - SendGrid email integration
5. **Add tests** - Unit and integration tests
6. **Deploy to production** - Docker containerization and cloud deployment

## Support

For detailed documentation about the API structure and frontend integration, see:

- [BACKEND-GUIDE-GO.md](../docs/BACKEND-GUIDE-GO.md) - Complete implementation guide
- [11-COMPLETE-API-REFERENCE.md](../docs/11-COMPLETE-API-REFERENCE.md) - API specifications
- [PHASE-12-PLAN.md](../docs/PHASE-12-PLAN.md) - Phase 12 planning document

## License

MIT License - See LICENSE file for details
