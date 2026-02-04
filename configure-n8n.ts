#!/usr/bin/env tsx
/**
 * Interactive n8n Configuration Script
 * Helps you set up n8n integration quickly
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║    🔗  n8n INTEGRATION CONFIGURATOR  🔗                   ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('This will help you configure n8n integration in 3 easy steps!');
  console.log('');

  // Check current configuration
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const currentWebhook = envContent.match(/^N8N_WEBHOOK_URL=(.*)$/m)?.[1] ||
                         envContent.match(/^n8n_webhook_url=(.*)$/m)?.[1];
  const currentApiKey = envContent.match(/^N8N_API_KEY=(.*)$/m)?.[1] ||
                        envContent.match(/^n8n_api_key=(.*)$/m)?.[1];

  console.log('Current Configuration:');
  console.log('─────────────────────');
  if (currentWebhook) {
    console.log(`✅ Webhook URL: ${currentWebhook.substring(0, 50)}...`);
  } else {
    console.log('❌ Webhook URL: Not configured');
  }
  if (currentApiKey) {
    console.log(`✅ API Key: ${'*'.repeat(currentApiKey.length)}`);
  } else {
    console.log('⚠️  API Key: Not configured (optional)');
  }
  console.log('');

  // Ask if user wants to configure
  const configure = await question('Do you want to configure n8n now? (yes/no): ');

  if (configure.toLowerCase() !== 'yes' && configure.toLowerCase() !== 'y') {
    console.log('');
    console.log('Setup cancelled. Run this script again when ready!');
    rl.close();
    return;
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 1/3: n8n Webhook URL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('To get your webhook URL:');
  console.log('1. Open your n8n instance');
  console.log('2. Create a new workflow');
  console.log('3. Add a "Webhook" node');
  console.log('4. Set HTTP Method to POST');
  console.log('5. Copy the webhook URL');
  console.log('');

  const webhookUrl = await question('Enter your n8n webhook URL: ');

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2/3: n8n API Key (Optional)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('API key is optional but recommended for production.');
  console.log('Leave blank to skip.');
  console.log('');

  const apiKey = await question('Enter your n8n API key (or press Enter to skip): ');

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 3/3: Saving Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Update .env file
  let newEnvContent = envContent;

  // Remove old n8n config
  newEnvContent = newEnvContent.replace(/^N8N_WEBHOOK_URL=.*$/m, '');
  newEnvContent = newEnvContent.replace(/^n8n_webhook_url=.*$/m, '');
  newEnvContent = newEnvContent.replace(/^N8N_API_KEY=.*$/m, '');
  newEnvContent = newEnvContent.replace(/^n8n_api_key=.*$/m, '');

  // Add new configuration
  const n8nConfig = `
# n8n Integration (Auto-configured)
N8N_WEBHOOK_URL=${webhookUrl}${apiKey ? `\nN8N_API_KEY=${apiKey}` : ''}
`;

  newEnvContent = newEnvContent.trim() + '\n' + n8nConfig + '\n';

  fs.writeFileSync(envPath, newEnvContent);

  console.log('✅ Configuration saved to .env');
  console.log('');

  // Test the configuration
  console.log('🧪 Testing n8n connection...');
  console.log('');

  try {
    const testPayload = {
      event: 'test.connection',
      data: { message: 'Configuration test from Information Portal' },
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-N8N-API-KEY': apiKey } : {}),
      },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      console.log('✅ n8n webhook is working!');
      console.log(`   Response: ${response.status} ${response.statusText}`);
    } else {
      console.log('⚠️  Webhook responded but with error:');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log('');
      console.log('This might be okay - check your n8n workflow execution log.');
    }
  } catch (error: any) {
    console.log('⚠️  Could not reach webhook:');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('This might be because:');
    console.log('  • n8n workflow is not activated');
    console.log('  • Wrong webhook URL');
    console.log('  • Network/firewall issue');
    console.log('');
    console.log('Check your n8n instance and try again!');
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║  ✅  n8n CONFIGURATION COMPLETE!  ✅                      ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Import n8n workflows from: n8n-workflows/');
  console.log('  2. Start your server: npm run dev');
  console.log('  3. Test: curl http://localhost:5000/api/n8n/status');
  console.log('  4. Create a ticket and watch the magic! 🎉');
  console.log('');

  rl.close();
}

main().catch(console.error);
