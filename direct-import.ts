#!/usr/bin/env tsx

/**
 * Direct vendor import script
 * This script directly imports vendor data that you provide from BigQuery
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { eq } from "drizzle-orm";
import * as dotenv from 'dotenv';

dotenv.config();

interface VendorRow {
  handle: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gmv_tier?: string | null;
  gmv_90_day?: number | null;
  kam?: string | null;
  zone?: string | null;
  region?: string | null;
  country?: string | null;
  geo?: string | null;
  persona?: string | null;
}

async function importVendors(vendorData: VendorRow[]) {
  console.log('🚀 Starting direct vendor import...\n');
  console.log(`📊 Processing ${vendorData.length} vendors\n`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  let importedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  try {
    for (const row of vendorData) {
      try {
        // Check if vendor exists
        const existing = await db.select()
          .from(vendors)
          .where(eq(vendors.handle, row.handle))
          .limit(1);

        const vendorRecord = {
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
            .set({ ...vendorRecord, updatedAt: new Date() })
            .where(eq(vendors.handle, row.handle));
          updatedCount++;
          console.log(`✅ Updated: ${row.handle} - ${row.name}`);
        } else {
          await db.insert(vendors).values(vendorRecord);
          importedCount++;
          console.log(`✅ Imported: ${row.handle} - ${row.name}`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error: ${row.handle} - ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Complete!');
    console.log('='.repeat(60));
    console.log(`✅ New vendors: ${importedCount}`);
    console.log(`🔄 Updated vendors: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

  } finally {
    await pool.end();
  }
}

// Sample data for testing - replace with actual BigQuery data
const sampleVendors: VendorRow[] = [
  {
    handle: 'vendor_test_001',
    name: 'Test Vendor 1',
    email: 'test1@example.com',
    country: 'US',
    geo: 'North America'
  },
];

if (require.main === module) {
  console.log('📝 To use this script:');
  console.log('1. Query BigQuery to get vendor data');
  console.log('2. Pass the data to importVendors() function\n');
  console.log('Running with sample data for demonstration...\n');
  importVendors(sampleVendors);
}

export { importVendors };
