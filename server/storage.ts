import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  vendors,
  categories,
  tickets,
  comments,
  users,
  notifications,
  issueTypes,
  categoryHierarchy,
  categoryMappings,
  slaConfigurations,
  priorityConfigurations,
  tags,
  type Vendor,
  type Category,
  type Ticket,
  type Comment,
  type User,
  type Notification,
  type IssueType,
  type CategoryHierarchy,
  type CategoryMapping,
  type SlaConfiguration,
  type PriorityConfiguration,
  type Tag,
  type InsertVendor,
  type InsertCategory,
  type InsertTicket,
  type InsertComment,
  type InsertUser,
  type InsertNotification,
  type InsertIssueType,
  type InsertCategoryHierarchy,
  type InsertCategoryMapping,
  type InsertSlaConfiguration,
  type InsertPriorityConfiguration,
  type InsertTag,
} from "@shared/schema";

export interface IStorage {
  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendorByHandle(handle: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicketById(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket | undefined>;

  // Comments
  getCommentsByTicketId(ticketId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Users
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;

  // Category Hierarchy & SLA
  getAllCategoryHierarchies(): Promise<CategoryHierarchy[]>;
  getAllSlaConfigurations(): Promise<SlaConfiguration[]>;
}

export class DatabaseStorage implements IStorage {
  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).orderBy(desc(vendors.createdAt));
  }

  async getVendorByHandle(handle: string): Promise<Vendor | undefined> {
    const results = await db.select().from(vendors).where(eq(vendors.handle, handle)).limit(1);
    return results[0];
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const results = await db.insert(vendors).values(vendor).returning();
    return results[0];
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.path);
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const results = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return results[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const results = await db.insert(categories).values(category).returning();
    return results[0];
  }

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicketById(id: string): Promise<Ticket | undefined> {
    const results = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    return results[0];
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const results = await db.insert(tickets).values(ticket).returning();
    return results[0];
  }

  async updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const results = await db
      .update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return results[0];
  }

  // Comments
  async getCommentsByTicketId(ticketId: string): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.ticketId, ticketId)).orderBy(comments.createdAt);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const results = await db.insert(comments).values(comment).returning();
    return results[0];
  }

  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserById(id: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`).limit(1);
    return results[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const results = await db.insert(users).values(user).returning();
    return results[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const results = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return results[0];
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Issue Types
  async getIssueTypes(): Promise<IssueType[]> {
    return await db.select().from(issueTypes).orderBy(issueTypes.name);
  }

  async getIssueTypeById(id: string): Promise<IssueType | undefined> {
    const results = await db.select().from(issueTypes).where(eq(issueTypes.id, id)).limit(1);
    return results[0];
  }

  async createIssueType(issueType: InsertIssueType): Promise<IssueType> {
    const results = await db.insert(issueTypes).values(issueType).returning();
    return results[0];
  }

  async updateIssueType(id: string, updates: Partial<InsertIssueType>): Promise<IssueType | undefined> {
    const results = await db
      .update(issueTypes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(issueTypes.id, id))
      .returning();
    return results[0];
  }

  async deleteIssueType(id: string): Promise<void> {
    await db.delete(issueTypes).where(eq(issueTypes.id, id));
  }

  // Category Hierarchy
  async getCategoryHierarchy(): Promise<CategoryHierarchy[]> {
    return await db.select().from(categoryHierarchy).orderBy(categoryHierarchy.level, categoryHierarchy.name);
  }

  async getCategoryHierarchyByLevel(level: 1 | 2 | 3): Promise<CategoryHierarchy[]> {
    return await db.select().from(categoryHierarchy).where(eq(categoryHierarchy.level, level)).orderBy(categoryHierarchy.name);
  }

  async getCategoryHierarchyByLevelAndName(level: number, name: string): Promise<CategoryHierarchy | undefined> {
    const results = await db.select().from(categoryHierarchy)
      .where(and(eq(categoryHierarchy.level, level), eq(categoryHierarchy.name, name)))
      .limit(1);
    return results[0];
  }

  async getCategoryHierarchyByParent(parentId: string | null): Promise<CategoryHierarchy[]> {
    const condition = parentId === null ? isNull(categoryHierarchy.parentId) : eq(categoryHierarchy.parentId, parentId);
    return await db.select().from(categoryHierarchy).where(condition).orderBy(categoryHierarchy.name);
  }

  async getCategoryHierarchyById(id: string): Promise<CategoryHierarchy | undefined> {
    const results = await db.select().from(categoryHierarchy).where(eq(categoryHierarchy.id, id)).limit(1);
    return results[0];
  }

  async createCategoryHierarchy(category: InsertCategoryHierarchy): Promise<CategoryHierarchy> {
    const results = await db.insert(categoryHierarchy).values(category).returning();
    return results[0];
  }

  async updateCategoryHierarchy(id: string, updates: Partial<InsertCategoryHierarchy>): Promise<CategoryHierarchy | undefined> {
    const results = await db
      .update(categoryHierarchy)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categoryHierarchy.id, id))
      .returning();
    return results[0];
  }

  async deleteCategoryHierarchy(id: string): Promise<void> {
    await db.delete(categoryHierarchy).where(eq(categoryHierarchy.id, id));
  }

  // Category Mappings
  async getCategoryMappings(): Promise<CategoryMapping[]> {
    return await db.select().from(categoryMappings).orderBy(desc(categoryMappings.createdAt));
  }

  async getCategoryMappingsByIssueType(issueTypeId: string): Promise<CategoryMapping[]> {
    return await db.select().from(categoryMappings).where(eq(categoryMappings.issueTypeId, issueTypeId));
  }

  async createCategoryMapping(mapping: InsertCategoryMapping): Promise<CategoryMapping> {
    const results = await db.insert(categoryMappings).values(mapping).returning();
    return results[0];
  }

  async updateCategoryMapping(id: string, updates: Partial<InsertCategoryMapping>): Promise<CategoryMapping | undefined> {
    const results = await db
      .update(categoryMappings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categoryMappings.id, id))
      .returning();
    return results[0];
  }

  async deleteCategoryMapping(id: string): Promise<void> {
    await db.delete(categoryMappings).where(eq(categoryMappings.id, id));
  }

  // SLA Configurations
  async getSlaConfigurations(): Promise<SlaConfiguration[]> {
    return await db.select().from(slaConfigurations).orderBy(desc(slaConfigurations.createdAt));
  }

  async getSlaConfigurationById(id: string): Promise<SlaConfiguration | undefined> {
    const results = await db.select().from(slaConfigurations).where(eq(slaConfigurations.id, id)).limit(1);
    return results[0];
  }

  async createSlaConfiguration(sla: InsertSlaConfiguration): Promise<SlaConfiguration> {
    const results = await db.insert(slaConfigurations).values(sla).returning();
    return results[0];
  }

  async updateSlaConfiguration(id: string, updates: Partial<InsertSlaConfiguration>): Promise<SlaConfiguration | undefined> {
    const results = await db
      .update(slaConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(slaConfigurations.id, id))
      .returning();
    return results[0];
  }

  async deleteSlaConfiguration(id: string): Promise<void> {
    await db.delete(slaConfigurations).where(eq(slaConfigurations.id, id));
  }

  // Priority Configurations
  async getPriorityConfigurations(): Promise<PriorityConfiguration[]> {
    return await db.select().from(priorityConfigurations).orderBy(desc(priorityConfigurations.points));
  }

  async getPriorityConfigurationById(id: string): Promise<PriorityConfiguration | undefined> {
    const results = await db.select().from(priorityConfigurations).where(eq(priorityConfigurations.id, id)).limit(1);
    return results[0];
  }

  async createPriorityConfiguration(priority: InsertPriorityConfiguration): Promise<PriorityConfiguration> {
    const results = await db.insert(priorityConfigurations).values(priority).returning();
    return results[0];
  }

  async updatePriorityConfiguration(id: string, updates: Partial<InsertPriorityConfiguration>): Promise<PriorityConfiguration | undefined> {
    const results = await db
      .update(priorityConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(priorityConfigurations.id, id))
      .returning();
    return results[0];
  }

  async deletePriorityConfiguration(id: string): Promise<void> {
    await db.delete(priorityConfigurations).where(eq(priorityConfigurations.id, id));
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(tags.name);
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    const results = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    return results[0];
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const results = await db.insert(tags).values(tag).returning();
    return results[0];
  }

  async updateTag(id: string, updates: Partial<InsertTag>): Promise<Tag | undefined> {
    const results = await db
      .update(tags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tags.id, id))
      .returning();
    return results[0];
  }

  async deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const results = await db.insert(notifications).values(notification).returning();
    return results[0];
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const results = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return results[0];
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // Category Hierarchy & SLA
  async getAllCategoryHierarchies(): Promise<CategoryHierarchy[]> {
    return await db.select().from(categoryHierarchy).orderBy(categoryHierarchy.level, categoryHierarchy.name);
  }

  async getAllSlaConfigurations(): Promise<SlaConfiguration[]> {
    return await db.select().from(slaConfigurations).where(eq(slaConfigurations.isActive, true));
  }

  // Analytics
  async getTicketAnalytics(): Promise<{
    byIssueType: Array<{ issueType: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    byL1: Array<{ category: string; count: number }>;
    byL2: Array<{ category: string; count: number }>;
    byL3: Array<{ category: string; count: number }>;
    byL4: Array<{ category: string; count: number }>;
    bySla: Array<{ status: string; count: number }>;
    byDepartment: Array<{ department: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
    total: number;
  }> {
    // Get all tickets with their categories
    const allTickets = await db.select({
      id: tickets.id,
      issueType: tickets.issueType,
      status: tickets.status,
      department: tickets.department,
      priorityTier: tickets.priorityTier,
      categoryId: tickets.categoryId,
      createdAt: tickets.createdAt,
      slaDueDate: tickets.slaDueDate,
    }).from(tickets);

    // Get all categories for L1/L2/L3/L4 breakdown
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map(allCategories.map(c => [c.id, c]));

    // Count by issue type
    const byIssueType = Object.entries(
      allTickets.reduce((acc, t) => {
        acc[t.issueType] = (acc[t.issueType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([issueType, count]) => ({ issueType, count }));

    // Count by status
    const byStatus = Object.entries(
      allTickets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({ status, count }));

    // Count by department
    const byDepartment = Object.entries(
      allTickets.reduce((acc, t) => {
        acc[t.department] = (acc[t.department] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([department, count]) => ({ department, count }));

    // Count by priority
    const byPriority = Object.entries(
      allTickets.reduce((acc, t) => {
        acc[t.priorityTier] = (acc[t.priorityTier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([priority, count]) => ({ priority, count }));

    // Count by L1/L2/L3/L4
    const l1Counts: Record<string, number> = {};
    const l2Counts: Record<string, number> = {};
    const l3Counts: Record<string, number> = {};
    const l4Counts: Record<string, number> = {};

    allTickets.forEach(ticket => {
      const category = categoryMap.get(ticket.categoryId);
      if (category) {
        l1Counts[category.l1] = (l1Counts[category.l1] || 0) + 1;
        l2Counts[category.l2] = (l2Counts[category.l2] || 0) + 1;
        l3Counts[category.l3] = (l3Counts[category.l3] || 0) + 1;
        if (category.l4) {
          l4Counts[category.l4] = (l4Counts[category.l4] || 0) + 1;
        }
      }
    });

    const byL1 = Object.entries(l1Counts).map(([category, count]) => ({ category, count }));
    const byL2 = Object.entries(l2Counts).map(([category, count]) => ({ category, count }));
    const byL3 = Object.entries(l3Counts).map(([category, count]) => ({ category, count }));
    const byL4 = Object.entries(l4Counts).map(([category, count]) => ({ category, count }));

    // Count by SLA status
    const now = new Date();
    const slaCounts = {
      "Within SLA": 0,
      "Breached": 0,
      "No SLA": 0,
    };

    allTickets.forEach(ticket => {
      if (!ticket.slaDueDate) {
        slaCounts["No SLA"]++;
      } else if (ticket.status === "Solved" || ticket.status === "Closed") {
        // For solved/closed tickets, we'd need to check if they were solved before SLA due date
        // For now, we'll just count them as within SLA if slaDueDate exists
        slaCounts["Within SLA"]++;
      } else if (new Date(ticket.slaDueDate) < now) {
        slaCounts["Breached"]++;
      } else {
        slaCounts["Within SLA"]++;
      }
    });

    const bySla = Object.entries(slaCounts).map(([status, count]) => ({ status, count }));

    return {
      byIssueType,
      byStatus,
      byL1,
      byL2,
      byL3,
      byL4,
      bySla,
      byDepartment,
      byPriority,
      total: allTickets.length,
    };
  }
}

export const storage = new DatabaseStorage();
