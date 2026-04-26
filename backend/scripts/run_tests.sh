#!/bin/bash

# LIYALI GATEWAY MODULAR TEST SUITE ORCHESTRATOR
# Main script to run individual test modules with authentication context

# Source common utilities
source "$(dirname "$0")/common_tests.sh"

# Global test counters for overall summary
GLOBAL_TESTS_PASSED=0
GLOBAL_TESTS_FAILED=0
GLOBAL_TOTAL_TESTS=0

# Global test results for summary table
DECLARE_MODULE_NAMES=()
DECLARE_MODULE_PASSED=()
DECLARE_MODULE_FAILED=()
DECLARE_MODULE_TOTAL=()

# Function to accumulate test results
accumulate_results() {
    local name=$1
    DECLARE_MODULE_NAMES+=("$name")
    DECLARE_MODULE_PASSED+=($TESTS_PASSED)
    DECLARE_MODULE_FAILED+=($TESTS_FAILED)
    DECLARE_MODULE_TOTAL+=($TOTAL_TESTS)
    
    GLOBAL_TESTS_PASSED=$((GLOBAL_TESTS_PASSED + TESTS_PASSED))
    GLOBAL_TESTS_FAILED=$((GLOBAL_TESTS_FAILED + TESTS_FAILED))
    GLOBAL_TOTAL_TESTS=$((GLOBAL_TOTAL_TESTS + TOTAL_TESTS))
}

# Function to print overall summary
print_overall_summary() {
    echo ""
    echo "=========================================================================="
    echo "🎯 OVERALL TEST SUITE RESULTS"
    echo "=========================================================================="
    printf "| %-30s | %-8s | %-8s | %-8s | %-6s |\n" "Module Name" "Total" "Passed" "Failed" "Score"
    echo "--------------------------------------------------------------------------"
    
    for i in "${!DECLARE_MODULE_NAMES[@]}"; do
        local name="${DECLARE_MODULE_NAMES[$i]}"
        local total="${DECLARE_MODULE_TOTAL[$i]}"
        local passed="${DECLARE_MODULE_PASSED[$i]}"
        local failed="${DECLARE_MODULE_FAILED[$i]}"
        local score=0
        if [ $total -gt 0 ]; then
            score=$((passed * 100 / total))
        fi
        
        local color=$NC
        if [ $failed -eq 0 ]; then color=$GREEN; elif [ $score -ge 90 ]; then color=$YELLOW; else color=$RED; fi
        
        printf "| %-30s | %-8s | %-8s | %-8s | ${color}%-5s%%${NC} |\n" "$name" "$total" "$passed" "$failed" "$score"
    done
    
    echo "--------------------------------------------------------------------------"
    
    if [ $GLOBAL_TOTAL_TESTS -gt 0 ]; then
        local success_rate=$((GLOBAL_TESTS_PASSED * 100 / GLOBAL_TOTAL_TESTS))
        printf "| %-30s | %-8s | %-8s | %-8s | ${GREEN}%-5s%%${NC} |\n" "AGGREGATED TOTAL" "$GLOBAL_TOTAL_TESTS" "$GLOBAL_TESTS_PASSED" "$GLOBAL_TESTS_FAILED" "$success_rate"
        echo "=========================================================================="
        echo ""
        
        if [ $GLOBAL_TESTS_FAILED -eq 0 ]; then
            echo -e "🎉 ${GREEN}PERFECT SCORE - ALL TESTS PASSED!${NC}"
            echo -e "✅ ${GREEN}System is production ready${NC}"
        elif [ $success_rate -ge 95 ]; then
            echo -e "🟡 ${YELLOW}EXCELLENT - Minor issues detected (expected gaps)${NC}"
            echo -e "✅ ${GREEN}System is ready for production with monitoring${NC}"
        elif [ $success_rate -ge 90 ]; then
            echo -e "🟠 ${YELLOW}GOOD - Some issues need attention${NC}"
            echo -e "⚠️  ${YELLOW}Review failed tests before production deployment${NC}"
        else
            echo -e "🔴 ${RED}CRITICAL ISSUES DETECTED${NC}"
            echo -e "❌ ${RED}System needs fixes before production deployment${NC}"
        fi
    else
        echo -e "⚠️  ${YELLOW}No tests were run${NC}"
    fi
    
    echo ""
    echo "=========================================="
    echo "🔗 Additional Resources:"
    echo "- API coverage analysis: backend/scripts/API_COVERAGE_ANALYSIS.md"
    echo "- API endpoint report: backend/scripts/API_ENDPOINT_TEST_REPORT.md"
    echo "- HTTP test requests: backend/scripts/test_requests.http"
    echo "=========================================="
}

# Function to run authentication and establish context
setup_authentication() {
    print_status "INFO" "Checking for existing authentication context..."
    load_context
    
    if [ ! -z "$ACCESS_TOKEN" ]; then
        print_status "SUCCESS" "Existing authentication context found"
        return 0
    fi

    print_status "INFO" "Setting up new authentication context..."
    
    # Run authentication tests
    source "$(dirname "$0")/auth_tests.sh"
    run_auth_tests
    local auth_result=$?
    accumulate_results "Authentication"
    
    if [ $auth_result -ne 0 ] || [ -z "$ACCESS_TOKEN" ]; then
        print_status "ERROR" "Failed to establish authentication context. Cannot continue with other tests."
        return 1
    fi
    
    save_context
    print_status "SUCCESS" "Authentication context established successfully"
    return 0
}

# Function to run individual test module
run_test_module() {
    local module_name=$1
    local script_name=$2
    
    print_status "INFO" "Running $module_name tests..."
    
    # Source the test module
    source "$(dirname "$0")/$script_name"
    
    # Generate function name based on script name
    local module_function
    if [[ "$script_name" == "workflow_test.sh" ]]; then
        module_function="run_workflow_tests"
    else
        module_function="run_${script_name%_tests.sh}_tests"
    fi
    
    # Check if function exists
    if ! declare -f "$module_function" > /dev/null; then
        print_status "ERROR" "Function $module_function not found in $script_name"
        return 1
    fi
    
    # Call the module's main function
    $module_function
    local result=$?
    accumulate_results "$module_name"
    
    # Save context after module run in case it created new IDs
    save_context
    
    return $result
}

# Function to run all test modules
run_all_tests() {
    echo "=========================================="
    echo "🚀 LIYALI GATEWAY MODULAR TEST SUITE"
    echo "=========================================="
    echo ""
    
    # Check server availability
    check_server
    
    # Setup authentication context
    setup_authentication
    if [ $? -ne 0 ]; then
        print_overall_summary
        exit 1
    fi
    
    # Run all test modules
    run_test_module "RBAC & Multi-Tenant" "rbac_tests.sh"
    run_test_module "Document Management" "document_tests.sh"
    run_test_module "Workflow & Approval" "workflow_test.sh"
    run_test_module "Custom Role Workflows" "custom_role_tests.sh"
    run_test_module "Workflow Unit Tests" "workflow_unit_tests.sh"
    run_test_module "Department Management" "department_tests.sh"
    run_test_module "Analytics & System" "analytics_tests.sh"
    run_test_module "Admin Endpoints" "admin_tests.sh"
    run_test_module "Error Handling & Security" "error_tests.sh"
    
    # Optional: Clear context after full run if desired
    # clear_context
    
    print_overall_summary
}

# Function to run specific test modules
run_specific_tests() {
    local modules=("$@")
    
    echo "=========================================="
    echo "🎯 LIYALI GATEWAY SELECTIVE TEST SUITE"
    echo "=========================================="
    echo ""
    print_status "INFO" "Running selected test modules: ${modules[*]}"
    print_status "INFO" "Base URL: $BASE_URL"
    print_status "INFO" "API URL: $API_URL"
    echo ""
    
    # Check server availability
    check_server
    
    # Setup authentication context
    setup_authentication
    if [ $? -ne 0 ]; then
        print_overall_summary
        exit 1
    fi
    
    # Run selected modules
    for module in "${modules[@]}"; do
        case $module in
            "auth"|"authentication")
                print_status "INFO" "Authentication tests already completed during setup"
                ;;
            "rbac"|"roles"|"permissions")
                run_test_module "RBAC & Multi-Tenant" "rbac_tests.sh"
                ;;
            "documents"|"document"|"crud")
                run_test_module "Document Management" "document_tests.sh"
                ;;
            "workflows"|"workflow"|"approvals")
                run_test_module "Workflow & Approval" "workflow_test.sh"
                ;;
            "custom-roles"|"custom_roles"|"roles")
                run_test_module "Custom Role Workflows" "custom_role_tests.sh"
                ;;
            "unit"|"unit-tests"|"go-tests")
                run_test_module "Workflow Unit Tests" "workflow_unit_tests.sh"
                ;;
            "departments"|"department")
                run_test_module "Department Management" "department_tests.sh"
                ;;
            "analytics"|"notifications"|"system")
                run_test_module "Analytics & System" "analytics_tests.sh"
                ;;
            "admin"|"admin-endpoints")
                run_test_module "Admin Endpoints" "admin_tests.sh"
                ;;
            "errors"|"security"|"validation")
                run_test_module "Error Handling & Security" "error_tests.sh"
                ;;
            *)
                print_status "WARNING" "Unknown test module: $module"
                ;;
        esac
    done
    
    # Logout cleanup
    print_status "INFO" "Cleaning up authentication session..."
    source "$(dirname "$0")/auth_tests.sh"
    test_logout
    
    print_overall_summary
}

# Function to show help
show_help() {
    echo "Liyali Gateway Modular Test Suite"
    echo ""
    echo "Usage: $0 [options] [modules...]"
    echo ""
    echo "Options:"
    echo "  (no options)     Run all test modules"
    echo "  --help           Show this help message"
    echo "  --list           List available test modules"
    echo ""
    echo "Available Test Modules:"
    echo "  auth             Authentication and session management"
    echo "  rbac             Role-based access control and multi-tenant operations"
    echo "  documents        Document management (categories, vendors, requisitions, etc.)"
    echo "  workflows        Workflow and approval system"
    echo "  custom-roles     Custom organization role workflow tests"
    echo "  unit             Go unit tests and integration tests"
    echo "  departments      Department management and user assignments"
    echo "  analytics        Analytics, notifications, and system operations"
    echo "  admin            Admin endpoints (dashboard, subscriptions, settings, feature flags)"
    echo "  errors           Error handling, validation, and security tests"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all tests"
    echo "  $0 auth rbac                 # Run only authentication and RBAC tests"
    echo "  $0 documents workflows       # Run only document and workflow tests"
    echo "  $0 custom-roles unit         # Run only custom role and unit tests"
    echo "  $0 analytics admin           # Run only analytics and admin endpoint tests"
    echo ""
    echo "Individual Test Scripts:"
    echo "  You can also run individual test scripts directly:"
    echo "  ./auth_tests.sh              # Authentication tests only"
    echo "  ./rbac_tests.sh              # RBAC tests only (requires auth context)"
    echo "  ./document_tests.sh          # Document tests only (requires auth context)"
    echo "  ./workflow_test.sh           # Workflow tests only (requires auth context)"
    echo "  ./custom_role_tests.sh       # Custom role tests only (requires auth context)"
    echo "  ./workflow_unit_tests.sh     # Workflow unit tests only"
    echo "  ./department_tests.sh        # Department tests only (requires auth context)"
    echo "  ./analytics_tests.sh         # Analytics tests only (requires auth context)"
    echo "  ./admin_tests.sh             # Admin endpoint tests only (requires admin auth)"
    echo "  ./error_tests.sh             # Error handling tests only (requires auth context)"
    echo ""
}

# Function to list available modules
list_modules() {
    echo "Available Test Modules:"
    echo ""
    echo "🔐 auth          - Authentication and session management"
    echo "🏢 rbac          - Role-based access control and multi-tenant operations"
    echo "📄 documents     - Document management (categories, vendors, requisitions, etc.)"
    echo "🔄 workflows     - Workflow and approval system"
    echo "👥 custom-roles  - Custom organization role workflow tests"
    echo "🧪 unit          - Go unit tests and integration tests"
    echo "🏢 departments   - Department management and user assignments"
    echo "📊 analytics     - Analytics, notifications, and system operations"
    echo "🔧 admin         - Admin endpoints (dashboard, subscriptions, settings, feature flags)"
    echo "⚠️  errors       - Error handling, validation, and security tests"
    echo ""
    echo "Use: $0 [module1] [module2] ... to run specific modules"
    echo "Use: $0 to run all modules"
}

# Main execution logic
main() {
    # Handle command line arguments
    case "${1:-}" in
        --help|-h)
            show_help
            ;;
        --list|-l)
            list_modules
            ;;
        "")
            # No arguments - run all tests
            run_all_tests
            ;;
        *)
            # Specific modules provided
            run_specific_tests "$@"
            ;;
    esac
}

# Execute main function with all arguments
main "$@"