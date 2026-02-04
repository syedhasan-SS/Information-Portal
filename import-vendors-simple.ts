#!/usr/bin/env tsx
/**
 * Import vendors from BigQuery using actual available columns
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { eq } from "drizzle-orm";

dotenv.config();

async function importVendors() {
  console.log('🚀 Starting vendor import from BigQuery...\n');

  const projectId = 'dogwood-baton-345622';
  const bigquery = new BigQuery({ projectId });

  console.log('🔄 Connecting to BigQuery...');

  // Initialize database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    console.log('🔄 Fetching vendors from BigQuery...');

    // Query using actual columns that exist in BigQuery
    const query = `
      SELECT
        handle,
        shop_name as name,
        email,
        phone,
        origin as country,
        zone,
        status
      FROM \`${projectId}.aurora_postgres_public.vendors\`
      WHERE handle IS NOT NULL
        AND status = 'ACTIVE'
        AND _fivetran_deleted = FALSE
      ORDER BY handle
      LIMIT 500
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'us-west1',
    });

    console.log(`✅ Found ${rows.length} active vendors in BigQuery\n`);

    if (rows.length === 0) {
      console.log('⚠️  No vendors found');
      await pool.end();
      return;
    }

    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    console.log('🔄 Importing vendors...\n');

    for (const row of rows as any[]) {
      try {
        const existing = await db.select()
          .from(vendors)
          .where(eq(vendors.handle, row.handle))
          .limit(1);

        const vendorData = {
          handle: row.handle,
          name: row.name || row.handle, // Fallback to handle if no shop name
          email: row.email || null,
          phone: row.phone || null,
          country: row.country || null,
          zone: row.zone || null,
          // These fields don't exist in BigQuery, set to null
          gmvTier: null,
          gmv90Day: null,
          kam: null,
          region: null,
          geo: row.country || null, // Use country as geo for now
          persona: null,
        };

        if (existing.length > 0) {
          await db.update(vendors)
            .set({ ...vendorData, updatedAt: new Date() })
            .where(eq(vendors.handle, row.handle));
          updatedCount++;
          console.log(`✅ Updated: ${row.handle} (${vendorData.name})`);
        } else {
          await db.insert(vendors).values(vendorData);
          importedCount++;
          console.log(`✅ Imported: ${row.handle} (${vendorData.name})`);
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
    console.log('💡 Note: GMV tier, KAM, region, and persona fields were not available');
    console.log('   in BigQuery and have been set to null. You can update these later.\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Tip: Make sure BigQuery is properly configured via MCP\n');
    }
    process.exit(1);
  } finally {
    await pool.end();
    console.log('✅ Database connection closed');
  }
}

importVendors();
