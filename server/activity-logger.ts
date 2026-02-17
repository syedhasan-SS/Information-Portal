/**
 * Ticket Activity Logger
 * Tracks all changes to tickets for audit trail and transparency
 */

import { storage } from "./storage";
import type { Ticket, User, TicketActivityLog, Comment } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

interface ActivityContext {
  user: User;
  ticket: Ticket;
}

/**
 * Log ticket creation
 */
export async function logTicketCreated(ticket: Ticket, user: User): Promise<void> {
  try {
    await storage.db.insert(storage.schema.ticketActivityLog).values({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      action: "created",
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      description: `Ticket created by ${user.name}`,
      metadata: {
        department: ticket.department,
        priority: ticket.priorityTier,
        issueType: ticket.issueType,
      },
    });

    console.log(`[Activity] Ticket created: ${ticket.ticketNumber} by ${user.email}`);
  } catch (error) {
    console.error("[Activity] Failed to log ticket creation:", error);
  }
}

/**
 * Log status change
 */
export async function logStatusChange(
  ticket: Ticket,
  oldStatus: string,
  newStatus: string,
  user: User
): Promise<void> {
  try {
    let action: TicketActivityLog["action"] = "status_changed";
    let description = `Status changed from ${oldStatus} to ${newStatus}`;

    // Special cases for resolved/closed/reopened
    if (newStatus === "Solved" && oldStatus !== "Solved") {
      action = "resolved";
      description = `Ticket resolved by ${user.name}`;
    } else if (newStatus === "Closed" && oldStatus !== "Closed") {
      action = "closed";
      description = `Ticket closed by ${user.name}`;
    } else if (oldStatus === "Closed" && newStatus !== "Closed") {
      action = "reopened";
      description = `Ticket reopened by ${user.name}`;
    }

    await storage.db.insert(storage.schema.ticketActivityLog).values({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      action,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      fieldName: "status",
      oldValue: oldStatus,
      newValue: newStatus,
      description,
    });

    console.log(`[Activity] ${ticket.ticketNumber}: ${description}`);
  } catch (error) {
    console.error("[Activity] Failed to log status change:", error);
  }
}

/**
 * Log assignee change
 */
export async function logAssigneeChange(
  ticket: Ticket,
  oldAssignee: User | null,
  newAssignee: User | null,
  user: User
): Promise<void> {
  try {
    let action: TicketActivityLog["action"] = "assigned";
    let description = "";

    if (!oldAssignee && newAssignee) {
      action = "assigned";
      description = `Assigned to ${newAssignee.name} by ${user.name}`;
    } else if (oldAssignee && newAssignee) {
      action = "reassigned";
      description = `Reassigned from ${oldAssignee.name} to ${newAssignee.name} by ${user.name}`;
    } else if (oldAssignee && !newAssignee) {
      action = "unassigned";
      description = `Unassigned from ${oldAssignee.name} by ${user.name}`;
    }

    await storage.db.insert(storage.schema.ticketActivityLog).values({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      action,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      fieldName: "assigneeId",
      oldValue: oldAssignee?.name || "Unassigned",
      newValue: newAssignee?.name || "Unassigned",
      description,
      metadata: {
        oldAssigneeId: oldAssignee?.id,
        newAssigneeId: newAssignee?.id,
      },
    });

    console.log(`[Activity] ${ticket.ticketNumber}: ${description}`);
  } catch (error) {
    console.error("[Activity] Failed to log assignee change:", error);
  }
}

/**
 * Log priority change
 */
export async function logPriorityChange(
  ticket: Ticket,
  oldPriority: string,
  newPriority: string,
  user: User
): Promise<void> {
  try {
    await storage.db.insert(storage.schema.ticketActivityLog).values({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      action: "priority_changed",
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      fieldName: "priorityTier",
      oldValue: oldPriority,
      newValue: newPriority,
      description: `Priority changed from ${oldPriority} to ${newPriority} by ${user.name}`,
    });

    console.log(`[Activity] ${ticket.ticketNumber}: Priority ${oldPriority} → ${newPriority}`);
  } catch (error) {
    console.error("[Activity] Failed to log priority change:", error);
  }
}

/**
 * Log department change
 */
export async function logDepartmentChange(
  ticket: Ticket,
  oldDepartment: string,
  newDepartment: string,
  user: User
): Promise<void> {
  try {
    await storage.db.insert(storage.schema.ticketActivityLog).values({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      action: "department_changed",
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      fieldName: "department",
      oldValue: oldDepartment,
      newValue: newDepartment,
      description: `Department changed from ${oldDepartment} to ${newDepartment} by ${user.name}`,
    });

    console.log(`[Activity] ${ticket.ticketNumber}: Department ${oldDepartment} → ${newDepartment}`);
  } catch (error) {
    console.error("[Activity] Failed to log department change:", error);
  }
}

/**
 * Log comment added
 */
export async function logCommentAdded(
  ticket: Ticket,
  comment: Comment,
  user: User
): Promise<void> {
  try {
    // Truncate comment for preview
    const commentPreview = comment.body.length > 100
      ? comment.body.substring(0, 100) + "..."
      : comment.body;

    await storage.db.insert(storage.schema.ticketActivityLog).values({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      action: "comment_added",
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      description: `Comment added by ${user.name}`,
      metadata: {
        commentId: comment.id,
        commentPreview,
        visibility: comment.visibility,
      },
    });

    console.log(`[Activity] ${ticket.ticketNumber}: Comment added by ${user.email}`);
  } catch (error) {
    console.error("[Activity] Failed to log comment:", error);
  }
}

/**
 * Log tags update
 */
export async function logTagsUpdate(
  ticket: Ticket,
  oldTags: string[],
  newTags: string[],
  user: User
): Promise<void> {
  try {
    const added = newTags.filter(tag => !oldTags.includes(tag));
    const removed = oldTags.filter(tag => !newTags.includes(tag));

    let description = "Tags updated";
    if (added.length > 0 && removed.length === 0) {
      description = `Tags added: ${added.join(", ")}`;
    } else if (removed.length > 0 && added.length === 0) {
      description = `Tags removed: ${removed.join(", ")}`;
    } else if (added.length > 0 && removed.length > 0) {
      description = `Tags updated: added ${added.join(", ")}, removed ${removed.join(", ")}`;
    }

    await storage.db.insert(storage.schema.ticketActivityLog).values({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      action: "tags_updated",
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      fieldName: "tags",
      oldValue: oldTags.join(", "),
      newValue: newTags.join(", "),
      description: `${description} by ${user.name}`,
      metadata: {
        added,
        removed,
      },
    });

    console.log(`[Activity] ${ticket.ticketNumber}: ${description}`);
  } catch (error) {
    console.error("[Activity] Failed to log tags update:", error);
  }
}

/**
 * Log generic field update
 */
export async function logFieldUpdate(
  ticket: Ticket,
  fieldName: string,
  oldValue: any,
  newValue: any,
  user: User,
  description?: string
): Promise<void> {
  try {
    await storage.db.insert(storage.schema.ticketActivityLog).values({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      action: "field_updated",
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      fieldName,
      oldValue: String(oldValue),
      newValue: String(newValue),
      description: description || `${fieldName} changed from ${oldValue} to ${newValue} by ${user.name}`,
    });

    console.log(`[Activity] ${ticket.ticketNumber}: ${fieldName} updated`);
  } catch (error) {
    console.error("[Activity] Failed to log field update:", error);
  }
}

/**
 * Get activity log for a ticket
 */
export async function getTicketActivity(ticketId: string): Promise<TicketActivityLog[]> {
  try {
    const activities = await storage.db
      .select()
      .from(storage.schema.ticketActivityLog)
      .where(eq(storage.schema.ticketActivityLog.ticketId, ticketId))
      .orderBy(desc(storage.schema.ticketActivityLog.createdAt));

    return activities;
  } catch (error) {
    console.error("[Activity] Failed to get ticket activity:", error);
    return [];
  }
}
