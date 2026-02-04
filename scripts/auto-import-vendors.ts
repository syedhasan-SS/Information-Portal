#!/usr/bin/env tsx
/**
 * Automated Vendor Import Script
 * Run this to populate your database with vendors from BigQuery
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║    🚀  AUTOMATED VENDOR IMPORT FROM BIGQUERY  🚀          ║');
console.log('║                                                            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// Check if BigQuery is configured
const hasProjectId = !!process.env.BIGQUERY_PROJECT_ID;
const hasCredentials = !!(
  process.env.BIGQUERY_CREDENTIALS_JSON ||
  fs.existsSync(path.join(process.cwd(), 'service-account-key.json'))
);

console.log('Pre-flight Checks:');
console.log('─────────────────');
console.log(hasProjectId ? '✅ BIGQUERY_PROJECT_ID configured' : '❌ BIGQUERY_PROJECT_ID missing');
console.log(hasCredentials ? '✅ BigQuery credentials found' : '❌ BigQuery credentials missing');
console.log('');

if (!hasProjectId || !hasCredentials) {
  console.log('❌ BigQuery not configured!');
  console.log('');
  console.log('Please run: ./setup-bigquery.sh');
  console.log('');
  process.exit(1);
}

console.log('🔄 Starting vendor import...');
console.log('');

try {
  // Run the import script
  execSync('npx tsx import-vendors-from-bigquery.ts', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║  ✅  VENDOR IMPORT COMPLETE!  ✅                          ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('🎉 Vendors are now available in your portal!');
  console.log('');
  console.log('Next steps:');
  console.log('  • Start the server: npm run dev');
  console.log('  • Create a ticket and test vendor dropdown');
  console.log('  • Set up n8n automation: ./setup-n8n.sh');
  console.log('');
} catch (error: any) {
  console.log('');
  console.log('❌ Import failed!');
  console.log('');
  console.log('Error:', error.message);
  console.log('');
  console.log('Troubleshooting:');
  console.log('  1. Check BigQuery credentials');
  console.log('  2. Verify table exists: aurora_postgres_public.vendors');
  console.log('  3. Check database connection: DATABASE_URL');
  console.log('  4. Review error details above');
  console.log('');
  process.exit(1);
}
