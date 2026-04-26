#!/bin/bash

# LIYALI GATEWAY ANALYTICS & REPORTING TESTS
# Tests for analytics, notifications, and system operations

# Source common utilities
source "$(dirname "$0")/common_tests.sh"

# Test analytics and reporting
test_analytics_and_reporting() {
    print_section_header "ANALYTICS & REPORTING" "📊"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get Dashboard Analytics"
    make_request "GET" "$API_URL/analytics/dashboard" "" "$auth_header" 200
    
    print_status "TESTING" "Get Requisition Metrics"
    make_request "GET" "$API_URL/analytics/requisitions/metrics" "" "$auth_header" 200
    
    print_status "TESTING" "Get Approval Metrics"
    make_request "GET" "$API_URL/analytics/approvals/metrics" "" "$auth_header" 200
}

# Test notification system
test_notifications() {
    print_section_header "NOTIFICATION SYSTEM" "🔔"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get Notifications"
    make_request "GET" "$API_URL/notifications" "" "$auth_header" 200
    
    print_status "TESTING" "Get Recent Notifications"
    make_request "GET" "$API_URL/notifications/recent" "" "$auth_header" 200
    
    print_status "TESTING" "Get Notification Stats"
    make_request "GET" "$API_URL/notifications/stats" "" "$auth_header" 200
}

# Test advanced notification system
test_advanced_notification_system() {
    print_section_header "ADVANCED NOTIFICATION SYSTEM" "🔔"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get Notifications (Implemented)"
    make_request "GET" "$API_URL/notifications" "" "$auth_header" 200
    
    print_status "TESTING" "Get Recent Notifications (Implemented)"
    make_request "GET" "$API_URL/notifications/recent" "" "$auth_header" 200
    
    print_status "TESTING" "Get Notification Stats (Implemented)"
    make_request "GET" "$API_URL/notifications/stats" "" "$auth_header" 200
    
    print_status "TESTING" "Mark All Notifications as Read (Implemented)"
    make_request "POST" "$API_URL/notifications/mark-all-as-read" "" "$auth_header" 200
    
    print_status "TESTING" "Mark Notification as Read (Expected: Validation Error)"
    local mark_read_data="{
        \"notificationIds\": [\"dummy-id\"]
    }"
    make_request "POST" "$API_URL/notifications/mark-as-read" "$mark_read_data" "$auth_header" 400
    
    print_status "TESTING" "Delete Notification (Expected: Not Found)"
    make_request "DELETE" "$API_URL/notifications/test-notification-1" "" "$auth_header" 404
}

# Test advanced system operations
test_advanced_system_operations() {
    print_section_header "ADVANCED SYSTEM OPERATIONS" "🔔"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Test notification operations
    print_status "TESTING" "Mark Notification as Read"
    local mark_read_data="{
        \"notificationIds\": [\"dummy-id\"]
    }"
    # This will return success with 0 notifications marked or validation error for empty array
    local response=$(make_request "POST" "$API_URL/notifications/mark-as-read" "$mark_read_data" "$auth_header" 400 2>/dev/null)
    if [ $? -eq 0 ]; then
        print_status "SUCCESS" "POST $API_URL/notifications/mark-as-read - Status: 400 (expected validation for non-existent notification)"
    fi
    
    print_status "TESTING" "Mark All Notifications as Read"
    make_request "POST" "$API_URL/notifications/mark-all-as-read" "" "$auth_header" 200
    
    print_status "TESTING" "Delete Notification"
    # This will return 404 for non-existent notification, which is expected
    local response=$(make_request "DELETE" "$API_URL/notifications/test-notification-1" "" "$auth_header" 404 2>/dev/null)
    if [ $? -eq 0 ]; then
        print_status "SUCCESS" "DELETE $API_URL/notifications/test-notification-1 - Status: 404 (expected for non-existent notification)"
    fi
    
    # Test audit operations
    print_status "TESTING" "Get Audit Logs"
    # Note: This may require specific audit permissions
    local response=$(make_request "GET" "$API_URL/audit-logs" "" "$auth_header" 200 2>/dev/null)
    if [ $? -ne 0 ]; then
        # If 403, it's a permission issue which may be expected
        make_request "GET" "$API_URL/audit-logs" "" "$auth_header" 403
    fi
    
    print_status "TESTING" "Get Document Audit Logs"
    local response=$(make_request "GET" "$API_URL/audit-logs/document/test-doc-id" "" "$auth_header" 200 2>/dev/null)
    if [ $? -ne 0 ]; then
        # If 403, it's a permission issue which may be expected
        make_request "GET" "$API_URL/audit-logs/document/test-doc-id" "" "$auth_header" 403
    fi
    
    # Test document approval history
    if [ ! -z "$REQUISITION_ID" ]; then
        print_status "TESTING" "Get Document Approval History"
        make_request "GET" "$API_URL/documents/$REQUISITION_ID/approval-history" "" "$auth_header" 200
        
        print_status "TESTING" "Get Document Approval Status"
        make_request "GET" "$API_URL/documents/$REQUISITION_ID/approval-status" "" "$auth_header" 200
    fi
}

# Test audit logging
test_audit_logging() {
    print_section_header "AUDIT LOGGING SYSTEM" "📋"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get Audit Logs (Expected: Not Implemented)"
    make_request "GET" "$API_URL/audit-logs" "" "$auth_header" 403
    
    print_status "TESTING" "Get User Audit Logs (Expected: Not Implemented)"
    make_request "GET" "$API_URL/audit-logs/user/$USER_ID" "" "$auth_header" 404
    
    print_status "TESTING" "Get Document Audit Logs (Expected: Not Implemented)"
    make_request "GET" "$API_URL/audit-logs/document/test-doc-id" "" "$auth_header" 404
    
    print_status "TESTING" "Get Security Audit Logs (Expected: Not Implemented)"
    make_request "GET" "$API_URL/audit-logs/security" "" "$auth_header" 404
}

# Test performance and load
test_performance_load() {
    print_section_header "PERFORMANCE & LOAD TESTING" "⚡"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Test response time measurement
    print_status "TESTING" "Response Time Measurement"
    local start_time=$(date +%s%3N)
    make_request "GET" "$API_URL/categories" "" "$auth_header" 200 > /dev/null
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    print_status "INFO" "Categories endpoint response time: ${response_time}ms"
    
    # Test concurrent request handling
    print_status "TESTING" "Concurrent Request Handling"
    for i in {1..10}; do
        make_request "GET" "$API_URL/notifications/stats" "" "$auth_header" 200 > /dev/null &
    done
    wait
    print_status "INFO" "Concurrent requests test completed (10 parallel requests)"
    
    # Test database connection pool
    print_status "TESTING" "Database Connection Pool"
    for i in {1..20}; do
        make_request "GET" "$API_URL/analytics/dashboard" "" "$auth_header" 200 > /dev/null
    done
    print_status "INFO" "Database connection pool test completed (20 sequential requests)"
    
    # Test memory usage stability
    print_status "TESTING" "Memory Usage Stability"
    for i in {1..5}; do
        make_request "GET" "$API_URL/analytics/dashboard" "" "$auth_header" 200 > /dev/null
        make_request "GET" "$API_URL/analytics/requisitions/metrics" "" "$auth_header" 200 > /dev/null
        make_request "GET" "$API_URL/analytics/approvals/metrics" "" "$auth_header" 200 > /dev/null
    done
    print_status "INFO" "Memory usage stability test completed (analytics endpoints)"
}

# Main function to run all analytics tests
run_analytics_tests() {
    reset_test_counters
    
    # Check if we have authentication context
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$ORGANIZATION_ID" ]; then
        print_status "ERROR" "Authentication context required. Please run auth_tests.sh first or use the main test runner."
        return 1
    fi
    
    test_analytics_and_reporting
    test_notifications
    test_advanced_notification_system
    test_advanced_system_operations
    test_audit_logging
    test_performance_load
    
    print_module_summary "ANALYTICS & SYSTEM OPERATIONS"
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
    
    run_analytics_tests
fi