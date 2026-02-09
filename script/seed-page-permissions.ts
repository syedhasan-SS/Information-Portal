import "dotenv/config";
import { db } from "../server/db";
import { pagePermissions, pageFeatures } from "../shared/schema";
import { sql } from "drizzle-orm";

async function seedPagePermissions() {
  console.log("🌱 Seeding page permissions...");

  try {
    // Check if data already exists
    const existingPages = await db.select().from(pagePermissions).limit(1);
    if (existingPages.length > 0) {
      console.log("✅ Page permissions already seeded. Skipping.");
      return;
    }

    // Seed default pages
    const pages = [
      { pageKey: 'dashboard', displayName: 'Dashboard', description: 'Main dashboard with overview statistics', category: 'Core', isActive: true, defaultEnabled: true },
      { pageKey: 'tickets', displayName: 'All Tickets', description: 'View and manage all support tickets', category: 'Tickets', isActive: true, defaultEnabled: true },
      { pageKey: 'my-tickets', displayName: 'My Tickets', description: 'View tickets assigned to me', category: 'Tickets', isActive: true, defaultEnabled: true },
      { pageKey: 'department-tickets', displayName: 'Department Tickets', description: 'View department-specific tickets', category: 'Tickets', isActive: true, defaultEnabled: true },
      { pageKey: 'ticket-detail', displayName: 'Ticket Detail', description: 'View and manage individual ticket details', category: 'Tickets', isActive: true, defaultEnabled: true },
      { pageKey: 'users', displayName: 'Users', description: 'Manage user accounts and permissions', category: 'Administration', isActive: true, defaultEnabled: false },
      { pageKey: 'vendors', displayName: 'Vendors', description: 'Manage vendor relationships', category: 'Business', isActive: true, defaultEnabled: true },
      { pageKey: 'analytics', displayName: 'Analytics', description: 'View performance analytics and reports', category: 'Reports', isActive: true, defaultEnabled: true },
      { pageKey: 'ticket-config', displayName: 'Ticket Configuration', description: 'Configure ticket categories and settings', category: 'Administration', isActive: true, defaultEnabled: false },
      { pageKey: 'routing-config', displayName: 'Routing Configuration', description: 'Configure ticket routing rules', category: 'Administration', isActive: true, defaultEnabled: false },
      { pageKey: 'roles', displayName: 'Roles Management', description: 'Manage user roles and permissions', category: 'Administration', isActive: true, defaultEnabled: false },
      { pageKey: 'org-hierarchy', displayName: 'Organization Hierarchy', description: 'View organizational structure', category: 'Administration', isActive: true, defaultEnabled: false },
      { pageKey: 'profile', displayName: 'Profile', description: 'User profile and settings', category: 'Core', isActive: true, defaultEnabled: true },
      { pageKey: 'notifications', displayName: 'Notifications', description: 'View system notifications', category: 'Core', isActive: true, defaultEnabled: true },
      { pageKey: 'product-requests', displayName: 'Product Requests', description: 'Manage product feature requests', category: 'Business', isActive: true, defaultEnabled: false },
      { pageKey: 'attendance', displayName: 'Attendance', description: 'View attendance records', category: 'HR', isActive: true, defaultEnabled: true },
      { pageKey: 'attendance-checkin', displayName: 'Attendance Check-in', description: 'Check in/out for attendance', category: 'HR', isActive: true, defaultEnabled: true },
      { pageKey: 'attendance-team', displayName: 'Team Attendance', description: 'View team attendance records', category: 'HR', isActive: true, defaultEnabled: false },
      { pageKey: 'leave-management', displayName: 'Leave Management', description: 'Manage leave requests', category: 'HR', isActive: true, defaultEnabled: true },
    ];

    console.log(`📄 Inserting ${pages.length} pages...`);
    for (const page of pages) {
      await db.insert(pagePermissions).values({
        pageKey: page.pageKey,
        displayName: page.displayName,
        description: page.description,
        category: page.category,
        isActive: page.isActive,
        defaultEnabled: page.defaultEnabled,
      }).onConflictDoNothing();
    }

    // Seed default features
    const features = [
      // Ticket features
      { pageKey: 'tickets', featureKey: 'create', displayName: 'Create Ticket', description: 'Create new tickets', featureType: 'crud', isActive: true, defaultEnabled: true },
      { pageKey: 'tickets', featureKey: 'read', displayName: 'View Tickets', description: 'View ticket list', featureType: 'crud', isActive: true, defaultEnabled: true },
      { pageKey: 'tickets', featureKey: 'update', displayName: 'Edit Tickets', description: 'Edit ticket details', featureType: 'crud', isActive: true, defaultEnabled: true },
      { pageKey: 'tickets', featureKey: 'delete', displayName: 'Delete Tickets', description: 'Delete tickets', featureType: 'crud', isActive: true, defaultEnabled: false },
      { pageKey: 'tickets', featureKey: 'export', displayName: 'Export Tickets', description: 'Export ticket data', featureType: 'export', isActive: true, defaultEnabled: true },
      { pageKey: 'tickets', featureKey: 'filters', displayName: 'Advanced Filters', description: 'Use advanced filtering', featureType: 'ui_section', isActive: true, defaultEnabled: true },

      // Users features
      { pageKey: 'users', featureKey: 'create', displayName: 'Create User', description: 'Create new users', featureType: 'crud', isActive: true, defaultEnabled: false },
      { pageKey: 'users', featureKey: 'read', displayName: 'View Users', description: 'View user list', featureType: 'crud', isActive: true, defaultEnabled: true },
      { pageKey: 'users', featureKey: 'update', displayName: 'Edit Users', description: 'Edit user details', featureType: 'crud', isActive: true, defaultEnabled: false },
      { pageKey: 'users', featureKey: 'delete', displayName: 'Delete Users', description: 'Delete users', featureType: 'crud', isActive: true, defaultEnabled: false },
      { pageKey: 'users', featureKey: 'export', displayName: 'Export Users', description: 'Export user data', featureType: 'export', isActive: true, defaultEnabled: false },

      // Analytics features
      { pageKey: 'analytics', featureKey: 'read', displayName: 'View Analytics', description: 'View analytics dashboard', featureType: 'crud', isActive: true, defaultEnabled: true },
      { pageKey: 'analytics', featureKey: 'export', displayName: 'Export Reports', description: 'Export analytics reports', featureType: 'export', isActive: true, defaultEnabled: true },
      { pageKey: 'analytics', featureKey: 'advanced_metrics', displayName: 'Advanced Metrics', description: 'Access advanced analytics', featureType: 'custom', isActive: true, defaultEnabled: false },

      // Attendance features
      { pageKey: 'attendance', featureKey: 'read', displayName: 'View Attendance', description: 'View attendance records', featureType: 'crud', isActive: true, defaultEnabled: true },
      { pageKey: 'attendance', featureKey: 'export', displayName: 'Export Attendance', description: 'Export attendance data', featureType: 'export', isActive: true, defaultEnabled: false },
      { pageKey: 'attendance-checkin', featureKey: 'checkin', displayName: 'Check In', description: 'Check in for work', featureType: 'custom', isActive: true, defaultEnabled: true },
      { pageKey: 'attendance-checkin', featureKey: 'checkout', displayName: 'Check Out', description: 'Check out from work', featureType: 'custom', isActive: true, defaultEnabled: true },
      { pageKey: 'attendance-team', featureKey: 'read', displayName: 'View Team', description: 'View team attendance', featureType: 'crud', isActive: true, defaultEnabled: true },
      { pageKey: 'attendance-team', featureKey: 'export', displayName: 'Export Team Data', description: 'Export team attendance', featureType: 'export', isActive: true, defaultEnabled: false },
    ];

    console.log(`⚙️ Inserting ${features.length} features...`);
    for (const feature of features) {
      await db.insert(pageFeatures).values({
        pageKey: feature.pageKey,
        featureKey: feature.featureKey,
        displayName: feature.displayName,
        description: feature.description,
        featureType: feature.featureType as 'crud' | 'export' | 'ui_section' | 'custom',
        isActive: feature.isActive,
        defaultEnabled: feature.defaultEnabled,
      }).onConflictDoNothing();
    }

    console.log("✅ Page permissions seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding page permissions:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedPagePermissions()
    .then(() => {
      console.log("🎉 Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to seed:", error);
      process.exit(1);
    });
}

export { seedPagePermissions };
