/**
 * Cleanup script to delete old routing rules that reference legacy categories
 * Run this before deploying the new schema that references categoryHierarchy
 */

import { db } from "./server/db";
import { categoryRoutingRules } from "@shared/schema";

async function cleanupOldRoutingRules() {
  console.log("🧹 Cleaning up old routing rules...");

  try {
    // Delete all existing routing rules (they reference old category IDs)
    const deleted = await db.delete(categoryRoutingRules);

    console.log("✅ Successfully deleted all old routing rules");
    console.log("📝 Note: You'll need to recreate routing rules using categories from Ticket Manager");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning up routing rules:", error);
    process.exit(1);
  }
}

cleanupOldRoutingRules();
