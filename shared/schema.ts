import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  handle: text("handle").notNull().unique(),
  name: text("name").notNull(),
  gmvTier: text("gmv_tier").notNull().$type<"S" | "M" | "L" | "XL">(),
  kam: text("kam").notNull(),
  zone: text("zone").notNull(),
  persona: text("persona").notNull(),
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
  vendorHandle: text("vendor_handle").notNull().references(() => vendors.handle),
  department: text("department").notNull().$type<"Finance" | "Operations" | "Marketplace" | "Tech" | "Experience" | "CX" | "Seller Support">(),
  issueType: text("issue_type").notNull().$type<"Complaint" | "Request" | "Information">(),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  fleekOrderId: text("fleek_order_id"),
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
  ownerAssignee: text("owner_assignee"),
  
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  
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

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Comment = typeof comments.$inferSelect;
