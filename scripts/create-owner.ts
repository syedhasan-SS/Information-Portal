import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function createOwner() {
  try {
    console.log("Creating owner user...");

    const ownerEmail = "Syed.hasan@joinfleek.com";
    const ownerPassword = "owner123";
    const ownerName = "Syed Faez Hasan Rizvi";

    // Check if owner exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, ownerEmail))
      .limit(1);

    if (existing.length > 0) {
      console.log("Owner user already exists. Updating...");
      await db
        .update(users)
        .set({
          password: ownerPassword,
          name: ownerName,
          role: "Owner",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.email, ownerEmail));
    } else {
      console.log("Creating new owner user...");
      await db.insert(users).values({
        email: ownerEmail,
        password: ownerPassword, // In production, use bcrypt!
        name: ownerName,
        role: "Owner",
        isActive: true,
      });
    }

    console.log("\n✅ Owner user created successfully!");
    console.log("\nCredentials:");
    console.log(`Email: ${ownerEmail}`);
    console.log(`Password: ${ownerPassword}`);
    console.log("\n⚠️  IMPORTANT: Change this password after first login!\n");

    process.exit(0);
  } catch (error) {
    console.error("Error creating owner:", error);
    process.exit(1);
  }
}

createOwner();
