#!/usr/bin/env tsx
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { eq } from "drizzle-orm";
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSpecific() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const handles = ['creed-vintage', 'diamond-vintage', 'creed-women', 'diamond-vintage-1'];

  console.log('🔍 Checking specific vendors in database:\n');

  for (const handle of handles) {
    const result = await db.select().from(vendors).where(eq(vendors.handle, handle));
    if (result.length > 0) {
      console.log(`✅ ${handle} → ${result[0].name}`);
    } else {
      console.log(`❌ ${handle} → Not imported yet`);
    }
  }

  await pool.end();
}

checkSpecific();
