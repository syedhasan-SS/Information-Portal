import { eq, and, desc, sql, isNull, asc } from "drizzle-orm";
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
  categorySettings,
  ticketFieldConfigurations,
  categoryFieldOverrides,
  departments,
  subDepartments,
  permissions,
  roles,
  rolePermissions,
  categoryRoutingRules,
  productRequests,
  productRequestComments,
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
  type CategorySettings,
  type TicketFieldConfiguration,
  type CategoryFieldOverride,
  type Department,
  type SubDepartment,
  type Permission,
  type Role,
  type RolePermission,
  type CategoryRoutingRule,
  type ProductRequest,
  type ProductRequestComment,
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
  type InsertCategorySettings,
  type InsertTicketFieldConfiguration,
  type InsertCategoryFieldOverride,
  type InsertPermission,
  type InsertRole,
  type InsertRolePermission,
  type InsertCategoryRoutingRule,
  type InsertProductRequest,
  type InsertProductRequestComment,
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
  getUsersByDepartment(department: string, options?: { isActive?: boolean }): Promise<User[]>;
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

  // Category Routing Rules
  getCategoryRoutingRules(): Promise<CategoryRoutingRule[]>;
  getCategoryRoutingRuleById(id: string): Promise<CategoryRoutingRule | undefined>;
  getCategoryRoutingRuleByCategoryId(categoryId: string): Promise<CategoryRoutingRule | undefined>;
  createCategoryRoutingRule(rule: InsertCategoryRoutingRule): Promise<CategoryRoutingRule>;
  updateCategoryRoutingRule(id: string, updates: Partial<InsertCategoryRoutingRule>): Promise<CategoryRoutingRule | undefined>;
  deleteCategoryRoutingRule(id: string): Promise<void>;
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
  async getCategories(): Promise<(Category & { departmentType?: string })[]> {
    // Get all categories from flat table
    const allCategories = await db.select().from(categories).orderBy(categories.path);

    console.log(`[getCategories] Processing ${allCategories.length} flat categories`);

    // Get all L3 AND L4 categoryHierarchy items to map departmentType
    // Note: departmentType is stored at BOTH L3 and L4 levels in some configurations
    const l3Categories = await db
      .select()
      .from(categoryHierarchy)
      .where(eq(categoryHierarchy.level, 3));

    const l4Categories = await db
      .select()
      .from(categoryHierarchy)
      .where(eq(categoryHierarchy.level, 4));

    console.log(`[getCategories] Found ${l3Categories.length} L3 and ${l4Categories.length} L4 categories in categoryHierarchy`);
    console.log('[getCategories] Sample L3 categories:', l3Categories.slice(0, 3).map(c => ({
      name: c.name,
      departmentType: c.departmentType
    })));
    console.log('[getCategories] Sample L4 categories:', l4Categories.slice(0, 3).map(c => ({
      name: c.name,
      departmentType: c.departmentType
    })));

    // Create ID-based map for L3 categories
    const l3IdMap = new Map<string, typeof l3Categories[0]>();
    for (const l3Cat of l3Categories) {
      l3IdMap.set(l3Cat.id, l3Cat);
    }

    // Create maps for L3 and L4 names to departmentType
    const l3NameTypeMap = new Map<string, string>();
    for (const l3Cat of l3Categories) {
      l3NameTypeMap.set(l3Cat.name, l3Cat.departmentType || "All");
    }

    const l4NameTypeMap = new Map<string, string>();
    for (const l4Cat of l4Categories) {
      if (l4Cat.name && l4Cat.name.trim() !== "") {
        // L4 with a name (Seller Support case)
        l4NameTypeMap.set(l4Cat.name, l4Cat.departmentType || "All");
      }
    }

    // CRITICAL: Create map from L3 name to departmentType by checking if L3 has a child L4 with departmentType
    // This handles Customer Support case where L4 exists but has empty name
    const l3NameToTypeViaChild = new Map<string, string>();
    for (const l4Cat of l4Categories) {
      if (l4Cat.departmentType && l4Cat.departmentType !== "All" && l4Cat.parentId) {
        const parentL3 = l3IdMap.get(l4Cat.parentId);
        if (parentL3) {
          l3NameToTypeViaChild.set(parentL3.name, l4Cat.departmentType);
        }
      }
    }

    console.log('[getCategories] L3 name map size:', l3NameTypeMap.size, 'L4 name map size:', l4NameTypeMap.size);
    console.log('[getCategories] L3-to-type-via-child map size:', l3NameToTypeViaChild.size);
    console.log('[getCategories] Sample L3 with Customer Support via child L4:',
      Array.from(l3NameToTypeViaChild.entries()).filter(([_, type]) => type === "Customer Support").slice(0, 5));
    console.log('[getCategories] Sample L4 with Seller Support:',
      Array.from(l4NameTypeMap.entries()).filter(([_, type]) => type === "Seller Support").slice(0, 3));

    // Enhance categories with departmentType
    // Logic:
    // - If category has L4 with name: Use L4's departmentType (Seller Support case)
    // - If category has NO L4 or empty L4: Check if L3 has a child L4 with departmentType (Customer Support case)
    const enhancedCategories = allCategories.map(cat => {
      let departmentType = "All";

      // If category has L4 with a name, look up L4's departmentType
      if (cat.l4 && cat.l4.trim() !== "") {
        departmentType = l4NameTypeMap.get(cat.l4) || "All";
      }
      // If category has NO L4, check if the L3 has a child L4 with departmentType
      else {
        // First try L3's child L4 (Customer Support case: L4 exists but has empty name)
        const typeViaChild = l3NameToTypeViaChild.get(cat.l3);
        if (typeViaChild) {
          departmentType = typeViaChild;
        }
        // Fallback to L3's own departmentType
        else {
          departmentType = l3NameTypeMap.get(cat.l3) || "All";
        }
      }

      return {
        ...cat,
        departmentType
      };
    });

    console.log(`[getCategories] Returning ${enhancedCategories.length} categories with departmentType`);
    console.log('[getCategories] Sample enhanced categories:', enhancedCategories.slice(0, 5).map(c => ({
      l1: c.l1,
      l2: c.l2,
      l3: c.l3,
      departmentType: c.departmentType
    })));

    // Count by departmentType
    const typeCounts = enhancedCategories.reduce((acc, cat) => {
      acc[cat.departmentType] = (acc[cat.departmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[getCategories] Categories by departmentType:', typeCounts);

    return enhancedCategories;
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const results = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return results[0];
  }

  /**
   * Get category information from categoryHierarchy by building the path
   * Used for new tickets that reference categoryHierarchy IDs
   */
  async getCategoryFromHierarchyById(id: string): Promise<Category | undefined> {
    const leafCategory = await db.select().from(categoryHierarchy)
      .where(eq(categoryHierarchy.id, id))
      .limit(1);

    if (!leafCategory[0]) return undefined;

    // Get all categories to build path
    const allCategories = await db.select().from(categoryHierarchy)
      .where(sql`${categoryHierarchy.deletedAt} IS NULL`);

    const categoryMap = new Map(allCategories.map(c => [c.id, c]));

    // Walk up tree to build full path
    const path: typeof leafCategory[0][] = [];
    let current: typeof leafCategory[0] | undefined = leafCategory[0];
    while (current) {
      path.unshift(current);
      current = current.parentId ? categoryMap.get(current.parentId) : undefined;
    }

    // Extract L1, L2, L3, L4
    const l1 = path[0]?.name || "";
    const l2 = path[1]?.name || "";
    const l3 = path[2]?.name || "";
    const l4 = path[3]?.name || null;
    const fullPath = path.map(p => p.name).filter(n => n).join(" > ");

    // Return in Category format for compatibility
    return {
      id: leafCategory[0].id,
      issueType: null,
      l1,
      l2,
      l3,
      l4,
      path: fullPath,
      departmentType: leafCategory[0].departmentType || "All",
      issuePriorityPoints: 10,
      createdAt: leafCategory[0].createdAt,
    };
  }

  async getCategoryByPath(path: string): Promise<Category | undefined> {
    const results = await db.select().from(categories).where(eq(categories.path, path)).limit(1);
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
    // Use transaction to prevent race conditions in ticket number generation
    return await db.transaction(async (tx) => {
      // Generate ticket number if not provided
      if (!ticket.ticketNumber) {
        // Determine department prefix based on ticket type
        // SS = Seller Support (has vendorHandle)
        // CS = Customer Support (has customer field but no vendorHandle)
        const prefix = ticket.vendorHandle ? 'SS' : 'CS';

        // Get the last ticket number for this prefix (within transaction)
        const lastTicket = await tx.select({ ticketNumber: tickets.ticketNumber })
          .from(tickets)
          .where(sql`${tickets.ticketNumber} LIKE ${prefix + '%'}`)
          .orderBy(sql`${tickets.ticketNumber} DESC`)
          .limit(1);

        const lastNumber = lastTicket[0]?.ticketNumber
          ? parseInt(lastTicket[0].ticketNumber.replace(/[^\d]/g, ''))
          : 0;

        ticket.ticketNumber = `${prefix}${(lastNumber + 1).toString().padStart(5, '0')}`;
      }

      // Set default ownerTeam if not provided
      if (!ticket.ownerTeam) {
        ticket.ownerTeam = ticket.department || 'Seller Support';
      }

      // Set default priority fields if not provided
      if (!ticket.priorityScore) {
        ticket.priorityScore = 0;
      }
      if (!ticket.priorityTier) {
        ticket.priorityTier = 'Low';
      }
      if (!ticket.priorityBadge) {
        ticket.priorityBadge = 'P3';
      }
      if (!ticket.priorityBreakdown) {
        ticket.priorityBreakdown = {
          vendorTicketVolume: 0,
          vendorGmvTier: "Unknown",
          issuePriorityPoints: 0,
          gmvPoints: 0,
          ticketHistoryPoints: 0,
          issuePoints: 0,
        };
      }

      // Capture configuration snapshots
      const snapshots = await this.captureConfigurationSnapshots(ticket);

      // Insert ticket with snapshots (within transaction)
      const results = await tx.insert(tickets).values({
        ...ticket,
        ...snapshots,
      }).returning();

      return results[0];
    });
  }

  /**
   * Captures immutable snapshots of all configuration data at ticket creation time
   */
  private async captureConfigurationSnapshots(ticketData: InsertTicket) {
    // Fetch configuration data in parallel
    // Try categoryHierarchy first (new system), then fall back to old categories table
    let category = null;
    if (ticketData.categoryId) {
      category = await this.getCategoryFromHierarchyById(ticketData.categoryId);
      if (!category) {
        // Fallback to old categories table for backward compatibility
        category = await this.getCategoryById(ticketData.categoryId);
      }
    }

    const [slaConfig, tagsData] = await Promise.all([
      this.findMatchingSlaConfiguration(ticketData.categoryId, ticketData.department),
      ticketData.tags ? this.getTagsByNames(ticketData.tags) : Promise.resolve([]),
    ]);

    // Build category snapshot (with defaults if no category selected)
    const categorySnapshot = category ? {
      categoryId: ticketData.categoryId,
      issueType: ticketData.issueType,
      l1: category.l1,
      l2: category.l2,
      l3: category.l3,
      l4: category.l4,
      path: category.path,
      departmentType: category.departmentType,
      issuePriorityPoints: category.issuePriorityPoints,
    } : {
      categoryId: null,
      issueType: ticketData.issueType,
      l1: 'General',
      l2: 'Uncategorized',
      l3: 'Other',
      l4: null,
      path: 'General / Uncategorized / Other',
      departmentType: ticketData.department,
      issuePriorityPoints: 0,
    };

    // Build SLA snapshot
    const now = ticketData.createdAt || new Date();
    const slaSnapshot = {
      configurationId: slaConfig?.id,
      responseTimeHours: slaConfig?.responseTimeHours || null,
      resolutionTimeHours: slaConfig?.resolutionTimeHours || 24,
      useBusinessHours: slaConfig?.useBusinessHours || false,
      responseTarget: slaConfig?.responseTimeHours
        ? this.calculateSlaTarget(now, slaConfig.responseTimeHours, slaConfig.useBusinessHours || false)
        : null,
      resolveTarget: this.calculateSlaTarget(
        now,
        slaConfig?.resolutionTimeHours || 24,
        slaConfig?.useBusinessHours || false
      ),
    };

    // Build priority snapshot (using existing priority calculation data)
    const prioritySnapshot = {
      configurationId: undefined, // Could be added if priority configs are matched
      score: ticketData.priorityScore || 0,
      tier: ticketData.priorityTier || "Low",
      badge: ticketData.priorityBadge || "P3",
      breakdown: ticketData.priorityBreakdown || {
        vendorTicketVolume: 0,
        vendorGmvTier: "Unknown",
        issuePriorityPoints: 0,
        gmvPoints: 0,
        ticketHistoryPoints: 0,
        issuePoints: 0,
      },
    };

    // Build tags snapshot
    const tagsSnapshot = tagsData.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color || undefined,
      departmentType: tag.departmentType || undefined,
      appliedAt: now.toISOString(),
    }));

    return {
      categorySnapshot,
      slaSnapshot,
      prioritySnapshot,
      tagsSnapshot,
      snapshotVersion: 1,
      snapshotCapturedAt: now,
    };
  }

  /**
   * Calculates SLA target timestamp
   */
  private calculateSlaTarget(startTime: Date, hours: number, useBusinessHours: boolean): string {
    // For now, simple calculation (business hours logic can be added later)
    const targetTime = new Date(startTime);
    targetTime.setHours(targetTime.getHours() + hours);
    return targetTime.toISOString();
  }

  /**
   * Finds matching SLA configuration for a category and department
   */
  private async findMatchingSlaConfiguration(
    categoryId: string,
    department: string
  ): Promise<SlaConfiguration | undefined> {
    const allConfigs = await this.getSlaConfigurations();

    // Try to find exact match first
    let match = allConfigs.find(
      config =>
        config.isActive &&
        config.categoryId === categoryId &&
        config.department === department
    );

    // Fallback to "All" department if no exact match
    if (!match) {
      match = allConfigs.find(
        config =>
          config.isActive &&
          config.categoryId === categoryId &&
          config.department === "All"
      );
    }

    return match;
  }

  /**
   * Gets tags by their names
   */
  private async getTagsByNames(tagNames: string[]): Promise<Tag[]> {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    const allTags = await this.getTags();
    return allTags.filter(tag => tagNames.includes(tag.name));
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

  async getUsersByDepartment(department: string, options?: { isActive?: boolean }): Promise<User[]> {
    const conditions = [eq(users.department, department)];

    if (options?.isActive !== undefined) {
      conditions.push(eq(users.isActive, options.isActive));
    }

    return await db.select()
      .from(users)
      .where(and(...conditions))
      .orderBy(users.name);
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

  async deleteCategoryHierarchy(id: string, userId?: string): Promise<CategoryHierarchy | undefined> {
    const results = await db
      .update(categoryHierarchy)
      .set({
        deletedAt: new Date(),
        deletedById: userId || null,
        updatedAt: new Date(),
        updatedById: userId || null,
        isActive: false,
      })
      .where(eq(categoryHierarchy.id, id))
      .returning();
    return results[0];
  }

  async restoreCategoryHierarchy(id: string, userId?: string): Promise<CategoryHierarchy | undefined> {
    const results = await db
      .update(categoryHierarchy)
      .set({
        deletedAt: null,
        deletedById: null,
        updatedAt: new Date(),
        updatedById: userId || null,
        isActive: true,
      })
      .where(eq(categoryHierarchy.id, id))
      .returning();
    return results[0];
  }

  // Get categories for ticket creation - builds complete paths from categoryHierarchy
  async getCategoriesForTicketCreation(filters?: { departmentType?: string; issueType?: string }) {
    // Get all L3 and L4 categories (these are the selectable endpoints)
    const l3Categories = await db
      .select()
      .from(categoryHierarchy)
      .where(and(
        eq(categoryHierarchy.level, 3),
        eq(categoryHierarchy.isActive, true),
        sql`${categoryHierarchy.deletedAt} IS NULL`
      ));

    const l4Categories = await db
      .select()
      .from(categoryHierarchy)
      .where(and(
        eq(categoryHierarchy.level, 4),
        eq(categoryHierarchy.isActive, true),
        sql`${categoryHierarchy.deletedAt} IS NULL`
      ));

    // Get all parent categories to build paths
    const allCategories = await db
      .select()
      .from(categoryHierarchy)
      .where(sql`${categoryHierarchy.deletedAt} IS NULL`);

    const categoryMap = new Map(allCategories.map(c => [c.id, c]));

    // Build complete category objects
    const buildCategoryObject = (leafCategory: CategoryHierarchy) => {
      const path: CategoryHierarchy[] = [];
      let current: CategoryHierarchy | undefined = leafCategory;

      // Walk up the tree to build full path
      while (current) {
        path.unshift(current);
        current = current.parentId ? categoryMap.get(current.parentId) : undefined;
      }

      // Extract L1, L2, L3, L4
      const l1 = path[0]?.name || "";
      const l2 = path[1]?.name || "";
      const l3 = path[2]?.name || "";
      const l4 = path[3]?.name || null;

      // Get departmentType from the leaf (L3 or L4)
      const departmentType = leafCategory.departmentType || "All";

      return {
        id: leafCategory.id,
        issueType: null, // Will be filtered by issueType separately
        l1,
        l2,
        l3,
        l4,
        path: path.map(p => p.name).join(" > "),
        departmentType,
        issuePriorityPoints: 10, // Default, can be configured
        createdAt: leafCategory.createdAt
      };
    };

    // Build from L4 categories (those with names - Seller Support case)
    const l4Objects = l4Categories
      .filter(l4 => l4.name && l4.name.trim() !== "")
      .map(buildCategoryObject);

    // Build from L3 categories (those without L4 or with empty L4 - Customer Support case)
    const l3Objects = l3Categories
      .filter(l3 => {
        // Include L3 if it has a child L4 with departmentType but empty name
        const childL4 = l4Categories.find(l4 => l4.parentId === l3.id);
        if (childL4 && childL4.departmentType && childL4.departmentType !== "All") {
          return true;
        }
        // Or if L3 itself has departmentType set
        return l3.departmentType && l3.departmentType !== "All";
      })
      .map(l3 => {
        // Check if L3 has a child L4 with departmentType
        const childL4 = l4Categories.find(l4 => l4.parentId === l3.id);
        const effectiveDepartmentType = childL4?.departmentType || l3.departmentType || "All";

        const obj = buildCategoryObject(l3);
        return {
          ...obj,
          id: childL4?.id || l3.id, // Use L4 ID if exists for consistency
          departmentType: effectiveDepartmentType
        };
      });

    let allCategoryObjects = [...l4Objects, ...l3Objects];

    // Filter by departmentType if specified
    if (filters?.departmentType) {
      allCategoryObjects = allCategoryObjects.filter(cat =>
        cat.departmentType === filters.departmentType || cat.departmentType === "All"
      );
    }

    console.log(`[getCategoriesForTicketCreation] Built ${allCategoryObjects.length} categories`);
    console.log(`[getCategoriesForTicketCreation] Breakdown:`, {
      total: allCategoryObjects.length,
      customerSupport: allCategoryObjects.filter(c => c.departmentType === "Customer Support").length,
      sellerSupport: allCategoryObjects.filter(c => c.departmentType === "Seller Support").length,
      all: allCategoryObjects.filter(c => c.departmentType === "All").length
    });

    return allCategoryObjects;
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
  async getTags(includeDeleted: boolean = false): Promise<Tag[]> {
    if (includeDeleted) {
      return await db.select().from(tags).orderBy(tags.name);
    }
    return await db
      .select()
      .from(tags)
      .where(isNull(tags.deletedAt))
      .orderBy(tags.name);
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

  async deleteTag(id: string, userId?: string): Promise<Tag | undefined> {
    const results = await db
      .update(tags)
      .set({
        deletedAt: new Date(),
        deletedById: userId || null,
        updatedAt: new Date(),
        updatedById: userId || null,
        isActive: false,
      })
      .where(eq(tags.id, id))
      .returning();
    return results[0];
  }

  async restoreTag(id: string, userId?: string): Promise<Tag | undefined> {
    const results = await db
      .update(tags)
      .set({
        deletedAt: null,
        deletedById: null,
        updatedAt: new Date(),
        updatedById: userId || null,
        isActive: true,
      })
      .where(eq(tags.id, id))
      .returning();
    return results[0];
  }

  // Category Settings
  async getCategorySettings(): Promise<CategorySettings[]> {
    return await db.select().from(categorySettings).orderBy(categorySettings.departmentType);
  }

  async getCategorySettingsByDepartment(departmentType: "Seller Support" | "Customer Support" | "All"): Promise<CategorySettings | undefined> {
    const results = await db.select().from(categorySettings).where(eq(categorySettings.departmentType, departmentType)).limit(1);
    return results[0];
  }

  async createCategorySettings(settings: InsertCategorySettings): Promise<CategorySettings> {
    const results = await db.insert(categorySettings).values(settings).returning();
    return results[0];
  }

  async updateCategorySettings(id: string, updates: Partial<InsertCategorySettings>): Promise<CategorySettings | undefined> {
    const results = await db
      .update(categorySettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categorySettings.id, id))
      .returning();
    return results[0];
  }

  async deleteCategorySettings(id: string, userId?: string): Promise<CategorySettings | undefined> {
    const results = await db
      .update(categorySettings)
      .set({
        deletedAt: new Date(),
        deletedById: userId || null,
        updatedAt: new Date(),
        updatedById: userId || null,
      })
      .where(eq(categorySettings.id, id))
      .returning();
    return results[0];
  }

  async restoreCategorySettings(id: string, userId?: string): Promise<CategorySettings | undefined> {
    const results = await db
      .update(categorySettings)
      .set({
        deletedAt: null,
        deletedById: null,
        updatedAt: new Date(),
        updatedById: userId || null,
      })
      .where(eq(categorySettings.id, id))
      .returning();
    return results[0];
  }

  // Ticket Field Configurations
  async getTicketFieldConfigurations(): Promise<TicketFieldConfiguration[]> {
    return await db.select().from(ticketFieldConfigurations)
      .where(isNull(ticketFieldConfigurations.deletedAt))
      .orderBy(ticketFieldConfigurations.displayOrder, ticketFieldConfigurations.fieldName);
  }

  async getTicketFieldConfigurationsByDepartment(departmentType: "Seller Support" | "Customer Support" | "All"): Promise<TicketFieldConfiguration[]> {
    // Get fields for the specific department OR "All" departments
    // BUT exclude fields from the opposite department
    const allFields = await db.select().from(ticketFieldConfigurations)
      .where(isNull(ticketFieldConfigurations.deletedAt))
      .orderBy(ticketFieldConfigurations.displayOrder, ticketFieldConfigurations.fieldName);

    // Filter logic:
    // - Include fields matching the requested departmentType
    // - Include fields with departmentType="All"
    // - Exclude fields from the opposite department
    const filteredFields = allFields.filter(field => {
      const fieldDept = field.departmentType || "All";

      // Always include "All" fields
      if (fieldDept === "All") return true;

      // Include if matches requested department
      if (fieldDept === departmentType) return true;

      // Exclude if it's from a different specific department
      return false;
    });

    return filteredFields;
  }

  async getTicketFieldConfigurationById(id: string): Promise<TicketFieldConfiguration | undefined> {
    const results = await db.select().from(ticketFieldConfigurations).where(eq(ticketFieldConfigurations.id, id)).limit(1);
    return results[0];
  }

  async createTicketFieldConfiguration(config: InsertTicketFieldConfiguration): Promise<TicketFieldConfiguration> {
    const results = await db.insert(ticketFieldConfigurations).values(config).returning();
    return results[0];
  }

  async updateTicketFieldConfiguration(id: string, updates: Partial<InsertTicketFieldConfiguration>): Promise<TicketFieldConfiguration | undefined> {
    const results = await db
      .update(ticketFieldConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ticketFieldConfigurations.id, id))
      .returning();
    return results[0];
  }

  async deleteTicketFieldConfiguration(id: string, userId?: string): Promise<TicketFieldConfiguration | undefined> {
    const results = await db
      .update(ticketFieldConfigurations)
      .set({
        deletedAt: new Date(),
        deletedById: userId || null,
        updatedAt: new Date(),
        updatedById: userId || null,
      })
      .where(eq(ticketFieldConfigurations.id, id))
      .returning();
    return results[0];
  }

  async restoreTicketFieldConfiguration(id: string, userId?: string): Promise<TicketFieldConfiguration | undefined> {
    const results = await db
      .update(ticketFieldConfigurations)
      .set({
        deletedAt: null,
        deletedById: null,
        updatedAt: new Date(),
        updatedById: userId || null,
      })
      .where(eq(ticketFieldConfigurations.id, id))
      .returning();
    return results[0];
  }

  // Category Field Overrides
  async getCategoryFieldOverrides(categoryId: string): Promise<CategoryFieldOverride[]> {
    return await db.select().from(categoryFieldOverrides)
      .where(eq(categoryFieldOverrides.categoryId, categoryId))
      .orderBy(categoryFieldOverrides.displayOrderOverride);
  }

  async getCategoryFieldOverridesByField(fieldConfigurationId: string): Promise<CategoryFieldOverride[]> {
    return await db.select().from(categoryFieldOverrides)
      .where(eq(categoryFieldOverrides.fieldConfigurationId, fieldConfigurationId));
  }

  async getCategoryFieldOverride(categoryId: string, fieldConfigurationId: string): Promise<CategoryFieldOverride | undefined> {
    const results = await db.select().from(categoryFieldOverrides)
      .where(and(
        eq(categoryFieldOverrides.categoryId, categoryId),
        eq(categoryFieldOverrides.fieldConfigurationId, fieldConfigurationId)
      ))
      .limit(1);
    return results[0];
  }

  async createCategoryFieldOverride(override: InsertCategoryFieldOverride): Promise<CategoryFieldOverride> {
    const results = await db.insert(categoryFieldOverrides).values(override).returning();
    return results[0];
  }

  async updateCategoryFieldOverride(id: string, updates: Partial<InsertCategoryFieldOverride>): Promise<CategoryFieldOverride | undefined> {
    const results = await db
      .update(categoryFieldOverrides)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categoryFieldOverrides.id, id))
      .returning();
    return results[0];
  }

  async deleteCategoryFieldOverride(id: string): Promise<void> {
    await db.delete(categoryFieldOverrides).where(eq(categoryFieldOverrides.id, id));
  }

  async deleteCategoryFieldOverridesByCategoryId(categoryId: string): Promise<void> {
    await db.delete(categoryFieldOverrides).where(eq(categoryFieldOverrides.categoryId, categoryId));
  }

  async upsertCategoryFieldOverrides(
    categoryId: string,
    overrides: Array<{
      fieldConfigurationId: string;
      visibilityOverride?: "visible" | "hidden" | null;
      requiredOverride?: boolean | null;
      displayOrderOverride?: number | null;
      metadataOverride?: any;
    }>,
    userId?: string
  ): Promise<CategoryFieldOverride[]> {
    const results: CategoryFieldOverride[] = [];

    for (const override of overrides) {
      const existing = await this.getCategoryFieldOverride(categoryId, override.fieldConfigurationId);

      if (existing) {
        const updated = await this.updateCategoryFieldOverride(existing.id, {
          ...override,
          updatedById: userId,
        });
        if (updated) results.push(updated);
      } else {
        const created = await this.createCategoryFieldOverride({
          categoryId,
          ...override,
          createdById: userId,
        });
        results.push(created);
      }
    }

    return results;
  }

  // Get resolved field configuration for a category (with inheritance/overrides applied)
  async getResolvedFieldsForCategory(
    categoryId: string,
    departmentType?: "Seller Support" | "Customer Support" | "All"
  ): Promise<Array<TicketFieldConfiguration & {
    override?: CategoryFieldOverride;
    effectiveVisibility: "visible" | "hidden";
    effectiveRequired: boolean;
  }>> {
    // Get base field configurations
    const baseFields = departmentType
      ? await this.getTicketFieldConfigurationsByDepartment(departmentType)
      : await this.getTicketFieldConfigurations();

    // Get overrides for this category
    const overrides = await this.getCategoryFieldOverrides(categoryId);
    const overrideMap = new Map(overrides.map(o => [o.fieldConfigurationId, o]));

    // Merge and resolve
    return baseFields
      .filter(field => field.isEnabled)
      .map(field => {
        const override = overrideMap.get(field.id);
        return {
          ...field,
          override,
          effectiveVisibility: (override?.visibilityOverride ?? "visible") as "visible" | "hidden",
          effectiveRequired: override?.requiredOverride ?? field.isRequired,
          displayOrder: override?.displayOrderOverride ?? field.displayOrder,
        };
      })
      .filter(field => field.effectiveVisibility !== "hidden")
      .sort((a, b) => a.displayOrder - b.displayOrder);
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
  async getAllCategoryHierarchies(includeDeleted: boolean = false): Promise<CategoryHierarchy[]> {
    if (includeDeleted) {
      return await db.select().from(categoryHierarchy).orderBy(categoryHierarchy.level, categoryHierarchy.name);
    }
    return await db
      .select()
      .from(categoryHierarchy)
      .where(isNull(categoryHierarchy.deletedAt))
      .orderBy(categoryHierarchy.level, categoryHierarchy.name);
  }

  async getAllSlaConfigurations(): Promise<SlaConfiguration[]> {
    return await db.select().from(slaConfigurations).where(eq(slaConfigurations.isActive, true));
  }

  // Category Routing Rules
  async getCategoryRoutingRules(): Promise<CategoryRoutingRule[]> {
    return await db.select()
      .from(categoryRoutingRules)
      .where(eq(categoryRoutingRules.isActive, true))
      .orderBy(categoryRoutingRules.createdAt);
  }

  async getCategoryRoutingRuleById(id: string): Promise<CategoryRoutingRule | undefined> {
    const results = await db.select()
      .from(categoryRoutingRules)
      .where(eq(categoryRoutingRules.id, id))
      .limit(1);
    return results[0];
  }

  async getCategoryRoutingRuleByCategoryId(categoryId: string): Promise<CategoryRoutingRule | undefined> {
    const results = await db.select()
      .from(categoryRoutingRules)
      .where(and(
        eq(categoryRoutingRules.categoryId, categoryId),
        eq(categoryRoutingRules.isActive, true)
      ))
      .limit(1);
    return results[0];
  }

  async createCategoryRoutingRule(rule: InsertCategoryRoutingRule): Promise<CategoryRoutingRule> {
    const results = await db.insert(categoryRoutingRules).values(rule).returning();
    return results[0];
  }

  async updateCategoryRoutingRule(id: string, updates: Partial<InsertCategoryRoutingRule>): Promise<CategoryRoutingRule | undefined> {
    const results = await db
      .update(categoryRoutingRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categoryRoutingRules.id, id))
      .returning();
    return results[0];
  }

  async deleteCategoryRoutingRule(id: string): Promise<void> {
    await db.delete(categoryRoutingRules).where(eq(categoryRoutingRules.id, id));
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
      slaResolveTarget: tickets.slaResolveTarget,
    }).from(tickets);

    // Use categorySnapshot for analytics (immutable, already contains L1/L2/L3/L4)
    // This is more reliable than looking up categories which may have been deleted/changed

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

    // Count by L1/L2/L3/L4 using categorySnapshot
    const l1Counts: Record<string, number> = {};
    const l2Counts: Record<string, number> = {};
    const l3Counts: Record<string, number> = {};
    const l4Counts: Record<string, number> = {};

    allTickets.forEach(ticket => {
      if (ticket.categorySnapshot) {
        const snap = ticket.categorySnapshot as any;
        if (snap.l1) l1Counts[snap.l1] = (l1Counts[snap.l1] || 0) + 1;
        if (snap.l2) l2Counts[snap.l2] = (l2Counts[snap.l2] || 0) + 1;
        if (snap.l3) l3Counts[snap.l3] = (l3Counts[snap.l3] || 0) + 1;
        if (snap.l4) l4Counts[snap.l4] = (l4Counts[snap.l4] || 0) + 1;
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
      if (!ticket.slaResolveTarget) {
        slaCounts["No SLA"]++;
      } else if (ticket.status === "Solved" || ticket.status === "Closed") {
        // For solved/closed tickets, we'd need to check if they were solved before SLA due date
        // For now, we'll just count them as within SLA if slaResolveTarget exists
        slaCounts["Within SLA"]++;
      } else if (new Date(ticket.slaResolveTarget) < now) {
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

  // Department methods
  async getDepartments(): Promise<Department[]> {
    return db.select().from(departments).orderBy(asc(departments.displayOrder), asc(departments.name));
  }

  async getActiveDepartments(): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.isActive, true)).orderBy(asc(departments.displayOrder), asc(departments.name));
  }

  async getDepartmentById(id: string): Promise<Department | undefined> {
    const result = await db.select().from(departments).where(eq(departments.id, id));
    return result[0];
  }

  async getDepartmentByName(name: string): Promise<Department | undefined> {
    const result = await db.select().from(departments).where(eq(departments.name, name));
    return result[0];
  }

  async createDepartment(data: { name: string; description?: string; color?: string; headId?: string; isActive?: boolean; displayOrder?: number }): Promise<Department> {
    const result = await db.insert(departments).values(data).returning();
    return result[0];
  }

  async updateDepartment(id: string, data: Partial<{ name: string; description: string; color: string; headId: string | null; isActive: boolean; displayOrder: number }>): Promise<Department | undefined> {
    const result = await db.update(departments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return result[0];
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // Sub-department methods
  async getSubDepartments(): Promise<SubDepartment[]> {
    return db.select().from(subDepartments).orderBy(asc(subDepartments.displayOrder), asc(subDepartments.name));
  }

  async getSubDepartmentsByDepartment(departmentId: string): Promise<SubDepartment[]> {
    return db.select().from(subDepartments)
      .where(eq(subDepartments.departmentId, departmentId))
      .orderBy(asc(subDepartments.displayOrder), asc(subDepartments.name));
  }

  async getActiveSubDepartmentsByDepartment(departmentId: string): Promise<SubDepartment[]> {
    return db.select().from(subDepartments)
      .where(and(eq(subDepartments.departmentId, departmentId), eq(subDepartments.isActive, true)))
      .orderBy(asc(subDepartments.displayOrder), asc(subDepartments.name));
  }

  async getSubDepartmentById(id: string): Promise<SubDepartment | undefined> {
    const result = await db.select().from(subDepartments).where(eq(subDepartments.id, id));
    return result[0];
  }

  async createSubDepartment(data: { name: string; departmentId: string; parentId?: string; description?: string; isActive?: boolean; displayOrder?: number }): Promise<SubDepartment> {
    const result = await db.insert(subDepartments).values(data).returning();
    return result[0];
  }

  async updateSubDepartment(id: string, data: Partial<{ name: string; departmentId: string; parentId: string; description: string; isActive: boolean; displayOrder: number }>): Promise<SubDepartment | undefined> {
    const result = await db.update(subDepartments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subDepartments.id, id))
      .returning();
    return result[0];
  }

  async deleteSubDepartment(id: string): Promise<void> {
    await db.delete(subDepartments).where(eq(subDepartments.id, id));
  }

  // Get departments with their sub-departments
  async getDepartmentsWithSubDepartments(): Promise<(Department & { subDepartments: SubDepartment[] })[]> {
    const allDepartments = await this.getDepartments();
    const allSubDepartments = await this.getSubDepartments();

    return allDepartments.map(dept => ({
      ...dept,
      subDepartments: allSubDepartments.filter(sub => sub.departmentId === dept.id),
    }));
  }

  // ============================================
  // Permission Methods
  // ============================================

  async getPermissions(): Promise<Permission[]> {
    return db.select().from(permissions).orderBy(asc(permissions.category), asc(permissions.name));
  }

  async getActivePermissions(): Promise<Permission[]> {
    return db.select().from(permissions)
      .where(eq(permissions.isActive, true))
      .orderBy(asc(permissions.category), asc(permissions.name));
  }

  async getPermissionById(id: string): Promise<Permission | undefined> {
    const result = await db.select().from(permissions).where(eq(permissions.id, id));
    return result[0];
  }

  async getPermissionByName(name: string): Promise<Permission | undefined> {
    const result = await db.select().from(permissions).where(eq(permissions.name, name));
    return result[0];
  }

  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    return db.select().from(permissions)
      .where(eq(permissions.category, category))
      .orderBy(asc(permissions.name));
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const result = await db.insert(permissions).values(permission).returning();
    return result[0];
  }

  async updatePermission(id: string, updates: Partial<InsertPermission>): Promise<Permission | undefined> {
    const result = await db.update(permissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(permissions.id, id))
      .returning();
    return result[0];
  }

  async deletePermission(id: string): Promise<void> {
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  // ============================================
  // Role Methods
  // ============================================

  async getRoles(): Promise<Role[]> {
    return db.select().from(roles).orderBy(asc(roles.name));
  }

  async getActiveRoles(): Promise<Role[]> {
    return db.select().from(roles)
      .where(eq(roles.isActive, true))
      .orderBy(asc(roles.name));
  }

  async getRoleById(id: string): Promise<Role | undefined> {
    const result = await db.select().from(roles).where(eq(roles.id, id));
    return result[0];
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const result = await db.select().from(roles).where(eq(roles.name, name));
    return result[0];
  }

  async getSystemRoles(): Promise<Role[]> {
    return db.select().from(roles)
      .where(eq(roles.isSystem, true))
      .orderBy(asc(roles.name));
  }

  async getCustomRoles(): Promise<Role[]> {
    return db.select().from(roles)
      .where(eq(roles.isSystem, false))
      .orderBy(asc(roles.name));
  }

  async createRole(role: InsertRole): Promise<Role> {
    const result = await db.insert(roles).values(role).returning();
    return result[0];
  }

  async updateRole(id: string, updates: Partial<InsertRole>): Promise<Role | undefined> {
    const result = await db.update(roles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return result[0];
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // ============================================
  // Role-Permission Mapping Methods
  // ============================================

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const mappings = await db.select({
      permission: permissions,
    })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return mappings.map(m => m.permission);
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // Delete all existing permissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    // Insert new permissions
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map(permissionId => ({
          roleId,
          permissionId,
        }))
      );
    }
  }

  async addRolePermission(roleId: string, permissionId: string): Promise<RolePermission> {
    const result = await db.insert(rolePermissions)
      .values({ roleId, permissionId })
      .returning();
    return result[0];
  }

  async removeRolePermission(roleId: string, permissionId: string): Promise<void> {
    await db.delete(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      ));
  }

  // Get roles with their permissions (for UI display)
  async getRolesWithPermissions(): Promise<Array<Role & { permissions: Permission[] }>> {
    const allRoles = await this.getRoles();
    const result: Array<Role & { permissions: Permission[] }> = [];

    for (const role of allRoles) {
      const rolePerms = await this.getRolePermissions(role.id);
      result.push({
        ...role,
        permissions: rolePerms,
      });
    }

    return result;
  }

  // Get effective permissions for a user (combines role permissions + custom permissions)
  async getUserEffectivePermissions(userId: string): Promise<string[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];

    // Start with custom permissions if any
    const effectivePermissions = new Set<string>(user.customPermissions || []);

    // Get permissions from user's roles
    const userRoleNames = user.roles && user.roles.length > 0 ? user.roles : [user.role];

    for (const roleName of userRoleNames) {
      const role = await this.getRoleByName(roleName);
      if (role) {
        const rolePerms = await this.getRolePermissions(role.id);
        rolePerms.forEach(p => effectivePermissions.add(p.name));
      }
    }

    return Array.from(effectivePermissions);
  }

  // ============================================
  // Product Request Methods
  // ============================================

  async getProductRequests(): Promise<ProductRequest[]> {
    return await db.select().from(productRequests).orderBy(desc(productRequests.createdAt));
  }

  async getProductRequestById(id: string): Promise<ProductRequest | undefined> {
    const result = await db.select().from(productRequests).where(eq(productRequests.id, id));
    return result[0];
  }

  async getProductRequestsByStatus(status: ProductRequest['status']): Promise<ProductRequest[]> {
    return await db.select()
      .from(productRequests)
      .where(eq(productRequests.status, status))
      .orderBy(desc(productRequests.createdAt));
  }

  async getProductRequestsByRequestedBy(userId: string): Promise<ProductRequest[]> {
    return await db.select()
      .from(productRequests)
      .where(eq(productRequests.requestedById, userId))
      .orderBy(desc(productRequests.createdAt));
  }

  async createProductRequest(data: InsertProductRequest): Promise<ProductRequest> {
    // Generate request number: PR-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const count = await db.select().from(productRequests);
    const requestNumber = `PR-${dateStr}-${String(count.length + 1).padStart(4, '0')}`;

    const result = await db.insert(productRequests)
      .values({ ...data, requestNumber })
      .returning();
    return result[0];
  }

  async updateProductRequest(id: string, updates: Partial<InsertProductRequest>): Promise<ProductRequest | undefined> {
    const result = await db.update(productRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productRequests.id, id))
      .returning();
    return result[0];
  }

  async deleteProductRequest(id: string): Promise<void> {
    await db.delete(productRequests).where(eq(productRequests.id, id));
  }

  // Product Request Comments

  async getProductRequestComments(requestId: string): Promise<ProductRequestComment[]> {
    return await db.select()
      .from(productRequestComments)
      .where(eq(productRequestComments.requestId, requestId))
      .orderBy(asc(productRequestComments.createdAt));
  }

  async createProductRequestComment(data: InsertProductRequestComment): Promise<ProductRequestComment> {
    const result = await db.insert(productRequestComments)
      .values(data)
      .returning();
    return result[0];
  }

  async deleteProductRequestComment(id: string): Promise<void> {
    await db.delete(productRequestComments).where(eq(productRequestComments.id, id));
  }
}

export const storage = new DatabaseStorage();
