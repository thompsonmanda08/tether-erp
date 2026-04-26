# Test Organization

This directory contains all test files for the Tether-ERP Backend, organized into unit and integration tests with a clean architecture.

## Directory Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── *_service_test.go   # Service layer tests
│   ├── *_handler_test.go   # Handler layer tests
│   └── *_test.go           # Other unit tests
├── integration/            # Integration tests for complete workflows
│   ├── *_integration_test.go # End-to-end workflow tests
│   └── helpers.go          # Test helper functions
└── README.md               # This file

../scripts/                  # Testing scripts and tools
├── test_requests.http      # HTTP requests for manual API testing
├── run_tests.sh            # ✅ Modular test suite runner
├── custom_role_tests.sh    # Custom role workflow API tests
└── workflow_unit_tests.sh    # Workflow-specific unit test runner
```

## Test Categories

### Unit Tests (`tests/unit/`)

- **Service Tests**: Test business logic in isolation
  - `analytics_service_test.go` - Analytics calculations and data processing
  - `approval_rules_test.go` - Approval workflow rules and validation
  - `budget_validation_test.go` - Budget constraint validation
  - `custom_role_validation_test.go` - Custom organization role validation logic
  - `custom_role_edge_cases_test.go` - Custom role edge cases and database integration
  - `document_automation_service_test.go` - Document automation workflows
  - `document_linking_test.go` - Document relationship management
  - `notification_service_test.go` - Notification delivery and formatting
  - `workflow_execution_service_test.go` - Workflow execution logic (includes custom role scenarios)
  - `workflow_state_machine_test.go` - State transition logic

- **Handler Tests**: Test HTTP request/response handling
  - `*_handler_test.go` - API endpoint behavior and validation

### Integration Tests (`tests/integration/`)

- **Workflow Tests**: Test complete business processes
  - `approval_flow_integration_test.go` - Complete approval workflows
  - `budget_constraint_integration_test.go` - Budget validation across services
  - `custom_role_workflow_integration_test.go` - Custom role workflow integration
  - `document_automation_integration_test.go` - Document automation integration
  - `multi_tenant_analytics_test.go` - Multi-tenant analytics testing
  - `workflow_integration_complete_test.go` - Complete workflow integration
  - `workflows_integration_test.go` - End-to-end workflow execution

## Running Tests

### Comprehensive Test Suite

For complete system testing, use the comprehensive test suite:

```bash
# From backend directory
./scripts/run_tests.sh
```

This runs all 47 API endpoints with automated reporting and covers:

- Authentication and authorization
- CRUD operations for all entities
- Workflow execution and approvals
- Multi-tenant isolation
- Error handling and validation

### Custom Role Testing

For testing custom organization roles in workflows:

```bash
# Run all custom role tests (API + Unit tests)
./scripts/run_tests.sh custom-roles unit

# Run only custom role API tests
./scripts/custom_role_tests.sh

# Run only workflow unit tests
./scripts/workflow_unit_tests.sh

# Run specific custom role tests
go test -v ./tests/unit/custom_role_validation_test.go
go test -v ./tests/integration/custom_role_workflow_integration_test.go
```

### Individual Test Commands

### Run All Tests

```bash
go test ./tests/...
```

### Run Unit Tests Only

```bash
go test ./tests/unit/...
```

### Run Integration Tests Only

```bash
go test ./tests/integration/...
```

### Run Specific Test File

```bash
go test ./tests/unit/analytics_service_test.go
```

### Run with Verbose Output

```bash
go test -v ./tests/...
```

### Run with Coverage

```bash
go test -cover ./tests/...
```

## Custom Role Workflow Testing

### Overview

Comprehensive test suite for custom organization roles in workflow approval/rejection processes, covering core functionality, edge cases, and system integration.

### Test Coverage

#### **Core Functionality**

- ✅ Custom role workflow creation and validation
- ✅ Role mismatch detection and error handling
- ✅ Multi-stage workflows with different custom roles
- ✅ Approval/rejection with correct vs wrong custom roles
- ✅ Audit trail and history tracking

#### **Edge Cases**

- ✅ Deactivated role handling
- ✅ Role deletion during active workflows
- ✅ User role changes mid-workflow
- ✅ Multiple users with same custom role
- ✅ Special characters and long role names
- ✅ Case sensitivity enforcement

#### **System Integration**

- ✅ RBAC system integration
- ✅ Notification system integration
- ✅ User management integration
- ✅ Department management integration

### Test Files

#### **Unit Tests**

- `custom_role_validation_test.go` - Core validation logic (100% pass rate)
- `custom_role_edge_cases_test.go` - Database integration scenarios (95% pass rate)
- `workflow_execution_service_test.go` - Enhanced with custom role scenarios

#### **Integration Tests**

- `custom_role_workflow_integration_test.go` - End-to-end workflow integration (90% pass rate)

#### **API Tests**

- `scripts/custom_role_tests.sh` - Comprehensive API endpoint testing (70% implemented endpoints)

### Key Findings

#### **✅ Working Correctly**

1. Custom role workflow creation and validation
2. Role name validation and edge case handling
3. Workflow structure with custom roles
4. Basic approval/rejection logic structure
5. Audit trail data structure

#### **⚠️ Needs Implementation**

1. Task management endpoints (`/api/v1/tasks/my-tasks`)
2. Workflow history endpoints (`/api/v1/workflows/{id}/history`)
3. Custom role analytics endpoints
4. Permission-based validation (currently uses role name matching)
5. Role activation status checking in workflow execution

#### **🔴 Critical Edge Cases Identified**

1. **Deactivated Role Handling**: Users with deactivated custom roles should be blocked from approvals
2. **Role Change During Workflow**: System should handle user role changes mid-workflow
3. **Permission Inheritance**: Future enhancement for role hierarchy support
4. **Audit Trail Completeness**: Ensure all custom role actions are properly logged

### Running Custom Role Tests

```bash
# Run all custom role tests
./scripts/run_tests.sh custom-roles

# Run unit tests only
./scripts/workflow_unit_tests.sh

# Run API tests only
./scripts/custom_role_tests.sh

# Run specific test files
go test -v ./tests/unit/custom_role_validation_test.go
go test -v ./tests/unit/custom_role_edge_cases_test.go
go test -v ./tests/integration/custom_role_workflow_integration_test.go
```

## Test Guidelines

1. **Unit Tests**: Should test individual functions/methods in isolation
2. **Integration Tests**: Should test complete workflows and interactions between components
3. **Test Data**: Use realistic but anonymized test data
4. **Cleanup**: Always clean up test data and resources
5. **Isolation**: Tests should not depend on each other
6. **Documentation**: Include clear test descriptions and comments

## Test Helpers

Common test utilities and helpers are located in:

- `tests/integration/helpers.go` - Integration test helpers
- Individual test files may include their own helper functions

## Database Testing

For tests requiring database access:

1. Use test database configuration
2. Run migrations before tests
3. Clean up test data after tests
4. Use transactions for isolation when possible

## Mocking

Use mocks for external dependencies:

- Database connections
- External API calls
- File system operations
- Time-dependent operations
