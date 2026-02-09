import "dotenv/config";
import { db } from "../server/db";
import { users, userPageAccessOverrides, rolePageAccess, pagePermissions } from "../shared/schema";

async function checkAllPermissions() {
  console.log("🔍 Checking page permissions status...\n");

  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`📊 Total users: ${allUsers.length}\n`);

    // Get all pages
    const allPages = await db.select().from(pagePermissions);
    console.log(`📄 Total pages: ${allPages.length}\n`);

    // Get all user-specific overrides
    const userOverrides = await db.select().from(userPageAccessOverrides);
    console.log(`🎯 User-specific overrides: ${userOverrides.length}`);

    if (userOverrides.length > 0) {
      console.log("\n⚠️ Users with custom page access overrides:");
      userOverrides.forEach(override => {
        const user = allUsers.find(u => u.id === override.userId);
        const page = allPages.find(p => p.pageKey === override.pageKey);
        console.log(`  - ${user?.email || 'Unknown'}`);
        console.log(`    Page: ${page?.displayName || override.pageKey}`);
        console.log(`    Access: ${override.isEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log("");
      });
    } else {
      console.log("✅ No user-specific overrides found. All users use role defaults.\n");
    }

    // Get all role-based access
    const roleAccess = await db.select().from(rolePageAccess);
    console.log(`📋 Role-based access rules: ${roleAccess.length}`);

    if (roleAccess.length > 0) {
      console.log("\n⚠️ Roles with custom page access:");
      const roleGroups = roleAccess.reduce((acc, access) => {
        if (!acc[access.roleId]) acc[access.roleId] = [];
        acc[access.roleId].push(access);
        return acc;
      }, {} as Record<string, typeof roleAccess>);

      Object.entries(roleGroups).forEach(([roleId, accesses]) => {
        console.log(`\n  Role: ${roleId}`);
        accesses.forEach(access => {
          const page = allPages.find(p => p.pageKey === access.pageKey);
          console.log(`    - ${page?.displayName || access.pageKey}: ${access.isEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        });
      });
    } else {
      console.log("✅ No role-based overrides found. All roles use page defaults.\n");
    }

    // Summary
    console.log("\n📊 SUMMARY:");
    console.log(`  Total Users: ${allUsers.length}`);
    console.log(`  Total Pages: ${allPages.length}`);
    console.log(`  User Overrides: ${userOverrides.length}`);
    console.log(`  Role Overrides: ${roleAccess.length}`);

    if (userOverrides.length === 0 && roleAccess.length === 0) {
      console.log("\n✅ ALL PERMISSIONS ARE USING DEFAULT SETTINGS");
      console.log("   All users can access pages based on page default settings.");
    } else {
      console.log("\n⚠️ CUSTOM PERMISSIONS ARE ACTIVE");
      console.log("   Some users or roles have custom page access configured.");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

checkAllPermissions();
