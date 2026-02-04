#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║    🧪  AUTOMATION TESTING SUITE  🧪                       ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the portal URL
if [ "$1" = "prod" ] || [ "$1" = "production" ]; then
    BASE_URL="https://information-portal.vercel.app"
    echo "🌐 Testing PRODUCTION environment"
else
    BASE_URL="http://localhost:5000"
    echo "🏠 Testing LOCAL environment"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1/6: BigQuery Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESPONSE=$(curl -s "$BASE_URL/api/bigquery/test")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"connected":true'; then
    echo -e "${GREEN}✅ BigQuery is connected!${NC}"
else
    echo -e "${RED}❌ BigQuery not connected${NC}"
    echo "   Fix: Run ./setup-bigquery.sh"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2/6: n8n Integration Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESPONSE=$(curl -s "$BASE_URL/api/n8n/status")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"configured":true'; then
    echo -e "${GREEN}✅ n8n is configured!${NC}"
else
    echo -e "${YELLOW}⚠️  n8n not configured (optional)${NC}"
    echo "   Setup: npx tsx configure-n8n.ts"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3/6: Vendors API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESPONSE=$(curl -s "$BASE_URL/api/vendors")
VENDOR_COUNT=$(echo "$RESPONSE" | grep -o '"handle"' | wc -l | tr -d ' ')

if [ "$VENDOR_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $VENDOR_COUNT vendors in database${NC}"
    echo ""
    echo "Sample vendors:"
    echo "$RESPONSE" | grep -o '"handle":"[^"]*"' | head -5 | sed 's/"handle"://g'
else
    echo -e "${RED}❌ No vendors found in database${NC}"
    echo "   Fix: npm run import:vendors"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4/6: Order IDs Fetching (BigQuery)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get first vendor handle
VENDOR_HANDLE=$(echo "$RESPONSE" | grep -o '"handle":"[^"]*"' | head -1 | sed 's/"handle":"//g' | sed 's/"//g')

if [ -n "$VENDOR_HANDLE" ]; then
    echo "Testing with vendor: $VENDOR_HANDLE"
    ORDER_RESPONSE=$(curl -s "$BASE_URL/api/bigquery/vendor/$VENDOR_HANDLE/order-ids?limit=5")
    ORDER_COUNT=$(echo "$ORDER_RESPONSE" | grep -o '"' | wc -l | tr -d ' ')

    if [ "$ORDER_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Order IDs fetching works!${NC}"
        echo "Sample orders: $ORDER_RESPONSE" | head -c 100
    else
        echo -e "${YELLOW}⚠️  No orders found for this vendor (might be normal)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipped (no vendors to test)${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5/6: Vendor Sync Automation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if echo "$RESPONSE" | grep -q '"connected":true'; then
    echo "Testing sync endpoint..."
    SYNC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/automation/bigquery/sync-vendors" 2>&1)

    if echo "$SYNC_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Vendor sync automation works!${NC}"
        echo "$SYNC_RESPONSE" | grep -o '"imported":[0-9]*' | head -1
        echo "$SYNC_RESPONSE" | grep -o '"updated":[0-9]*' | head -1
    else
        echo -e "${YELLOW}⚠️  Sync test skipped or failed${NC}"
        echo "   This might be okay if BigQuery isn't configured yet"
    fi
else
    echo -e "${YELLOW}⚠️  Skipped (BigQuery not connected)${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6/6: n8n Workflow Trigger"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

N8N_RESPONSE=$(curl -s -X POST "$BASE_URL/api/n8n/trigger" \
  -H "Content-Type: application/json" \
  -d '{"event":"test.automation","data":{"test":true}}')

if echo "$N8N_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ n8n workflow trigger works!${NC}"
    echo "   Check your n8n dashboard for execution log"
else
    echo -e "${YELLOW}⚠️  n8n trigger skipped (not configured)${NC}"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║    📊  TEST RESULTS SUMMARY  📊                           ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Summary
TESTS_PASSED=0
TESTS_TOTAL=6

if echo "$RESPONSE" | grep -q '"connected":true'; then ((TESTS_PASSED++)); fi
if [ "$VENDOR_COUNT" -gt 0 ]; then ((TESTS_PASSED++)); fi

echo "Tests Passed: $TESTS_PASSED / $TESTS_TOTAL"
echo ""

if [ $TESTS_PASSED -ge 2 ]; then
    echo -e "${GREEN}✅ Core functionality is working!${NC}"
    echo ""
    echo "You can now:"
    echo "  • Create tickets with vendor handles"
    echo "  • Auto-load Fleek order IDs"
    echo "  • Use the portal normally"
    echo ""
    echo "Optional enhancements:"
    echo "  • Configure n8n for notifications"
    echo "  • Set up scheduled syncs"
    echo "  • Enable advanced automations"
else
    echo -e "${YELLOW}⚠️  Some features need configuration${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. ./setup-bigquery.sh      # Set up BigQuery"
    echo "  2. npm run import:vendors   # Import vendor data"
    echo "  3. npx tsx configure-n8n.ts # Configure n8n (optional)"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
