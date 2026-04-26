#!/bin/bash

# Admin API Endpoint Tests
# Tests all admin-only endpoints for the Liyali Gateway API
# Requires: Backend server running on http://localhost:8081

# Source common utilities if available
if [ -f "$(dirname "$0")/common_tests.sh" ]; then
    source "$(dirname "$0")/common_tests.sh"
fi

BASE_URL="${BASE_URL:-http://localhost:8081}"
API_URL="${API_URL:-$BASE_URL/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@liyali.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-password}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -a FAILED_TEST_NAMES

# Function to print test result
print_result() {
    local test_name=$1
    local status_code=$2
    local expected_code=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓${NC} $test_name (HTTP $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $test_name (Expected HTTP $expected_code, got $status_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name")
    fi
}

# Function to make authenticated request
auth_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            "$API_URL$endpoint"
    else
        curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint"
    fi
}

# Main function to run all admin tests
run_admin_tests() {
    if [ -n "$TESTS_PASSED" ]; then
        # Running as part of modular suite - reset counters
        TOTAL_TESTS=0
        PASSED_TESTS=0
        FAILED_TESTS=0
        FAILED_TEST_NAMES=()
    fi
    
    echo "========================================="
    echo "Admin API Endpoint Tests"
    echo "========================================="
    echo ""

    # Step 1: Admin Login
    echo "Step 1: Admin Authentication"
    echo "----------------------------"

    LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
        "$API_URL/auth/login")

    LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n 1)
    LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

    if [ "$LOGIN_STATUS" -eq 200 ]; then
        ADMIN_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        if [ -z "$ADMIN_TOKEN" ]; then
            ADMIN_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        fi
        echo -e "${GREEN}✓${NC} Admin login successful"
        echo "Admin Token: ${ADMIN_TOKEN:0:20}..."
    else
        echo -e "${RED}✗${NC} Admin login failed (HTTP $LOGIN_STATUS)"
        echo "Response: $LOGIN_BODY"
        return 1
    fi

    echo ""

# Step 2: Admin Dashboard & Analytics
echo "Step 2: Admin Dashboard & Analytics"
echo "------------------------------------"

RESPONSE=$(auth_request "GET" "/admin/dashboard")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/dashboard" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/analytics")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/analytics" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/analytics/overview")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/analytics/overview" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/analytics/users")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/analytics/users" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/analytics/organizations")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/analytics/organizations" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/analytics/revenue")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/analytics/revenue" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/analytics/usage")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/analytics/usage" "$STATUS" 200

echo ""

# Step 3: System Health & Monitoring
echo "Step 3: System Health & Monitoring"
echo "-----------------------------------"

RESPONSE=$(auth_request "GET" "/admin/system/health")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/system/health" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/system/metrics")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/system/metrics" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/system/alerts")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/system/alerts" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/system/alerts?severity=high")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/system/alerts?severity=high" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/system/logs")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/system/logs" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/system/logs?level=error")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/system/logs?level=error" "$STATUS" 200

echo ""

# Step 4: Subscription Management
echo "Step 4: Subscription Management"
echo "--------------------------------"

RESPONSE=$(auth_request "GET" "/admin/subscriptions/statistics")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/subscriptions/statistics" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/subscriptions/tiers")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')
print_result "GET /admin/subscriptions/tiers" "$STATUS" 200

# Get first tier ID for subsequent tests
TIER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$TIER_ID" ]; then
    RESPONSE=$(auth_request "GET" "/admin/subscriptions/tiers/$TIER_ID")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "GET /admin/subscriptions/tiers/:id" "$STATUS" 200
fi

RESPONSE=$(auth_request "GET" "/admin/subscriptions/features")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/subscriptions/features" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/subscriptions/trials")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/subscriptions/trials" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/subscriptions/analytics")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/subscriptions/analytics" "$STATUS" 200

echo ""

# Step 5: Settings Management
echo "Step 5: Settings Management"
echo "---------------------------"

RESPONSE=$(auth_request "GET" "/admin/settings")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/settings" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/settings/stats")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/settings/stats" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/settings/health")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/settings/health" "$STATUS" 200

RESPONSE=$(auth_request "GET" "/admin/environment-variables")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/environment-variables" "$STATUS" 200

echo ""

# Step 6: Feature Flags Management
echo "Step 6: Feature Flags Management"
echo "---------------------------------"

RESPONSE=$(auth_request "GET" "/admin/feature-flags")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')
print_result "GET /admin/feature-flags" "$STATUS" 200

# Get first flag ID for subsequent tests
FLAG_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$FLAG_ID" ]; then
    RESPONSE=$(auth_request "GET" "/admin/feature-flags/$FLAG_ID")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "GET /admin/feature-flags/:id" "$STATUS" 200
fi

RESPONSE=$(auth_request "GET" "/admin/feature-flags/stats")
STATUS=$(echo "$RESPONSE" | tail -n 1)
print_result "GET /admin/feature-flags/stats" "$STATUS" 200

echo ""

# Step 7: Create/Update/Delete Tests
echo "Step 7: Create/Update/Delete Operations"
echo "----------------------------------------"

# Create subscription tier
CREATE_TIER_DATA='{
  "name": "test_tier",
  "display_name": "Test Tier",
  "description": "Test tier for API testing",
  "price_monthly": 99.99,
  "price_yearly": 999.99,
  "max_users": 50,
  "storage_limit_gb": 100,
  "features": ["test_feature_1", "test_feature_2"],
  "is_active": true,
  "sort_order": 99
}'

RESPONSE=$(auth_request "POST" "/admin/subscriptions/tiers" "$CREATE_TIER_DATA")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')
print_result "POST /admin/subscriptions/tiers" "$STATUS" 200

# Get created tier ID
CREATED_TIER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$CREATED_TIER_ID" ]; then
    # Update tier
    UPDATE_TIER_DATA='{
      "display_name": "Updated Test Tier",
      "price_monthly": 149.99
    }'
    
    RESPONSE=$(auth_request "PUT" "/admin/subscriptions/tiers/$CREATED_TIER_ID" "$UPDATE_TIER_DATA")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "PUT /admin/subscriptions/tiers/:id" "$STATUS" 200
    
    # Delete tier
    RESPONSE=$(auth_request "DELETE" "/admin/subscriptions/tiers/$CREATED_TIER_ID")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "DELETE /admin/subscriptions/tiers/:id" "$STATUS" 200
fi

# Create subscription feature
CREATE_FEATURE_DATA='{
  "name": "test_feature",
  "display_name": "Test Feature",
  "description": "Test feature for API testing",
  "category": "testing",
  "is_active": true
}'

RESPONSE=$(auth_request "POST" "/admin/subscriptions/features" "$CREATE_FEATURE_DATA")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')
print_result "POST /admin/subscriptions/features" "$STATUS" 200

# Get created feature ID
CREATED_FEATURE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$CREATED_FEATURE_ID" ]; then
    # Update feature
    UPDATE_FEATURE_DATA='{
      "display_name": "Updated Test Feature"
    }'
    
    RESPONSE=$(auth_request "PUT" "/admin/subscriptions/features/$CREATED_FEATURE_ID" "$UPDATE_FEATURE_DATA")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "PUT /admin/subscriptions/features/:id" "$STATUS" 200
    
    # Delete feature
    RESPONSE=$(auth_request "DELETE" "/admin/subscriptions/features/$CREATED_FEATURE_ID")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "DELETE /admin/subscriptions/features/:id" "$STATUS" 200
fi

# Create system setting
CREATE_SETTING_DATA='{
  "key": "test_setting",
  "value": "test_value",
  "type": "string",
  "category": "testing",
  "description": "Test setting for API testing",
  "is_required": false,
  "is_secret": false
}'

RESPONSE=$(auth_request "POST" "/admin/settings" "$CREATE_SETTING_DATA")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')
print_result "POST /admin/settings" "$STATUS" 200

# Get created setting ID
CREATED_SETTING_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$CREATED_SETTING_ID" ]; then
    # Get setting
    RESPONSE=$(auth_request "GET" "/admin/settings/$CREATED_SETTING_ID")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "GET /admin/settings/:id" "$STATUS" 200
    
    # Update setting
    UPDATE_SETTING_DATA='{
      "value": "updated_test_value"
    }'
    
    RESPONSE=$(auth_request "PUT" "/admin/settings/$CREATED_SETTING_ID" "$UPDATE_SETTING_DATA")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "PUT /admin/settings/:id" "$STATUS" 200
    
    # Delete setting
    RESPONSE=$(auth_request "DELETE" "/admin/settings/$CREATED_SETTING_ID")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "DELETE /admin/settings/:id" "$STATUS" 200
fi

# Create feature flag
CREATE_FLAG_DATA='{
  "key": "test_flag",
  "name": "Test Flag",
  "description": "Test flag for API testing",
  "type": "boolean",
  "default_value": "false",
  "enabled": true,
  "environment": "all",
  "category": "testing"
}'

RESPONSE=$(auth_request "POST" "/admin/feature-flags" "$CREATE_FLAG_DATA")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')
print_result "POST /admin/feature-flags" "$STATUS" 200

# Get created flag ID
CREATED_FLAG_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$CREATED_FLAG_ID" ]; then
    # Get flag
    RESPONSE=$(auth_request "GET" "/admin/feature-flags/$CREATED_FLAG_ID")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "GET /admin/feature-flags/:id" "$STATUS" 200
    
    # Update flag
    UPDATE_FLAG_DATA='{
      "name": "Updated Test Flag"
    }'
    
    RESPONSE=$(auth_request "PUT" "/admin/feature-flags/$CREATED_FLAG_ID" "$UPDATE_FLAG_DATA")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "PUT /admin/feature-flags/:id" "$STATUS" 200
    
    # Toggle flag
    RESPONSE=$(auth_request "POST" "/admin/feature-flags/$CREATED_FLAG_ID/toggle")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "POST /admin/feature-flags/:id/toggle" "$STATUS" 200
    
    # Archive flag
    RESPONSE=$(auth_request "POST" "/admin/feature-flags/$CREATED_FLAG_ID/archive")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "POST /admin/feature-flags/:id/archive" "$STATUS" 200
    
    # Delete flag
    RESPONSE=$(auth_request "DELETE" "/admin/feature-flags/$CREATED_FLAG_ID")
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    print_result "DELETE /admin/feature-flags/:id" "$STATUS" 200
fi

echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    echo "Failed Tests:"
    for test in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "  ${RED}✗${NC} $test"
    done
fi

echo ""

# Calculate success rate
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo "Success Rate: $SUCCESS_RATE%"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    return 0
else
    echo -e "${RED}Some tests failed.${NC}"
    return 1
fi
}

# If script is run directly, execute tests
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_admin_tests
    exit $?
fi
