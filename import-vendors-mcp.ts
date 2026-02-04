import * as dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { eq } from "drizzle-orm";

// Load environment variables
dotenv.config();

interface VendorData {
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

async function importVendorsFromData(vendorDataArray: VendorData[]) {
  console.log('🚀 Starting vendor import...\n');

  // Initialize database connection
  console.log('🔄 Connecting to application database...');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    console.log(`✅ Found ${vendorDataArray.length} vendors to import\n`);

    if (vendorDataArray.length === 0) {
      console.log('⚠️  No vendors to import');
      await pool.end();
      return;
    }

    // Import vendors into application database
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    console.log('🔄 Importing vendors...\n');

    for (const row of vendorDataArray) {
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

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(`✅ New vendors imported: ${importedCount}`);
    console.log(`🔄 Existing vendors updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Total processed: ${vendorDataArray.length}`);
    console.log('='.repeat(60) + '\n');

    console.log('🎉 Vendor import completed successfully!\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('✅ Database connection closed');
  }
}

// Export for use
export { importVendorsFromData };

// If run directly, show usage
if (require.main === module) {
  console.log('This script should be called with vendor data.');
  console.log('Use the BigQuery MCP connector to query vendors first.');
}
