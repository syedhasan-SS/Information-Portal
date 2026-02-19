/**
 * Test Slack Channel Routing
 * Tests department-specific notification channels and multi-channel routing
 *
 * Usage: tsx script/test-slack-channels.ts
 */

import dotenv from 'dotenv';
import { getNotificationChannels, getChannelName, logRoutingDecision } from '../server/slack-routing';

dotenv.config();

interface TestCase {
  name: string;
  context: {
    department: string;
    priorityTier?: string;
    status?: string;
    isEscalated?: boolean;
    slaStatus?: string;
    ownerTeam?: string;
  };
  expectedChannels: string[];
}

const testCases: TestCase[] = [
  {
    name: '1. CX Department - Normal Priority',
    context: {
      department: 'CX',
      priorityTier: 'medium',
      status: 'Open',
    },
    expectedChannels: ['SLACK_CHANNEL_CX'],
  },
  {
    name: '2. CX Department - Customer Support Subdepartment',
    context: {
      department: 'CX',
      ownerTeam: 'Customer Support',
      priorityTier: 'medium',
      status: 'Open',
    },
    expectedChannels: ['SLACK_CHANNEL_CX_CUSTOMER_SUPPORT'],
  },
  {
    name: '3. Finance Department - Normal Priority',
    context: {
      department: 'Finance',
      priorityTier: 'low',
      status: 'In Progress',
    },
    expectedChannels: ['SLACK_CHANNEL_FINANCE'],
  },
  {
    name: '4. Operations Department - Urgent Priority',
    context: {
      department: 'Operations',
      priorityTier: 'urgent',
      status: 'Open',
    },
    expectedChannels: ['SLACK_CHANNEL_OPERATIONS', 'SLACK_CHANNEL_URGENT'],
  },
  {
    name: '5. QA Department - Critical Priority',
    context: {
      department: 'QA',
      priorityTier: 'critical',
      status: 'Open',
    },
    expectedChannels: ['SLACK_CHANNEL_QA', 'SLACK_CHANNEL_URGENT'],
  },
  {
    name: '6. CX Department - Escalated Ticket',
    context: {
      department: 'CX',
      priorityTier: 'medium',
      status: 'Escalated',
    },
    expectedChannels: ['SLACK_CHANNEL_CX', 'SLACK_CHANNEL_ESCALATION'],
  },
  {
    name: '7. Finance Department - SLA Breach',
    context: {
      department: 'Finance',
      priorityTier: 'medium',
      status: 'In Progress',
      slaStatus: 'breached',
    },
    expectedChannels: ['SLACK_CHANNEL_FINANCE', 'SLACK_CHANNEL_SLA_BREACH'],
  },
  {
    name: '8. Operations - Urgent + Escalated + SLA Breach',
    context: {
      department: 'Operations',
      priorityTier: 'urgent',
      status: 'Escalated',
      isEscalated: true,
      slaStatus: 'breached',
    },
    expectedChannels: [
      'SLACK_CHANNEL_OPERATIONS',
      'SLACK_CHANNEL_URGENT',
      'SLACK_CHANNEL_ESCALATION',
      'SLACK_CHANNEL_SLA_BREACH',
    ],
  },
  {
    name: '9. Unknown Department - Fallback',
    context: {
      department: 'UnknownDept',
      priorityTier: 'medium',
      status: 'Open',
    },
    expectedChannels: ['SLACK_CHANNEL_ID'], // Main fallback channel
  },
];

function checkEnvironmentVariables(): boolean {
  console.log('🔍 Checking Environment Variables...\n');

  const requiredVars = [
    'SLACK_CHANNEL_ID', // Fallback channel
    'SLACK_CHANNEL_CX',
    'SLACK_CHANNEL_FINANCE',
    'SLACK_CHANNEL_OPERATIONS',
    'SLACK_CHANNEL_QA',
    'SLACK_CHANNEL_URGENT',
    'SLACK_CHANNEL_ESCALATION',
    'SLACK_CHANNEL_SLA_BREACH',
  ];

  const optionalVars = [
    'SLACK_CHANNEL_CX_CUSTOMER_SUPPORT',
    'SLACK_CHANNEL_CX_SELLER_SUPPORT',
  ];

  let allRequired = true;

  console.log('Required Channels:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${value}`);
    } else {
      console.log(`  ❌ ${varName}: NOT SET`);
      allRequired = false;
    }
  });

  console.log('\nOptional Channels:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${value}`);
    } else {
      console.log(`  ⚠️  ${varName}: NOT SET (optional)`);
    }
  });

  console.log('\n');
  return allRequired;
}

function runTests() {
  console.log('🧪 Testing Slack Channel Routing Logic\n');
  console.log('═'.repeat(80));
  console.log('\n');

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`\n📋 Test Case ${index + 1}: ${testCase.name}`);
    console.log('─'.repeat(80));

    // Get channels that would be notified
    const channels = getNotificationChannels(testCase.context);

    // Log the routing decision
    logRoutingDecision(testCase.context, channels);

    // Display results
    console.log('\n🎯 Results:');
    console.log(`  Expected Channels: ${testCase.expectedChannels.join(', ')}`);
    console.log(`  Actual Channels:   ${channels.map(c => getChannelName(c)).join(', ')}`);

    // Check if all expected channels are present
    const expectedEnvVars = testCase.expectedChannels.filter(varName => process.env[varName]);
    const expectedChannelIds = expectedEnvVars.map(varName => process.env[varName]!);

    const allExpectedPresent = expectedChannelIds.every(id => channels.includes(id));
    const noExtraChannels = channels.every(id =>
      expectedChannelIds.includes(id) || id === process.env.SLACK_CHANNEL_ID
    );

    if (allExpectedPresent && (noExtraChannels || channels.length === 0)) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED');
      console.log(`     Missing: ${expectedChannelIds.filter(id => !channels.includes(id)).join(', ') || 'none'}`);
      console.log(`     Extra: ${channels.filter(id => !expectedChannelIds.includes(id) && id !== process.env.SLACK_CHANNEL_ID).join(', ') || 'none'}`);
      failed++;
    }

    console.log('');
  });

  console.log('═'.repeat(80));
  console.log('\n📊 Test Summary:');
  console.log(`  Total Tests: ${testCases.length}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log('\n');

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Please check your environment variables in .env file.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed! Your Slack channel routing is configured correctly.');
  }
}

function main() {
  console.log('🚀 Slack Channel Routing Test Suite\n');
  console.log('═'.repeat(80));
  console.log('\n');

  // Step 1: Check environment variables
  const envVarsOk = checkEnvironmentVariables();

  if (!envVarsOk) {
    console.log('❌ Missing required environment variables.');
    console.log('\n💡 Setup Instructions:');
    console.log('  1. Run: tsx script/get-slack-channel-ids.ts');
    console.log('  2. Copy the channel IDs to your .env file');
    console.log('  3. Run this test again\n');
    process.exit(1);
  }

  // Step 2: Run routing tests
  runTests();
}

// Run the test suite
main();
