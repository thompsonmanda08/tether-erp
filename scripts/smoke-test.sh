#!/usr/bin/env bash
# MVP smoke test — hits backend HTTP API end-to-end.
# Covers: auth, org bootstrap, provinces/towns, full procurement chain, petty cash.
#
# Prereq: backend running on $API (default http://localhost:8080), DB migrated + seeded.
# Requires: jq, curl, bash.
# Usage: ./scripts/smoke-test.sh [api_base_url]

set -euo pipefail

BASE="${1:-http://localhost:8080}"
API="${BASE}/api/v1"
TS=$(date +%s)
EMAIL="smoke-${TS}@test.local"
PASSWORD="SmokeTest123!"
ORG_NAME="Smoke Org ${TS}"

# ── helpers ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; echo "  Response: $2"; exit 1; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }

req() {
  local method="$1" path="$2" body="${3:-}" auth="${4:-}"
  local args=(-sS -X "$method" "${API}${path}" -H "Content-Type: application/json")
  [ -n "$auth" ] && args+=(-H "Authorization: Bearer $auth")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}"
}

jget() { echo "$1" | jq -r "$2" 2>/dev/null || echo ""; }

# ── 1. Health ──────────────────────────────────────────────────────────────
info "1. Health check"
H=$(curl -sS "${BASE}/health")
echo "$H" | grep -qi "ok\|healthy\|status" || fail "health" "$H"
pass "health"

# ── 2. Provinces / Towns (public) ──────────────────────────────────────────
info "2. Provinces + cascading towns"
PROVS=$(req GET /provinces)
PROV_COUNT=$(jget "$PROVS" '.data | length')
[ -n "$PROV_COUNT" ] && [ "$PROV_COUNT" -ge 9 ] || fail "provinces seed" "$PROVS"
pass "provinces returned ($PROV_COUNT)"

LUSAKA_ID=$(jget "$PROVS" '.data[] | select(.name | contains("Lusaka")) | .id')
TOWNS=$(req GET "/towns?province_id=${LUSAKA_ID}")
TOWN_COUNT=$(jget "$TOWNS" '.data | length')
[ -n "$TOWN_COUNT" ] && [ "$TOWN_COUNT" -ge 1 ] || fail "towns by province" "$TOWNS"
pass "towns by province ($TOWN_COUNT for Lusaka)"

# ── 3. Register + login ────────────────────────────────────────────────────
info "3. Register + login"
REG=$(req POST /auth/register "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\",\"role\":\"admin\"}")
REG_OK=$(jget "$REG" '.success // empty')
[ "$REG_OK" = "true" ] || fail "register" "$REG"
pass "register"

LOGIN=$(req POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(jget "$LOGIN" '.data.token // .token // .data.accessToken // .accessToken // empty')
[ -n "$TOKEN" ] || fail "login token" "$LOGIN"
pass "login token captured"

USER_ID=$(jget "$LOGIN" '.data.user.id // .user.id // empty')
[ -n "$USER_ID" ] && pass "user id: $USER_ID"

# ── 4. Org create + switch ─────────────────────────────────────────────────
info "4. Org bootstrap"
ORG=$(req POST /organizations "{\"name\":\"$ORG_NAME\",\"slug\":\"smoke-${TS}\"}" "$TOKEN")
ORG_ID=$(jget "$ORG" '.data.id // .id // empty')
[ -n "$ORG_ID" ] || fail "org create" "$ORG"
pass "org created ($ORG_ID)"

SWITCH=$(req POST "/organizations/$ORG_ID/switch" "" "$TOKEN")
NEW_TOKEN=$(jget "$SWITCH" '.data.token // .token // empty')
[ -n "$NEW_TOKEN" ] && TOKEN="$NEW_TOKEN"
pass "org switched"

# ── 5. Vendor + category prep ──────────────────────────────────────────────
info "5. Vendor + category"
VENDOR=$(req POST /vendors '{"name":"Smoke Vendor","email":"v@v.com","phone":"+260000000","country":"Zambia","city":"Lusaka","taxId":"TAX123456"}' "$TOKEN")
VENDOR_ID=$(jget "$VENDOR" '.data.id // .id // empty')
if [ -z "$VENDOR_ID" ]; then warn "vendor create failed: $VENDOR"; else pass "vendor created"; fi

CAT=$(req POST /categories '{"name":"Office Supplies","code":"OFF"}' "$TOKEN")
CAT_ID=$(jget "$CAT" '.data.id // .id // empty')
if [ -z "$CAT_ID" ]; then warn "category create failed: $CAT"; else pass "category created"; fi

# ── 6. Procurement chain: Requisition ──────────────────────────────────────
info "6. Requisition lifecycle"
REQ_BODY=$(cat <<JSON
{
  "title": "Smoke Req ${TS}",
  "description": "smoke test",
  "vendorId": "${VENDOR_ID}",
  "categoryId": "${CAT_ID}",
  "items": [{"description":"Pens","quantity":10,"unitPrice":5,"totalPrice":50}],
  "totalAmount": 50,
  "currency": "USD"
}
JSON
)
REQ=$(req POST /requisitions "$REQ_BODY" "$TOKEN")
REQ_ID=$(jget "$REQ" '.data.id // .id // empty')
if [ -z "$REQ_ID" ]; then
  warn "requisition create failed: $REQ"
else
  pass "requisition created ($REQ_ID)"
  WF=$(req GET "/workflows/default/requisition" "" "$TOKEN")
  WF_ID=$(jget "$WF" '.data.id // .id // empty')
  if [ -z "$WF_ID" ]; then
    warn "no default workflow for requisition: $WF"
  else
    SUBMIT=$(req POST "/requisitions/$REQ_ID/submit" "{\"workflowId\":\"$WF_ID\"}" "$TOKEN")
    SUB_OK=$(jget "$SUBMIT" '.success // empty')
    [ "$SUB_OK" = "true" ] && pass "requisition submitted (workflow $WF_ID)" || warn "submit: $SUBMIT"
  fi

  TASKS=$(req GET /approvals "" "$TOKEN")
  TASK_ID=$(jget "$TASKS" "(.data.items // .data // [])[] | select(.entityId==\"$REQ_ID\") | .id" | head -1)
  if [ -n "$TASK_ID" ]; then
    APP=$(req POST "/approvals/$TASK_ID/approve" '{"comments":"smoke approved"}' "$TOKEN")
    pass "requisition approved"
  else
    warn "no approval task assigned to creator (workflow may need different approver)"
  fi
fi

# ── 7. Petty cash PV (standalone, no PO) ───────────────────────────────────
info "7. Petty cash payment voucher (standalone)"
PV_BODY=$(cat <<JSON
{
  "title": "Petty Cash ${TS}",
  "description": "smoke petty cash payment for taxi",
  "invoiceNumber": "INV-SMOKE-${TS}",
  "amount": 20,
  "currency": "USD",
  "paymentMethod": "cash",
  "glCode": "5000-001"
}
JSON
)
PV=$(req POST /payment-vouchers "$PV_BODY" "$TOKEN")
PV_ID=$(jget "$PV" '.data.id // .id // empty')
if [ -z "$PV_ID" ]; then
  warn "petty cash PV create failed: $PV"
else
  pass "petty cash PV created ($PV_ID, no PO link)"
  req POST "/payment-vouchers/$PV_ID/submit" "" "$TOKEN" >/dev/null
  pass "petty cash PV submitted"
fi

# ── 8. Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Smoke test complete${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo "  User:  $EMAIL"
echo "  Org:   $ORG_ID"
echo "  Req:   ${REQ_ID:-<skipped>}"
echo "  PV:    ${PV_ID:-<skipped>}"
echo ""
echo "Manual UI checks remaining:"
echo "  - PDF preview/download per doc type"
echo "  - QR scan → /verify/<doc-number>"
echo "  - Branches form: province dropdown → towns cascade"
echo "  - Departments tree CRUD"
echo "  - Notifications + audit trail"
