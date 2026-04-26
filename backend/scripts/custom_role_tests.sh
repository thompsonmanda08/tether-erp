#!/bin/bash

# LIYALI GATEWAY CUSTOM ROLE WORKFLOW TESTS
# Tests for custom organization roles in workflow approval/rejection processes

# Source common utilities
source "$(dirname "$0")/common_tests.sh"

# Test custom role workflow creation and validation
test_custom_role_workflow_creation() {
    print_section_header "CUSTOM ROLE WORKFLOW CREATION" "👥"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Create Workflow with Custom Roles"
    local timestamp=$(date +%s)
    local custom_role_workflow="{
        \"name\": \"Custom Role Procurement Workflow $timestamp\",
        \"entityType\": \"requisition\",
        \"description\": \"Workflow using custom organization roles for approval\",
        \"stages\": [
            {
                \"stageNumber\": 1,
                \"stageName\": \"Procurement Specialist Review\",
                \"requiredRole\": \"procurement_specialist\",
                \"requiredApprovals\": 1,
                \"canReject\": true,
                \"canReassign\": true,
                \"timeoutHours\": 24
            },
            {
                \"stageNumber\": 2,
                \"stageName\": \"Department Head Approval\",
                \"requiredRole\": \"department_head_procurement\",
                \"requiredApprovals\": 1,
                \"canReject\": true,
                \"canReassign\": true,
                \"timeoutHours\": 48
            },
            {
                \"stageNumber\": 3,
                \"stageName\": \"Finance Controller Review\",
                \"requiredRole\": \"finance_controller\",
                \"requiredApprovals\": 1,
                \"canReject\": true,
                \"canReassign\": false,
                \"timeoutHours\": 72
            }
        ]
    }"
    
    local response=$(make_request "POST" "$API_URL/workflows" "$custom_role_workflow" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        # Extract workflow ID for later tests
        CUSTOM_ROLE_WORKFLOW_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)
        print_status "INFO" "Created custom role workflow with ID: $CUSTOM_ROLE_WORKFLOW_ID"
    fi
    
    print_status "TESTING" "Validate Custom Role Workflow Structure"
    if [ ! -z "$CUSTOM_ROLE_WORKFLOW_ID" ]; then
        make_request "GET" "$API_URL/workflows/$CUSTOM_ROLE_WORKFLOW_ID" "" "$auth_header" 200
    fi
}

# Test custom role validation in workflow operations
test_custom_role_validation() {
    print_section_header "CUSTOM ROLE VALIDATION" "🔐"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Create Workflow with Invalid Custom Role"
    local invalid_role_workflow="{
        \"name\": \"Invalid Custom Role Workflow\",
        \"entityType\": \"requisition\",
        \"description\": \"Workflow with non-existent custom role\",
        \"stages\": [
            {
                \"stageNumber\": 1,
                \"stageName\": \"Invalid Role Review\",
                \"requiredRole\": \"non_existent_custom_role\",
                \"requiredApprovals\": 1,
                \"canReject\": true,
                \"timeoutHours\": 24
            }
        ]
    }"
    
    # This should succeed in creation but may fail during execution
    make_request "POST" "$API_URL/workflows" "$invalid_role_workflow" "$auth_header" 201
    
    print_status "TESTING" "Validate Workflow with Mixed Role Types"
    local mixed_role_workflow="{
        \"name\": \"Mixed Role Type Workflow\",
        \"entityType\": \"budget\",
        \"description\": \"Workflow mixing standard and custom roles\",
        \"stages\": [
            {
                \"stageNumber\": 1,
                \"stageName\": \"Standard Manager Review\",
                \"requiredRole\": \"manager\",
                \"requiredApprovals\": 1,
                \"canReject\": true,
                \"timeoutHours\": 24
            },
            {
                \"stageNumber\": 2,
                \"stageName\": \"Custom Finance Controller Review\",
                \"requiredRole\": \"finance_controller\",
                \"requiredApprovals\": 1,
                \"canReject\": true,
                \"timeoutHours\": 48
            }
        ]
    }"
    
    make_request "POST" "$API_URL/workflows" "$mixed_role_workflow" "$auth_header" 201
}

# Test custom role workflow execution scenarios
test_custom_role_workflow_execution() {
    print_section_header "CUSTOM ROLE WORKFLOW EXECUTION" "⚡"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Test workflow task assignment with custom roles
    print_status "TESTING" "Get Workflow Tasks for Custom Roles"
    make_request "GET" "$API_URL/tasks/my-tasks" "" "$auth_header" 200
    
    print_status "TESTING" "Get Available Approvers for Custom Role Workflow"
    if [ ! -z "$CUSTOM_ROLE_WORKFLOW_ID" ]; then
        make_request "GET" "$API_URL/approvals/available-approvers?workflowId=$CUSTOM_ROLE_WORKFLOW_ID" "" "$auth_header" 200
    fi
    
    # Test custom role permission validation
    print_status "TESTING" "Validate Custom Role Permissions"
    local permission_check="{
        \"role\": \"procurement_specialist\",
        \"action\": \"approve_requisitions\",
        \"entityType\": \"requisition\"
    }"
    
    # This endpoint may not exist yet, but documents expected behavior
    make_request "POST" "$API_URL/roles/validate-permission" "$permission_check" "$auth_header" 404
}

# Test custom role edge cases and error handling
test_custom_role_edge_cases() {
    print_section_header "CUSTOM ROLE EDGE CASES" "⚠️"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Workflow with Empty Custom Role"
    local empty_role_workflow="{
        \"name\": \"Empty Role Workflow\",
        \"entityType\": \"requisition\",
        \"stages\": [
            {
                \"stageNumber\": 1,
                \"stageName\": \"Empty Role Review\",
                \"requiredRole\": \"\",
                \"requiredApprovals\": 1
            }
        ]
    }"
    
    # Should fail validation
    make_request "POST" "$API_URL/workflows" "$empty_role_workflow" "$auth_header" 400
    
    print_status "TESTING" "Workflow with Special Characters in Role Name"
    local special_char_workflow="{
        \"name\": \"Special Character Role Workflow\",
        \"entityType\": \"requisition\",
        \"stages\": [
            {
                \"stageNumber\": 1,
                \"stageName\": \"Special Role Review\",
                \"requiredRole\": \"procurement-specialist@level.3\",
                \"requiredApprovals\": 1
            }
        ]
    }"
    
    make_request "POST" "$API_URL/workflows" "$special_char_workflow" "$auth_header" 201
    
    print_status "TESTING" "Workflow with Very Long Custom Role Name"
    local long_role_name="very_long_custom_role_name_that_exceeds_normal_length_limits_and_tests_database_constraints_procurement_specialist_senior_level_department_head"
    local long_role_workflow="{
        \"name\": \"Long Role Name Workflow\",
        \"entityType\": \"requisition\",
        \"stages\": [
            {
                \"stageNumber\": 1,
                \"stageName\": \"Long Role Review\",
                \"requiredRole\": \"$long_role_name\",
                \"requiredApprovals\": 1
            }
        ]
    }"
    
    # May succeed or fail depending on database constraints
    make_request "POST" "$API_URL/workflows" "$long_role_workflow" "$auth_header" 201
}

# Test custom role approval/rejection scenarios
test_custom_role_approval_rejection() {
    print_section_header "CUSTOM ROLE APPROVAL/REJECTION" "✅❌"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Test approval with correct custom role
    print_status "TESTING" "Approve Task with Correct Custom Role"
    local approve_data='{
        "taskId": "test-task-custom-role",
        "action": "approve",
        "comments": "Approved by procurement specialist with custom role",
        "signature": "custom-role-signature",
        "approverRole": "procurement_specialist"
    }'
    
    # This will likely return 404 since we don't have actual tasks, but tests the structure
    make_request "POST" "$API_URL/workflows/tasks/approve" "$approve_data" "$auth_header" 404
    
    # Test rejection with custom role
    print_status "TESTING" "Reject Task with Custom Role"
    local reject_data='{
        "taskId": "test-task-custom-role-reject",
        "action": "reject",
        "comments": "Rejected by department head - insufficient justification",
        "signature": "dept-head-signature",
        "approverRole": "department_head_procurement"
    }'
    
    make_request "POST" "$API_URL/workflows/tasks/reject" "$reject_data" "$auth_header" 404
    
    # Test approval with wrong custom role
    print_status "TESTING" "Approve Task with Wrong Custom Role"
    local wrong_role_approve='{
        "taskId": "test-task-wrong-role",
        "action": "approve",
        "comments": "Attempting approval with wrong custom role",
        "signature": "wrong-role-signature",
        "approverRole": "finance_controller"
    }'
    
    # Should fail due to role mismatch
    make_request "POST" "$API_URL/workflows/tasks/approve" "$wrong_role_approve" "$auth_header" 403
}

# Test custom role audit trail and history
test_custom_role_audit_trail() {
    print_section_header "CUSTOM ROLE AUDIT TRAIL" "📋"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get Workflow History with Custom Roles"
    if [ ! -z "$CUSTOM_ROLE_WORKFLOW_ID" ]; then
        make_request "GET" "$API_URL/workflows/$CUSTOM_ROLE_WORKFLOW_ID/history" "" "$auth_header" 200
    fi
    
    print_status "TESTING" "Get Approval History for Custom Role Actions"
    make_request "GET" "$API_URL/approvals/history?role=procurement_specialist" "" "$auth_header" 200
    
    print_status "TESTING" "Get Audit Trail for Custom Role Workflows"
    make_request "GET" "$API_URL/audit/workflows?customRoles=true" "" "$auth_header" 200
    
    print_status "TESTING" "Export Custom Role Workflow Report"
    local export_data='{
        "workflowId": "'$CUSTOM_ROLE_WORKFLOW_ID'",
        "includeCustomRoles": true,
        "format": "json"
    }'
    
    # This endpoint may not exist yet
    make_request "POST" "$API_URL/reports/workflows/export" "$export_data" "$auth_header" 404
}

# Test custom role performance and metrics
test_custom_role_performance() {
    print_section_header "CUSTOM ROLE PERFORMANCE METRICS" "📊"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get Custom Role Approval Metrics"
    make_request "GET" "$API_URL/analytics/approvals/custom-roles" "" "$auth_header" 200
    
    print_status "TESTING" "Get Custom Role Performance Statistics"
    make_request "GET" "$API_URL/analytics/workflows/custom-role-performance" "" "$auth_header" 200
    
    print_status "TESTING" "Get Custom Role Usage Statistics"
    make_request "GET" "$API_URL/analytics/roles/usage?type=custom" "" "$auth_header" 200
    
    print_status "TESTING" "Get Custom Role Bottleneck Analysis"
    local bottleneck_query="startDate=2024-01-01&endDate=2024-12-31&roleType=custom"
    make_request "GET" "$API_URL/analytics/workflows/bottlenecks?$bottleneck_query" "" "$auth_header" 200
}

# Test custom role integration with other systems
test_custom_role_integration() {
    print_section_header "CUSTOM ROLE SYSTEM INTEGRATION" "🔗"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Custom Role Integration with RBAC System"
    make_request "GET" "$API_URL/rbac/roles?type=custom" "" "$auth_header" 200
    
    print_status "TESTING" "Custom Role Integration with Notification System"
    local notification_test='{
        "recipientRole": "procurement_specialist",
        "message": "Test notification for custom role",
        "type": "workflow_assignment"
    }'
    
    make_request "POST" "$API_URL/notifications/send" "$notification_test" "$auth_header" 200
    
    print_status "TESTING" "Custom Role Integration with User Management"
    make_request "GET" "$API_URL/users?role=procurement_specialist" "" "$auth_header" 200
    
    print_status "TESTING" "Custom Role Integration with Department Management"
    make_request "GET" "$API_URL/departments/roles?includeCustom=true" "" "$auth_header" 200
}

# Main function to run all custom role tests
run_custom_role_tests() {
    reset_test_counters
    
    # Check if we have authentication context
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$ORGANIZATION_ID" ]; then
        print_status "ERROR" "Authentication context required. Please run auth_tests.sh first or use the main test runner."
        return 1
    fi
    
    test_custom_role_workflow_creation
    test_custom_role_validation
    test_custom_role_workflow_execution
    test_custom_role_edge_cases
    test_custom_role_approval_rejection
    test_custom_role_audit_trail
    test_custom_role_performance
    test_custom_role_integration
    
    print_module_summary "CUSTOM ROLE WORKFLOW SYSTEM"
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
    
    run_custom_role_tests
fi