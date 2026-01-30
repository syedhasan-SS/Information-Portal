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

  // Unified Ticket Configurations (combines issue types with L1-L4 hierarchy)
  app.get("/api/config/ticket-configs", async (_req, res) => {
    try {
      // For now, return empty array - full implementation coming soon
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/config/ticket-configs", async (req, res) => {
    try {
      // Placeholder for now
      res.status(201).json({ ...req.body, id: `config-${Date.now()}`, createdAt: new Date() });
    } catch (error: any) {
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

      // For now, just return success with count
      // In the future, this will insert into the database
      res.status(201).json({
        message: "Configurations created successfully",
        count: configs.length,
        configs: configs.map((config, index) => ({
          ...config,
          id: `config-${Date.now()}-${index}`,
          createdAt: new Date()
        }))
      });
    } catch (error: any) {
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

  return httpServer;
}
