#!/bin/bash

echo "============================================"
echo "🔑 BigQuery Credentials Setup Helper"
echo "============================================"
echo ""

# Check if service account key exists
if [ -f "./service-account-key.json" ]; then
    echo "✅ service-account-key.json already exists!"
    echo ""
    echo "Testing connection..."
    curl -s http://localhost:5000/api/bigquery/test
    exit 0
fi

echo "❌ service-account-key.json not found"
echo ""
echo "📋 Follow these steps to get your BigQuery credentials:"
echo ""
echo "1. Open: https://console.cloud.google.com/"
echo "2. Select project: dogwood-baton-345622"
echo "3. Go to: IAM & Admin → Service Accounts"
echo "4. Find or create a service account"
echo "5. Click Actions (⋮) → Manage Keys → Add Key → Create New Key"
echo "6. Choose JSON format and download"
echo "7. Move the downloaded file here:"
echo ""
echo "   mv ~/Downloads/dogwood-baton-*.json ./service-account-key.json"
echo ""
echo "8. Run this script again to test!"
echo ""
echo "============================================"
echo ""
echo "⚠️  IMPORTANT: Never commit this file to git!"
echo "   (It's already in .gitignore)"
echo ""
echo "Alternative: Use inline JSON for Vercel deployment"
echo "   Set BIGQUERY_CREDENTIALS_JSON in .env instead"
echo ""
