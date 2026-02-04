#!/usr/bin/env tsx
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { like, or } from "drizzle-orm";
import * as dotenv from 'dotenv';

dotenv.config();

async function checkVendors() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Count total vendors
    const allVendors = await db.select().from(vendors);
    console.log(`📊 Total vendors in database: ${allVendors.length}\n`);

    // Search for specific vendors
    const searchTerms = ['creed-vintage', 'diamond-vintage', 'vintage', 'fleek'];

    for (const term of searchTerms) {
      const results = await db.select()
        .from(vendors)
        .where(
          or(
            like(vendors.handle, `%${term}%`),
            like(vendors.name, `%${term}%`)
          )
        )
        .limit(5);

      console.log(`🔍 Search results for "${term}": ${results.length} found`);
      results.forEach(v => {
        console.log(`   ✅ ${v.name} (${v.handle})`);
      });
      console.log('');
    }

    // Show sample vendors
    console.log('📋 Sample vendors:');
    const sample = allVendors.slice(0, 10);
    sample.forEach(v => {
      console.log(`   ${v.name} (${v.handle})`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendors();
