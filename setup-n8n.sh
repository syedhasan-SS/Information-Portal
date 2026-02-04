#!/bin/bash

echo "============================================"
echo "🔗 n8n Integration Setup Helper"
echo "============================================"
echo ""

# Check current n8n config
N8N_API_KEY=$(grep "^n8n_api_key=" .env 2>/dev/null | cut -d'=' -f2)
N8N_WEBHOOK=$(grep "^n8n_webhook_url=" .env 2>/dev/null | cut -d'=' -f2)
N8N_BASE=$(grep "^n8n_base_url=" .env 2>/dev/null | cut -d'=' -f2)

echo "Current Configuration:"
echo "---------------------"
if [ -z "$N8N_API_KEY" ]; then
    echo "❌ n8n_api_key: Not set"
else
    echo "✅ n8n_api_key: Set (${#N8N_API_KEY} chars)"
fi

if [ -z "$N8N_WEBHOOK" ]; then
    echo "❌ n8n_webhook_url: Not set"
else
    echo "✅ n8n_webhook_url: $N8N_WEBHOOK"
fi

if [ -z "$N8N_BASE" ]; then
    echo "❌ n8n_base_url: Not set"
else
    echo "✅ n8n_base_url: $N8N_BASE"
fi

echo ""
echo "============================================"
echo ""

if [ -z "$N8N_WEBHOOK" ] && [ -z "$N8N_API_KEY" ]; then
    echo "📋 Setup Instructions:"
    echo ""
    echo "Option 1: Using n8n Webhook (Recommended)"
    echo "----------------------------------------"
    echo "1. Open your n8n instance"
    echo "2. Create a new workflow"
    echo "3. Add 'Webhook' node as trigger"
    echo "4. Set HTTP Method: POST"
    echo "5. Copy the Webhook URL"
    echo "6. Add to .env file:"
    echo ""
    echo "   n8n_webhook_url=https://your-n8n.com/webhook/xxxxx"
    echo ""
    echo "Option 2: Using n8n API"
    echo "----------------------"
    echo "1. Go to n8n Settings → API"
    echo "2. Generate API Key"
    echo "3. Add to .env file:"
    echo ""
    echo "   n8n_api_key=your_api_key_here"
    echo "   n8n_base_url=https://your-n8n.com"
    echo ""
    echo "============================================"
    echo ""
    echo "After configuration, test with:"
    echo "  curl http://localhost:5000/api/n8n/status"
    echo ""
else
    echo "✅ n8n appears to be configured!"
    echo ""
    echo "Testing connection..."
    if command -v curl &> /dev/null; then
        curl -s http://localhost:5000/api/n8n/status | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5000/api/n8n/status
    else
        echo "Install curl to test the connection"
    fi
    echo ""
fi

echo ""
echo "============================================"
echo "📚 Next Steps:"
echo "============================================"
echo ""
echo "1. Configure n8n webhook URL in .env"
echo "2. Create n8n workflows (see n8n-workflows/ folder)"
echo "3. Test automation: npm run test:automation"
echo "4. Deploy to Vercel with environment variables"
echo ""
