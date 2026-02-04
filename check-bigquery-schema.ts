#!/usr/bin/env tsx
/**
 * Check BigQuery table schema
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  const projectId = 'dogwood-baton-345622';
  const bigquery = new BigQuery({ projectId });

  console.log('🔍 Checking BigQuery table schema...\n');

  try {
    // Try to get table metadata
    const dataset = bigquery.dataset('aurora_postgres_public');
    const [tables] = await dataset.getTables();

    console.log('📊 Available tables in aurora_postgres_public:');
    tables.forEach(table => {
      console.log(`   - ${table.id}`);
    });

    // Check if vendors table exists
    if (tables.some(t => t.id === 'vendors')) {
      console.log('\n✅ Found vendors table!');
      console.log('\n🔍 Fetching schema...');

      const [table] = await dataset.table('vendors').get();
      const [metadata] = await dataset.table('vendors').getMetadata();

      console.log('\n📋 Columns:');
      if (metadata.schema && metadata.schema.fields) {
        metadata.schema.fields.forEach((field: any) => {
          console.log(`   - ${field.name} (${field.type})`);
        });
      }

      // Try to fetch a sample row
      console.log('\n📊 Sample data (first row):');
      const query = `SELECT * FROM \`${projectId}.aurora_postgres_public.vendors\` LIMIT 1`;

      const locations = ['US', 'us-central1', 'us-west1', 'us-east1', 'us-west2'];
      for (const location of locations) {
        try {
          const [rows] = await bigquery.query({ query, location });
          if (rows.length > 0) {
            console.log(JSON.stringify(rows[0], null, 2));
            console.log(`\n✅ Query succeeded in location: ${location}`);
            break;
          }
        } catch (error: any) {
          if (!error.message.includes('was not found in location')) {
            console.error(`Error in ${location}:`, error.message);
          }
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
