#!/bin/bash

# LIYALI GATEWAY TEST COMMON UTILITIES
# Shared functions and configurations for all test modules

# Configuration
BASE_URL="http://localhost:8081"
API_URL="$BASE_URL/api/v1"
TEST_EMAIL="admin@liyali.com"
TEST_PASSWORD="password"
TEST_NAME="System Administrator"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables (allows overriding from environment or context file)
: ${ACCESS_TOKEN:=""}
: ${REFRESH_TOKEN:=""}
: ${ORGANIZATION_ID:=""}
: ${USER_ID:=""}
: ${VENDOR_ID:=""}
: ${WORKFLOW_ID:=""}
: ${REQUISITION_ID:=""}
: ${BUDGET_ID:=""}
: ${CATEGORY_ID:=""}
: ${ROLE_ID:=""}
: ${TEST_ORG_ID:=""}
: ${DEPARTMENT_ID:=""}

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ SUCCESS:${NC} $message"
            # Only increment if this is a test result (contains "Status:")
            if [[ "$message" == *"Status:"* ]]; then
                ((TESTS_PASSED++))
                ((TOTAL_TESTS++))
            fi
            ;;
        "ERROR")
            echo -e "${RED}❌ ERROR:${NC} $message"
            # Only increment if this is a test result (contains "Expected:")
            if [[ "$message" == *"Expected:"* ]]; then
                ((TESTS_FAILED++))
                ((TOTAL_TESTS++))
            fi
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO:${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING:${NC} $message"
            ;;
        "TESTING")
            echo -e "${YELLOW}🧪 TESTING:${NC} $message"
            ;;
    esac
}

# Function to make HTTP requests
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    local expected_status=${5:-200}
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ ! -z "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local response=$(eval $curl_cmd)
    
    # Extract status code (last 3 chars) and body (everything before)
    local status_code=$(echo "$response" | grep -o '[0-9]\{3\}$')
    local body=$(echo "$response" | sed 's/[0-9]\{3\}$//')
    
    # Handle cases where status code might be empty
    if [ -z "$status_code" ]; then
        status_code=0
    fi
    
    if [ "$status_code" -eq "$expected_status" ]; then
        print_status "SUCCESS" "$method $url - Status: $status_code"
        echo "$body"
        return 0
    else
        print_status "ERROR" "$method $url - Expected: $expected_status, Got: $status_code"
        echo "Response: $body"
        return 1
    fi
}

# Extract JSON values with improved debugging
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# Enhanced ID extraction with multiple methods
extract_id_from_response() {
    local response=$1
    local entity_name=$2
    
    # Method 1: Standard grep approach
    local id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    # Method 2: Alternative sed approach
    if [ -z "$id" ]; then
        id=$(echo "$response" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
    fi
    
    # Method 3: Try with data wrapper
    if [ -z "$id" ]; then
        id=$(echo "$response" | grep -o '"data":{[^}]*"id":"[^"]*"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    fi
    
    # Method 4: Try jq-like parsing (manual)
    if [ -z "$id" ]; then
        id=$(echo "$response" | grep -o '{"id":"[^"]*"' | cut -d'"' -f4)
    fi
    
    if [ ! -z "$id" ]; then
        print_status "INFO" "$entity_name created with ID: $id" >&2
        echo "$id"
    else
        print_status "WARNING" "Failed to extract ID for $entity_name from response: ${response:0:200}..." >&2
        echo ""
    fi
}

# Check if server is running
check_server() {
    print_status "INFO" "Checking if server is running..."
    if curl -s "$BASE_URL/health" > /dev/null; then
        print_status "SUCCESS" "Server is running at $BASE_URL"
        return 0
    else
        print_status "ERROR" "Server is not running at $BASE_URL"
        print_status "INFO" "Please start the backend server with: cd backend && go run main.go"
        exit 1
    fi
}

# Print test section header
print_section_header() {
    local title=$1
    local icon=$2
    echo ""
    echo "=========================================="
    echo "$icon $title"
    echo "=========================================="
}

# Print final summary for a test module
print_module_summary() {
    local module_name=$1
    echo ""
    echo "=========================================="
    echo "📊 $module_name TEST RESULTS"
    echo "=========================================="
    echo ""
    echo -e "Total Tests Run: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        local success_rate=$((TESTS_PASSED * 100 / TOTAL_TESTS))
        echo -e "Success Rate: ${GREEN}$success_rate%${NC}"
        echo ""
        
        if [ $TESTS_FAILED -eq 0 ]; then
            echo -e "🎉 ${GREEN}ALL TESTS PASSED!${NC}"
        elif [ $success_rate -ge 95 ]; then
            echo -e "🟡 ${YELLOW}EXCELLENT - Minor issues detected${NC}"
        elif [ $success_rate -ge 90 ]; then
            echo -e "🟠 ${YELLOW}GOOD - Some issues need attention${NC}"
        else
            echo -e "🔴 ${RED}CRITICAL ISSUES DETECTED${NC}"
        fi
    else
        echo -e "⚠️  ${YELLOW}No tests were run${NC}"
    fi
    echo ""
}

# Reset test counters for new module
reset_test_counters() {
    TESTS_PASSED=0
    TESTS_FAILED=0
    TOTAL_TESTS=0
}

# Function to export authentication context to environment
export_auth_context() {
    export ACCESS_TOKEN REFRESH_TOKEN ORGANIZATION_ID USER_ID
    export VENDOR_ID WORKFLOW_ID REQUISITION_ID BUDGET_ID CATEGORY_ID ROLE_ID TEST_ORG_ID DEPARTMENT_ID
}

# Path for persistent context storage
CONTEXT_FILE="$HOME/.liyali_test_context"

# Function to save context to a file
save_context() {
    cat > "$CONTEXT_FILE" << EOF
ACCESS_TOKEN="$ACCESS_TOKEN"
REFRESH_TOKEN="$REFRESH_TOKEN"
ORGANIZATION_ID="$ORGANIZATION_ID"
USER_ID="$USER_ID"
VENDOR_ID="$VENDOR_ID"
WORKFLOW_ID="$WORKFLOW_ID"
REQUISITION_ID="$REQUISITION_ID"
BUDGET_ID="$BUDGET_ID"
CATEGORY_ID="$CATEGORY_ID"
ROLE_ID="$ROLE_ID"
TEST_ORG_ID="$TEST_ORG_ID"
DEPARTMENT_ID="$DEPARTMENT_ID"
EOF
    chmod 600 "$CONTEXT_FILE"
}

# Function to load context from a file
load_context() {
    if [ -f "$CONTEXT_FILE" ]; then
        source "$CONTEXT_FILE"
        export_auth_context
    fi
}

# Automatically load context if it exists
load_context

# Function to clear context
clear_context() {
    rm -f "$CONTEXT_FILE"
}

export TESTS_PASSED TESTS_FAILED TOTAL_TESTS