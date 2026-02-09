import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";

async function checkUserRole() {
  console.log("🔍 Checking user role for Syed.hasan@joinfleek.com...\n");

  try {
    const allUsers = await db.select().from(users);

    const user = allUsers.find(u =>
      u.email.toLowerCase() === 'syed.hasan@joinfleek.com'
    );

    if (!user) {
      console.log("❌ User not found!\n");
      console.log("Available users:");
      allUsers.slice(0, 10).forEach(u => {
        console.log(`  - ${u.email} (${u.role})`);
      });
      process.exit(1);
      return;
    }

    console.log("👤 User Details:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Department: ${user.department || 'N/A'}`);
    console.log(`   Is Active: ${user.isActive}`);
    console.log("");

    console.log("🔒 Routing Rules Access:");
    const allowedRoles = ["Owner", "Admin", "Head", "Manager"];
    const hasAccess = allowedRoles.includes(user.role || "");

    if (hasAccess) {
      console.log(`   ✅ ${user.role} role HAS access to edit routing rules`);
    } else {
      console.log(`   ❌ ${user.role} role DOES NOT have access to edit routing rules`);
      console.log(`   Required roles: ${allowedRoles.join(", ")}`);
      console.log("");
      console.log("💡 Solution:");
      console.log(`   Update user role to one of: ${allowedRoles.join(", ")}`);
    }
    console.log("");

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

checkUserRole();
