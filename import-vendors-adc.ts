#!/usr/bin/env tsx
/**
 * Import vendors using Application Default Credentials
 * This works with gcloud CLI authentication or MCP BigQuery connectors
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { eq } from "drizzle-orm";

dotenv.config();

interface BigQueryVendor {
  handle: string;
  name: string;
  email?: string;
  phone?: string;
  gmv_tier?: string;
  gmv_90_day?: number;
  kam?: string;
  zone?: string;
  region?: string;
  country?: string;
  geo?: string;
  persona?: string;
}

async function importVendors() {
  console.log('🚀 Starting vendor import from BigQuery (using ADC)...\n');

  const projectId = process.env.BIGQUERY_PROJECT_ID || 'dogwood-baton-345622';

  console.log('🔄 Connecting to BigQuery with Application Default Credentials...');

  // Initialize BigQuery with ADC (no credentials needed if gcloud is configured)
  const bigquery = new BigQuery({ projectId });

  // Initialize database
  console.log('🔄 Connecting to application database...');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    console.log('🔄 Fetching vendors from BigQuery...');

    const query = `
      SELECT
        handle,
        name,
        email,
        phone,
        gmv_tier,
        gmv_90_day,
        kam,
        zone,
        region,
        country,
        geo,
        persona
      FROM \`${projectId}.aurora_postgres_public.vendors\`
      WHERE handle IS NOT NULL
      ORDER BY handle
    `;

    // Try different locations
    let rows;
    const locations = ['US', 'us-central1', 'us-west1', 'us-east1'];

    for (const location of locations) {
      try {
        console.log(`🔄 Trying location: ${location}...`);
        [rows] = await bigquery.query({
          query,
          location,
        });
        console.log(`✅ Successfully queried from location: ${location}`);
        break;
      } catch (error: any) {
        if (error.message.includes('was not found in location')) {
          continue;
        }
        throw error;
      }
    }

    if (!rows) {
      throw new Error('Dataset not found in any location');
    }

    console.log(`✅ Found ${rows.length} vendors in BigQuery\n`);

    if (rows.length === 0) {
      console.log('⚠️  No vendors found');
      await pool.end();
      return;
    }

    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    console.log('🔄 Importing vendors...\n');

    for (const row of rows as BigQueryVendor[]) {
      try {
        const existing = await db.select()
          .from(vendors)
          .where(eq(vendors.handle, row.handle))
          .limit(1);

        const vendorData = {
          handle: row.handle,
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          gmvTier: row.gmv_tier as any || null,
          gmv90Day: row.gmv_90_day || null,
          kam: row.kam || null,
          zone: row.zone || null,
          region: row.region || null,
          country: row.country || null,
          geo: row.geo || null,
          persona: row.persona || null,
        };

        if (existing.length > 0) {
          await db.update(vendors)
            .set({ ...vendorData, updatedAt: new Date() })
            .where(eq(vendors.handle, row.handle));
          updatedCount++;
          console.log(`✅ Updated: ${row.handle} (${row.name})`);
        } else {
          await db.insert(vendors).values(vendorData);
          importedCount++;
          console.log(`✅ Imported: ${row.handle} (${row.name})`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error processing ${row.handle}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(`✅ New vendors imported: ${importedCount}`);
    console.log(`🔄 Existing vendors updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Total processed: ${rows.length}`);
    console.log('='.repeat(60) + '\n');

    console.log('🎉 Vendor import completed successfully!\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Tip: Make sure you have gcloud CLI installed and authenticated');
      console.error('   Run: gcloud auth application-default login\n');
    }
    process.exit(1);
  } finally {
    await pool.end();
    console.log('✅ Database connection closed');
  }
}

importVendors();
