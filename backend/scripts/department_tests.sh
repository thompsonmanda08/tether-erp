#!/bin/bash

# LIYALI GATEWAY DEPARTMENT MANAGEMENT TESTS
# Tests for department operations and user-department relationships

# Source common utilities
source "$(dirname "$0")/common_tests.sh"

# Test department management operations
test_department_management() {
    print_section_header "DEPARTMENT MANAGEMENT OPERATIONS" "🏢"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get Organization Departments"
    make_request "GET" "$API_URL/organization/departments" "" "$auth_header" 200
    
    print_status "TESTING" "Create Organization Department"
    local timestamp=$(date +%s)
    local dept_data="{
        \"name\": \"Test Department Unique $timestamp\",
        \"code\": \"TEST-DEPT-$timestamp\",
        \"description\": \"Test department for automated testing with unique name and timestamp\"
    }"
    local dept_response=$(make_request "POST" "$API_URL/organization/departments" "$dept_data" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        DEPARTMENT_ID=$(echo "$dept_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        export DEPARTMENT_ID
        print_status "INFO" "Department created with ID: $DEPARTMENT_ID"
        
        if [ ! -z "$DEPARTMENT_ID" ]; then
            print_status "TESTING" "Get Individual Department"
            make_request "GET" "$API_URL/organization/departments/$DEPARTMENT_ID" "" "$auth_header" 200
            
            print_status "TESTING" "Update Department"
            local dept_update='{
                "name": "Updated Test Department",
                "description": "Updated description for test department"
            }'
            make_request "PUT" "$API_URL/organization/departments/$DEPARTMENT_ID" "$dept_update" "$auth_header" 200
            
            print_status "TESTING" "Get Department Modules"
            make_request "GET" "$API_URL/organization/departments/$DEPARTMENT_ID/modules" "" "$auth_header" 200
            
            print_status "TESTING" "Assign Module to Department"
            local module_data='{
                "module_id": "requisition",
                "permissions": ["view", "create", "edit"]
            }'
            make_request "POST" "$API_URL/organization/departments/$DEPARTMENT_ID/modules" "$module_data" "$auth_header" 200
            
            print_status "TESTING" "Get Department Users"
            make_request "GET" "$API_URL/organization/departments/$DEPARTMENT_ID/users" "" "$auth_header" 200
            
            print_status "TESTING" "Remove Module from Department"
            make_request "DELETE" "$API_URL/organization/departments/$DEPARTMENT_ID/modules/requisition" "" "$auth_header" 200
            
            print_status "TESTING" "Delete Department"
            make_request "DELETE" "$API_URL/organization/departments/$DEPARTMENT_ID" "" "$auth_header" 200
            
            print_status "TESTING" "Restore Department"
            make_request "POST" "$API_URL/organization/departments/$DEPARTMENT_ID/restore" "" "$auth_header" 200
        fi
    fi
}

# Test user-department management
test_user_department_management() {
    print_section_header "USER-DEPARTMENT MANAGEMENT" "👥"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    if [ ! -z "$DEPARTMENT_ID" ] && [ ! -z "$USER_ID" ]; then
        print_status "TESTING" "Assign User to Department"
        make_request "POST" "$API_URL/users/$USER_ID/department/$DEPARTMENT_ID" "" "$auth_header" 200
        
        print_status "TESTING" "Get User Department"
        make_request "GET" "$API_URL/users/$USER_ID/department" "" "$auth_header" 200
        
        print_status "TESTING" "Remove User from Department"
        make_request "DELETE" "$API_URL/users/$USER_ID/department" "" "$auth_header" 200
    else
        print_status "INFO" "Skipping user-department tests - missing department or user ID"
    fi
}

# Main function to run all department tests
run_department_tests() {
    reset_test_counters
    
    # Check if we have authentication context
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$ORGANIZATION_ID" ]; then
        print_status "ERROR" "Authentication context required. Please run auth_tests.sh first or use the main test runner."
        return 1
    fi
    
    test_department_management
    test_user_department_management
    
    print_module_summary "DEPARTMENT MANAGEMENT"
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
    
    run_department_tests
fi