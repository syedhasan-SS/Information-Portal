#!/bin/bash

# Vendor Audit Script - Compare BigQuery vs API
# Usage: ./scripts/audit-vendors.sh [production-url]

API_URL="${1:-http://localhost:5001}"

echo "=================================================="
echo "🔍 VENDOR AUDIT - BigQuery vs API"
echo "=================================================="
echo ""
echo "API URL: $API_URL"
echo ""

# Test 1: Check API connectivity
echo "1️⃣  Testing API connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/vendors")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ API reachable (HTTP $HTTP_CODE)"
else
  echo "   ❌ API failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo ""

# Test 2: Count vendors in API
echo "2️⃣  Counting vendors in API..."
API_COUNT=$(curl -s "$API_URL/api/vendors" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
echo "   API returned: $API_COUNT vendors"
echo ""

# Test 3: Check for specific vendors
echo "3️⃣  Checking for 'unique' vendors..."
curl -s "$API_URL/api/vendors" | python3 -c "
import sys, json
data = json.load(sys.stdin)
unique_vendors = [v for v in data if 'unique' in v['handle'].lower()]
print(f'   Found {len(unique_vendors)} vendors with \"unique\" in handle:')
for v in sorted(unique_vendors, key=lambda x: x['handle']):
    print(f'   - {v[\"handle\"]:<35} → {v[\"name\"]}')
"
echo ""

# Test 4: Check for specific problem vendor
echo "4️⃣  Checking for specific vendors..."
VENDORS_TO_CHECK=("uniquevintage" "unique-vintage" "retro-vintage-global" "creed-vintage" "diamond")
for vendor in "${VENDORS_TO_CHECK[@]}"; do
  FOUND=$(curl -s "$API_URL/api/vendors" | python3 -c "
import sys, json
data = json.load(sys.stdin)
found = any(v['handle'] == '$vendor' for v in data)
print('YES' if found else 'NO')
" 2>/dev/null)

  if [ "$FOUND" = "YES" ]; then
    echo "   ✅ $vendor"
  else
    echo "   ❌ $vendor (MISSING)"
  fi
done
echo ""

# Test 5: Sample first and last vendors
echo "5️⃣  Sample vendors (first 5 and last 5)..."
curl -s "$API_URL/api/vendors" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('   First 5:')
for v in data[:5]:
    print(f'   - {v[\"handle\"]}')
print('   Last 5:')
for v in data[-5:]:
    print(f'   - {v[\"handle\"]}')
"
echo ""

echo "=================================================="
echo "✅ Audit Complete"
echo "=================================================="
echo ""
echo "Expected total: 1,588 vendors"
echo "Actual total:   $API_COUNT vendors"
if [ "$API_COUNT" = "1588" ]; then
  echo "Status: ✅ MATCH"
else
  echo "Status: ❌ MISMATCH (difference: $((1588 - API_COUNT)))"
fi
