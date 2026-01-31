import "dotenv/config";
import { db } from "./db";
import { categoryHierarchy, tags } from "@shared/schema";
import { sql } from "drizzle-orm";

async function backfillDepartmentTypes() {
  console.log("Starting backfill of department types...");

  try {
    // Update category_hierarchy records
    const categoryResult = await db.execute(sql`
      UPDATE category_hierarchy
      SET department_type = 'All'
      WHERE department_type IS NULL
    `);
    console.log(`✓ Updated category_hierarchy records`);

    // Update tags records
    const tagsResult = await db.execute(sql`
      UPDATE tags
      SET department_type = 'All'
      WHERE department_type IS NULL
    `);
    console.log(`✓ Updated tags records`);

    // Verify the updates
    const verification = await db.execute(sql`
      SELECT 'Category Hierarchy' as table_name,
             COUNT(*) as total_records,
             COUNT(CASE WHEN department_type = 'All' THEN 1 END) as all_dept,
             COUNT(CASE WHEN department_type = 'Seller Support' THEN 1 END) as seller_support,
             COUNT(CASE WHEN department_type = 'Customer Support' THEN 1 END) as customer_support
      FROM category_hierarchy

      UNION ALL

      SELECT 'Tags' as table_name,
             COUNT(*) as total_records,
             COUNT(CASE WHEN department_type = 'All' THEN 1 END) as all_dept,
             COUNT(CASE WHEN department_type = 'Seller Support' THEN 1 END) as seller_support,
             COUNT(CASE WHEN department_type = 'Customer Support' THEN 1 END) as customer_support
      FROM tags
    `);

    console.log("\n=== Verification Results ===");
    console.table(verification.rows);
    console.log("\n✅ Backfill completed successfully!");

  } catch (error) {
    console.error("❌ Error during backfill:", error);
    process.exit(1);
  }

  process.exit(0);
}

backfillDepartmentTypes();
