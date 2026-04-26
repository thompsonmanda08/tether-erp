# Liyali Gateway Modular Test Suite

The comprehensive test suite has been refactored into smaller, focused modules for better maintainability and selective testing.

## 📁 Test Structure

```
backend/scripts/
├── common_tests.sh              # Shared utilities and configurations
├── run_tests.sh               # Main orchestrator script
├── auth_tests.sh              # Authentication & session management
├── rbac_tests.sh              # Role-based access control & multi-tenant
├── document_tests.sh          # Document management (CRUD operations)
├── workflow_test.sh            # Consolidated workflow & approval system tests
├── department_tests.sh        # Department management
├── analytics_tests.sh         # Analytics, notifications & system ops
├── admin_tests.sh             # Admin endpoints (NEW)
├── error_tests.sh             # Error handling & security validation
└── README_TESTS.md            # This documentation
```

## 🚀 Quick Start

### Run All Tests

```bash
cd backend/scripts
./run_tests.sh
```

### Run Specific Test Modules

```bash
# Run only authentication and RBAC tests
./run_tests.sh auth rbac

# Run only document and workflow tests
./run_tests.sh documents workflows

# Run only analytics and error handling tests
./run_tests.sh analytics errors

# Run only admin endpoint tests
./run_tests.sh admin
```

### Run Individual Test Scripts

```bash
# Authentication tests (establishes context for others)
./auth_tests.sh

# Individual modules (require auth context)
./rbac_tests.sh
./document_tests.sh
./workflow_test.sh
./department_tests.sh
./analytics_tests.sh
./admin_tests.sh
./error_tests.sh
```

## 📋 Test Modules

### 🔐 Authentication Tests (`auth_tests.sh`)

- Health check endpoint
- User login/logout
- Token verification & refresh
- Token rotation security
- Password management
- Session management
- **Establishes authentication context for other modules**

### 🏢 RBAC Tests (`rbac_tests.sh`)

- Multi-tenant operations
- Organization management
- Role creation & management
- Permission assignment
- User permission management
- Organization settings

### 📄 Document Tests (`document_tests.sh`)

- Categories & vendors CRUD
- Requisitions lifecycle
- Budgets management
- Purchase orders
- Payment vouchers & GRNs
- Document search & statistics
- Critical fixes verification

### 🔄 Workflow Tests (`workflow_test.sh`)

- Workflow creation & management
- Legacy documentType support
- Modern entityType support
- Workflow validation & resolution
- Approval system operations
- Bulk approval operations
- Workflow lifecycle management

### 🏢 Department Tests (`department_tests.sh`)

- Department CRUD operations
- Module assignments
- User-department relationships
- Soft delete & restore
- Department user management

### 📊 Analytics Tests (`analytics_tests.sh`)

- Dashboard analytics
- Requisition & approval metrics
- Notification system
- Advanced system operations
- Audit logging tests
- Performance & load testing

### 🔧 Admin Tests (`admin_tests.sh`) - NEW

- Admin authentication & authorization
- Admin dashboard & analytics (7 endpoints)
- System health & monitoring (6 endpoints)
- Subscription management (9 endpoints)
- Trial management (4 endpoints)
- Settings management (7 endpoints)
- Feature flags management (10 endpoints)
- CRUD operations for all admin resources
- Admin-only access control validation

### ⚠️ Error Tests (`error_tests.sh`)

- Error handling & edge cases
- Input validation
- Security validation
- Authentication errors
- Authorization bypass prevention
- SQL injection & XSS prevention

## 🔧 Configuration

### Environment Variables

All test modules use shared configuration from `common_tests.sh`:

```bash
BASE_URL="http://localhost:8080"
API_URL="$BASE_URL/api/v1"
TEST_EMAIL="admin@liyali.com"
TEST_PASSWORD="password"
```

### Authentication Context & Persistence

The test suite uses a file-based persistent context mechanism:

1. **Storage**: Variables are saved to `$HOME/.liyali_test_context` (chmod 600).
2. **Setup**: `run_tests.sh` attempts to load existing context. If invalid/missing, it runs `auth_tests.sh`.
3. **Sharing**: Every modular script automatically sources `common_tests.sh`, which loads the latest context.
4. **Persistence**: New IDs (Workflow ID, Category ID, etc.) are saved to the context file after each module execution.
5. **Cleanup**: Call `clear_context` (standard in `test_logout`) to wipe the persistence file.

### Individual Module Execution

When running individual test scripts:

- They automatically attempt to `load_context` from the file.
- If an `ACCESS_TOKEN` is found, they proceed immediately.
- If not, they will trigger a login via `auth_tests.sh` to establish context.

## 📊 Test Results

### Success Rates by Module (Updated Jan 12, 2026)

Based on the latest comprehensive test suite execution:

- **Authentication**: 100% (16/16 tests) - Includes validation & rotation
- **RBAC & Multi-Tenant**: 100% (32/32 tests) - Includes Org CRUD & Members
- **Document Management**: 97% (45/46 tests) - Includes Search & Stats
- **Workflow & Approval**: 94% (35/37 tests) - Includes advanced validation
- **Department Management**: 100% (15/15 tests)
- **Analytics & System**: 100% (19/19 tests)
- **Admin Endpoints**: NEW (44 tests) - Dashboard, subscriptions, settings, feature flags
- **Error Handling & Security**: 100% (10/10 tests)

**Overall Success Rate: TBD (pending admin test execution)**

### Key Benefits of Modular Structure

1. **Focused Testing**: Run only the modules you're working on
2. **Faster Development**: Quicker feedback during development
3. **Better Maintainability**: Easier to update and extend individual modules
4. **Parallel Development**: Multiple developers can work on different test modules
5. **Selective CI/CD**: Run different test suites in different pipeline stages
6. **Debugging**: Easier to isolate and debug specific functionality

## 🎯 Usage Examples

### Development Workflow

```bash
# During authentication development
./auth_tests.sh

# During document management development
./run_tests.sh auth documents

# During workflow system development
./run_tests.sh auth workflows

# During admin console development
./run_tests.sh auth admin

# Full regression testing
./run_tests.sh
```

### CI/CD Pipeline Integration

```bash
# Quick smoke tests (authentication + critical paths)
./run_tests.sh auth documents

# Full test suite (nightly builds)
./run_tests.sh

# Admin-focused testing
./run_tests.sh auth admin

# Security-focused testing
./run_tests.sh auth rbac errors
```

### Debugging Specific Issues

```bash
# Debug authentication issues
./auth_tests.sh

# Debug workflow problems
./run_tests.sh auth workflows

# Debug admin endpoint issues
./run_tests.sh auth admin

# Debug performance issues
./run_tests.sh auth analytics
```

## 🔗 Integration with Existing Tools

The modular test suite integrates with existing project tools:

- **Makefile**: Add test targets for different modules
- **Docker**: Run tests in containerized environments
- **CI/CD**: Selective test execution based on changed files
- **Monitoring**: Module-specific test result tracking

## 📈 Future Enhancements

Potential improvements to the modular test structure:

1. **Parallel Execution**: Run independent modules in parallel
2. **Test Data Management**: Shared test data setup/teardown
3. **Report Generation**: Module-specific test reports
4. **Integration Tests**: Cross-module integration testing
5. **Performance Benchmarking**: Module-specific performance baselines
