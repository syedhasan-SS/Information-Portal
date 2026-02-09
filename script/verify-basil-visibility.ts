import "dotenv/config";
import { db } from "../server/db";
import { users, tickets } from "../shared/schema";

async function verifyBasilVisibility() {
  console.log("🔍 Verifying Basil can see Tooba's tickets...\n");

  try {
    const allUsers = await db.select().from(users);
    const allTickets = await db.select().from(tickets);

    // Find Basil
    const basil = allUsers.find(u => u.email.toLowerCase().includes('basil'));
    if (!basil) {
      console.log("❌ Basil not found!");
      process.exit(1);
      return;
    }

    console.log("👤 Basil's Profile:");
    console.log(`   Email: ${basil.email}`);
    console.log(`   Department: ${basil.department}`);
    console.log(`   Sub-Department: ${basil.subDepartment}\n`);

    // Simulate the filtering logic from all-tickets.tsx for CX/Seller Support users
    const basilVisibleTickets = allTickets.filter(ticket => {
      const ticketDept = ticket.department;

      // Exclude empty departments
      if (!ticketDept || ticketDept.trim() === "") {
        return false;
      }

      // For CX department users with Seller Support sub-department
      if (basil.department === "CX" && basil.subDepartment === "Seller Support") {
        // Option 1: Ticket has department "Seller Support" (legacy)
        if (ticketDept === "Seller Support") {
          return true;
        }

        // Option 2: Ticket has department "CX" with Seller Support category (new tickets)
        if (ticketDept === "CX") {
          const categoryDepartmentType = ticket.categorySnapshot?.departmentType;
          return categoryDepartmentType === "Seller Support" || categoryDepartmentType === "All";
        }

        return false;
      }

      return false;
    });

    console.log(`📊 Basil can see ${basilVisibleTickets.length} tickets:\n`);

    // Show only open tickets (not Solved/Closed)
    const openTickets = basilVisibleTickets.filter(t =>
      t.status !== "Solved" && t.status !== "Closed"
    );

    console.log(`🎫 Open Tickets (${openTickets.length}):\n`);
    openTickets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach(ticket => {
        const creator = allUsers.find(u => u.id === ticket.createdById);
        console.log(`  - ${ticket.ticketNumber}: ${ticket.subject}`);
        console.log(`    Creator: ${creator?.email || 'Unknown'}`);
        console.log(`    Department: ${ticket.department}`);
        console.log(`    Status: ${ticket.status}`);
        console.log(`    Category Type: ${ticket.categorySnapshot?.departmentType || 'N/A'}`);
        console.log("");
      });

    // Check specifically for Tooba's tickets
    const tooba = allUsers.find(u => u.email.toLowerCase().includes('tooba'));
    if (tooba) {
      const toobaTickets = basilVisibleTickets.filter(t => t.createdById === tooba.id);
      console.log(`\n✅ Tooba's tickets visible to Basil: ${toobaTickets.length}`);

      if (toobaTickets.length > 0) {
        console.log("   Tickets:");
        toobaTickets.forEach(t => {
          console.log(`   - ${t.ticketNumber}: ${t.subject} (${t.status})`);
        });
      } else {
        console.log("   ⚠️ No Tooba tickets visible - checking why...\n");

        // Debug: Show all Tooba tickets and why they might not be visible
        const allToobaTickets = allTickets.filter(t => t.createdById === tooba.id);
        console.log(`   Tooba has ${allToobaTickets.length} total tickets:\n`);
        allToobaTickets.forEach(t => {
          console.log(`   - ${t.ticketNumber}: ${t.subject}`);
          console.log(`     Department: ${t.department}`);
          console.log(`     Category Type: ${t.categorySnapshot?.departmentType || 'NOT SET'}`);
          console.log(`     Status: ${t.status}`);
          console.log("");
        });
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

verifyBasilVisibility();
