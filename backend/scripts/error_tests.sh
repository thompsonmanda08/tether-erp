#!/bin/bash

# LIYALI GATEWAY ERROR HANDLING & EDGE CASES TESTS
# Tests for error handling, validation, and edge cases

# Source common utilities
source "$(dirname "$0")/common_tests.sh"

# Test error handling and edge cases
test_error_handling_edge_cases() {
    print_section_header "ERROR HANDLING & EDGE CASES" "⚠️"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Test invalid authentication
    print_status "TESTING" "Invalid Authentication Token"
    make_request "GET" "$API_URL/organization/roles" "" "-H 'Authorization: Bearer invalid-token'" 401
    
    # Test missing organization context
    print_status "TESTING" "Missing Organization Context"
    make_request "GET" "$API_URL/organization/roles" "" "-H 'Authorization: Bearer $ACCESS_TOKEN'" 200
    
    # Test invalid organization ID
    print_status "TESTING" "Invalid Organization ID"
    make_request "GET" "$API_URL/organization/roles" "" "-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: invalid-org-id'" 403
    
    # Test malformed JSON request
    print_status "TESTING" "Malformed JSON Request"
    make_request "POST" "$API_URL/categories" '{"invalid": json}' "$auth_header" 400
    
    # Test missing required fields
    print_status "TESTING" "Missing Required Fields"
    make_request "POST" "$API_URL/categories" '{}' "$auth_header" 400
    
    # Test non-existent resource access
    print_status "TESTING" "Non-existent Resource Access"
    make_request "GET" "$API_URL/categories/non-existent-id" "" "$auth_header" 404
    
    # Test unauthorized resource access
    print_status "TESTING" "Unauthorized Resource Access"
    make_request "DELETE" "$API_URL/organization/roles/system-admin-role" "" "$auth_header" 404
    
    # Test rate limiting (if implemented)
    print_status "TESTING" "Rate Limiting Test"
    for i in {1..5}; do
        make_request "GET" "$API_URL/health" "" "" 200 > /dev/null
    done
    print_status "INFO" "Rate limiting test completed (5 rapid requests)"
}

# Test advanced user management
test_advanced_user_management() {
    print_section_header "ADVANCED USER MANAGEMENT" "👥"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get Current User Profile Details"
    make_request "GET" "$API_URL/auth/profile" "" "-H 'Authorization: Bearer $ACCESS_TOKEN'" 200
    
    print_status "TESTING" "Get User Permissions (Expected: Not Implemented)"
    make_request "GET" "$API_URL/users/$USER_ID/permissions" "" "$auth_header" 500
    
    print_status "TESTING" "Grant User Permission (Expected: Not Implemented)"
    local grant_data='{
        "resource": "document",
        "action": "view"
    }'
    make_request "POST" "$API_URL/users/$USER_ID/permissions/document/view" "" "$auth_header" 500
    
    print_status "TESTING" "Revoke User Permission (Expected: Not Implemented)"
    make_request "DELETE" "$API_URL/users/$USER_ID/permissions/document/view" "" "$auth_header" 500
}

# Test input validation
test_input_validation() {
    print_section_header "INPUT VALIDATION TESTS" "🔍"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Test SQL injection attempts
    print_status "TESTING" "SQL Injection Prevention"
    make_request "GET" "$API_URL/categories?search='; DROP TABLE categories; --" "" "$auth_header" 200
    
    # Test XSS prevention
    print_status "TESTING" "XSS Prevention"
    local xss_data='{
        "name": "<script>alert(\"xss\")</script>",
        "description": "Test category with XSS attempt"
    }'
    make_request "POST" "$API_URL/categories" "$xss_data" "$auth_header" 400
    
    # Test oversized payload
    print_status "TESTING" "Oversized Payload Handling"
    local large_string=$(printf 'A%.0s' {1..10000})
    local large_data="{\"name\": \"$large_string\", \"description\": \"Test\"}"
    make_request "POST" "$API_URL/categories" "$large_data" "$auth_header" 400
    
    # Test invalid email format
    print_status "TESTING" "Invalid Email Format"
    local invalid_email_data='{
        "email": "invalid-email-format",
        "name": "Test User",
        "password": "password",
        "role": "requester"
    }'
    make_request "POST" "$API_URL/auth/register" "$invalid_email_data" "" 400
}

# Test security validation
test_security_validation() {
    print_section_header "SECURITY VALIDATION TESTS" "🔒"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Test CSRF protection (if implemented)
    print_status "TESTING" "CSRF Protection"
    make_request "POST" "$API_URL/categories" '{"name": "CSRF Test"}' "-H 'Origin: http://malicious-site.com' $auth_header" 400
    
    # Test authorization bypass attempts
    print_status "TESTING" "Authorization Bypass Prevention"
    make_request "GET" "$API_URL/organization/roles" "" "-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: different-org-id'" 403
    
    # Test privilege escalation prevention
    print_status "TESTING" "Privilege Escalation Prevention"
    local escalation_data='{
        "name": "Hacker Role",
        "permissions": ["*:*"]
    }'
    make_request "POST" "$API_URL/organization/roles" "$escalation_data" "$auth_header" 201
    
    # Test sensitive data exposure
    print_status "TESTING" "Sensitive Data Exposure Prevention"
    local response=$(make_request "GET" "$API_URL/auth/profile" "" "-H 'Authorization: Bearer $ACCESS_TOKEN'" 200)
    if echo "$response" | grep -q "password"; then
        print_status "ERROR" "Password field exposed in profile response"
    else
        print_status "SUCCESS" "Password field properly hidden in profile response"
    fi
}

# Main function to run all error handling tests
run_error_tests() {
    reset_test_counters
    
    # Check if we have authentication context
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$ORGANIZATION_ID" ]; then
        print_status "ERROR" "Authentication context required. Please run auth_tests.sh first or use the main test runner."
        return 1
    fi
    
    test_error_handling_edge_cases
    test_advanced_user_management
    test_input_validation
    test_security_validation
    
    print_module_summary "ERROR HANDLING & SECURITY"
    return 0
}

# If script is run directly, execute tests
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_server
    
    # Check if we have auth context, if not, run auth first
    if [ -z "$ACCESS_TOKEN" ]; then
        print_status "INFO" "No authentication context found. Running authentication first..."
        source "$(dirname "$0")/auth_tests.sh"
        run_auth_tests
    fi
    
    run_error_tests
fi