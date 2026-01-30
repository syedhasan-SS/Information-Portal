import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
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
  vendorHandle: text("vendor_handle").notNull().references(() => vendors.handle),
  department: text("department").notNull().$type<"Finance" | "Operations" | "Marketplace" | "Tech" | "Experience" | "CX" | "Seller Support">(),
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
  role: text("role").notNull().$type<"Owner" | "Admin" | "Seller Support Agent" | "Department Head" | "Department Manager" | "Department Agent">(),
  department: text("department").$type<"Finance" | "Operations" | "Marketplace" | "Tech" | "Experience" | "CX" | "Seller Support">(),
  profilePicture: text("profile_picture"),
  isActive: boolean("is_active").notNull().default(true),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

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
  isActive: boolean("is_active").notNull().default(true),
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
  isAutoApplied: boolean("is_auto_applied").notNull().default(false),
  autoApplyCondition: jsonb("auto_apply_condition").$type<{
    type: "sla_breach" | "priority" | "category" | "custom";
    value?: any;
  }>(),
  isActive: boolean("is_active").notNull().default(true),
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

export type InsertIssueType = z.infer<typeof insertIssueTypeSchema>;
export type InsertCategoryHierarchy = z.infer<typeof insertCategoryHierarchySchema>;
export type InsertCategoryMapping = z.infer<typeof insertCategoryMappingSchema>;
export type InsertSlaConfiguration = z.infer<typeof insertSlaConfigurationSchema>;
export type InsertPriorityConfiguration = z.infer<typeof insertPriorityConfigurationSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type IssueType = typeof issueTypes.$inferSelect;
export type CategoryHierarchy = typeof categoryHierarchy.$inferSelect;
export type CategoryMapping = typeof categoryMappings.$inferSelect;
export type SlaConfiguration = typeof slaConfigurations.$inferSelect;
export type PriorityConfiguration = typeof priorityConfigurations.$inferSelect;
export type Tag = typeof tags.$inferSelect;

export type Vendor = typeof vendors.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type User = typeof users.$inferSelect;
