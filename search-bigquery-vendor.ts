#!/usr/bin/env tsx
/**
 * Search for specific vendor in BigQuery
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';

dotenv.config();

async function searchVendor(searchTerm: string) {
  const projectId = 'dogwood-baton-345622';
  const bigquery = new BigQuery({ projectId });

  console.log(`🔍 Searching BigQuery for vendor: "${searchTerm}"\n`);

  // Search in the comprehensive query
  const query = `
    WITH base AS (
      SELECT
        handle,
        MAX(email) AS email,
        MAX(origin) AS origin,
        MAX(phone_number) AS phone_number
      FROM fleek_vendor_app.sign_up
      WHERE LOWER(handle) LIKE LOWER('%${searchTerm}%')
      GROUP BY handle
    )
    SELECT
      base.*,
      vendors.shop_name
    FROM base
    LEFT JOIN \`${projectId}.aurora_postgres_public.vendors\` AS vendors
      ON vendors.handle = base.handle
    LIMIT 10
  `;

  try {
    const locations = ['us-west1', 'US'];
    for (const location of locations) {
      try {
        const [rows] = await bigquery.query({ query, location });

        if (rows.length > 0) {
          console.log(`✅ Found ${rows.length} matching vendors in BigQuery:\n`);
          rows.forEach((row: any) => {
            console.log(`   Handle: ${row.handle}`);
            console.log(`   Name: ${row.shop_name || 'N/A'}`);
            console.log(`   Email: ${row.email ? '✓' : '✗'}`);
            console.log(`   Phone: ${row.phone_number ? '✓' : '✗'}`);
            console.log(`   Origin: ${row.origin || 'N/A'}`);
            console.log('');
          });
        } else {
          console.log(`❌ No vendors found matching "${searchTerm}" in BigQuery`);
          console.log('\nThis means the vendor does not exist in your BigQuery tables.');
          console.log('Please verify the exact handle name in your BigQuery data.\n');
        }
        break;
      } catch (error: any) {
        if (!error.message.includes('was not found in location')) {
          throw error;
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Search for the vendors you mentioned
const searchTerms = ['creed-vintage', 'diamond-vintage', 'creed', 'diamond'];

async function searchAll() {
  for (const term of searchTerms) {
    await searchVendor(term);
    console.log('═'.repeat(60) + '\n');
  }
}

searchAll();
