#!/usr/bin/env tsx

/**
 * Quick vendor sync script
 * Uses the portal's existing BigQuery setup to import vendors
 */

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function syncVendors() {
  console.log('🚀 Starting vendor sync from BigQuery...\n');
  console.log('📡 Connecting to portal API...\n');

  try {
    // Call the sync endpoint
    const response = await axios.post(`${BASE_URL}/api/automation/bigquery/sync-vendors`, {
      timeout: 60000
    });

    if (response.data.success) {
      console.log('✅ Vendor sync completed successfully!\n');
      console.log('📊 Summary:');
      console.log(`   New vendors imported: ${response.data.imported || 0}`);
      console.log(`   Existing vendors updated: ${response.data.updated || 0}`);
      console.log(`   Errors: ${response.data.errors || 0}\n`);

      if (response.data.errorDetails && response.data.errorDetails.length > 0) {
        console.log('❌ Error details:');
        response.data.errorDetails.forEach((err: any) => {
          console.log(`   - ${err.vendor}: ${err.error}`);
        });
      }
    } else {
      console.error('❌ Sync failed:', response.data.error);
      process.exit(1);
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Could not connect to portal server');
      console.error('   Make sure the server is running: npm run dev\n');
      process.exit(1);
    } else if (error.response) {
      console.error('❌ Sync failed:', error.response.data);
      process.exit(1);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/bigquery/test`, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if portal server is running...\n');

  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('❌ Portal server is not running!\n');
    console.log('Please start the server first:');
    console.log('   npm run dev\n');
    console.log('Then run this script again.\n');
    process.exit(1);
  }

  console.log('✅ Server is running\n');
  await syncVendors();
}

main();
