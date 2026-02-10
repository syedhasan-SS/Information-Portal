import { Client } from 'pg';

async function findOwner() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log("🔍 Searching for Owner or users with 'hasan' in email...\n");

  const res = await client.query(`
    SELECT email, name, role, department
    FROM users
    WHERE email LIKE '%hasan%' OR email LIKE '%syed%' OR role = 'Owner'
    ORDER BY role DESC, email
    LIMIT 20
  `);

  if (res.rows.length === 0) {
    console.log("❌ No matching users found!");
    console.log("\nLet me show all users:");
    const allUsers = await client.query(`
      SELECT email, name, role, department
      FROM users
      ORDER BY role, email
      LIMIT 10
    `);
    console.log("\nUsers in database:");
    allUsers.rows.forEach(u => {
      console.log(`  ${u.email} | ${u.name} | ${u.role} | ${u.department || 'N/A'}`);
    });
  } else {
    console.log("Found users:");
    res.rows.forEach(u => {
      console.log(`  ${u.email} | ${u.name} | ${u.role} | ${u.department || 'N/A'}`);
    });
  }

  await client.end();
  process.exit(0);
}

findOwner().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
