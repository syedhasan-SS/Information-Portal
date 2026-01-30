import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";

async function testLogin() {
  try {
    const testEmail = "syed.hasan@joinfleek.com"; // lowercase
    const testPassword = "owner123";

    console.log("Testing login with:", testEmail);
    console.log("---");

    // Test the SQL query
    console.log("\nTest 1: Using sql template (current implementation)");
    const results1 = await db.select().from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${testEmail})`)
      .limit(1);

    console.log("Found user:", results1.length > 0 ? "YES" : "NO");
    if (results1.length > 0) {
      console.log("User email:", results1[0].email);
      console.log("Password match:", results1[0].password === testPassword ? "YES" : "NO");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testLogin();
