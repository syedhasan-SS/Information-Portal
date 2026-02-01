import { db } from "./db";
import { vendors, categories, ticketFieldConfigurations } from "@shared/schema";

const MOCK_VENDORS = [
  { handle: "vendor_fleek_moda", name: "Fleek Moda", gmvTier: "XL" as const, kam: "Ayesha Khan", zone: "West", persona: "Strategic" },
  { handle: "vendor_silverlane", name: "Silverlane", gmvTier: "L" as const, kam: "Rohan Mehta", zone: "North", persona: "Growth" },
  { handle: "vendor_kora_home", name: "Kora Home", gmvTier: "M" as const, kam: "Sana Iqbal", zone: "South", persona: "Core" },
  { handle: "vendor_aurora", name: "Aurora", gmvTier: "S" as const, kam: "Hamza Ali", zone: "Central", persona: "Long-tail" },
  { handle: "vendor_nimbus", name: "Nimbus", gmvTier: "M" as const, kam: "Neha Kapoor", zone: "East", persona: "Core" },
];

const CATEGORY_PATHS = [
  "Complaint > Finance > Payment > Payment Not Processed",
  "Complaint > Finance > Payment > Account Statement Reconciliation",
  "Complaint > Finance > Payment > Order amount not Included > Shipping data is missing",
  "Complaint > Finance > Payment > Order amount not Included > AR Issue",
  "Complaint > Finance > Payment > Payout Not Received",
  "Complaint > Finance > Payment > ROW - Postage Reimbusrment",
  "Complaint > Finance > Payment > Transfer Receipt Required",
  "Information > Finance > Payment > Payment Process Information",
  "Information > Finance > Payment > Comission Information",
  "Information > Finance > Payment > Payout Details Inquiry",
  "Information > Operations > Order Related Information > Cancellation Reason Required",
  "Information > Operations > Order Related Information > How to fulfil order",
  "Information > Operations > Order Related Information > Pickup Information",
  "Complaint > Operations > Order Issue > Pickup Not Aligned",
  "Information > Marketplace > Product Listing > Product Approval Information",
  "Complaint > Marketplace > Product Listing > Product Approval Request",
  "Information > Marketplace > Product Listing > Rework Guidelines",
  "Information > Marketplace > Product Listing > Product Activation/ Deactivation",
  "Information > Marketplace > Seller Rating and Review > Seller Rating Information",
  "Request > Tech > Account Details Update Request > Shop Name Update",
  "Request > Experience > Account Details Update Request > Profile Picture Update",
  "Request > Tech > Account Details Update Request > BIO Update",
  "Request > Tech > Account Details Update Request > Email Address Update",
  "Request > Tech > Account Details Update Request > Password Update Request",
  "Information > Tech > Account Details Update Information > How to change shop name",
  "Information > Experience > Account Details Update Information > How to change profile picture",
  "Complaint > Operations > Shipping Charges Issue > Extra shipping charged",
  "Information > Operations > Shipping Charges Information > Shipping Calculation - Exact Listing",
  "Information > Operations > Shipping Charges Information > Shipping Calculation - Custom Listing",
  "Request > Operations > Quality Check > QC skip request",
  "Complaint > Operations > Quality Check > RTV request",
  "Complaint > CX > Quality Check > Channel not created",
  "Request > CX > Quality Check > QC hold delay",
  "Information > CX > Quality Check > QC hold reason required",
  "Information > CX > Quality Check > QC grading guidelines",
  "Complaint > CX > Seller Refund > Incorrect Refund Charged",
  "Information > CX > Seller Refund > Refund Related Information",
  "Information > Operations > Order related Information > Order Tracking",
  "Information > Tech > Account Details Information > Login Credentials Required",
  "Information > Tech > Seller Stories > How to Upload a Story",
  "Complaint > Tech > Seller Stories > Story Not Visible",
  "Complaint > Tech > Seller Stories > Story Upload Issues",
  "Request > Tech > Seller Stories > Story Activation Request",
  "Information > Seller Support > General > Contact reason not found",
  "Information > Seller Support > General > Elaboration/ Details required",
  "Information > Seller Support > General > Dead & Drop Chat",
  "Information > Marketplace > Bank Account Details > Bank Account Details Update",
  "Complaint > Marketplace > Product Listing > Product Upload Issue",
  "Request > Tech > Account Details Update Request > Phone number Update",
  "Information > Marketplace > Seller Onboarding > How to become a seller",
  "Information > Marketplace > Cancellation Fee > Cancellation Fee related infomation",
  "Information > Operations > Stock Liquidation > Stock Liquidation Infrormation",
  "Information > Operations > Stock Liquidation > Stock Liquidation - Media Required",
  "Request > Operations > Stock Liquidation > Liquidation Stock – Dispatch Request for New Orders",
  "Complaint > Marketplace > Cancellation Fee > Incorrect Fee Applied",
  "Information > Marketplace > Seller Rating and Review > Review Related Information",
  "Information > Marketplace > Product Listing > Product Listing Information",
  "Information > Marketplace > Promotion & Discount > Make an Offer",
  "Information > Marketplace > Promotion & Discount > Campaign Discount Info",
];

// Default ticket form fields to be managed via Custom Field Manager
const DEFAULT_TICKET_FIELDS = [
  {
    fieldName: "vendorHandle",
    fieldLabel: "Vendor Handle",
    fieldType: "text" as const,
    departmentType: "All" as const,
    isEnabled: true,
    isRequired: true,
    displayOrder: 1,
    metadata: {
      placeholder: "Enter or search vendor handle",
      helpText: "The unique identifier for the vendor/seller",
    },
  },
  {
    fieldName: "department",
    fieldLabel: "Department",
    fieldType: "select" as const,
    departmentType: "All" as const,
    isEnabled: true,
    isRequired: true,
    displayOrder: 2,
    metadata: {
      placeholder: "Select department",
      helpText: "The department responsible for handling this ticket",
      options: [
        { label: "Finance", value: "Finance" },
        { label: "Operations", value: "Operations" },
        { label: "Marketplace", value: "Marketplace" },
        { label: "Tech", value: "Tech" },
        { label: "Supply", value: "Supply" },
        { label: "Growth", value: "Growth" },
      ],
    },
  },
  {
    fieldName: "issueType",
    fieldLabel: "Issue Type",
    fieldType: "select" as const,
    departmentType: "All" as const,
    isEnabled: true,
    isRequired: true,
    displayOrder: 3,
    metadata: {
      placeholder: "Select issue type",
      helpText: "The type of issue being reported",
      options: [
        { label: "Complaint", value: "Complaint" },
        { label: "Request", value: "Request" },
        { label: "Information", value: "Information" },
      ],
    },
  },
  {
    fieldName: "categoryId",
    fieldLabel: "Category",
    fieldType: "select" as const,
    departmentType: "All" as const,
    isEnabled: true,
    isRequired: true,
    displayOrder: 4,
    metadata: {
      placeholder: "Select category",
      helpText: "The specific category for this ticket (filtered by department and issue type)",
    },
  },
  {
    fieldName: "subject",
    fieldLabel: "Subject",
    fieldType: "text" as const,
    departmentType: "All" as const,
    isEnabled: true,
    isRequired: true,
    displayOrder: 5,
    metadata: {
      placeholder: "Brief summary of the issue",
      helpText: "A short title describing the ticket",
    },
  },
  {
    fieldName: "description",
    fieldLabel: "Description",
    fieldType: "textarea" as const,
    departmentType: "All" as const,
    isEnabled: true,
    isRequired: true,
    displayOrder: 6,
    metadata: {
      placeholder: "Provide detailed description of the issue...",
      helpText: "Detailed explanation of the issue, including any relevant context",
    },
  },
  {
    fieldName: "fleekOrderIds",
    fieldLabel: "Fleek Order IDs",
    fieldType: "multiselect" as const,
    departmentType: "All" as const,
    isEnabled: true,
    isRequired: false,
    displayOrder: 7,
    metadata: {
      placeholder: "Select related order IDs",
      helpText: "Link this ticket to specific Fleek orders (optional)",
    },
  },
  {
    fieldName: "attachments",
    fieldLabel: "Attachments",
    fieldType: "file" as const,
    departmentType: "All" as const,
    isEnabled: true,
    isRequired: false,
    displayOrder: 8,
    metadata: {
      placeholder: "Upload files",
      helpText: "Attach relevant screenshots, documents, or other files",
    },
  },
];

function parseCategory(path: string) {
  const parts = path.split(">").map((s) => s.trim());
  const issueType = parts[0] as "Complaint" | "Request" | "Information";
  const l1 = parts[1] || "";
  const l2 = parts[2] || "";
  const l3 = parts[3] || "";
  const l4 = parts[4] || null;

  // Assign priority points based on issue type
  let issuePriorityPoints = 0;
  if (issueType === "Complaint") issuePriorityPoints = 30;
  else if (issueType === "Request") issuePriorityPoints = 20;
  else issuePriorityPoints = 10;

  return {
    issueType,
    l1,
    l2,
    l3,
    l4,
    path,
    issuePriorityPoints,
  };
}

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Seed vendors
    console.log("📦 Seeding vendors...");
    for (const vendor of MOCK_VENDORS) {
      await db.insert(vendors).values(vendor).onConflictDoNothing();
    }
    console.log(`✅ Seeded ${MOCK_VENDORS.length} vendors`);

    // Seed categories
    console.log("🏷️  Seeding categories...");
    for (const pathString of CATEGORY_PATHS) {
      const category = parseCategory(pathString);
      await db.insert(categories).values(category).onConflictDoNothing();
    }
    console.log(`✅ Seeded ${CATEGORY_PATHS.length} categories`);

    // Seed ticket field configurations
    console.log("📝 Seeding ticket field configurations...");
    for (const field of DEFAULT_TICKET_FIELDS) {
      await db.insert(ticketFieldConfigurations).values(field).onConflictDoNothing();
    }
    console.log(`✅ Seeded ${DEFAULT_TICKET_FIELDS.length} ticket field configurations`);

    console.log("✨ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
