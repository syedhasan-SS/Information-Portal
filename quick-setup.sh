#!/bin/bash

# 🚀 Quick Setup Script - Get Everything Running in 5 Minutes!

echo "════════════════════════════════════════════════════════════════"
echo "  🎯 Information Portal - Quick Setup Wizard"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if service account key exists
echo "📋 Step 1/4: Checking BigQuery Credentials..."
if [ -f "service-account-key.json" ]; then
    echo -e "${GREEN}✅ Found service-account-key.json${NC}"
else
    echo -e "${YELLOW}⚠️  BigQuery service account key not found${NC}"
    echo ""
    echo "Please download your BigQuery credentials:"
    echo ""
    echo "1. Open this link in your browser:"
    echo -e "${BLUE}https://console.cloud.google.com/iam-admin/serviceaccounts?project=dogwood-baton-345622${NC}"
    echo ""
    echo "2. Click on a service account (or create a new one)"
    echo "3. Go to 'KEYS' tab"
    echo "4. Click 'ADD KEY' → 'Create new key' → 'JSON'"
    echo "5. The file will download automatically"
    echo ""
    echo "6. Then move it here with this command:"
    echo -e "${BLUE}mv ~/Downloads/dogwood-baton-*.json ./service-account-key.json${NC}"
    echo ""
    read -p "Press Enter when you've done this (or Ctrl+C to exit)..."

    # Check again
    if [ ! -f "service-account-key.json" ]; then
        echo -e "${RED}❌ Still can't find service-account-key.json${NC}"
        echo "Please make sure you've moved the file to this directory."
        exit 1
    fi
    echo -e "${GREEN}✅ Found service-account-key.json${NC}"
fi

echo ""
echo "📦 Step 2/4: Installing dependencies..."
if npm install --silent; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo ""
echo "📥 Step 3/4: Importing vendors from BigQuery..."
echo "This will sync all vendor data (handles, names, countries, geo, etc.)"
echo ""

if npm run import:vendors; then
    echo -e "${GREEN}✅ Vendors imported successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Vendor import had issues. You can try again later with: npm run import:vendors${NC}"
fi

echo ""
echo "🧪 Step 4/4: Testing the setup..."
echo ""

# Test BigQuery connection
echo "Testing BigQuery connection..."
if curl -s http://localhost:5000/api/bigquery/test 2>/dev/null | grep -q "connected"; then
    echo -e "${GREEN}✅ BigQuery connection working${NC}"
else
    echo -e "${YELLOW}⚠️  Server not running. Will test after starting server.${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the development server:"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo "2. Open your browser to:"
echo -e "   ${BLUE}http://localhost:5000${NC}"
echo ""
echo "3. Test ticket creation:"
echo "   - Go to 'My Tickets' → 'Create Ticket'"
echo "   - Click 'Vendor Handle' field"
echo "   - Type 'vendor' or 'fleek' to search"
echo "   - Select a vendor"
echo "   - Watch order IDs auto-load! ✨"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📚 Useful commands:"
echo ""
echo "  npm run dev              - Start development server"
echo "  npm run import:vendors   - Re-sync vendors from BigQuery"
echo "  npm run test:automation  - Test all automation"
echo "  npm run setup:n8n        - Configure n8n webhook"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if user wants to configure n8n now
echo -e "${YELLOW}Optional: Do you want to configure n8n automation now?${NC}"
echo "This enables:"
echo "  • Automatic vendor syncing every 6 hours"
echo "  • Critical ticket alerts to Slack"
echo "  • Daily management reports"
echo ""
read -p "Configure n8n? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Great! Please provide your n8n webhook URL:"
    echo "(Example: https://your-n8n.com/webhook/xxxxx)"
    echo ""
    read -p "n8n Webhook URL: " N8N_URL

    if [ ! -z "$N8N_URL" ]; then
        # Update .env file
        if grep -q "N8N_WEBHOOK_URL=" .env; then
            # Update existing
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|N8N_WEBHOOK_URL=.*|N8N_WEBHOOK_URL=$N8N_URL|" .env
            else
                sed -i "s|N8N_WEBHOOK_URL=.*|N8N_WEBHOOK_URL=$N8N_URL|" .env
            fi
        else
            # Add new
            echo "N8N_WEBHOOK_URL=$N8N_URL" >> .env
        fi
        echo -e "${GREEN}✅ n8n webhook URL configured!${NC}"
        echo ""
        echo "Next: Import n8n workflow templates from the n8n-workflows/ folder"
        echo "See n8n-workflows/README.md for instructions"
    fi
else
    echo ""
    echo "No problem! You can configure n8n later by running:"
    echo -e "${BLUE}npm run setup:n8n${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Ready to start! Run: npm run dev${NC}"
echo ""
