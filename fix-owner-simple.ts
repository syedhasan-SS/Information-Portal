import { Client } from 'pg';

async function fixOwnerRole() {
  const ownerEmail = "syed.hasan@joinfleek.com";
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log(`🔍 Checking user: ${ownerEmail}\n`);

  // Get current user data
  const userResult = await client.query(
    'SELECT email, name, role, department FROM users WHERE email = $1',
    [ownerEmail]
  );

  if (userResult.rows.length === 0) {
    console.log("❌ User not found!");
    await client.end();
    process.exit(1);
  }

  const user = userResult.rows[0];

  console.log("📋 Current user data:");
  console.log("  Email:", user.email);
  console.log("  Name:", user.name);
  console.log("  Role:", user.role);
  console.log("  Department:", user.department);
  console.log("");

  if (user.role === "Owner") {
    console.log("✅ User already has Owner role - no fix needed!");
    await client.end();
    process.exit(0);
  }

  // Fix: Set role back to Owner
  console.log("🔧 Restoring Owner role...");
  console.log(`  Current role: ${user.role}`);
  console.log("  New role: Owner");
  console.log("");

  await client.query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2',
    ['Owner', ownerEmail]
  );

  console.log("✅ Role restored successfully!");
  console.log("");
  console.log("🎉 All Owner permissions have been restored!");
  console.log("   Please refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) to see the changes.");
  console.log("");

  await client.end();
  process.exit(0);
}

fixOwnerRole().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
