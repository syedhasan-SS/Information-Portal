#!/usr/bin/env tsx
/**
 * Create a default "Uncategorized" category for tickets without specific categories
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { categories } from "./shared/schema";
import * as dotenv from 'dotenv';
import { eq } from "drizzle-orm";

dotenv.config();

async function createDefaultCategory() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    console.log('🔧 Creating default "Uncategorized" category...\n');

    // Check if it already exists
    const existing = await db.select()
      .from(categories)
      .where(eq(categories.path, 'General / Uncategorized / Other'))
      .limit(1);

    if (existing.length > 0) {
      console.log('✅ Default category already exists:', existing[0].id);
      console.log('   Path:', existing[0].path);
      await pool.end();
      return existing[0].id;
    }

    // Create the default category
    const result = await db.insert(categories).values({
      issueType: 'Request',
      l1: 'General',
      l2: 'Uncategorized',
      l3: 'Other',
      l4: null,
      path: 'General / Uncategorized / Other',
      departmentType: 'Seller Support',
      issuePriorityPoints: 0,
      responseTime: 24,
      resolutionTime: 48,
    }).returning();

    console.log('✅ Created default category:', result[0].id);
    console.log('   Path:', result[0].path);
    console.log('   Department:', result[0].departmentType);
    console.log('\nThis category can be used for tickets without specific categorization.\n');

    await pool.end();
    return result[0].id;

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createDefaultCategory().then(id => {
  console.log(`\n💡 Use this category ID as default: ${id}`);
  console.log('You can now create tickets without selecting a specific category!\n');
});
