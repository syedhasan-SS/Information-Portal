import "dotenv/config";
import { db } from "../server/db";
import { roles, rolePermissions, rolePageAccess, pagePermissions } from "../shared/schema";

async function showRolePermissions() {
  console.log("🔍 Role-Based Permissions Configuration\n");
  console.log("=" . repeat(60) + "\n");

  try {
    // Get all roles
    const allRoles = await db.select().from(roles);
    console.log(`📋 Total Roles: ${allRoles.length}\n`);

    // Get all page permissions
    const allPages = await db.select().from(pagePermissions);

    // Get all role permissions (old system)
    const allRolePermissions = await db.select().from(rolePermissions);

    // Get all role page access (new system)
    const allRolePageAccess = await db.select().from(rolePageAccess);

    // Display each role
    for (const role of allRoles) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📌 ROLE: ${role.name}`);
      console.log(`   Display Name: ${role.displayName}`);
      console.log(`   ID: ${role.id}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Show old permission system
      const rolePerms = allRolePermissions.filter(rp => rp.roleId === role.id);
      if (rolePerms.length > 0) {
        console.log(`\n  📜 Feature Permissions (Old System):`);
        rolePerms.forEach(perm => {
          console.log(`     ✓ ${perm.permissionName}`);
        });
      }

      // Show new page access system
      const rolePages = allRolePageAccess.filter(rpa => rpa.roleId === role.id);
      if (rolePages.length > 0) {
        console.log(`\n  📄 Page Access Overrides (New System):`);
        rolePages.forEach(access => {
          const page = allPages.find(p => p.pageKey === access.pageKey);
          const status = access.isEnabled ? '✅ ENABLED' : '❌ DISABLED';
          console.log(`     ${status} - ${page?.displayName || access.pageKey}`);
        });
      }

      if (rolePerms.length === 0 && rolePages.length === 0) {
        console.log(`\n  ℹ️  No custom permissions configured - using defaults`);
      }
    }

    console.log("\n\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Roles: ${allRoles.length}`);
    console.log(`Feature Permissions Configured: ${allRolePermissions.length}`);
    console.log(`Page Access Rules Configured: ${allRolePageAccess.length}`);
    console.log("");

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

showRolePermissions();
