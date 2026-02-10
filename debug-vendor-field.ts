import { db } from "./server/db";
import { ticketFieldConfigurations } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkVendorField() {
  console.log("🔍 Checking vendorHandle field configuration...\n");

  const vendorField = await db
    .select()
    .from(ticketFieldConfigurations)
    .where(eq(ticketFieldConfigurations.fieldName, "vendorHandle"));

  if (vendorField.length === 0) {
    console.log("❌ vendorHandle field not found in ticket_field_configurations!");
  } else {
    console.log("✅ vendorHandle field configuration:");
    console.log(JSON.stringify(vendorField[0], null, 2));
  }

  process.exit(0);
}

checkVendorField().catch(console.error);
