import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, index, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  handle: text("handle").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  gmvTier: text("gmv_tier").$type<"S" | "M" | "L" | "XL" | "Platinum" | "Gold" | "Silver" | "Bronze">(),
  gmv90Day: integer("gmv_90_day"),
  kam: text("kam"),
  zone: text("zone"),
  region: text("region"),
  country: text("country"),
  persona: text("persona"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueType: text("issue_type").notNull().$type<"Complaint" | "Request" | "Information">(),
  l1: text("l1").notNull(),
  l2: text("l2").notNull(),
  l3: text("l3").notNull(),
  l4: text("l4"),
  path: text("path").notNull().unique(),
  issuePriorityPoints: integer("issue_priority_points").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: text("ticket_number").notNull().unique(),
  vendorHandle: text("vendor_handle").references(() => vendors.handle), // Optional for Customer Support tickets
  customer: text("customer"), // For Customer Support tickets (customer name/ID)
  department: text("department").notNull().$type<"Finance" | "Operations" | "Marketplace" | "Tech" | "Supply" | "Growth" | "Experience" | "CX">(),
  issueType: text("issue_type").notNull().$type<"Complaint" | "Request" | "Information">(),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  fleekOrderIds: text("fleek_order_ids").array(),
  attachments: jsonb("attachments").$type<Array<{
    type: "image" | "file" | "video";
    name: string;
    url: string;
    size: number;
  }>>(),
  status: text("status").notNull().default("New").$type<"New" | "Open" | "Pending" | "Solved" | "Closed">(),
  
  priorityScore: integer("priority_score").notNull(),
  priorityTier: text("priority_tier").notNull().$type<"Critical" | "High" | "Medium" | "Low">(),
  priorityBadge: text("priority_badge").notNull().$type<"P0" | "P1" | "P2" | "P3">(),
  priorityBreakdown: jsonb("priority_breakdown").notNull().$type<{
    vendorTicketVolume: number;
    vendorGmvTier: "S" | "M" | "L" | "XL";
    issuePriorityPoints: number;
    gmvPoints: number;
    ticketHistoryPoints: number;
    issuePoints: number;
  }>(),
  
  ownerTeam: text("owner_team").notNull(),
  assigneeId: varchar("assignee_id").references(() => users.id),
  createdById: varchar("created_by_id").references(() => users.id),
  
  tags: text("tags").array(),
  
  slaResponseTarget: timestamp("sla_response_target"),
  slaResolveTarget: timestamp("sla_resolve_target"),
  slaStatus: text("sla_status").default("on_track").$type<"on_track" | "at_risk" | "breached">(),
  firstResponseAt: timestamp("first_response_at"),
  
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  
  zendeskLinked: boolean("zendesk_linked").notNull().default(false),
  zendeskTicketId: text("zendesk_ticket_id"),

  // CONFIGURATION SNAPSHOTS - Immutable state captured at creation
  categorySnapshot: jsonb("category_snapshot").$type<{
    categoryId: string;
    issueType: string;
    l1: string;
    l2: string;
    l3: string;
    l4: string | null;
    path: string;
    departmentType?: string;
    issuePriorityPoints: number;
  }>(),

  slaSnapshot: jsonb("sla_snapshot").$type<{
    configurationId?: string;
    responseTimeHours: number | null;
    resolutionTimeHours: number;
    useBusinessHours: boolean;
    responseTarget: string | null;  // ISO timestamp
    resolveTarget: string;          // ISO timestamp
  }>(),

  prioritySnapshot: jsonb("priority_snapshot").$type<{
    configurationId?: string;
    score: number;
    tier: "Critical" | "High" | "Medium" | "Low";
    badge: "P0" | "P1" | "P2" | "P3";
    breakdown: {
      vendorTicketVolume: number;
      vendorGmvTier: string;
      issuePriorityPoints: number;
      gmvPoints: number;
      ticketHistoryPoints: number;
      issuePoints: number;
    };
  }>(),

  tagsSnapshot: jsonb("tags_snapshot").$type<Array<{
    id: string;
    name: string;
    color?: string;
    departmentType?: string;
    appliedAt: string;
  }>>(),

  // VERSION TRACKING
  snapshotVersion: integer("snapshot_version").notNull().default(1),
  snapshotCapturedAt: timestamp("snapshot_captured_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  visibility: text("visibility").notNull().default("Internal").$type<"Internal" | "Zendesk">(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().$type<"Owner" | "Admin" | "Head" | "Manager" | "Lead" | "Associate" | "Agent">(),
  roles: text("roles").array().$type<Array<"Owner" | "Admin" | "Head" | "Manager" | "Lead" | "Associate" | "Agent">>(), // Multi-role support
  department: text("department").$type<"Finance" | "Operations" | "Marketplace" | "Tech" | "Supply" | "Growth" | "CX">(),
  subDepartment: text("sub_department"), // Sub-department for organizational hierarchy
  managerId: varchar("manager_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }), // Reports to (direct manager)
  profilePicture: text("profile_picture"),
  customPermissions: text("custom_permissions").array(), // Agent-level custom permissions
  isActive: boolean("is_active").notNull().default(true),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Departments table for dynamic department management
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default("#6366f1"), // For UI badge color
  headId: varchar("head_id").references(() => users.id, { onDelete: "set null" }), // Department head
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Sub-departments table
export const subDepartments = pgTable("sub_departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<"case_created" | "comment_mention" | "ticket_assigned" | "ticket_solved" | "comment_added">(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  ticketId: varchar("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<{
    ticketNumber?: string;
    vendorHandle?: string;
    mentionedBy?: string;
    [key: string]: any;
  }>(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Ticket Configuration Tables

export const issueTypes = pgTable("issue_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categoryHierarchy = pgTable("category_hierarchy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  level: integer("level").notNull().$type<1 | 2 | 3 | 4>(), // L1, L2, L3, L4
  parentId: varchar("parent_id").references((): any => categoryHierarchy.id, { onDelete: "cascade" }),
  description: text("description"),
  departmentType: text("department_type").$type<"Seller Support" | "Customer Support" | "All">().default("All"),
  isActive: boolean("is_active").notNull().default(true),
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references(() => users.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categoryMappings = pgTable("category_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueTypeId: varchar("issue_type_id").notNull().references(() => issueTypes.id, { onDelete: "cascade" }),
  l1CategoryId: varchar("l1_category_id").notNull().references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l2CategoryId: varchar("l2_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l3CategoryId: varchar("l3_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l4CategoryId: varchar("l4_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const slaConfigurations = pgTable("sla_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  issueTypeId: varchar("issue_type_id").references(() => issueTypes.id, { onDelete: "cascade" }),
  l1CategoryId: varchar("l1_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l2CategoryId: varchar("l2_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l3CategoryId: varchar("l3_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l4CategoryId: varchar("l4_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  responseTimeHours: integer("response_time_hours"),
  resolutionTimeHours: integer("resolution_time_hours").notNull(),
  useBusinessHours: boolean("use_business_hours").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const priorityConfigurations = pgTable("priority_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  level: text("level").notNull().$type<"Critical" | "High" | "Medium" | "Low">(),
  issueTypeId: varchar("issue_type_id").references(() => issueTypes.id, { onDelete: "cascade" }),
  l1CategoryId: varchar("l1_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l2CategoryId: varchar("l2_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l3CategoryId: varchar("l3_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  l4CategoryId: varchar("l4_category_id").references(() => categoryHierarchy.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color"),
  description: text("description"),
  departmentType: text("department_type").$type<"Seller Support" | "Customer Support" | "All">().default("All"),
  isAutoApplied: boolean("is_auto_applied").notNull().default(false),
  autoApplyCondition: jsonb("auto_apply_condition").$type<{
    type: "sla_breach" | "priority" | "category" | "custom";
    value?: any;
  }>(),
  isActive: boolean("is_active").notNull().default(true),
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references(() => users.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIssueTypeSchema = createInsertSchema(issueTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategoryHierarchySchema = createInsertSchema(categoryHierarchy).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategoryMappingSchema = createInsertSchema(categoryMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSlaConfigurationSchema = createInsertSchema(slaConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriorityConfigurationSchema = createInsertSchema(priorityConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Category Settings Table
export const categorySettings = pgTable("category_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentType: text("department_type").$type<"Seller Support" | "Customer Support" | "All">().default("All"),
  l4Mandatory: boolean("l4_mandatory").notNull().default(false),
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references(() => users.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Ticket Field Configurations Table
export const ticketFieldConfigurations = pgTable("ticket_field_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldName: text("field_name").notNull(), // e.g., "fleekOrderIds", "tags", "attachments"
  fieldLabel: text("field_label").notNull(), // e.g., "Order IDs", "Tags"
  fieldType: text("field_type").notNull().$type<"text" | "textarea" | "select" | "multiselect" | "file" | "array">(),
  departmentType: text("department_type").$type<"Seller Support" | "Customer Support" | "All">().default("All"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  isRequired: boolean("is_required").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  metadata: jsonb("metadata").$type<{
    placeholder?: string;
    helpText?: string;
    options?: Array<{ label: string; value: string }>;
    [key: string]: any;
  }>(),
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references(() => users.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Category Field Overrides Table - Links categories to field configurations with overrides
export const categoryFieldOverrides = pgTable("category_field_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Link to category (can be any level, but typically L4 for most specific)
  categoryId: varchar("category_id").notNull(), // Can reference categories.id or categoryHierarchy.id
  // Link to base field configuration
  fieldConfigurationId: varchar("field_configuration_id")
    .notNull()
    .references(() => ticketFieldConfigurations.id, { onDelete: "cascade" }),
  // Override settings (null means inherit from base field config)
  visibilityOverride: text("visibility_override").$type<"visible" | "hidden" | null>(),
  requiredOverride: boolean("required_override"), // null = inherit, true = required, false = optional
  displayOrderOverride: integer("display_order_override"),
  // Optional: category-specific metadata overrides
  metadataOverride: jsonb("metadata_override").$type<{
    placeholder?: string;
    helpText?: string;
    defaultValue?: any;
  }>(),
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Configuration Audit Log Table
export const configurationAuditLog = pgTable("configuration_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // What was changed
  entityType: text("entity_type").notNull().$type<
    "issueType" | "categoryHierarchy" | "categoryMapping" |
    "slaConfiguration" | "priorityConfiguration" | "tag" |
    "categorySettings" | "ticketFieldConfiguration" | "categoryFieldOverride"
  >(),
  entityId: varchar("entity_id").notNull(),

  // Action metadata
  action: text("action").notNull().$type<"create" | "update" | "delete" | "restore">(),
  version: integer("version").notNull(),

  // Who made the change
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: text("user_email").notNull(),
  userName: text("user_name").notNull(),

  // Change details
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  changedFields: text("changed_fields").array(),

  // Additional context
  changeReason: text("change_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => ({
  entityTypeIdx: index("config_audit_entity_type_idx").on(table.entityType),
  entityIdIdx: index("config_audit_entity_id_idx").on(table.entityId),
  userIdIdx: index("config_audit_user_id_idx").on(table.userId),
  timestampIdx: index("config_audit_timestamp_idx").on(table.timestamp),
  compositeIdx: index("config_audit_entity_composite_idx").on(table.entityType, table.entityId),
}));

export const insertCategorySettingsSchema = createInsertSchema(categorySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketFieldConfigurationSchema = createInsertSchema(ticketFieldConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategoryFieldOverrideSchema = createInsertSchema(categoryFieldOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIssueType = z.infer<typeof insertIssueTypeSchema>;
export type InsertCategoryHierarchy = z.infer<typeof insertCategoryHierarchySchema>;
export type InsertCategoryMapping = z.infer<typeof insertCategoryMappingSchema>;
export type InsertSlaConfiguration = z.infer<typeof insertSlaConfigurationSchema>;
export type InsertPriorityConfiguration = z.infer<typeof insertPriorityConfigurationSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type InsertCategorySettings = z.infer<typeof insertCategorySettingsSchema>;
export type InsertTicketFieldConfiguration = z.infer<typeof insertTicketFieldConfigurationSchema>;
export type InsertCategoryFieldOverride = z.infer<typeof insertCategoryFieldOverrideSchema>;

export type IssueType = typeof issueTypes.$inferSelect;
export type CategoryHierarchy = typeof categoryHierarchy.$inferSelect;
export type CategoryMapping = typeof categoryMappings.$inferSelect;
export type SlaConfiguration = typeof slaConfigurations.$inferSelect;
export type PriorityConfiguration = typeof priorityConfigurations.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type CategorySettings = typeof categorySettings.$inferSelect;
export type TicketFieldConfiguration = typeof ticketFieldConfigurations.$inferSelect;
export type CategoryFieldOverride = typeof categoryFieldOverrides.$inferSelect;
export type ConfigurationAuditLog = typeof configurationAuditLog.$inferSelect;

export type Vendor = typeof vendors.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type User = typeof users.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type SubDepartment = typeof subDepartments.$inferSelect;
