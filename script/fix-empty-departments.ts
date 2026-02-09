import "dotenv/config";
import { db } from "../server/db";
import { users, tickets, categories } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixEmptyDepartments() {
  console.log("🔍 Finding tickets with empty departments...\n");

  try {
    const allTickets = await db.select().from(tickets);
    const allUsers = await db.select().from(users);
    const allCategories = await db.select().from(categories);

    // Find tickets with empty or null departments
    const emptyDeptTickets = allTickets.filter(ticket =>
      !ticket.department || ticket.department.trim() === ""
    );

    console.log(`📊 Found ${emptyDeptTickets.length} tickets with empty departments:\n`);

    if (emptyDeptTickets.length === 0) {
      console.log("✅ No tickets with empty departments found!\n");
      process.exit(0);
      return;
    }

    // Show details
    for (const ticket of emptyDeptTickets) {
      const creator = allUsers.find(u => u.id === ticket.createdById);
      const category = allCategories.find(c => c.id === ticket.categoryId);

      console.log(`🎫 ${ticket.ticketNumber}: ${ticket.subject}`);
      console.log(`   Creator: ${creator?.email || 'Unknown'} (Dept: ${creator?.department || 'N/A'})`);
      console.log(`   Category: ${category?.name || 'N/A'} (Dept Type: ${category?.departmentType || 'N/A'})`);
      console.log(`   Current Department: "${ticket.department}"`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Created: ${ticket.createdAt}`);

      // Determine best department to assign
      let suggestedDept = "General";

      if (creator?.department) {
        // Use creator's department
        suggestedDept = creator.department;
        console.log(`   ✅ Suggested: Use creator's department "${suggestedDept}"`);
      } else if (category?.departmentType && category.departmentType !== "All") {
        // Use category's department type
        suggestedDept = category.departmentType;
        console.log(`   ✅ Suggested: Use category's department type "${suggestedDept}"`);
      } else {
        console.log(`   ⚠️  Suggested: Default to "General" department`);
      }

      console.log("");
    }

    console.log("🔄 Updating tickets...\n");

    let fixed = 0;
    for (const ticket of emptyDeptTickets) {
      const creator = allUsers.find(u => u.id === ticket.createdById);
      const category = allCategories.find(c => c.id === ticket.categoryId);

      let newDepartment = "General";

      if (creator?.department) {
        newDepartment = creator.department;
      } else if (category?.departmentType && category.departmentType !== "All") {
        newDepartment = category.departmentType;
      }

      try {
        await db.update(tickets)
          .set({
            department: newDepartment,
            ownerTeam: newDepartment
          })
          .where(eq(tickets.id, ticket.id));

        console.log(`✅ Updated ${ticket.ticketNumber} to department="${newDepartment}"`);
        fixed++;
      } catch (error) {
        console.error(`❌ Failed to update ${ticket.ticketNumber}:`, error);
      }
    }

    console.log(`\n✨ Successfully fixed ${fixed} out of ${emptyDeptTickets.length} tickets!`);
    console.log("\n📊 Summary:");
    console.log(`  - Tickets updated: ${fixed}`);
    console.log(`  - All updated tickets now have valid departments`);
    console.log(`  - These tickets will no longer be excluded from view\n`);

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

fixEmptyDepartments();
