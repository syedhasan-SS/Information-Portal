import type { Vendor, Category, Ticket, Comment } from "@shared/schema";

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const userEmail = localStorage.getItem("userEmail");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(userEmail ? { "x-user-email": userEmail } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

// Vendors
export async function getVendors(): Promise<Vendor[]> {
  return fetchAPI<Vendor[]>("/api/vendors");
}

export async function getVendorByHandle(handle: string): Promise<Vendor> {
  return fetchAPI<Vendor>(`/api/vendors/${handle}`);
}

export async function createVendor(vendor: Omit<Vendor, "id" | "createdAt" | "updatedAt">): Promise<Vendor> {
  return fetchAPI<Vendor>("/api/vendors", {
    method: "POST",
    body: JSON.stringify(vendor),
  });
}

// Categories
export async function getCategories(): Promise<Category[]> {
  return fetchAPI<Category[]>("/api/categories");
}

export async function createCategory(category: Omit<Category, "id" | "createdAt">): Promise<Category> {
  return fetchAPI<Category>("/api/categories", {
    method: "POST",
    body: JSON.stringify(category),
  });
}

// Tickets
export async function getTickets(): Promise<Ticket[]> {
  return fetchAPI<Ticket[]>("/api/tickets");
}

export async function getTicketById(id: string): Promise<Ticket> {
  return fetchAPI<Ticket>(`/api/tickets/${id}`);
}

export async function createTicket(ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt">): Promise<Ticket> {
  return fetchAPI<Ticket>("/api/tickets", {
    method: "POST",
    body: JSON.stringify(ticket),
  });
}

export async function updateTicket(id: string, updates: Partial<Omit<Ticket, "id" | "createdAt" | "updatedAt">>): Promise<Ticket> {
  return fetchAPI<Ticket>(`/api/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// Comments
export async function getCommentsByTicketId(ticketId: string): Promise<Comment[]> {
  return fetchAPI<Comment[]>(`/api/tickets/${ticketId}/comments`);
}

export async function createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment> {
  return fetchAPI<Comment>("/api/comments", {
    method: "POST",
    body: JSON.stringify(comment),
  });
}
