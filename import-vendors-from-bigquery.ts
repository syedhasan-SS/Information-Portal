import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { eq } from "drizzle-orm";

// Load environment variables
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
  console.log('🚀 Starting vendor import from BigQuery...\n');

  // 1. Initialize BigQuery client
  const projectId = process.env.BIGQUERY_PROJECT_ID || 'dogwood-baton-345622';
  const credentialsPath = process.env.BIGQUERY_CREDENTIALS_PATH;
  const credentialsJson = process.env.BIGQUERY_CREDENTIALS_JSON;

  if (!projectId) {
    console.error('❌ BIGQUERY_PROJECT_ID is required');
    process.exit(1);
  }

  const options: any = { projectId };

  if (credentialsJson) {
    try {
      options.credentials = JSON.parse(credentialsJson);
    } catch (err) {
      console.error('❌ Invalid BIGQUERY_CREDENTIALS_JSON:', err);
      process.exit(1);
    }
  } else if (credentialsPath) {
    options.keyFilename = credentialsPath;
  } else {
    console.error('❌ Either BIGQUERY_CREDENTIALS_PATH or BIGQUERY_CREDENTIALS_JSON is required');
    process.exit(1);
  }

  console.log('🔄 Connecting to BigQuery...');
  const bigquery = new BigQuery(options);

  // 2. Initialize database connection
  console.log('🔄 Connecting to application database...');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // 3. Query vendors from BigQuery
    console.log('🔄 Fetching vendors from BigQuery (aurora_postgres_public.vendors)...');

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

    const [rows] = await bigquery.query({
      query,
      location: process.env.BIGQUERY_LOCATION || 'US',
    });

    console.log(`✅ Found ${rows.length} vendors in BigQuery\n`);

    if (rows.length === 0) {
      console.log('⚠️  No vendors found in BigQuery table');
      await pool.end();
      return;
    }

    // 4. Import vendors into application database
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('🔄 Importing vendors...\n');

    for (const row of rows as BigQueryVendor[]) {
      try {
        // Check if vendor already exists
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
          // Update existing vendor
          await db.update(vendors)
            .set({
              ...vendorData,
              updatedAt: new Date(),
            })
            .where(eq(vendors.handle, row.handle));

          updatedCount++;
          console.log(`✅ Updated: ${row.handle} (${row.name})`);
        } else {
          // Insert new vendor
          await db.insert(vendors).values(vendorData);
          importedCount++;
          console.log(`✅ Imported: ${row.handle} (${row.name})`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error processing ${row.handle}: ${error.message}`);
      }
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(`✅ New vendors imported: ${importedCount}`);
    console.log(`🔄 Existing vendors updated: ${updatedCount}`);
    console.log(`⏭️  Vendors skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Total processed: ${rows.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.errors) {
      console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  } finally {
    await pool.end();
    console.log('✅ Database connection closed');
  }
}

// Run the import
importVendors();
