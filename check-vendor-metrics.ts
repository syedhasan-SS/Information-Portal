#!/usr/bin/env tsx
import { BigQuery } from '@google-cloud/bigquery';

async function checkVendorMetrics() {
  const bigquery = new BigQuery({ projectId: 'dogwood-baton-345622' });
  const query = `SELECT * FROM \`dogwood-baton-345622.aurora_postgres_public.vendor_metrics\` LIMIT 1`;
  const locations = ['us-west1', 'US'];

  for (const location of locations) {
    try {
      const [rows] = await bigquery.query({ query, location });
      if (rows.length > 0) {
        console.log('vendor_metrics sample:');
        console.log(JSON.stringify(rows[0], null, 2));
        return;
      }
    } catch (e: any) {
      if (!e.message.includes('not found in location')) {
        console.log('Error:', e.message);
      }
    }
  }
}

checkVendorMetrics();
