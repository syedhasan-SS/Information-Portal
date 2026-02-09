import "dotenv/config";
import { db } from "../server/db";
import { users, tickets } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixCXTicketDepartments() {
  console.log("🔧 Fixing CX ticket departments...\n");

  try {
    // Get all users
    const allUsers = await db.select().from(users);

    // Find CX users
    const cxUsers = allUsers.filter(u => u.department === "CX");
    console.log(`👥 Found ${cxUsers.length} CX users:\n`);
    cxUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.subDepartment})`);
    });

    // Get all tickets created by CX users that are NOT in CX department
    const allTickets = await db.select().from(tickets);
    const cxUserIds = cxUsers.map(u => u.id);

    const misroutedTickets = allTickets.filter(ticket =>
      ticket.createdById &&
      cxUserIds.includes(ticket.createdById) &&
      ticket.department !== "CX"
    );

    console.log(`\n🎫 Found ${misroutedTickets.length} CX user tickets with wrong department:\n`);

    if (misroutedTickets.length === 0) {
      console.log("✅ No tickets need fixing. All CX tickets are correctly assigned!\n");
      process.exit(0);
      return;
    }

    // Show what will be fixed
    misroutedTickets.forEach(ticket => {
      const creator = allUsers.find(u => u.id === ticket.createdById);
      console.log(`  - ${ticket.ticketNumber}: ${ticket.subject}`);
      console.log(`    Creator: ${creator?.email}`);
      console.log(`    Current Department: ${ticket.department}`);
      console.log(`    Will change to: CX`);
      console.log(`    Owner Team stays: ${ticket.ownerTeam || ticket.department}`);
      console.log("");
    });

    console.log("🔄 Updating tickets...\n");

    // Fix each ticket
    let fixed = 0;
    for (const ticket of misroutedTickets) {
      try {
        await db.update(tickets)
          .set({
            department: "CX",
            // Keep ownerTeam as is for proper routing, or set it to current department if not set
            ownerTeam: ticket.ownerTeam || ticket.department
          })
          .where(eq(tickets.id, ticket.id));

        console.log(`✅ Fixed ${ticket.ticketNumber}`);
        fixed++;
      } catch (error) {
        console.error(`❌ Failed to fix ${ticket.ticketNumber}:`, error);
      }
    }

    console.log(`\n✨ Successfully fixed ${fixed} out of ${misroutedTickets.length} tickets!`);
    console.log("\n📊 Summary:");
    console.log(`  - Tickets updated: ${fixed}`);
    console.log(`  - All updated tickets now have department="CX"`);
    console.log(`  - Original routing preserved in ownerTeam field`);
    console.log(`  - CX team members can now see these tickets\n`);

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

fixCXTicketDepartments();
