import { Client } from 'pg';

async function addMultiRoleSupport() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log("🔧 Adding multi-role support to users table...\n");

  // Step 1: Check if roles column exists
  const checkColumn = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='users' AND column_name='roles'
  `);

  if (checkColumn.rows.length === 0) {
    console.log("📊 Adding 'roles' column to users table...");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN roles text[]
    `);
    console.log("✅ Column added successfully!");
  } else {
    console.log("✅ 'roles' column already exists");
  }

  console.log("");

  // Step 2: Check if sub_department column exists
  const checkSubDept = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='users' AND column_name='sub_department'
  `);

  if (checkSubDept.rows.length === 0) {
    console.log("📊 Adding 'sub_department' column to users table...");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN sub_department text
    `);
    console.log("✅ Column added successfully!");
  } else {
    console.log("✅ 'sub_department' column already exists");
  }

  console.log("");

  // Step 3: Check if custom_permissions column exists
  const checkPerms = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='users' AND column_name='custom_permissions'
  `);

  if (checkPerms.rows.length === 0) {
    console.log("📊 Adding 'custom_permissions' column to users table...");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN custom_permissions text[]
    `);
    console.log("✅ Column added successfully!");
  } else {
    console.log("✅ 'custom_permissions' column already exists");
  }

  console.log("");

  // Step 4: Update the owner to have both Owner and Lead roles
  const ownerEmail = "syed.hasan@joinfleek.com";
  console.log(`👤 Updating ${ownerEmail} to have multi-role support...`);

  // Get current user
  const userResult = await client.query(
    'SELECT email, name, role, roles, department, sub_department FROM users WHERE LOWER(email) = LOWER($1)',
    [ownerEmail]
  );

  if (userResult.rows.length === 0) {
    console.log("❌ User not found!");
    await client.end();
    process.exit(1);
  }

  const user = userResult.rows[0];
  console.log("\n📋 Current user data:");
  console.log("  Email:", user.email);
  console.log("  Name:", user.name);
  console.log("  Primary Role:", user.role);
  console.log("  Roles Array:", user.roles);
  console.log("  Department:", user.department);
  console.log("  Sub-Department:", user.sub_department);
  console.log("");

  // Update to have both Owner and Lead roles, with Owner as primary
  console.log("🔧 Setting multi-role configuration:");
  console.log("  Primary Role: Owner");
  console.log("  All Roles: ['Owner', 'Lead']");
  console.log("  Sub-Department: Seller Support");
  console.log("");

  await client.query(
    `UPDATE users
     SET role = $1,
         roles = $2,
         sub_department = $3,
         updated_at = NOW()
     WHERE LOWER(email) = LOWER($4)`,
    ['Owner', ['Owner', 'Lead'], 'Seller Support', ownerEmail]
  );

  console.log("✅ Multi-role configuration complete!");
  console.log("");
  console.log("🎉 You now have:");
  console.log("   • Primary role: Owner (highest permissions)");
  console.log("   • Additional role: Lead (for Seller Support team)");
  console.log("   • Sub-department: Seller Support");
  console.log("");
  console.log("💡 The system will use Owner permissions (highest role)");
  console.log("   Please refresh your browser to see the changes.");

  await client.end();
  process.exit(0);
}

addMultiRoleSupport().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
