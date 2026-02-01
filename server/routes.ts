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
      const parsed = insertTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const ticket = await storage.createTicket(parsed.data);

      // Create notifications for new ticket (non-blocking)
      const creator = await getCurrentUser(req);
      notifyTicketCreated(ticket, creator).catch(err => {
        console.error('Failed to send ticket creation notifications:', err);
      });

      res.status(201).json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

      // Store plain password for email before creating user
      const plainPassword = parsed.data.password;

      const user = await storage.createUser(parsed.data);

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
      const user = await storage.updateUser(req.params.id, req.body);
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
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
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
      res.json(userWithoutPassword);
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
      if (!config.issueType || !config.l1 || !config.l2 || !config.l3 || !config.l4) {
        return res.status(400).json({ error: "Missing required fields" });
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
        name: config.l4,
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
      const slaConfig = await storage.createSlaConfiguration({
        name: `${config.l1} > ${config.l2} > ${config.l3} > ${config.l4}`,
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
        if (!config.issueType || !config.l1 || !config.l2 || !config.l3 || !config.l4) {
          return res.status(400).json({
            error: `Configuration at index ${i} is missing required fields`
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
          name: config.l4,
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
        const slaConfig = await storage.createSlaConfiguration({
          name: `${config.l1} > ${config.l2} > ${config.l3} > ${config.l4}`,
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

  return httpServer;
}
