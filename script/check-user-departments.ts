import "dotenv/config";
import { db } from "../server/db";
import { users, tickets } from "../shared/schema";
import { eq, or } from "drizzle-orm";

async function checkUserDepartments() {
  console.log("🔍 Checking user departments...\n");

  try {
    // Check Tooba and Basil's departments
    const allUsers = await db.select().from(users);
    console.log(`📊 Total users in database: ${allUsers.length}\n`);

    // Find users with similar emails (case-insensitive)
    const targetUsers = allUsers.filter(u =>
      u.email.toLowerCase().includes('tooba') ||
      u.email.toLowerCase().includes('basil')
    );

    if (targetUsers.length === 0) {
      console.log("⚠️ No users found matching 'tooba' or 'basil'\n");
      console.log("Sample users:");
      allUsers.slice(0, 5).forEach(u => {
        console.log(`  - ${u.email}`);
      });
      return;
    }

    console.log("👥 User Details:");
    targetUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email})`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Department: ${user.department || 'NOT SET'}`);
      console.log(`    Sub-Department: ${user.subDepartment || 'N/A'}`);
      console.log("");
    });

    // Check Tooba's tickets
    const toobaUser = targetUsers.find(u => u.email.toLowerCase().includes('tooba'));
    if (toobaUser) {
      const allTickets = await db.select().from(tickets);
      const toobaTickets = allTickets.filter(t => t.createdById === toobaUser.id);

      console.log(`\n🎫 Tooba's Tickets (${toobaTickets.length} total):`);
      toobaTickets.forEach(ticket => {
        console.log(`  - ${ticket.ticketNumber}: ${ticket.subject}`);
        console.log(`    Department: ${ticket.department}`);
        console.log(`    Status: ${ticket.status}`);
        console.log("");
      });
    }

    // Check all recent tickets
    const allTickets = await db.select().from(tickets);
    console.log(`\n📊 Total tickets: ${allTickets.length}`);
    console.log("\n🆕 Most recent 10 tickets:");
    allTickets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .forEach(ticket => {
        const creator = allUsers.find(u => u.id === ticket.createdById);
        console.log(`  - ${ticket.ticketNumber}: ${ticket.subject}`);
        console.log(`    Creator: ${creator?.email || 'Unknown'}`);
        console.log(`    Department: ${ticket.department}`);
        console.log(`    Status: ${ticket.status}`);
        console.log("");
      });

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

checkUserDepartments();
