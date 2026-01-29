import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  vendors,
  categories,
  tickets,
  comments,
  users,
  type Vendor,
  type Category,
  type Ticket,
  type Comment,
  type User,
  type InsertVendor,
  type InsertCategory,
  type InsertTicket,
  type InsertComment,
  type InsertUser,
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
    const results = await db.select().from(users).where(eq(users.email, email)).limit(1);
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
}

export const storage = new DatabaseStorage();
