#!/bin/bash

clear

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║    🚀  INFORMATION PORTAL - COMPLETE SETUP WIZARD  🚀     ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ $1"
    fi
}

# Check Node.js
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 1/6: Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v node &> /dev/null; then
    echo "✅ Node.js $(node --version) installed"
else
    echo "❌ Node.js not installed"
    echo "   Install from: https://nodejs.org/"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo "✅ npm $(npm --version) installed"
else
    echo "❌ npm not installed"
    exit 1
fi

if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Dependencies not installed"
    echo "   Run: npm install"
fi

echo ""

# Check Database
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  2/6: Database Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if grep -q "^DATABASE_URL=" .env 2>/dev/null; then
    DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
    if [ -n "$DB_URL" ]; then
        echo "✅ DATABASE_URL configured"
    else
        echo "❌ DATABASE_URL empty in .env"
    fi
else
    echo "❌ DATABASE_URL not found in .env"
fi

echo ""

# Check BigQuery
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "☁️  3/6: BigQuery Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BQ_CONFIGURED=0

if grep -q "^BIGQUERY_PROJECT_ID=" .env 2>/dev/null; then
    BQ_PROJECT=$(grep "^BIGQUERY_PROJECT_ID=" .env | cut -d'=' -f2)
    if [ -n "$BQ_PROJECT" ]; then
        echo "✅ BIGQUERY_PROJECT_ID: $BQ_PROJECT"
        BQ_CONFIGURED=1
    fi
fi

if [ -f "./service-account-key.json" ]; then
    echo "✅ service-account-key.json exists"
    BQ_CONFIGURED=1
elif grep -q "^BIGQUERY_CREDENTIALS_JSON=" .env 2>/dev/null; then
    CREDS=$(grep "^BIGQUERY_CREDENTIALS_JSON=" .env | cut -d'=' -f2)
    if [ -n "$CREDS" ]; then
        echo "✅ BIGQUERY_CREDENTIALS_JSON configured"
        BQ_CONFIGURED=1
    fi
fi

if [ $BQ_CONFIGURED -eq 0 ]; then
    echo "❌ BigQuery credentials not configured"
    echo ""
    echo "Run: ./setup-bigquery.sh for detailed instructions"
fi

echo ""

# Check n8n
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 4/6: n8n Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

N8N_CONFIGURED=0

if grep -q "^n8n_webhook_url=" .env 2>/dev/null; then
    N8N_URL=$(grep "^n8n_webhook_url=" .env | cut -d'=' -f2)
    if [ -n "$N8N_URL" ]; then
        echo "✅ n8n_webhook_url: ${N8N_URL:0:40}..."
        N8N_CONFIGURED=1
    fi
fi

if grep -q "^N8N_WEBHOOK_URL=" .env 2>/dev/null; then
    N8N_URL=$(grep "^N8N_WEBHOOK_URL=" .env | cut -d'=' -f2)
    if [ -n "$N8N_URL" ]; then
        echo "✅ N8N_WEBHOOK_URL: ${N8N_URL:0:40}..."
        N8N_CONFIGURED=1
    fi
fi

if [ $N8N_CONFIGURED -eq 0 ]; then
    echo "❌ n8n webhook not configured"
    echo ""
    echo "Run: ./setup-n8n.sh for detailed instructions"
fi

echo ""

# Check Workflows
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  5/6: n8n Workflows"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WORKFLOW_COUNT=$(find n8n-workflows -name "*.json" 2>/dev/null | wc -l)
echo "📁 Found $WORKFLOW_COUNT workflow template(s)"
echo ""

if [ $WORKFLOW_COUNT -gt 0 ]; then
    echo "Available workflows:"
    ls -1 n8n-workflows/*.json 2>/dev/null | while read workflow; do
        basename "$workflow"
    done | sed 's/^/   • /'
    echo ""
    echo "Import these into your n8n instance!"
    echo "See: n8n-workflows/README.md"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 6/6: Setup Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

READY=1

if [ -d "node_modules" ]; then
    echo "✅ Dependencies"
else
    echo "❌ Dependencies - Run: npm install"
    READY=0
fi

if grep -q "^DATABASE_URL=" .env 2>/dev/null; then
    echo "✅ Database"
else
    echo "❌ Database"
    READY=0
fi

if [ $BQ_CONFIGURED -eq 1 ]; then
    echo "✅ BigQuery"
else
    echo "❌ BigQuery - Run: ./setup-bigquery.sh"
    READY=0
fi

if [ $N8N_CONFIGURED -eq 1 ]; then
    echo "✅ n8n Integration"
else
    echo "⚠️  n8n Integration (Optional)"
fi

echo ""

if [ $READY -eq 1 ]; then
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║  🎉 ALL SYSTEMS READY! You're good to go! 🎉              ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🚀 Quick Start:"
    echo "   npm run dev              # Start development server"
    echo "   npm run build            # Build for production"
    echo ""
    echo "🧪 Test Automation:"
    echo "   curl http://localhost:5000/api/bigquery/test"
    echo "   curl http://localhost:5000/api/n8n/status"
    echo ""
    echo "📚 Documentation:"
    echo "   • AUTOMATION-SETUP.md    # Complete automation guide"
    echo "   • n8n-workflows/README.md # n8n workflow templates"
    echo ""
else
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║  ⚠️  SETUP INCOMPLETE - Please fix the issues above  ⚠️   ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📋 Setup Helpers:"
    echo "   ./setup-bigquery.sh     # BigQuery credentials guide"
    echo "   ./setup-n8n.sh          # n8n integration guide"
    echo "   ./setup-vercel.sh       # Vercel deployment guide"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
