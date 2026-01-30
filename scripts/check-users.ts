import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";

async function checkUsers() {
  try {
    console.log("Fetching all users from database...\n");

    const allUsers = await db.select().from(users);

    if (allUsers.length === 0) {
      console.log("No users found in database.");
    } else {
      console.log(`Found ${allUsers.length} user(s):\n`);
      allUsers.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.name}`);
        console.log(`Role: ${user.role}`);
        console.log(`Active: ${user.isActive}`);
        console.log(`Password: ${user.password}`);
        console.log("---");
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error fetching users:", error);
    process.exit(1);
  }
}

checkUsers();
