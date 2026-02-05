import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertVendorSchema,
  insertCategorySchema,
  insertTicketSchema,
  insertCommentSchema,
  insertUserSchema,
  insertNotificationSchema,
} from "@shared/schema";
import { z } from "zod";
import { sendNewUserEmail } from "./email";
import { getOrdersByIds, getOrderIdsByVendor, testBigQueryConnection } from "./bigquery";
import {
  notifyTicketCreated,
  notifyTicketAssigned,
  notifyTicketSolved,
  notifyCommentAdded,
  notifyMentions,
  getCurrentUser,
} from "./notifications";
import { auditService } from "./audit-service";
import {
  syncVendorsFromBigQuery,
  syncVendorMetricsFromBigQuery,
  runScheduledBigQuerySync,
} from "./bigquery-automation";
import {
  isN8nConfigured,
  triggerN8nWorkflow,
  triggerTicketCreated,
  triggerTicketUpdated,
} from "./n8n-integration";

// Hardcoded default permissions (fallback when database is empty)
const HARDCODED_PERMISSIONS = [
  { id: "hc-p-1", name: "view:dashboard", displayName: "View Dashboard", category: "General", isSystem: true, isActive: true },
  { id: "hc-p-2", name: "view:tickets", displayName: "View Tickets", category: "Tickets", isSystem: true, isActive: true },
  { id: "hc-p-3", name: "create:tickets", displayName: "Create Tickets", category: "Tickets", isSystem: true, isActive: true },
  { id: "hc-p-4", name: "edit:tickets", displayName: "Edit Tickets", category: "Tickets", isSystem: true, isActive: true },
  { id: "hc-p-5", name: "delete:tickets", displayName: "Delete Tickets", category: "Tickets", isSystem: true, isActive: true },
  { id: "hc-p-6", name: "view:all_tickets", displayName: "View All Tickets", category: "Tickets", isSystem: true, isActive: true },
  { id: "hc-p-7", name: "view:department_tickets", displayName: "View Department Tickets", category: "Tickets", isSystem: true, isActive: true },
  { id: "hc-p-8", name: "view:assigned_tickets", displayName: "View Assigned Tickets", category: "Tickets", isSystem: true, isActive: true },
  { id: "hc-p-9", name: "view:team_tickets", displayName: "View Team Tickets", category: "Tickets", isSystem: true, isActive: true },
  { id: "hc-p-10", name: "view:users", displayName: "View Users", category: "Users", isSystem: true, isActive: true },
  { id: "hc-p-11", name: "create:users", displayName: "Create Users", category: "Users", isSystem: true, isActive: true },
  { id: "hc-p-12", name: "edit:users", displayName: "Edit Users", category: "Users", isSystem: true, isActive: true },
  { id: "hc-p-13", name: "delete:users", displayName: "Delete Users", category: "Users", isSystem: true, isActive: true },
  { id: "hc-p-14", name: "view:department_users", displayName: "View Department Users", category: "Users", isSystem: true, isActive: true },
  { id: "hc-p-15", name: "view:vendors", displayName: "View Vendors", category: "Vendors", isSystem: true, isActive: true },
  { id: "hc-p-16", name: "create:vendors", displayName: "Create Vendors", category: "Vendors", isSystem: true, isActive: true },
  { id: "hc-p-17", name: "edit:vendors", displayName: "Edit Vendors", category: "Vendors", isSystem: true, isActive: true },
  { id: "hc-p-18", name: "delete:vendors", displayName: "Delete Vendors", category: "Vendors", isSystem: true, isActive: true },
  { id: "hc-p-19", name: "view:analytics", displayName: "View Analytics", category: "Analytics", isSystem: true, isActive: true },
  { id: "hc-p-20", name: "view:config", displayName: "View Configuration", category: "Settings", isSystem: true, isActive: true },
  { id: "hc-p-21", name: "edit:config", displayName: "Edit Configuration", category: "Settings", isSystem: true, isActive: true },
  { id: "hc-p-22", name: "view:roles", displayName: "View Roles", category: "Settings", isSystem: true, isActive: true },
  { id: "hc-p-23", name: "create:roles", displayName: "Create Roles", category: "Settings", isSystem: true, isActive: true },
  { id: "hc-p-24", name: "edit:roles", displayName: "Edit Roles", category: "Settings", isSystem: true, isActive: true },
  { id: "hc-p-25", name: "delete:roles", displayName: "Delete Roles", category: "Settings", isSystem: true, isActive: true },
];

// Hardcoded role permissions mapping
const HARDCODED_ROLE_PERMISSIONS: Record<string, string[]> = {
  Owner: [
    "view:dashboard", "view:tickets", "create:tickets", "edit:tickets", "delete:tickets",
    "view:users", "create:users", "edit:users", "delete:users",
    "view:vendors", "create:vendors", "edit:vendors", "delete:vendors",
    "view:analytics", "view:config", "edit:config", "view:all_tickets",
    "view:roles", "create:roles", "edit:roles", "delete:roles",
  ],
  Admin: [
    "view:dashboard", "view:tickets", "create:tickets", "edit:tickets", "delete:tickets",
    "view:users", "create:users", "edit:users",
    "view:vendors", "create:vendors", "edit:vendors",
    "view:analytics", "view:config", "edit:config", "view:all_tickets",
    "view:roles", "create:roles", "edit:roles",
  ],
  Head: [
    "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
    "view:users", "view:vendors", "view:analytics",
    "view:department_tickets", "view:department_users",
  ],
  Manager: [
    "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
    "view:vendors", "view:department_tickets", "view:department_users",
  ],
  Lead: [
    "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
    "view:vendors", "view:team_tickets",
  ],
  Associate: [
    "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
    "view:assigned_tickets",
  ],
  Agent: [
    "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
    "view:assigned_tickets", "view:department_tickets",
  ],
};

// Helper to build hardcoded roles with their permissions
function getHardcodedRolesWithPermissions() {
  const roleDescriptions: Record<string, string> = {
    Owner: "Full system access",
    Admin: "Administrative access",
    Head: "Department leadership access",
    Manager: "Team management access",
    Lead: "Team lead access",
    Associate: "Standard employee access",
    Agent: "Support agent access",
  };

  return Object.entries(HARDCODED_ROLE_PERMISSIONS).map(([roleName, permNames], index) => ({
    id: `hc-r-${index + 1}`,
    name: roleName,
    displayName: roleName === "Admin" ? "Administrator" : roleName === "Head" ? "Department Head" : roleName === "Lead" ? "Team Lead" : roleName,
    description: roleDescriptions[roleName] || "",
    isSystem: true,
    isActive: true,
    permissions: permNames.map(permName => {
      const perm = HARDCODED_PERMISSIONS.find(p => p.name === permName);
      return perm || { id: "", name: permName, displayName: permName, category: "Unknown", isSystem: true, isActive: true };
    }),
  }));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Vendors
  app.get("/api/vendors", async (_req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vendors/:handle", async (req, res) => {
    try {
      const vendor = await storage.getVendorByHandle(req.params.handle);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const parsed = insertVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const vendor = await storage.createVendor(parsed.data);
      res.status(201).json(vendor);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Categories
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const parsed = insertCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const category = await storage.createCategory(parsed.data);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tickets
  app.get("/api/tickets", async (_req, res) => {
    try {
      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets", async (req, res) => {
    try {
      console.log('📝 Creating ticket with data:', JSON.stringify(req.body, null, 2));

      const parsed = insertTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error('❌ Ticket validation failed:', JSON.stringify(parsed.error.issues, null, 2));
        return res.status(400).json({
          error: 'Validation failed: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
          details: parsed.error.issues
        });
      }

      console.log('✅ Ticket validation passed');
      console.log('📋 Received categoryId:', parsed.data.categoryId, 'Type:', typeof parsed.data.categoryId);

      // Use default "Uncategorized" category if none selected
      if (!parsed.data.categoryId || parsed.data.categoryId === '') {
        console.log('⚠️ CategoryId is empty, using default category');
        // Find or use the default uncategorized category
        const defaultCategory = await storage.getCategoryByPath('General / Uncategorized / Other');
        if (defaultCategory) {
          parsed.data.categoryId = defaultCategory.id;
          console.log('📋 Using default category:', defaultCategory.path);
        } else {
          return res.status(400).json({
            error: 'Please select a category for this ticket. If no specific category applies, contact an administrator to set up default categories.'
          });
        }
      }

      // Validate vendorHandle exists if provided (for Seller Support)
      if (parsed.data.vendorHandle) {
        console.log('🔍 Validating vendor handle:', parsed.data.vendorHandle);
        const vendor = await storage.getVendorByHandle(parsed.data.vendorHandle);
        if (!vendor) {
          console.error('❌ Vendor not found:', parsed.data.vendorHandle);
          return res.status(400).json({
            error: `Vendor with handle "${parsed.data.vendorHandle}" not found. Please select a valid vendor from the dropdown or create the vendor first.`
          });
        }
        console.log('✅ Vendor validated:', vendor.name);
      }

      console.log('💾 Attempting to create ticket in database...');
      const ticket = await storage.createTicket(parsed.data);
      console.log('✅ Ticket created successfully:', ticket.ticketNumber);

      // Create notifications for new ticket (non-blocking)
      const creator = await getCurrentUser(req);
      notifyTicketCreated(ticket, creator).catch(err => {
        console.error('Failed to send ticket creation notifications:', err);
      });

      res.status(201).json(ticket);
    } catch (error: any) {
      console.error('❌ Failed to create ticket:', error);
      console.error('Error stack:', error.stack);
      console.error('Error code:', error.code);
      console.error('Error details:', error.detail);

      // Better error messages for common issues
      if (error.code === '23503') { // Foreign key violation
        console.error('Foreign key violation - constraint:', error.constraint);
        return res.status(400).json({
          error: 'Invalid vendor handle or category. Please ensure the vendor exists and category is selected correctly.',
          details: error.detail
        });
      }

      if (error.code === '23505') { // Unique constraint violation
        console.error('Unique constraint violation:', error.constraint);
        return res.status(400).json({
          error: 'Duplicate ticket number. Please try again.',
          details: error.detail
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to create ticket',
        code: error.code,
        details: error.detail
      });
    }
  });

  app.patch("/api/tickets/:id", async (req, res) => {
    try {
      const oldTicket = await storage.getTicketById(req.params.id);
      if (!oldTicket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const ticket = await storage.updateTicket(req.params.id, req.body);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const currentUser = await getCurrentUser(req);

      // Check if ticket was assigned
      if (req.body.assigneeId && oldTicket.assigneeId !== req.body.assigneeId) {
        const assignee = await storage.getUserById(req.body.assigneeId);
        if (assignee) {
          notifyTicketAssigned(ticket, assignee, currentUser).catch(err => {
            console.error('Failed to send ticket assignment notification:', err);
          });
        }
      }

      // Check if ticket was solved
      if (req.body.status === "Solved" && oldTicket.status !== "Solved") {
        notifyTicketSolved(ticket, currentUser).catch(err => {
          console.error('Failed to send ticket solved notification:', err);
        });
      }

      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Comments
  app.get("/api/tickets/:ticketId/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByTicketId(req.params.ticketId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const parsed = insertCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const comment = await storage.createComment(parsed.data);

      // Get the ticket to send notifications
      const ticket = await storage.getTicketById(parsed.data.ticketId);
      if (ticket) {
        const commenter = await getCurrentUser(req);

        // Notify about new comment (non-blocking)
        notifyCommentAdded(comment, ticket, commenter).catch(err => {
          console.error('Failed to send comment notifications:', err);
        });

        // Notify mentioned users (non-blocking)
        notifyMentions(comment, ticket, commenter).catch(err => {
          console.error('Failed to send mention notifications:', err);
        });
      }

      res.status(201).json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Users
  app.get("/api/users", async (_req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      // Check if email already exists
      const existing = await storage.getUserByEmail(parsed.data.email);
      if (existing) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }

      // FIX: Ensure 'role' field is synced with 'roles' array
      const userData = { ...parsed.data };
      if (userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0) {
        userData.role = userData.roles[0]; // Set primary role to first role in array
      }

      // Store plain password for email before creating user
      const plainPassword = userData.password;

      const user = await storage.createUser(userData);

      // Send welcome email with credentials (don't await to avoid blocking response)
      sendNewUserEmail(user, plainPassword).catch(err => {
        console.error('Failed to send welcome email:', err);
      });

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updates = { ...req.body };

      // FIX: Sync the singular 'role' field with the 'roles' array
      if (updates.roles && Array.isArray(updates.roles)) {
        if (updates.roles.length > 0) {
          // If roles array has items, sync primary role with first item
          updates.role = updates.roles[0];
        } else if (updates.roles.length === 0) {
          // If roles array is empty (all secondary roles removed),
          // populate it with just the primary role if role field exists
          if (updates.role) {
            updates.roles = [updates.role];
          } else {
            // Get current user to use their existing role
            const currentUser = await storage.getUserById(req.params.id);
            if (currentUser && currentUser.role) {
              updates.roles = [currentUser.role];
            }
          }
        }
      }

      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      console.log("🔍 PUT /api/users/:id called");
      console.log("User ID:", req.params.id);
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      const updates = { ...req.body };

      // Get current user state BEFORE update
      const currentUser = await storage.getUserById(req.params.id);
      if (!currentUser) {
        console.log("❌ User not found:", req.params.id);
        return res.status(404).json({ error: "User not found" });
      }
      console.log("📊 Current user state:", {
        role: currentUser.role,
        roles: currentUser.roles,
      });

      // FIX: Sync the singular 'role' field with the 'roles' array
      if (updates.roles && Array.isArray(updates.roles)) {
        console.log("🔧 Processing roles array:", updates.roles);
        if (updates.roles.length > 0) {
          // If roles array has items, sync primary role with first item
          updates.role = updates.roles[0];
          console.log("✅ Set role to first item in roles array:", updates.role);
        } else if (updates.roles.length === 0) {
          console.log("⚠️  Roles array is empty, handling edge case");
          // If roles array is empty (all secondary roles removed),
          // populate it with just the primary role if role field exists
          if (updates.role) {
            updates.roles = [updates.role];
            console.log("✅ Populated empty roles with role field:", updates.roles);
          } else {
            // Use current user's role if no role specified
            if (currentUser.role) {
              updates.roles = [currentUser.role];
              console.log("✅ Populated empty roles with current user role:", updates.roles);
            }
          }
        }
      } else {
        console.log("ℹ️  No roles array in update, or not an array");
      }

      console.log("📝 Final updates to apply:", JSON.stringify(updates, null, 2));

      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        console.log("❌ Update failed: storage.updateUser returned null");
        return res.status(404).json({ error: "User not found" });
      }

      console.log("✅ User updated successfully:", {
        id: user.id,
        role: user.role,
        roles: user.roles,
      });

      res.json(user);
    } catch (error: any) {
      console.error("❌ PUT /api/users/:id error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Departments
  app.get("/api/departments", async (req, res) => {
    try {
      const activeOnly = req.query.active === "true";
      const departments = activeOnly
        ? await storage.getActiveDepartments()
        : await storage.getDepartments();
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/departments/with-sub-departments", async (_req, res) => {
    try {
      const departments = await storage.getDepartmentsWithSubDepartments();
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/departments/:id", async (req, res) => {
    try {
      const department = await storage.getDepartmentById(req.params.id);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const { name, description, color, headId, isActive, displayOrder, subDepartments: subDepts } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Department name is required" });
      }

      // Check if department already exists
      const existing = await storage.getDepartmentByName(name);
      if (existing) {
        return res.status(400).json({ error: "A department with this name already exists" });
      }

      const department = await storage.createDepartment({ name, description, color, headId, isActive, displayOrder });

      // Create sub-departments if provided
      if (subDepts && Array.isArray(subDepts) && subDepts.length > 0) {
        for (const subDept of subDepts) {
          if (subDept.name) {
            await storage.createSubDepartment({
              name: subDept.name,
              departmentId: department.id,
              description: subDept.description,
            });
          }
        }
      }

      // Return department with sub-departments
      const deptWithSubs = await storage.getDepartmentsWithSubDepartments();
      const result = deptWithSubs.find(d => d.id === department.id);
      res.status(201).json(result || department);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/departments/:id", async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed default departments
  app.post("/api/departments/seed-defaults", async (_req, res) => {
    try {
      const DEFAULT_DEPARTMENTS = [
        { name: "Finance", description: "Financial operations and payments", color: "#10b981", displayOrder: 1 },
        { name: "Operations", description: "Order fulfillment and logistics", color: "#f59e0b", displayOrder: 2 },
        { name: "Marketplace", description: "Product listings and seller management", color: "#8b5cf6", displayOrder: 3 },
        { name: "Tech", description: "Technical support and platform issues", color: "#3b82f6", displayOrder: 4 },
        { name: "Supply", description: "Supply chain and inventory management", color: "#ec4899", displayOrder: 5 },
        { name: "Growth", description: "Business development and expansion", color: "#f97316", displayOrder: 6 },
      ];

      const created = [];
      for (const dept of DEFAULT_DEPARTMENTS) {
        const existing = await storage.getDepartmentByName(dept.name);
        if (!existing) {
          const newDept = await storage.createDepartment(dept);
          created.push(newDept);
        }
      }

      res.status(201).json({
        message: `Seeded ${created.length} departments`,
        skipped: DEFAULT_DEPARTMENTS.length - created.length,
        departments: created,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sub-departments
  app.get("/api/sub-departments", async (req, res) => {
    try {
      const departmentId = req.query.departmentId as string;
      if (departmentId) {
        const activeOnly = req.query.active === "true";
        const subDepartments = activeOnly
          ? await storage.getActiveSubDepartmentsByDepartment(departmentId)
          : await storage.getSubDepartmentsByDepartment(departmentId);
        res.json(subDepartments);
      } else {
        const subDepartments = await storage.getSubDepartments();
        res.json(subDepartments);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sub-departments/:id", async (req, res) => {
    try {
      const subDepartment = await storage.getSubDepartmentById(req.params.id);
      if (!subDepartment) {
        return res.status(404).json({ error: "Sub-department not found" });
      }
      res.json(subDepartment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sub-departments", async (req, res) => {
    try {
      const { name, departmentId, parentId, description, isActive, displayOrder } = req.body;
      if (!name || !departmentId) {
        return res.status(400).json({ error: "Name and departmentId are required" });
      }

      // Verify department exists
      const department = await storage.getDepartmentById(departmentId);
      if (!department) {
        return res.status(400).json({ error: "Department not found" });
      }

      const subDepartment = await storage.createSubDepartment({ name, departmentId, parentId, description, isActive, displayOrder });
      res.status(201).json(subDepartment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/sub-departments/:id", async (req, res) => {
    try {
      const subDepartment = await storage.updateSubDepartment(req.params.id, req.body);
      if (!subDepartment) {
        return res.status(404).json({ error: "Sub-department not found" });
      }
      res.json(subDepartment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sub-departments/:id", async (req, res) => {
    try {
      await storage.deleteSubDepartment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter is required" });
      }
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notifications/unread", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter is required" });
      }
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const parsed = insertNotificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const notification = await storage.createNotification(parsed.data);
      res.status(201).json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      await storage.markAllNotificationsAsRead(userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin change user password (for Owner/Admin only)
  app.patch("/api/users/:id/password", async (req, res) => {
    try {
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.updateUser(req.params.id, { password });
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user permissions (for Owner/Admin only)
  app.patch("/api/users/:id/permissions", async (req, res) => {
    try {
      const { customPermissions } = req.body;

      if (!Array.isArray(customPermissions)) {
        return res.status(400).json({ error: "customPermissions must be an array" });
      }

      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.updateUser(req.params.id, { customPermissions });
      res.json({ message: "Permissions updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Change password
  app.post("/api/users/change-password", async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;

      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.password !== currentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      await storage.updateUser(user.id, { password: newPassword });
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Health check / debug endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      const userCount = await storage.getUsers();
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        usersInDB: userCount.length,
        version: "1.0.1"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("[LOGIN] Attempt with email:", email);

      if (!email || !password) {
        console.log("[LOGIN] Missing email or password");
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      console.log("[LOGIN] User found:", !!user);

      if (!user) {
        console.log("[LOGIN] User not found in database");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // In production, use proper password hashing (bcrypt, etc.)
      if (user.password !== password) {
        console.log("[LOGIN] Password mismatch");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        console.log("[LOGIN] User inactive");
        return res.status(403).json({ error: "Account is inactive" });
      }

      console.log("[LOGIN] Login successful for:", user.email);
      // Store user session (in production, use express-session or JWT)
      // For now, we'll send the user data back
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("[LOGIN] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      // In a real app, get user from session/JWT
      // For demo, we'll use a simple approach with email from headers or query
      const email = req.headers["x-user-email"] as string || req.query.email as string;

      console.log("[AUTH/ME] Request with email:", email);

      if (!email) {
        console.log("[AUTH/ME] No email provided");
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByEmail(email);
      console.log("[AUTH/ME] User found:", !!user, user?.isActive);

      if (!user || !user.isActive) {
        console.log("[AUTH/ME] User not found or inactive");
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log("[AUTH/ME] Returning user:", user.email);
      const { password: _, ...userWithoutPassword } = user;

      // Try to get effective permissions from database (roles + permissions tables)
      let effectivePermissions: string[] = [];
      try {
        effectivePermissions = await storage.getUserEffectivePermissions(user.id);
        console.log("[AUTH/ME] Loaded effective permissions from database:", effectivePermissions.length, "permissions");
      } catch (dbError: any) {
        console.warn("[AUTH/ME] Could not load permissions from database:", dbError.message);
        // Fallback: use custom permissions if database roles not available yet
        effectivePermissions = user.customPermissions || [];
      }

      // Override customPermissions with effective permissions
      const userWithEffectivePermissions = {
        ...userWithoutPassword,
        customPermissions: effectivePermissions,
      };

      res.json(userWithEffectivePermissions);
    } catch (error: any) {
      console.error("[AUTH/ME] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Logout
  app.post("/api/logout", async (req, res) => {
    try {
      // Clear session if using sessions
      // For now, just return success
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Ticket Configuration APIs =====

  // Issue Types
  app.get("/api/config/issue-types", async (_req, res) => {
    try {
      const issueTypes = await storage.getIssueTypes();
      res.json(issueTypes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/issue-types/:id", async (req, res) => {
    try {
      const issueType = await storage.getIssueTypeById(req.params.id);
      if (!issueType) {
        return res.status(404).json({ error: "Issue type not found" });
      }
      res.json(issueType);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/issue-types", async (req, res) => {
    try {
      const issueType = await storage.createIssueType(req.body);
      res.status(201).json(issueType);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/issue-types/:id", async (req, res) => {
    try {
      const issueType = await storage.updateIssueType(req.params.id, req.body);
      if (!issueType) {
        return res.status(404).json({ error: "Issue type not found" });
      }
      res.json(issueType);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/issue-types/:id", async (req, res) => {
    try {
      await storage.deleteIssueType(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Category Hierarchy
  app.get("/api/config/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategoryHierarchy();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/categories/level/:level", async (req, res) => {
    try {
      const level = parseInt(req.params.level) as 1 | 2 | 3;
      const categories = await storage.getCategoryHierarchyByLevel(level);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/categories/parent/:parentId", async (req, res) => {
    try {
      const parentId = req.params.parentId === "null" ? null : req.params.parentId;
      const categories = await storage.getCategoryHierarchyByParent(parentId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategoryHierarchyById(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/categories", async (req, res) => {
    try {
      const category = await storage.createCategoryHierarchy(req.body);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/categories/:id", async (req, res) => {
    try {
      const category = await storage.updateCategoryHierarchy(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategoryHierarchy(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Category Mappings
  app.get("/api/config/mappings", async (_req, res) => {
    try {
      const mappings = await storage.getCategoryMappings();
      res.json(mappings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/mappings/issue-type/:issueTypeId", async (req, res) => {
    try {
      const mappings = await storage.getCategoryMappingsByIssueType(req.params.issueTypeId);
      res.json(mappings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/mappings", async (req, res) => {
    try {
      const mapping = await storage.createCategoryMapping(req.body);
      res.status(201).json(mapping);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/mappings/:id", async (req, res) => {
    try {
      const mapping = await storage.updateCategoryMapping(req.params.id, req.body);
      if (!mapping) {
        return res.status(404).json({ error: "Mapping not found" });
      }
      res.json(mapping);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/mappings/:id", async (req, res) => {
    try {
      await storage.deleteCategoryMapping(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SLA Configurations
  app.get("/api/config/sla", async (_req, res) => {
    try {
      const slas = await storage.getSlaConfigurations();
      res.json(slas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/sla/:id", async (req, res) => {
    try {
      const sla = await storage.getSlaConfigurationById(req.params.id);
      if (!sla) {
        return res.status(404).json({ error: "SLA configuration not found" });
      }
      res.json(sla);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/sla", async (req, res) => {
    try {
      const sla = await storage.createSlaConfiguration(req.body);
      res.status(201).json(sla);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/sla/:id", async (req, res) => {
    try {
      const sla = await storage.updateSlaConfiguration(req.params.id, req.body);
      if (!sla) {
        return res.status(404).json({ error: "SLA configuration not found" });
      }
      res.json(sla);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/sla/:id", async (req, res) => {
    try {
      await storage.deleteSlaConfiguration(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Priority Configurations
  app.get("/api/config/priorities", async (_req, res) => {
    try {
      const priorities = await storage.getPriorityConfigurations();
      res.json(priorities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/priorities/:id", async (req, res) => {
    try {
      const priority = await storage.getPriorityConfigurationById(req.params.id);
      if (!priority) {
        return res.status(404).json({ error: "Priority configuration not found" });
      }
      res.json(priority);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/priorities", async (req, res) => {
    try {
      const priority = await storage.createPriorityConfiguration(req.body);
      res.status(201).json(priority);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/priorities/:id", async (req, res) => {
    try {
      const priority = await storage.updatePriorityConfiguration(req.params.id, req.body);
      if (!priority) {
        return res.status(404).json({ error: "Priority configuration not found" });
      }
      res.json(priority);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/priorities/:id", async (req, res) => {
    try {
      await storage.deletePriorityConfiguration(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tags
  app.get("/api/config/tags", async (_req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/tags/:id", async (req, res) => {
    try {
      const tag = await storage.getTagById(req.params.id);
      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }
      res.json(tag);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/tags", async (req, res) => {
    try {
      const tag = await storage.createTag(req.body);
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/tags/:id", async (req, res) => {
    try {
      const tag = await storage.updateTag(req.params.id, req.body);
      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }
      res.json(tag);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/tags/:id", async (req, res) => {
    try {
      await storage.deleteTag(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Category Settings (L4 Mandatory Toggle, etc.)
  app.get("/api/config/category-settings", async (_req, res) => {
    try {
      const settings = await storage.getCategorySettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/category-settings/:departmentType", async (req, res) => {
    try {
      const departmentType = req.params.departmentType as "Seller Support" | "Customer Support" | "All";
      const settings = await storage.getCategorySettingsByDepartment(departmentType);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/category-settings", async (req, res) => {
    try {
      const settings = await storage.createCategorySettings(req.body);
      res.status(201).json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/category-settings/:id", async (req, res) => {
    try {
      const settings = await storage.updateCategorySettings(req.params.id, req.body);
      if (!settings) {
        return res.status(404).json({ error: "Category settings not found" });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/category-settings/:id", async (req, res) => {
    try {
      await storage.deleteCategorySettings(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ticket Field Configurations
  app.get("/api/config/field-configurations", async (req, res) => {
    try {
      const departmentType = req.query.departmentType as "Seller Support" | "Customer Support" | "All" | undefined;

      // Auto-fix department types if they're wrong (ensures data integrity)
      const allConfigs = await storage.getTicketFieldConfigurations();

      const vendorHandleField = allConfigs.find(f => f.fieldName === "vendorHandle");
      if (vendorHandleField && vendorHandleField.departmentType !== "Seller Support") {
        console.log(`[field-config] Fixing vendorHandle: ${vendorHandleField.departmentType} -> Seller Support`);
        await storage.updateTicketFieldConfiguration(vendorHandleField.id, {
          departmentType: "Seller Support",
        });
      }

      const customerField = allConfigs.find(f => f.fieldName === "customer");
      if (customerField && customerField.departmentType !== "Customer Support") {
        console.log(`[field-config] Fixing customer: ${customerField.departmentType} -> Customer Support`);
        await storage.updateTicketFieldConfiguration(customerField.id, {
          departmentType: "Customer Support",
        });
      } else if (!customerField) {
        // Customer field doesn't exist - create it
        console.log(`[field-config] Creating missing customer field`);
        await storage.createTicketFieldConfiguration({
          fieldName: "customer",
          fieldLabel: "Customer",
          fieldType: "text",
          departmentType: "Customer Support",
          isEnabled: true,
          isRequired: true,
          displayOrder: 1,
          metadata: {
            placeholder: "Enter customer name or ID",
            helpText: "The customer associated with this ticket",
          },
        });
      }

      // Re-fetch after potential fixes
      if (departmentType) {
        const configs = await storage.getTicketFieldConfigurationsByDepartment(departmentType);
        res.json(configs);
      } else {
        const configs = await storage.getTicketFieldConfigurations();
        res.json(configs);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/field-configurations/:id", async (req, res) => {
    try {
      const config = await storage.getTicketFieldConfigurationById(req.params.id);
      if (!config) {
        return res.status(404).json({ error: "Field configuration not found" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/field-configurations", async (req, res) => {
    try {
      const config = await storage.createTicketFieldConfiguration(req.body);
      res.status(201).json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/field-configurations/:id", async (req, res) => {
    try {
      const config = await storage.updateTicketFieldConfiguration(req.params.id, req.body);
      if (!config) {
        return res.status(404).json({ error: "Field configuration not found" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/field-configurations/:id", async (req, res) => {
    try {
      await storage.deleteTicketFieldConfiguration(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed default ticket field configurations
  app.post("/api/config/field-configurations/seed-defaults", async (_req, res) => {
    try {
      const DEFAULT_TICKET_FIELDS = [
        {
          fieldName: "vendorHandle",
          fieldLabel: "Vendor Handle",
          fieldType: "text" as const,
          departmentType: "Seller Support" as const,
          isEnabled: true,
          isRequired: true,
          displayOrder: 1,
          metadata: {
            placeholder: "Enter or search vendor handle",
            helpText: "The unique identifier for the vendor/seller",
          },
        },
        {
          fieldName: "customer",
          fieldLabel: "Customer",
          fieldType: "text" as const,
          departmentType: "Customer Support" as const,
          isEnabled: true,
          isRequired: true,
          displayOrder: 1,
          metadata: {
            placeholder: "Enter customer name or ID",
            helpText: "The customer associated with this ticket",
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

      // Check existing fields to avoid duplicates
      const existingFields = await storage.getTicketFieldConfigurations();
      const existingFieldNames = new Set(existingFields.map(f => f.fieldName));

      const fieldsToCreate = DEFAULT_TICKET_FIELDS.filter(
        field => !existingFieldNames.has(field.fieldName)
      );

      const createdFields = [];
      for (const field of fieldsToCreate) {
        const created = await storage.createTicketFieldConfiguration(field);
        createdFields.push(created);
      }

      res.status(201).json({
        message: `Seeded ${createdFields.length} default field configurations`,
        skipped: DEFAULT_TICKET_FIELDS.length - createdFields.length,
        fields: createdFields,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fix department types for vendorHandle and customer fields
  app.post("/api/config/field-configurations/fix-department-types", async (_req, res) => {
    try {
      const existingFields = await storage.getTicketFieldConfigurations();
      const updates = [];

      // Fix vendorHandle to be Seller Support only
      const vendorHandleField = existingFields.find(f => f.fieldName === "vendorHandle");
      if (vendorHandleField && vendorHandleField.departmentType !== "Seller Support") {
        const updated = await storage.updateTicketFieldConfiguration(vendorHandleField.id, {
          departmentType: "Seller Support",
        });
        updates.push({ fieldName: "vendorHandle", from: vendorHandleField.departmentType, to: "Seller Support" });
      }

      // Fix customer to be Customer Support only
      const customerField = existingFields.find(f => f.fieldName === "customer");
      if (customerField && customerField.departmentType !== "Customer Support") {
        const updated = await storage.updateTicketFieldConfiguration(customerField.id, {
          departmentType: "Customer Support",
        });
        updates.push({ fieldName: "customer", from: customerField.departmentType, to: "Customer Support" });
      }

      res.json({
        message: `Fixed department types for ${updates.length} field(s)`,
        updates,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove duplicate field configurations (keep only the first occurrence of each fieldName)
  app.post("/api/config/field-configurations/remove-duplicates", async (_req, res) => {
    try {
      const existingFields = await storage.getTicketFieldConfigurations();
      const fieldNameMap = new Map<string, string[]>(); // fieldName -> array of IDs

      // Group fields by fieldName
      for (const field of existingFields) {
        if (!fieldNameMap.has(field.fieldName)) {
          fieldNameMap.set(field.fieldName, []);
        }
        fieldNameMap.get(field.fieldName)!.push(field.id);
      }

      const removed = [];
      // For each fieldName that has duplicates, keep the first ID and delete the rest
      for (const [fieldName, ids] of fieldNameMap.entries()) {
        if (ids.length > 1) {
          // Keep the first one, delete the rest
          const toDelete = ids.slice(1);
          for (const id of toDelete) {
            await storage.deleteTicketFieldConfiguration(id);
            removed.push({ fieldName, id });
          }
        }
      }

      res.json({
        message: `Removed ${removed.length} duplicate field configuration(s)`,
        removed,
        duplicateFields: Array.from(fieldNameMap.entries())
          .filter(([_, ids]) => ids.length > 1)
          .map(([fieldName, ids]) => ({ fieldName, count: ids.length })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Category Field Overrides - Configure form fields per category
  app.get("/api/config/categories/:categoryId/field-overrides", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const overrides = await storage.getCategoryFieldOverrides(categoryId);
      res.json(overrides);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config/categories/:categoryId/resolved-fields", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const departmentType = req.query.departmentType as "Seller Support" | "Customer Support" | "All" | undefined;

      const resolvedFields = await storage.getResolvedFieldsForCategory(
        categoryId,
        departmentType
      );
      res.json(resolvedFields);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/categories/:categoryId/field-overrides", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { overrides, userId } = req.body;

      if (!Array.isArray(overrides)) {
        return res.status(400).json({ error: "overrides must be an array" });
      }

      const results = await storage.upsertCategoryFieldOverrides(
        categoryId,
        overrides,
        userId
      );

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/field-overrides/:id", async (req, res) => {
    try {
      await storage.deleteCategoryFieldOverride(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/categories/:categoryId/field-overrides/reset", async (req, res) => {
    try {
      const { categoryId } = req.params;
      await storage.deleteCategoryFieldOverridesByCategoryId(categoryId);
      res.json({ message: "Field overrides reset to defaults" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Unified Ticket Configurations (combines issue types with L1-L4 hierarchy)
  app.get("/api/config/ticket-configs", async (_req, res) => {
    try {
      // Fetch all category hierarchies and their SLA configurations
      const hierarchies = await storage.getAllCategoryHierarchies();

      // Get all SLA configurations
      const slaConfigs = await storage.getAllSlaConfigurations();

      // Get all category mappings to find issue types
      const categoryMappings = await storage.getCategoryMappings();

      // Get all issue types
      const issueTypes = await storage.getIssueTypes();
      const issueTypeMap = new Map(issueTypes.map(it => [it.id, it.name]));

      // Build a map of category hierarchies
      const categoryMap = new Map();
      hierarchies.forEach(cat => {
        categoryMap.set(cat.id, cat);
      });

      // Build configurations from L4 categories
      const configs: any[] = [];
      const l4Categories = hierarchies.filter(h => h.level === 4);

      for (const l4 of l4Categories) {
        let l3 = l4.parentId ? categoryMap.get(l4.parentId) : null;
        let l2 = l3?.parentId ? categoryMap.get(l3.parentId) : null;
        let l1 = l2?.parentId ? categoryMap.get(l2.parentId) : null;

        if (l1 && l2 && l3) {
          const sla = slaConfigs.find(s =>
            s.l4CategoryId === l4.id
          );

          // Find the issue type from category mapping
          const mapping = categoryMappings.find(m => m.l4CategoryId === l4.id);
          const issueTypeName = mapping ? issueTypeMap.get(mapping.issueTypeId) : "Information";

          configs.push({
            id: l4.id,
            issueType: issueTypeName || "Information",
            l1: l1.name,
            l2: l2.name,
            l3: l3.name,
            l4: l4.name,
            description: l4.description || "",
            departmentType: l4.departmentType || "All",
            isActive: l4.isActive,
            slaResponseHours: sla?.responseTimeHours || null,
            slaResolutionHours: sla?.resolutionTimeHours || 24,
            createdAt: l4.createdAt,
          });
        }
      }

      res.json(configs);
    } catch (error: any) {
      console.error("Error fetching ticket configs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/ticket-configs", async (req, res) => {
    try {
      const config = req.body;

      // Basic validation
      if (!config.issueType || !config.l1 || !config.l2 || !config.l3) {
        return res.status(400).json({ error: "Missing required fields (issueType, l1, l2, l3 are required; l4 is optional)" });
      }
      if (!['Complaint', 'Request', 'Information'].includes(config.issueType)) {
        return res.status(400).json({ error: "Invalid issue type" });
      }
      if (!config.slaResolutionHours || isNaN(config.slaResolutionHours)) {
        return res.status(400).json({ error: "Invalid SLA resolution hours" });
      }

      // Create or find issue type
      const existingIssueTypes = await storage.getIssueTypes();
      let issueType = existingIssueTypes.find(it => it.name === config.issueType);
      if (!issueType) {
        issueType = await storage.createIssueType({
          name: config.issueType,
          description: `${config.issueType} issue type`,
          isActive: true,
        });
      }

      // Create L1 category
      let l1Category = await storage.getCategoryHierarchyByLevelAndName(1, config.l1);
      if (!l1Category) {
        l1Category = await storage.createCategoryHierarchy({
          level: 1,
          name: config.l1,
          parentId: null,
          description: null,
          isActive: true,
        });
      }

      // Create L2 category
      let l2Category = await storage.getCategoryHierarchyByLevelAndName(2, config.l2);
      if (!l2Category || l2Category.parentId !== l1Category.id) {
        l2Category = await storage.createCategoryHierarchy({
          level: 2,
          name: config.l2,
          parentId: l1Category.id,
          description: null,
          isActive: true,
        });
      }

      // Create L3 category
      let l3Category = await storage.getCategoryHierarchyByLevelAndName(3, config.l3);
      if (!l3Category || l3Category.parentId !== l2Category.id) {
        l3Category = await storage.createCategoryHierarchy({
          level: 3,
          name: config.l3,
          parentId: l2Category.id,
          description: null,
          isActive: true,
        });
      }

      // Create L4 category
      const l4Category = await storage.createCategoryHierarchy({
        level: 4,
        name: config.l4 || "",
        parentId: l3Category.id,
        description: config.description || null,
        departmentType: config.departmentType || "All",
        isActive: config.isActive !== undefined ? config.isActive : true,
      });

      // Create category mapping (needs all category IDs)
      await storage.createCategoryMapping({
        issueTypeId: issueType.id,
        l1CategoryId: l1Category.id,
        l2CategoryId: l2Category.id,
        l3CategoryId: l3Category.id,
        l4CategoryId: l4Category.id,
        isActive: true,
      });

      // Create SLA configuration (needs a name)
      const slaName = config.l4
        ? `${config.l1} > ${config.l2} > ${config.l3} > ${config.l4}`
        : `${config.l1} > ${config.l2} > ${config.l3}`;

      const slaConfig = await storage.createSlaConfiguration({
        name: slaName,
        issueTypeId: issueType.id,
        l1CategoryId: l1Category.id,
        l2CategoryId: l2Category.id,
        l3CategoryId: l3Category.id,
        l4CategoryId: l4Category.id,
        responseTimeHours: config.slaResponseHours || null,
        resolutionTimeHours: config.slaResolutionHours,
        isActive: true,
      });

      // Save field overrides if provided
      if (config.fieldOverrides && Array.isArray(config.fieldOverrides) && config.fieldOverrides.length > 0) {
        await storage.upsertCategoryFieldOverrides(l4Category.id, config.fieldOverrides, config.userId);
      }

      res.status(201).json({
        id: l4Category.id,
        issueType: config.issueType,
        l1: config.l1,
        l2: config.l2,
        l3: config.l3,
        l4: config.l4,
        description: config.description || "",
        departmentType: l4Category.departmentType || "All",
        isActive: l4Category.isActive,
        slaResponseHours: slaConfig.responseTimeHours,
        slaResolutionHours: slaConfig.resolutionTimeHours,
        createdAt: l4Category.createdAt,
      });
    } catch (error: any) {
      console.error("Error creating ticket config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/ticket-configs/bulk", async (req, res) => {
    try {
      const { configs } = req.body;

      if (!Array.isArray(configs) || configs.length === 0) {
        return res.status(400).json({ error: "configs must be a non-empty array" });
      }

      // Validate each config
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        if (!config.issueType || !config.l1 || !config.l2 || !config.l3) {
          return res.status(400).json({
            error: `Configuration at index ${i} is missing required fields (issueType, l1, l2, l3 are required)`
          });
        }
        if (!['Complaint', 'Request', 'Information'].includes(config.issueType)) {
          return res.status(400).json({
            error: `Configuration at index ${i} has invalid issue type`
          });
        }
        if (!config.slaResolutionHours || isNaN(config.slaResolutionHours)) {
          return res.status(400).json({
            error: `Configuration at index ${i} has invalid SLA resolution hours`
          });
        }
      }

      // Process each config and save to database
      const createdConfigs = [];

      for (const config of configs) {
        // Create or find issue type
        const existingIssueTypes = await storage.getIssueTypes();
        let issueType = existingIssueTypes.find(it => it.name === config.issueType);
        if (!issueType) {
          issueType = await storage.createIssueType({
            name: config.issueType,
            description: `${config.issueType} issue type`,
            isActive: true,
          });
        }

        // Create L1 category (or find existing)
        let l1Category = await storage.getCategoryHierarchyByLevelAndName(1, config.l1);
        if (!l1Category) {
          l1Category = await storage.createCategoryHierarchy({
            level: 1,
            name: config.l1,
            parentId: null,
            description: null,
            isActive: true,
          });
        }

        // Create L2 category (or find existing)
        let l2Category = await storage.getCategoryHierarchyByLevelAndName(2, config.l2);
        if (!l2Category || l2Category.parentId !== l1Category.id) {
          l2Category = await storage.createCategoryHierarchy({
            level: 2,
            name: config.l2,
            parentId: l1Category.id,
            description: null,
            isActive: true,
          });
        }

        // Create L3 category (or find existing)
        let l3Category = await storage.getCategoryHierarchyByLevelAndName(3, config.l3);
        if (!l3Category || l3Category.parentId !== l2Category.id) {
          l3Category = await storage.createCategoryHierarchy({
            level: 3,
            name: config.l3,
            parentId: l2Category.id,
            description: null,
            isActive: true,
          });
        }

        // Create L4 category (always create new to avoid conflicts)
        const l4Category = await storage.createCategoryHierarchy({
          level: 4,
          name: config.l4 || "",
          parentId: l3Category.id,
          description: config.description || null,
          departmentType: config.departmentType || "All",
          isActive: config.isActive !== undefined ? config.isActive : true,
        });

        // Create category mapping (link issue type to all category levels)
        await storage.createCategoryMapping({
          issueTypeId: issueType.id,
          l1CategoryId: l1Category.id,
          l2CategoryId: l2Category.id,
          l3CategoryId: l3Category.id,
          l4CategoryId: l4Category.id,
          isActive: true,
        });

        // Create SLA configuration
        const slaName = config.l4
          ? `${config.l1} > ${config.l2} > ${config.l3} > ${config.l4}`
          : `${config.l1} > ${config.l2} > ${config.l3}`;

        const slaConfig = await storage.createSlaConfiguration({
          name: slaName,
          issueTypeId: issueType.id,
          l1CategoryId: l1Category.id,
          l2CategoryId: l2Category.id,
          l3CategoryId: l3Category.id,
          l4CategoryId: l4Category.id,
          responseTimeHours: config.slaResponseHours || null,
          resolutionTimeHours: config.slaResolutionHours,
          isActive: true,
        });

        createdConfigs.push({
          id: l4Category.id,
          issueType: config.issueType,
          l1: config.l1,
          l2: config.l2,
          l3: config.l3,
          l4: config.l4,
          description: config.description || "",
          departmentType: l4Category.departmentType || "All",
          isActive: l4Category.isActive,
          slaResponseHours: slaConfig.responseTimeHours,
          slaResolutionHours: slaConfig.resolutionTimeHours,
          createdAt: l4Category.createdAt,
        });
      }

      res.status(201).json({
        message: "Configurations created successfully",
        count: createdConfigs.length,
        configs: createdConfigs,
      });
    } catch (error: any) {
      console.error("Error creating ticket configs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update ticket configuration
  app.put("/api/config/ticket-configs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Update L4 category
      const l4Category = await storage.updateCategoryHierarchy(id, {
        description: updates.description,
        departmentType: updates.departmentType,
        isActive: updates.isActive,
      });

      if (!l4Category) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      // Update SLA configuration if provided
      if (updates.slaResponseHours !== undefined || updates.slaResolutionHours !== undefined) {
        const slaConfigs = await storage.getAllSlaConfigurations();
        const slaConfig = slaConfigs.find(s => s.l4CategoryId === id);

        if (slaConfig) {
          await storage.updateSlaConfiguration(slaConfig.id, {
            responseTimeHours: updates.slaResponseHours || slaConfig.responseTimeHours,
            resolutionTimeHours: updates.slaResolutionHours || slaConfig.resolutionTimeHours,
          });
        }
      }

      res.json({ message: "Configuration updated successfully" });
    } catch (error: any) {
      console.error("Error updating ticket config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete ticket configuration
  app.delete("/api/config/ticket-configs/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Delete L4 category (cascade will handle mappings and SLA configs)
      await storage.deleteCategoryHierarchy(id);

      res.json({ message: "Configuration deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting ticket config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Tags Management
  app.get("/api/config/tags", async (_req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/tags", async (req, res) => {
    try {
      const { name, departmentType } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Tag name is required" });
      }

      const tag = await storage.createTag({
        name: name.trim(),
        departmentType: departmentType || "All",
      });

      res.status(201).json(tag);
    } catch (error: any) {
      console.error("Error creating tag:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config/tags/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, departmentType } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (departmentType !== undefined) updates.departmentType = departmentType;

      const tag = await storage.updateTag(id, updates);

      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }

      res.json(tag);
    } catch (error: any) {
      console.error("Error updating tag:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/config/tags/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTag(id);
      res.json({ message: "Tag deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics & Reporting
  app.get("/api/analytics/ticket-counts", async (_req, res) => {
    try {
      const analytics = await storage.getTicketAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // BigQuery Integration
  app.get("/api/bigquery/orders", async (req, res) => {
    try {
      const orderIds = req.query.ids as string;

      if (!orderIds) {
        return res.status(400).json({ error: "Order IDs are required" });
      }

      const idsArray = orderIds.split(',').map(id => id.trim()).filter(id => id);

      if (idsArray.length === 0) {
        return res.status(400).json({ error: "No valid order IDs provided" });
      }

      const orders = await getOrdersByIds(idsArray);
      res.json(orders);
    } catch (error: any) {
      console.error('[API] BigQuery orders fetch failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/bigquery/vendor/:vendorHandle/order-ids", async (req, res) => {
    try {
      const { vendorHandle } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!vendorHandle) {
        return res.status(400).json({ error: "Vendor handle is required" });
      }

      const orderIds = await getOrderIdsByVendor(vendorHandle, limit);
      res.json(orderIds);
    } catch (error: any) {
      console.error('[API] BigQuery vendor order IDs fetch failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/bigquery/test", async (_req, res) => {
    try {
      const isConnected = await testBigQueryConnection();
      res.json({
        connected: isConnected,
        configured: !!(process.env.BIGQUERY_PROJECT_ID),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // BigQuery Automation Endpoints
  app.post("/api/automation/bigquery/sync-vendors", async (_req, res) => {
    try {
      const results = await syncVendorsFromBigQuery();
      res.json({
        success: true,
        message: "Vendor sync completed",
        results,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/automation/bigquery/sync-metrics", async (_req, res) => {
    try {
      const count = await syncVendorMetricsFromBigQuery();
      res.json({
        success: true,
        message: "Metrics sync completed",
        vendorsUpdated: count,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/automation/bigquery/sync-all", async (_req, res) => {
    try {
      await runScheduledBigQuerySync();
      res.json({
        success: true,
        message: "Full BigQuery sync completed",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // n8n Integration Endpoints
  app.get("/api/n8n/status", async (_req, res) => {
    res.json({
      configured: isN8nConfigured(),
      apiKeySet: !!(process.env.N8N_API_KEY || process.env.n8n_api_key),
      webhookUrlSet: !!(process.env.N8N_WEBHOOK_URL || process.env.n8n_webhook_url),
    });
  });

  app.post("/api/n8n/trigger", async (req, res) => {
    try {
      const { event, data } = req.body;

      if (!event) {
        return res.status(400).json({ error: "Event name is required" });
      }

      const success = await triggerN8nWorkflow(event, data);
      res.json({
        success,
        message: success ? "Workflow triggered" : "Failed to trigger workflow",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook endpoint for n8n to call back
  app.post("/api/webhook/n8n", async (req, res) => {
    try {
      const { event, data } = req.body;

      console.log(`[Webhook] Received n8n webhook: ${event}`);

      // Handle different webhook events
      switch (event) {
        case 'bigquery.sync.trigger':
          await runScheduledBigQuerySync();
          break;
        case 'vendor.sync.trigger':
          await syncVendorsFromBigQuery();
          break;
        case 'metrics.sync.trigger':
          await syncVendorMetricsFromBigQuery();
          break;
        default:
          console.log(`[Webhook] Unknown event: ${event}`);
      }

      res.json({ success: true, message: `Processed ${event}` });
    } catch (error: any) {
      console.error('[Webhook] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Configuration Audit & History APIs =====

  // Get audit history for a specific entity
  app.get("/api/config/:entityType/:id/history", async (req, res) => {
    try {
      const { entityType, id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const validEntityTypes = [
        "issueType",
        "categoryHierarchy",
        "categoryMapping",
        "slaConfiguration",
        "priorityConfiguration",
        "tag",
        "categorySettings",
        "ticketFieldConfiguration",
      ];

      if (!validEntityTypes.includes(entityType)) {
        return res.status(400).json({ error: "Invalid entity type" });
      }

      const history = await auditService.getEntityHistory(
        entityType as any,
        id,
        limit
      );
      res.json(history);
    } catch (error: any) {
      console.error("Error fetching audit history:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get recent audit activity across all entities
  app.get("/api/config/audit/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activity = await auditService.getRecentActivity(limit);
      res.json(activity);
    } catch (error: any) {
      console.error("Error fetching recent audit activity:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get audit activity by entity type
  app.get("/api/config/audit/:entityType", async (req, res) => {
    try {
      const { entityType } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const validEntityTypes = [
        "issueType",
        "categoryHierarchy",
        "categoryMapping",
        "slaConfiguration",
        "priorityConfiguration",
        "tag",
        "categorySettings",
        "ticketFieldConfiguration",
      ];

      if (!validEntityTypes.includes(entityType)) {
        return res.status(400).json({ error: "Invalid entity type" });
      }

      const activity = await auditService.getActivityByEntityType(
        entityType as any,
        limit
      );
      res.json(activity);
    } catch (error: any) {
      console.error("Error fetching audit activity by type:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user activity log
  app.get("/api/config/audit/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const activity = await auditService.getUserActivityLog(userId, limit);
      res.json(activity);
    } catch (error: any) {
      console.error("Error fetching user activity log:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Restore deleted configuration
  app.post("/api/config/:entityType/:id/restore", async (req, res) => {
    try {
      const { entityType, id } = req.params;
      const userId = req.body.userId;

      let restored;
      switch (entityType) {
        case "categoryHierarchy":
          restored = await storage.restoreCategoryHierarchy(id, userId);
          break;
        case "tag":
          restored = await storage.restoreTag(id, userId);
          break;
        case "categorySettings":
          restored = await storage.restoreCategorySettings(id, userId);
          break;
        case "ticketFieldConfiguration":
          restored = await storage.restoreTicketFieldConfiguration(id, userId);
          break;
        default:
          return res.status(400).json({ error: "Entity type does not support restore" });
      }

      if (!restored) {
        return res.status(404).json({ error: "Entity not found" });
      }

      res.json(restored);
    } catch (error: any) {
      console.error("Error restoring entity:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Configuration Enums API =====

  // Get all enum values for dropdowns (UI decoupling)
  app.get("/api/config/enums", async (_req, res) => {
    try {
      const [departments, issueTypes, tags] = await Promise.all([
        storage.getAllCategoryHierarchies(false),
        storage.getIssueTypes(),
        storage.getTags(false),
      ]);

      const enums = {
        statuses: ["New", "Open", "Pending", "Solved", "Closed"],
        priorities: ["Critical", "High", "Medium", "Low"],
        departments: Array.from(
          new Set(
            departments
              .filter((c) => c.level === 1)
              .map((c) => c.departmentType)
              .filter(Boolean)
          )
        ),
        issueTypes: issueTypes.map((it) => it.name),
        tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      };

      res.json(enums);
    } catch (error: any) {
      console.error("Error fetching config enums:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Permissions Management API =====

  // Get all permissions
  app.get("/api/permissions", async (_req, res) => {
    try {
      let allPermissions = await storage.getPermissions();

      // Fallback to hardcoded permissions if database is empty
      if (!allPermissions || allPermissions.length === 0) {
        console.log("[permissions] Database empty, using hardcoded defaults");
        allPermissions = HARDCODED_PERMISSIONS as any;
      }

      // Group by category
      const grouped = allPermissions.reduce((acc, perm) => {
        if (!acc[perm.category]) {
          acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
      }, {} as Record<string, typeof allPermissions>);

      res.json({ permissions: allPermissions, grouped });
    } catch (error: any) {
      // On database error, return hardcoded defaults
      console.error("Error fetching permissions, using hardcoded:", error);
      const grouped = HARDCODED_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.category]) {
          acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
      }, {} as Record<string, any[]>);
      res.json({ permissions: HARDCODED_PERMISSIONS, grouped });
    }
  });

  // Get permission by ID
  app.get("/api/permissions/:id", async (req, res) => {
    try {
      const permission = await storage.getPermissionById(req.params.id);
      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }
      res.json(permission);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create permission
  app.post("/api/permissions", async (req, res) => {
    try {
      const { name, displayName, description, category, isSystem } = req.body;
      if (!name || !displayName || !category) {
        return res.status(400).json({ error: "name, displayName, and category are required" });
      }

      // Check for duplicate
      const existing = await storage.getPermissionByName(name);
      if (existing) {
        return res.status(409).json({ error: "Permission with this name already exists" });
      }

      const permission = await storage.createPermission({
        name,
        displayName,
        description,
        category,
        isSystem: isSystem || false,
      });

      res.status(201).json(permission);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update permission
  app.put("/api/permissions/:id", async (req, res) => {
    try {
      const permission = await storage.getPermissionById(req.params.id);
      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }

      // System permissions can only update displayName and description
      if (permission.isSystem) {
        const { displayName, description } = req.body;
        const updated = await storage.updatePermission(req.params.id, { displayName, description });
        return res.json(updated);
      }

      const updated = await storage.updatePermission(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete permission (non-system only)
  app.delete("/api/permissions/:id", async (req, res) => {
    try {
      const permission = await storage.getPermissionById(req.params.id);
      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }

      if (permission.isSystem) {
        return res.status(403).json({ error: "Cannot delete system permission" });
      }

      await storage.deletePermission(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Roles Management API =====

  // Seed default roles and permissions from hardcoded values
  // IMPORTANT: This route must be defined BEFORE /api/roles to avoid route conflicts
  app.post("/api/roles/seed-defaults", async (_req, res) => {
    try {
      console.log("[seed-defaults] Starting seeding process...");

      // Default permissions to seed
      const DEFAULT_PERMISSIONS = [
        { name: "view:dashboard", displayName: "View Dashboard", category: "General", isSystem: true },
        { name: "view:tickets", displayName: "View Tickets", category: "Tickets", isSystem: true },
        { name: "create:tickets", displayName: "Create Tickets", category: "Tickets", isSystem: true },
        { name: "edit:tickets", displayName: "Edit Tickets", category: "Tickets", isSystem: true },
        { name: "delete:tickets", displayName: "Delete Tickets", category: "Tickets", isSystem: true },
        { name: "view:all_tickets", displayName: "View All Tickets", category: "Tickets", isSystem: true },
        { name: "view:department_tickets", displayName: "View Department Tickets", category: "Tickets", isSystem: true },
        { name: "view:assigned_tickets", displayName: "View Assigned Tickets", category: "Tickets", isSystem: true },
        { name: "view:team_tickets", displayName: "View Team Tickets", category: "Tickets", isSystem: true },
        { name: "view:users", displayName: "View Users", category: "Users", isSystem: true },
        { name: "create:users", displayName: "Create Users", category: "Users", isSystem: true },
        { name: "edit:users", displayName: "Edit Users", category: "Users", isSystem: true },
        { name: "delete:users", displayName: "Delete Users", category: "Users", isSystem: true },
        { name: "view:department_users", displayName: "View Department Users", category: "Users", isSystem: true },
        { name: "view:vendors", displayName: "View Vendors", category: "Vendors", isSystem: true },
        { name: "create:vendors", displayName: "Create Vendors", category: "Vendors", isSystem: true },
        { name: "edit:vendors", displayName: "Edit Vendors", category: "Vendors", isSystem: true },
        { name: "delete:vendors", displayName: "Delete Vendors", category: "Vendors", isSystem: true },
        { name: "view:analytics", displayName: "View Analytics", category: "Analytics", isSystem: true },
        { name: "view:config", displayName: "View Configuration", category: "Settings", isSystem: true },
        { name: "edit:config", displayName: "Edit Configuration", category: "Settings", isSystem: true },
        { name: "view:roles", displayName: "View Roles", category: "Settings", isSystem: true },
        { name: "create:roles", displayName: "Create Roles", category: "Settings", isSystem: true },
        { name: "edit:roles", displayName: "Edit Roles", category: "Settings", isSystem: true },
        { name: "delete:roles", displayName: "Delete Roles", category: "Settings", isSystem: true },
      ];

      // Default system roles
      const DEFAULT_ROLES = [
        { name: "Owner", displayName: "Owner", description: "Full system access", isSystem: true },
        { name: "Admin", displayName: "Administrator", description: "Administrative access", isSystem: true },
        { name: "Head", displayName: "Department Head", description: "Department leadership access", isSystem: true },
        { name: "Manager", displayName: "Manager", description: "Team management access", isSystem: true },
        { name: "Lead", displayName: "Team Lead", description: "Team lead access", isSystem: true },
        { name: "Associate", displayName: "Associate", description: "Standard employee access", isSystem: true },
        { name: "Agent", displayName: "Agent", description: "Support agent access", isSystem: true },
      ];

      // Role to permissions mapping (matching ROLE_PERMISSIONS in use-auth.tsx)
      const ROLE_PERMISSION_MAPPING: Record<string, string[]> = {
        Owner: [
          "view:dashboard", "view:tickets", "create:tickets", "edit:tickets", "delete:tickets",
          "view:users", "create:users", "edit:users", "delete:users",
          "view:vendors", "create:vendors", "edit:vendors", "delete:vendors",
          "view:analytics", "view:config", "edit:config", "view:all_tickets",
          "view:roles", "create:roles", "edit:roles", "delete:roles",
        ],
        Admin: [
          "view:dashboard", "view:tickets", "create:tickets", "edit:tickets", "delete:tickets",
          "view:users", "create:users", "edit:users",
          "view:vendors", "create:vendors", "edit:vendors",
          "view:analytics", "view:config", "edit:config", "view:all_tickets",
          "view:roles", "create:roles", "edit:roles",
        ],
        Head: [
          "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
          "view:users", "view:vendors", "view:analytics",
          "view:department_tickets", "view:department_users",
        ],
        Manager: [
          "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
          "view:vendors", "view:department_tickets", "view:department_users",
        ],
        Lead: [
          "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
          "view:vendors", "view:team_tickets",
        ],
        Associate: [
          "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
          "view:assigned_tickets",
        ],
        Agent: [
          "view:dashboard", "view:tickets", "create:tickets", "edit:tickets",
          "view:assigned_tickets", "view:department_tickets",
        ],
      };

      const createdPermissions: any[] = [];
      const createdRoles: any[] = [];
      const skippedPermissions: string[] = [];
      const skippedRoles: string[] = [];
      const errors: string[] = [];

      // Seed permissions
      console.log("[seed-defaults] Seeding permissions...");
      for (const perm of DEFAULT_PERMISSIONS) {
        try {
          const existing = await storage.getPermissionByName(perm.name);
          if (existing) {
            skippedPermissions.push(perm.name);
            continue;
          }
          const created = await storage.createPermission(perm);
          createdPermissions.push(created);
        } catch (permError: any) {
          const errorMsg = `Permission ${perm.name}: ${permError.message}`;
          console.error(`[seed-defaults] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      console.log(`[seed-defaults] Created ${createdPermissions.length} permissions, skipped ${skippedPermissions.length}`);

      // Seed roles and their permissions
      console.log("[seed-defaults] Seeding roles...");
      for (const role of DEFAULT_ROLES) {
        try {
          const existing = await storage.getRoleByName(role.name);
          if (existing) {
            skippedRoles.push(role.name);
            continue;
          }
          const created = await storage.createRole(role);
          createdRoles.push(created);

          // Assign permissions to this role
          const rolePermNames = ROLE_PERMISSION_MAPPING[role.name] || [];
          const permIds: string[] = [];
          for (const permName of rolePermNames) {
            const perm = await storage.getPermissionByName(permName);
            if (perm) {
              permIds.push(perm.id);
            }
          }
          if (permIds.length > 0) {
            await storage.setRolePermissions(created.id, permIds);
          }
          console.log(`[seed-defaults] Created role ${role.name} with ${permIds.length} permissions`);
        } catch (roleError: any) {
          const errorMsg = `Role ${role.name}: ${roleError.message}`;
          console.error(`[seed-defaults] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      console.log(`[seed-defaults] Created ${createdRoles.length} roles, skipped ${skippedRoles.length}`);

      res.json({
        message: errors.length > 0 ? "Seeding completed with errors" : "Seeding complete",
        permissions: {
          created: createdPermissions.length,
          skipped: skippedPermissions.length,
          skippedNames: skippedPermissions,
        },
        roles: {
          created: createdRoles.length,
          skipped: skippedRoles.length,
          skippedNames: skippedRoles,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("[seed-defaults] Error seeding roles and permissions:", error);
      res.status(500).json({
        error: error.message,
        details: "Check server logs for more information. This might indicate the database tables don't exist yet."
      });
    }
  });

  // Get all roles with their permissions
  app.get("/api/roles", async (_req, res) => {
    try {
      const rolesWithPerms = await storage.getRolesWithPermissions();

      // Fallback to hardcoded roles if database is empty
      if (!rolesWithPerms || rolesWithPerms.length === 0) {
        console.log("[roles] Database empty, using hardcoded defaults");
        res.json(getHardcodedRolesWithPermissions());
        return;
      }

      res.json(rolesWithPerms);
    } catch (error: any) {
      // On database error, return hardcoded defaults
      console.error("Error fetching roles, using hardcoded:", error);
      res.json(getHardcodedRolesWithPermissions());
    }
  });

  // Get role by ID with permissions
  app.get("/api/roles/:id", async (req, res) => {
    try {
      const role = await storage.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      const permissions = await storage.getRolePermissions(role.id);
      res.json({ ...role, permissions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create role
  app.post("/api/roles", async (req, res) => {
    try {
      const { name, displayName, description, permissions: permissionIds } = req.body;
      if (!name || !displayName) {
        return res.status(400).json({ error: "name and displayName are required" });
      }

      // Check for duplicate
      const existing = await storage.getRoleByName(name);
      if (existing) {
        return res.status(409).json({ error: "Role with this name already exists" });
      }

      const role = await storage.createRole({
        name,
        displayName,
        description,
        isSystem: false,
      });

      // Set permissions if provided
      if (permissionIds && permissionIds.length > 0) {
        await storage.setRolePermissions(role.id, permissionIds);
      }

      const rolePermissions = await storage.getRolePermissions(role.id);
      res.status(201).json({ ...role, permissions: rolePermissions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update role
  app.put("/api/roles/:id", async (req, res) => {
    try {
      const role = await storage.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      const { name, displayName, description, isActive } = req.body;

      // System roles cannot have their name changed
      if (role.isSystem && name && name !== role.name) {
        return res.status(403).json({ error: "Cannot change name of system role" });
      }

      const updates: any = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (description !== undefined) updates.description = description;
      if (isActive !== undefined) updates.isActive = isActive;
      if (!role.isSystem && name !== undefined) updates.name = name;

      const updated = await storage.updateRole(req.params.id, updates);
      const permissions = await storage.getRolePermissions(req.params.id);
      res.json({ ...updated, permissions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete role (non-system only)
  app.delete("/api/roles/:id", async (req, res) => {
    try {
      const role = await storage.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      if (role.isSystem) {
        return res.status(403).json({ error: "Cannot delete system role" });
      }

      await storage.deleteRole(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update role permissions
  app.put("/api/roles/:id/permissions", async (req, res) => {
    try {
      const role = await storage.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      const { permissionIds } = req.body;
      if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ error: "permissionIds must be an array" });
      }

      await storage.setRolePermissions(role.id, permissionIds);
      const permissions = await storage.getRolePermissions(role.id);
      res.json({ ...role, permissions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DEBUG: Diagnostic endpoint to check user data
  app.get("/api/admin/debug-user/:id", async (req, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roles: user.roles,
        department: user.department,
        isActive: user.isActive,
        roleType: typeof user.role,
        rolesType: typeof user.roles,
        rolesIsArray: Array.isArray(user.roles),
        rolesLength: user.roles ? user.roles.length : 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TEMPORARY: Fix for users with mismatched role/roles fields
  // This endpoint syncs the singular 'role' field with the 'roles' array
  // Can be removed after all users are migrated
  app.post("/api/admin/fix-user-roles", async (req, res) => {
    try {
      // Get all users
      const allUsers = await storage.getUsers();
      const fixed: string[] = [];
      const skipped: string[] = [];

      for (const user of allUsers) {
        // If user has roles array and it doesn't match the role field
        if (user.roles && user.roles.length > 0 && user.role !== user.roles[0]) {
          await storage.updateUser(user.id, {
            role: user.roles[0] // Sync role with first item in roles array
          });
          fixed.push(`${user.email} (${user.role} → ${user.roles[0]})`);
        } else {
          skipped.push(user.email);
        }
      }

      res.json({
        success: true,
        message: `Fixed ${fixed.length} users, skipped ${skipped.length} users`,
        fixed,
        skipped
      });
    } catch (error: any) {
      console.error('Failed to fix user roles:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint: Get user by email
  app.get("/api/admin/user-by-email/:email", async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const user = allUsers.find(u => u.email.toLowerCase().includes(req.params.email.toLowerCase()));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roles: user.roles,
        department: user.department,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Force update a specific user's role (for debugging)
  app.post("/api/admin/force-update-role", async (req, res) => {
    try {
      const { email, role, roles } = req.body;

      if (!email || !role || !roles) {
        return res.status(400).json({ error: "Missing required fields: email, role, roles" });
      }

      const allUsers = await storage.getUsers();
      const user = allUsers.find(u => u.email.toLowerCase().includes(email.toLowerCase()));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("🔧 Force updating user:", {
        id: user.id,
        email: user.email,
        currentRole: user.role,
        currentRoles: user.roles,
        newRole: role,
        newRoles: roles,
      });

      const updated = await storage.updateUser(user.id, {
        role,
        roles: Array.isArray(roles) ? roles : [roles],
      });

      console.log("✅ Force update result:", {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        roles: updated.roles,
      });

      res.json({
        success: true,
        message: "User role force-updated",
        before: {
          role: user.role,
          roles: user.roles,
        },
        after: {
          role: updated.role,
          roles: updated.roles,
        },
      });
    } catch (error: any) {
      console.error('Force update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // One-click fix for atta user (GET endpoint - just visit the URL)
  app.get("/api/admin/fix-atta-now", async (req, res) => {
    try {
      console.log("🔍 Starting atta fix...");

      const allUsers = await storage.getUsers();
      const atta = allUsers.find(u => u.email.toLowerCase().includes('atta'));

      if (!atta) {
        return res.status(404).send(`
          <html><body style="font-family: monospace; padding: 40px; background: #1a1a1a; color: #fff;">
            <h1>❌ User 'atta' not found</h1>
            <p>Available users:</p>
            <pre>${allUsers.map(u => `${u.email} - ${u.role}`).join('\n')}</pre>
          </body></html>
        `);
      }

      console.log("📊 Atta BEFORE fix:", {
        id: atta.id,
        email: atta.email,
        role: atta.role,
        roles: atta.roles,
      });

      // Fix atta to Admin with proper roles array
      const updated = await storage.updateUser(atta.id, {
        role: 'Admin',
        roles: ['Admin', 'Associate'],
      });

      console.log("✅ Atta AFTER fix:", {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        roles: updated.roles,
      });

      res.send(`
        <html>
        <head>
          <style>
            body { font-family: monospace; padding: 40px; background: #1a1a1a; color: #fff; }
            .success { color: #4ade80; }
            .error { color: #f87171; }
            .info { color: #60a5fa; }
            pre { background: #2a2a2a; padding: 20px; border-radius: 8px; overflow-x: auto; }
            h1 { color: #4ade80; }
            .box { background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>✅ Atta User Fixed!</h1>

          <div class="box">
            <h2>Before:</h2>
            <pre>role:  ${atta.role}
roles: ${JSON.stringify(atta.roles, null, 2)}</pre>
          </div>

          <div class="box">
            <h2>After:</h2>
            <pre>role:  ${updated.role}
roles: ${JSON.stringify(updated.roles, null, 2)}</pre>
          </div>

          <div class="box">
            <h2 class="info">✅ Next Steps:</h2>
            <ol>
              <li><strong>Have atta LOGOUT</strong> from the portal</li>
              <li><strong>Have atta LOGIN</strong> again</li>
              <li><strong>Test access to:</strong>
                <ul>
                  <li>All Tickets page</li>
                  <li>User Management</li>
                  <li>Roles page</li>
                </ul>
              </li>
            </ol>
          </div>

          <p class="success">Atta should now have full Admin access! 🎉</p>
        </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Fix atta error:', error);
      res.status(500).send(`
        <html><body style="font-family: monospace; padding: 40px; background: #1a1a1a; color: #f87171;">
          <h1>❌ Error fixing atta</h1>
          <pre>${error.message}\n\n${error.stack}</pre>
        </body></html>
      `);
    }
  });

  return httpServer;
}
