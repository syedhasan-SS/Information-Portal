#!/bin/bash

echo "============================================"
echo "☁️  Vercel Environment Variables Setup"
echo "============================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed"
    echo ""
    echo "Install with:"
    echo "  npm install -g vercel"
    echo ""
    exit 1
fi

echo "✅ Vercel CLI installed"
echo ""

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged into Vercel"
    echo ""
    echo "Login with:"
    echo "  vercel login"
    echo ""
    exit 1
fi

echo "✅ Logged into Vercel as: $(vercel whoami)"
echo ""

echo "============================================"
echo "📋 Required Environment Variables"
echo "============================================"
echo ""

# Read current .env values
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
BIGQUERY_PROJECT_ID=$(grep "^BIGQUERY_PROJECT_ID=" .env | cut -d'=' -f2)
BIGQUERY_DATASET=$(grep "^BIGQUERY_DATASET=" .env | cut -d'=' -f2)
BIGQUERY_TABLE=$(grep "^BIGQUERY_ORDERS_TABLE=" .env | cut -d'=' -f2)
BIGQUERY_LOCATION=$(grep "^BIGQUERY_LOCATION=" .env | cut -d'=' -f2)

echo "From .env file:"
echo "---------------"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "BIGQUERY_PROJECT_ID: $BIGQUERY_PROJECT_ID"
echo "BIGQUERY_DATASET: $BIGQUERY_DATASET"
echo "BIGQUERY_ORDERS_TABLE: $BIGQUERY_TABLE"
echo "BIGQUERY_LOCATION: $BIGQUERY_LOCATION"
echo ""

# Check for service account key
if [ -f "./service-account-key.json" ]; then
    echo "⚠️  Found service-account-key.json"
    echo ""
    echo "For Vercel deployment, you need to use inline JSON instead of file path."
    echo ""
    echo "Option 1: Convert to inline JSON (Recommended)"
    echo "--------------------------------------------"
    echo "Run this command:"
    echo '  cat service-account-key.json | jq -c . | pbcopy'
    echo ""
    echo "Then add to Vercel:"
    echo "  vercel env add BIGQUERY_CREDENTIALS_JSON production"
    echo "  (Paste the JSON from clipboard)"
    echo ""
    echo "Option 2: Manual Setup via Dashboard"
    echo "------------------------------------"
    echo "1. Go to: https://vercel.com/dashboard"
    echo "2. Select your project: information-portal"
    echo "3. Go to Settings → Environment Variables"
    echo "4. Add BIGQUERY_CREDENTIALS_JSON"
    echo "5. Paste the entire service-account-key.json content"
    echo ""
else
    echo "❌ service-account-key.json not found"
    echo ""
    echo "You need BigQuery credentials for production!"
    echo "See: ./setup-bigquery.sh"
    echo ""
fi

echo "============================================"
echo "🚀 Quick Setup Commands"
echo "============================================"
echo ""
echo "Set environment variables in Vercel:"
echo ""
echo "# Database"
echo "vercel env add DATABASE_URL production"
echo "# Paste: $DATABASE_URL"
echo ""
echo "# BigQuery Project"
echo "vercel env add BIGQUERY_PROJECT_ID production"
echo "# Paste: $BIGQUERY_PROJECT_ID"
echo ""
echo "# BigQuery Credentials (inline JSON)"
echo "vercel env add BIGQUERY_CREDENTIALS_JSON production"
echo "# Paste: (contents of service-account-key.json as one line)"
echo ""
echo "# n8n Webhook"
echo "vercel env add N8N_WEBHOOK_URL production"
echo "# Paste: https://your-n8n.com/webhook/xxxxx"
echo ""
echo "# n8n API Key (optional)"
echo "vercel env add N8N_API_KEY production"
echo "# Paste: your-api-key"
echo ""

echo "============================================"
echo "📝 Alternative: Bulk Add via CLI"
echo "============================================"
echo ""
echo "Create a file called 'vercel-env.txt' with:"
echo ""
echo "DATABASE_URL=$DATABASE_URL"
echo "BIGQUERY_PROJECT_ID=$BIGQUERY_PROJECT_ID"
echo "BIGQUERY_DATASET=$BIGQUERY_DATASET"
echo "BIGQUERY_ORDERS_TABLE=$BIGQUERY_TABLE"
echo "BIGQUERY_LOCATION=$BIGQUERY_LOCATION"
echo "BIGQUERY_CREDENTIALS_JSON=<paste-json-here>"
echo "N8N_WEBHOOK_URL=<your-webhook-url>"
echo ""
echo "Then run:"
echo "  cat vercel-env.txt | while read line; do"
echo "    var=\$(echo \$line | cut -d'=' -f1)"
echo "    val=\$(echo \$line | cut -d'=' -f2-)"
echo "    echo \"\$val\" | vercel env add \"\$var\" production"
echo "  done"
echo ""

echo "============================================"
echo "✅ After Adding Variables"
echo "============================================"
echo ""
echo "1. Verify in dashboard:"
echo "   https://vercel.com/dashboard/information-portal/settings/environment-variables"
echo ""
echo "2. Redeploy:"
echo "   vercel --prod"
echo ""
echo "3. Test deployment:"
echo "   curl https://your-portal.vercel.app/api/bigquery/test"
echo "   curl https://your-portal.vercel.app/api/n8n/status"
echo ""
