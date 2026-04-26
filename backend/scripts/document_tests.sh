#!/bin/bash

# LIYALI GATEWAY DOCUMENT MANAGEMENT TESTS
# Tests for categories, vendors, requisitions, budgets, purchase orders, etc.

# Source common utilities
source "$(dirname "$0")/common_tests.sh"

# Test basic document management
test_document_management() {
    print_section_header "DOCUMENT MANAGEMENT SYSTEM" "📄"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Categories & Vendors
    print_status "TESTING" "Get Categories"
    make_request "GET" "$API_URL/categories" "" "$auth_header" 200
    
    print_status "TESTING" "Create Category"
    local cat_timestamp=$(date +%s)
    local cat_data="{
        \"name\": \"Test Equipment Category $cat_timestamp\",
        \"description\": \"Test Equipment Category for Automated Testing\",
        \"code\": \"TEST-EQ-CAT-$cat_timestamp\"
    }"
    local cat_response=$(make_request "POST" "$API_URL/categories" "$cat_data" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        CATEGORY_ID=$(echo "$cat_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        export CATEGORY_ID
        print_status "INFO" "Category created with ID: $CATEGORY_ID"
    fi
    
    print_status "TESTING" "Get Vendors"
    make_request "GET" "$API_URL/vendors" "" "$auth_header" 200
    
    print_status "TESTING" "Create Vendor"
    local vendor_timestamp=$(date +%s)
    local vendor_data="{
        \"name\": \"Tech Solutions Inc Test $vendor_timestamp\",
        \"vendorCode\": \"VEND-TEST-$vendor_timestamp\",
        \"email\": \"contact-test-$vendor_timestamp@techsolutions.com\",
        \"phone\": \"+1-555-0124\",
        \"address\": \"124 Tech Street, Silicon Valley, CA 94000\",
        \"country\": \"United States\",
        \"city\": \"San Francisco\",
        \"bankAccount\": \"1234567891\",
        \"taxId\": \"12-3456790\"
    }"
    local response=$(make_request "POST" "$API_URL/vendors" "$vendor_data" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        VENDOR_ID=$(extract_id_from_response "$response" "Vendor")
        export VENDOR_ID
    fi
    
    # Document Types
    print_status "TESTING" "Get Requisitions"
    make_request "GET" "$API_URL/requisitions" "" "$auth_header" 200
    
    print_status "TESTING" "Get Budgets"
    make_request "GET" "$API_URL/budgets" "" "$auth_header" 200
    
    print_status "TESTING" "Get Purchase Orders"
    make_request "GET" "$API_URL/purchase-orders" "" "$auth_header" 200
    
    print_status "TESTING" "Get Payment Vouchers"
    make_request "GET" "$API_URL/payment-vouchers" "" "$auth_header" 200
    
    print_status "TESTING" "Get GRNs"
    make_request "GET" "$API_URL/grns" "" "$auth_header" 200
}

# Test advanced CRUD operations
test_advanced_crud_operations() {
    print_section_header "ADVANCED CRUD OPERATIONS" "🔄"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Test individual document operations
    print_status "TESTING" "Create Requisition"
    local req_data='{
        "title": "Test Requisition",
        "description": "Test requisition for automated testing",
        "priority": "medium",
        "department": "IT",
        "items": [{
            "description": "Office Supplies",
            "quantity": 10,
            "unitPrice": 15.00,
            "estimatedCost": 15.00,
            "totalCost": 150.00
        }],
        "totalEstimatedCost": 150.00,
        "totalAmount": 150.00,
        "currency": "USD",
        "requiredBy": "2026-02-01T00:00:00Z"
    }'
    local req_response=$(make_request "POST" "$API_URL/requisitions" "$req_data" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        REQUISITION_ID=$(extract_id_from_response "$req_response" "Requisition")
        export REQUISITION_ID
        
        if [ ! -z "$REQUISITION_ID" ]; then
            # Test individual requisition retrieval
            print_status "TESTING" "Get Individual Requisition"
            make_request "GET" "$API_URL/requisitions/$REQUISITION_ID" "" "$auth_header" 200
            
            # Test requisition update
            print_status "TESTING" "Update Requisition"
            local update_data='{
                "title": "Updated Test Requisition",
                "description": "Updated description for testing",
                "priority": "high"
            }'
            make_request "PUT" "$API_URL/requisitions/$REQUISITION_ID" "$update_data" "$auth_header" 200
            
            # Test requisition submission
            print_status "TESTING" "Submit Requisition for Approval"
            make_request "POST" "$API_URL/requisitions/$REQUISITION_ID/submit" "" "$auth_header" 200
        fi
    fi
    
    # Test Budget Operations
    print_status "TESTING" "Create Budget"
    local budget_data='{
        "budgetCode": "TEST-BUDGET-001",
        "name": "Test Budget 2026",
        "description": "Test budget for automated testing",
        "department": "IT",
        "fiscalYear": "2026",
        "totalBudget": 50000.00,
        "allocatedAmount": 0.00,
        "currency": "USD"
    }'
    local budget_response=$(make_request "POST" "$API_URL/budgets" "$budget_data" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        BUDGET_ID=$(extract_id_from_response "$budget_response" "Budget")
        export BUDGET_ID
        
        if [ ! -z "$BUDGET_ID" ]; then
            # Test individual budget retrieval
            print_status "TESTING" "Get Individual Budget"
            make_request "GET" "$API_URL/budgets/$BUDGET_ID" "" "$auth_header" 200
            
            # Test budget update
            print_status "TESTING" "Update Budget"
            local budget_update='{
                "name": "Updated Test Budget 2026",
                "totalBudget": 60000.00
            }'
            make_request "PUT" "$API_URL/budgets/$BUDGET_ID" "$budget_update" "$auth_header" 200
        fi
    fi
    
    # Test Category Operations
    if [ ! -z "$CATEGORY_ID" ]; then
        print_status "TESTING" "Get Individual Category"
        make_request "GET" "$API_URL/categories/$CATEGORY_ID" "" "$auth_header" 200
        
        print_status "TESTING" "Update Category"
        local cat_update_timestamp=$(date +%s)
        local cat_update="{
            \"name\": \"Updated Test Equipment Category $cat_update_timestamp\",
            \"description\": \"Updated description for test equipment category with timestamp\"
        }"
        make_request "PUT" "$API_URL/categories/$CATEGORY_ID" "$cat_update" "$auth_header" 200
        
        # Test budget codes
        print_status "TESTING" "Add Budget Code to Category"
        local budget_code_data='{
            "budgetCode": "TEST-001",
            "description": "Test budget code"
        }'
        make_request "POST" "$API_URL/categories/$CATEGORY_ID/budget-codes" "$budget_code_data" "$auth_header" 201
        
        print_status "TESTING" "Get Category Budget Codes"
        make_request "GET" "$API_URL/categories/$CATEGORY_ID/budget-codes" "" "$auth_header" 200
    fi
    
    # Test Vendor Operations
    if [ ! -z "$VENDOR_ID" ]; then
        print_status "TESTING" "Get Individual Vendor"
        make_request "GET" "$API_URL/vendors/$VENDOR_ID" "" "$auth_header" 200
        
        print_status "TESTING" "Update Vendor"
        local vendor_update_timestamp=$(date +%s)
        local vendor_update="{
            \"name\": \"Updated Test Vendor Corp $vendor_update_timestamp\",
            \"email\": \"updated-$vendor_update_timestamp@testvendor.com\"
        }"
        make_request "PUT" "$API_URL/vendors/$VENDOR_ID" "$vendor_update" "$auth_header" 200
    fi
}

# Test complete document CRUD operations
test_complete_document_crud() {
    print_section_header "COMPLETE DOCUMENT CRUD OPERATIONS" "📄"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Purchase Order Operations
    print_status "TESTING" "Create Purchase Order"
    if [ ! -z "$VENDOR_ID" ]; then
        local po_data="{
            \"vendorId\": \"$VENDOR_ID\",
            \"items\": [{
                \"description\": \"Test Purchase Item\",
                \"quantity\": 5,
                \"unitPrice\": 100.00,
                \"totalPrice\": 500.00
            }],
            \"totalAmount\": 500.00,
            \"currency\": \"USD\",
            \"deliveryDate\": \"2026-03-01\"
        }"
        local po_response=$(make_request "POST" "$API_URL/purchase-orders" "$po_data" "$auth_header" 201)
        if [ $? -eq 0 ]; then
            PO_ID=$(echo "$po_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            export PO_ID
            print_status "INFO" "Purchase Order created with ID: $PO_ID"
            
            if [ ! -z "$PO_ID" ]; then
                print_status "TESTING" "Get Individual Purchase Order"
                make_request "GET" "$API_URL/purchase-orders/$PO_ID" "" "$auth_header" 200
                
                print_status "TESTING" "Update Purchase Order"
                local po_update="{
                    \"totalAmount\": 600.00,
                    \"deliveryDate\": \"2026-03-15\"
                }"
                make_request "PUT" "$API_URL/purchase-orders/$PO_ID" "$po_update" "$auth_header" 200
                
                print_status "TESTING" "Submit Purchase Order"
                make_request "POST" "$API_URL/purchase-orders/$PO_ID/submit" "" "$auth_header" 200
                
                print_status "TESTING" "Delete Purchase Order"
                make_request "DELETE" "$API_URL/purchase-orders/$PO_ID" "" "$auth_header" 403
            fi
        fi
    fi
    
    # Payment Voucher Operations
    print_status "TESTING" "Create Payment Voucher"
    local pv_data="{
        \"vendorId\": \"vendor-001\",
        \"amount\": 1000.00,
        \"currency\": \"USD\",
        \"description\": \"Test payment voucher\",
        \"dueDate\": \"2026-02-28\"
    }"
    local pv_response=$(make_request "POST" "$API_URL/payment-vouchers" "$pv_data" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        PV_ID=$(echo "$pv_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        export PV_ID
        if [ -z "$PV_ID" ]; then
            # Try alternative extraction methods
            PV_ID=$(echo "$pv_response" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
        fi
        print_status "INFO" "Payment Voucher created with ID: $PV_ID"
    fi
    
    # GRN Operations
    print_status "TESTING" "Create GRN"
    local grn_data="{
        \"poNumber\": \"PO-TEST-001\",
        \"receivedItems\": [{
            \"description\": \"Test Received Item\",
            \"quantityOrdered\": 10,
            \"quantityReceived\": 8,
            \"condition\": \"good\"
        }],
        \"receivedDate\": \"2026-01-15\"
    }"
    local grn_response=$(make_request "POST" "$API_URL/grns" "$grn_data" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        GRN_ID=$(echo "$grn_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        export GRN_ID
        if [ -z "$GRN_ID" ]; then
            # Try alternative extraction methods
            GRN_ID=$(echo "$grn_response" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
        fi
        print_status "INFO" "GRN created with ID: $GRN_ID"
    fi
}

# Test generic document system
test_generic_document_system() {
    print_section_header "GENERIC DOCUMENT SYSTEM" "📋"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    print_status "TESTING" "Get All Documents"
    make_request "GET" "$API_URL/documents" "" "$auth_header" 200
    
    print_status "TESTING" "Get My Documents"
    make_request "GET" "$API_URL/documents/my" "" "$auth_header" 200
    
    print_status "TESTING" "Create Generic Document"
    local doc_data='{
        "documentNumber": "DOC-TEST-001",
        "title": "Test Generic Document",
        "description": "Test document for automated testing",
        "documentType": "REQUISITION",
        "data": {
            "content": "Test document content",
            "category": "testing"
        }
    }'
    local doc_response=$(make_request "POST" "$API_URL/documents" "$doc_data" "$auth_header" 201)
    if [ $? -eq 0 ]; then
        DOC_ID=$(extract_id_from_response "$doc_response" "Generic Document")
        export DOC_ID
    fi
    
    print_status "TESTING" "Get Document by Number"
    make_request "GET" "$API_URL/documents/number/DOC-TEST-001" "" "$auth_header" 404
}

# Test document validation and error handling
test_document_validation() {
    print_section_header "DOCUMENT VALIDATION & ERROR HANDLING" "⚠️"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Create Category with Missing Fields
    print_status "TESTING" "Create Category with Missing Fields"
    local empty_data="{}"
    make_request "POST" "$API_URL/categories" "$empty_data" "$auth_header" 400
    
    # Get Individual Category with Invalid ID
    print_status "TESTING" "Get Category with Invalid ID"
    make_request "GET" "$API_URL/categories/invalid-uuid-format" "" "$auth_header" 404
    
    # Unauthorized Access - Try to access another organization's data (if possible)
    # This tests the tenant middleware security
    print_status "TESTING" "Unauthorized Organization Data Access"
    local other_org_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: other-org-id'"
    make_request "GET" "$API_URL/categories" "" "$other_org_header" 403
    
    # Requisition with Negative Amount
    print_status "TESTING" "Create Requisition with Invalid Amount"
    local invalid_req='{"title":"Invalid Req","totalAmount":-100}'
    make_request "POST" "$API_URL/requisitions" "$invalid_req" "$auth_header" 400
}

# Test critical fixes and search functionality
test_document_search_and_stats() {
    print_section_header "DOCUMENT SEARCH & STATISTICS" "🔍"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Generic Document Search
    print_status "TESTING" "Search Documents with Query"
    make_request "GET" "$API_URL/documents?q=Test" "" "$auth_header" 200
    
    # Search with Type Filter
    print_status "TESTING" "Search Documents by Type"
    make_request "GET" "$API_URL/documents?type=requisition" "" "$auth_header" 200
    
    # Search with Status Filter
    print_status "TESTING" "Search Documents by Status"
    make_request "GET" "$API_URL/documents?status=draft" "" "$auth_header" 200
    
    # Get Requisition Metrics (Specific Analytics)
    print_status "TESTING" "Get Requisition Metrics"
    make_request "GET" "$API_URL/analytics/requisitions/metrics" "" "$auth_header" 200
}

# Test critical fixes
test_critical_fixes() {
    print_section_header "CRITICAL FIXES VERIFICATION" "🔧"
    
    local auth_header="-H 'Authorization: Bearer $ACCESS_TOKEN' -H 'X-Organization-ID: $ORGANIZATION_ID'"
    
    # Fix #1: Document Search (Fixed organizationID inconsistency)
    print_status "TESTING" "Document Search (Fixed organizationID)"
    make_request "GET" "$API_URL/documents/search?q=laptop" "" "$auth_header" 200
    
    # Fix #2: Document Stats (Fixed organizationID inconsistency)
    print_status "TESTING" "Document Stats (Fixed organizationID)"
    make_request "GET" "$API_URL/documents/stats" "" "$auth_header" 200
    
    # Fix #3: Purchase Order with Flexible Date Formats
    print_status "TESTING" "Purchase Order with Simple Date Format (Fixed FlexibleDate)"
    # Use existing vendor from seed data
    local po_data='{
        "vendorId": "vendor-001",
        "items": [{
            "description": "Test Item",
            "quantity": 1,
            "unitPrice": 100.00,
            "totalPrice": 100.00
        }],
        "totalAmount": 100.00,
        "currency": "USD",
        "deliveryDate": "2026-02-15"
    }'
    make_request "POST" "$API_URL/purchase-orders" "$po_data" "$auth_header" 201
    
    # Fix #4: Purchase Order with RFC3339 Date Format
    print_status "TESTING" "Purchase Order with RFC3339 Date Format"
    local po_data2='{
        "vendorId": "vendor-002",
        "items": [{
            "description": "Test Item 2",
            "quantity": 1,
            "unitPrice": 200.00,
            "totalPrice": 200.00
        }],
        "totalAmount": 200.00,
        "currency": "USD",
        "deliveryDate": "2026-02-15T10:00:00Z"
    }'
    make_request "POST" "$API_URL/purchase-orders" "$po_data2" "$auth_header" 201
}

# Main function to run all document tests
run_document_tests() {
    reset_test_counters
    
    # Check if we have authentication context
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$ORGANIZATION_ID" ]; then
        print_status "ERROR" "Authentication context required. Please run auth_tests.sh first or use the main test runner."
        return 1
    fi
    
    test_document_management
    test_document_validation
    test_advanced_crud_operations
    test_complete_document_crud
    test_generic_document_system
    test_document_search_and_stats
    test_critical_fixes
    
    print_module_summary "DOCUMENT MANAGEMENT"
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
    
    run_document_tests
fi