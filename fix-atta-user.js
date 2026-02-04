// Quick fix script for user "atta" role issue
import { db } from "./server/db.js";
import { users } from "./shared/schema.js";
import { eq, sql } from "drizzle-orm";

async function fixUserRoles() {
  try {
    console.log("🔍 Finding user 'atta'...");

    // Get user atta
    const attaUsers = await db.select().from(users).where(
      sql`LOWER(${users.email}) LIKE '%atta%'`
    );

    if (attaUsers.length === 0) {
      console.log("❌ User 'atta' not found");
      return;
    }

    const atta = attaUsers[0];
    console.log("\n📊 Current state:");
    console.log("Email:", atta.email);
    console.log("Name:", atta.name);
    console.log("role (singular):", atta.role);
    console.log("roles (array):", atta.roles);

    // Fix the role field
    if (atta.roles && atta.roles.length > 0) {
      const primaryRole = atta.roles[0];
      console.log("\n🔧 Fixing role field to match roles array...");
      console.log("Setting role to:", primaryRole);

      await db.update(users)
        .set({
          role: primaryRole,
          updatedAt: new Date()
        })
        .where(eq(users.id, atta.id));

      console.log("✅ Fixed!");

      // Verify
      const fixed = await db.select().from(users).where(eq(users.id, atta.id));
      console.log("\n✅ After fix:");
      console.log("role:", fixed[0].role);
      console.log("roles:", fixed[0].roles);
    } else {
      console.log("\n⚠️  User has no roles array, cannot fix");
    }

    // Also fix all other users with mismatched roles
    console.log("\n🔧 Fixing all users with mismatched roles...");
    const result = await db.execute(sql`
      UPDATE users
      SET role = roles[1], updated_at = NOW()
      WHERE roles IS NOT NULL
        AND array_length(roles, 1) > 0
        AND role != roles[1]
    `);

    console.log("✅ Fixed all users!");
    console.log("\n🎉 Done! User 'atta' should now have correct permissions.");
    console.log("👉 Ask atta to logout and login again.");

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    process.exit(0);
  }
}

fixUserRoles();
