#!/bin/bash

# Test script for trial reset API endpoint
# Usage: ./test_trial_reset.sh [organization_id] [trial_days] [reason]

set -e

# Configuration
API_BASE_URL="http://localhost:8080/api/v1"
ORGANIZATION_ID="${1:-demo-org-123}"
TRIAL_DAYS="${2:-30}"
REASON="${3:-Testing trial reset functionality}"

echo "🧪 Testing Trial Reset API Endpoint"
echo "=================================="
echo "Organization ID: $ORGANIZATION_ID"
echo "Trial Days: $TRIAL_DAYS"
echo "Reason: $REASON"
echo ""

# Function to make authenticated request (you'll need to replace with actual auth)
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
            -d "$data" \
            "$API_BASE_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
            "$API_BASE_URL$endpoint"
    fi
}

echo "📊 Step 1: Get current trial status"
echo "GET /organizations/$ORGANIZATION_ID/trial-status"
CURRENT_STATUS=$(make_request "GET" "/organizations/$ORGANIZATION_ID/trial-status")
echo "Response: $CURRENT_STATUS"
echo ""

echo "🔄 Step 2: Reset trial period"
echo "POST /organizations/$ORGANIZATION_ID/trial/reset"
RESET_DATA=$(cat <<EOF
{
    "trialDays": $TRIAL_DAYS,
    "reason": "$REASON"
}
EOF
)

echo "Request body: $RESET_DATA"
RESET_RESPONSE=$(make_request "POST" "/organizations/$ORGANIZATION_ID/trial/reset" "$RESET_DATA")
echo "Response: $RESET_RESPONSE"
echo ""

echo "📊 Step 3: Verify updated trial status"
echo "GET /organizations/$ORGANIZATION_ID/trial-status"
UPDATED_STATUS=$(make_request "GET" "/organizations/$ORGANIZATION_ID/trial-status")
echo "Response: $UPDATED_STATUS"
echo ""

echo "✅ Trial reset test completed!"
echo ""
echo "📝 API Endpoint Summary:"
echo "========================"
echo "Endpoint: POST /api/v1/organizations/{id}/trial/reset"
echo "Method: POST"
echo "Auth: Required (Admin role)"
echo "Body: {"
echo "  \"trialDays\": number (1-90),"
echo "  \"reason\": string (5-200 chars)"
echo "}"
echo ""
echo "Response: {"
echo "  \"success\": true,"
echo "  \"data\": {"
echo "    \"organizationId\": string,"
echo "    \"subscriptionStatus\": \"trial\","
echo "    \"trialStartDate\": ISO date,"
echo "    \"trialEndDate\": ISO date,"
echo "    \"daysRemaining\": number,"
echo "    \"isActive\": true"
echo "  },"
echo "  \"message\": \"Trial reset successfully\""
echo "}"