/**
 * Get Slack Channel IDs
 *
 * Helper script to retrieve channel IDs for department channels
 * Usage: tsx script/get-slack-channel-ids.ts
 */

import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';

dotenv.config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function getChannelIds() {
  console.log('🔍 Fetching Slack channels...\n');

  try {
    const result = await slack.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 1000,
    });

    if (!result.channels) {
      console.error('❌ No channels found');
      return;
    }

    // Filter to relevant channels
    const relevantChannels = result.channels.filter(c =>
      c.name?.includes('ticket') ||
      c.name?.includes('complaint') ||
      c.name?.includes('flow') ||
      c.name?.includes('cx') ||
      c.name?.includes('finance') ||
      c.name?.includes('operations') ||
      c.name?.includes('qa') ||
      c.name?.includes('alert') ||
      c.name?.includes('escalation') ||
      c.name?.includes('urgent') ||
      c.name?.includes('sla')
    );

    console.log('📋 Relevant Slack Channels:\n');
    console.log('════════════════════════════════════════════════════════');

    relevantChannels.forEach(channel => {
      console.log(`Channel: #${channel.name}`);
      console.log(`ID:      ${channel.id}`);
      console.log(`Members: ${channel.num_members || 0}`);
      console.log(`Type:    ${channel.is_private ? 'Private' : 'Public'}`);
      console.log('────────────────────────────────────────────────────────');
    });

    console.log('\n💡 Environment Variables for .env:\n');
    console.log('════════════════════════════════════════════════════════\n');

    // Generate environment variables
    const envVars: string[] = [];

    relevantChannels.forEach(channel => {
      const channelName = channel.name || '';

      // Map channel names to environment variable names
      let envName = '';

      if (channelName.includes('cx') && !channelName.includes('ticket')) {
        if (channelName.includes('customer')) {
          envName = 'SLACK_CHANNEL_CX_CUSTOMER_SUPPORT';
        } else if (channelName.includes('seller')) {
          envName = 'SLACK_CHANNEL_CX_SELLER_SUPPORT';
        } else {
          envName = 'SLACK_CHANNEL_CX';
        }
      } else if (channelName.includes('finance')) {
        envName = 'SLACK_CHANNEL_FINANCE';
      } else if (channelName.includes('operations') || channelName.includes('ops')) {
        envName = 'SLACK_CHANNEL_OPERATIONS';
      } else if (channelName.includes('qa') || channelName.includes('quality')) {
        envName = 'SLACK_CHANNEL_QA';
      } else if (channelName.includes('urgent')) {
        envName = 'SLACK_CHANNEL_URGENT';
      } else if (channelName.includes('escalation')) {
        envName = 'SLACK_CHANNEL_ESCALATION';
      } else if (channelName.includes('sla')) {
        envName = 'SLACK_CHANNEL_SLA_BREACH';
      } else if (channelName.includes('general') || channelName.includes('main')) {
        envName = 'SLACK_CHANNEL_ID';
      }

      if (envName) {
        envVars.push(`${envName}=${channel.id}  # #${channelName}`);
      } else {
        // Generic mapping
        const genericName = channelName.toUpperCase().replace(/-/g, '_');
        envVars.push(`SLACK_CHANNEL_${genericName}=${channel.id}  # #${channelName}`);
      }
    });

    // Remove duplicates and sort
    const uniqueVars = [...new Set(envVars)].sort();
    uniqueVars.forEach(v => console.log(v));

    console.log('\n📝 Instructions:\n');
    console.log('1. Copy the environment variables above');
    console.log('2. Add them to your .env file');
    console.log('3. Update channel IDs as needed');
    console.log('4. Deploy to production');
    console.log('\n✅ Done!');

  } catch (error: any) {
    console.error('❌ Error fetching channels:', error.message);

    if (error.message.includes('invalid_auth') || error.message.includes('not_authed')) {
      console.error('\n⚠️  Invalid Slack token. Please check SLACK_BOT_TOKEN in .env');
      console.error('   Make sure the token starts with xoxb-');
    } else if (error.message.includes('missing_scope')) {
      console.error('\n⚠️  Missing OAuth scopes. Your bot needs:');
      console.error('   - channels:read');
      console.error('   - groups:read');
      console.error('   Add these scopes in Slack App settings');
    }
  }
}

getChannelIds();
