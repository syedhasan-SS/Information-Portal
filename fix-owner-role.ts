import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq, sql } from "drizzle-orm";

async function fixOwnerRole() {
  const ownerEmail = "syed.hasan@joinfleek.com";

  console.log(`🔍 Checking user: ${ownerEmail}\n`);

  // Get current user data (select only existing columns)
  const [user] = await db
    .select({
      email: users.email,
      name: users.name,
      role: users.role,
      department: users.department,
      subDepartment: users.subDepartment,
    })
    .from(users)
    .where(eq(users.email, ownerEmail));

  if (!user) {
    console.log("❌ User not found!");
    process.exit(1);
  }

  console.log("📋 Current user data:");
  console.log("  Email:", user.email);
  console.log("  Name:", user.name);
  console.log("  Primary Role:", user.role);
  console.log("  Department:", user.department);
  console.log("  Sub-Department:", user.subDepartment);
  console.log("");

  // Check if roles column exists
  const checkRolesColumn = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='users' AND column_name='roles'
  `);

  const rolesColumnExists = checkRolesColumn.rows.length > 0;
  console.log(`📊 Roles column exists: ${rolesColumnExists}`);
  console.log("");

  if (user.role === "Owner") {
    console.log("✅ User already has Owner role - no fix needed!");
    process.exit(0);
  }

  // Fix: Set primary role back to Owner
  console.log("🔧 Fixing role...");
  console.log(`  Current role: ${user.role}`);
  console.log("  Setting primary role to: Owner");
  console.log("");

  if (rolesColumnExists) {
    // If roles column exists, also set the roles array
    await db
      .update(users)
      .set({
        role: "Owner",
        roles: ["Owner", "Lead"],
      })
      .where(eq(users.email, ownerEmail));
    console.log("  ✓ Set role to Owner");
    console.log("  ✓ Set roles array to ['Owner', 'Lead']");
  } else {
    // Just update the primary role
    await db
      .update(users)
      .set({
        role: "Owner",
      })
      .where(eq(users.email, ownerEmail));
    console.log("  ✓ Set role to Owner");
  }

  console.log("");
  console.log("✅ User role fixed successfully!");
  console.log("");
  console.log("🎉 All Owner permissions restored!");
  console.log("   Please refresh your browser to see the changes.");

  process.exit(0);
}

fixOwnerRole().catch(console.error);
