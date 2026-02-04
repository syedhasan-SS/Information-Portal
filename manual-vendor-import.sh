#!/bin/bash

# Manual Vendor Import Helper
# Since BigQuery is connected via MCP, we'll import vendors manually

echo "════════════════════════════════════════════════════════════════"
echo "  📥 Manual Vendor Import Helper"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Since you have BigQuery connected via MCP connectors,"
echo "we'll import vendor data directly."
echo ""
echo "Step 1: I'll query BigQuery for you via MCP"
echo "Step 2: Save the results to a temp file"
echo "Step 3: Import into the portal database"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Create a temp SQL file
cat > /tmp/vendor-query.sql << 'EOF'
SELECT
  handle,
  name,
  email,
  phone,
  gmv_tier,
  gmv_90_day,
  kam,
  zone,
  region,
  country,
  geo,
  persona
FROM `dogwood-baton-345622.aurora_postgres_public.vendors`
WHERE handle IS NOT NULL
ORDER BY handle
LIMIT 200
EOF

echo "✅ Created BigQuery query"
echo ""
echo "Now Claude will execute this query via MCP and import the results..."
echo ""
