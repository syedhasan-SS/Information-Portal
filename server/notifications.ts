import { storage } from "./storage";
import type { Ticket, Comment, User } from "@shared/schema";

/**
 * Helper functions for creating notifications based on ticket events
 */

/**
 * Create notification when a new ticket is created
 */
export async function notifyTicketCreated(ticket: Ticket, creator: User | undefined) {
  try {
    // Notify team members in the owner team/department
    const teamMembers = await storage.getUsers();
    const relevantUsers = teamMembers.filter(
      (user) =>
        user.department === ticket.ownerTeam &&
        user.id !== ticket.createdById && // Don't notify the creator
        user.isActive
    );

    // Create notifications for team members
    const notificationPromises = relevantUsers.map((user) =>
      storage.createNotification({
        userId: user.id,
        type: "case_created",
        title: "New Ticket Created",
        message: `A new ${ticket.priorityTier} priority ticket has been created: ${ticket.subject}`,
        ticketId: ticket.id,
        actorId: ticket.createdById || undefined,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          vendorHandle: ticket.vendorHandle,
          priority: ticket.priorityTier,
        },
        isRead: false,
      })
    );

    await Promise.all(notificationPromises);
    console.log(`[Notifications] Created ${notificationPromises.length} notifications for new ticket ${ticket.ticketNumber}`);
  } catch (error) {
    console.error("[Notifications] Failed to create ticket creation notifications:", error);
  }
}

/**
 * Create notification when a ticket is assigned
 */
export async function notifyTicketAssigned(ticket: Ticket, assignee: User, actor: User | undefined) {
  try {
    if (!ticket.assigneeId) return;

    await storage.createNotification({
      userId: ticket.assigneeId,
      type: "ticket_assigned",
      title: "Ticket Assigned to You",
      message: `You have been assigned ticket: ${ticket.subject}`,
      ticketId: ticket.id,
      actorId: actor?.id,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        vendorHandle: ticket.vendorHandle,
        priority: ticket.priorityTier,
        assignedBy: actor?.name,
      },
      isRead: false,
    });

    console.log(`[Notifications] Notified user ${assignee.name} about ticket assignment: ${ticket.ticketNumber}`);
  } catch (error) {
    console.error("[Notifications] Failed to create ticket assignment notification:", error);
  }
}

/**
 * Create notification when a ticket is solved
 */
export async function notifyTicketSolved(ticket: Ticket, solver: User | undefined) {
  try {
    // Notify the ticket creator
    if (ticket.createdById && ticket.createdById !== solver?.id) {
      await storage.createNotification({
        userId: ticket.createdById,
        type: "ticket_solved",
        title: "Ticket Solved",
        message: `Your ticket has been solved: ${ticket.subject}`,
        ticketId: ticket.id,
        actorId: solver?.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          vendorHandle: ticket.vendorHandle,
          solvedBy: solver?.name,
        },
        isRead: false,
      });

      console.log(`[Notifications] Notified ticket creator about ticket resolution: ${ticket.ticketNumber}`);
    }

    // Also notify the assignee if different from creator and solver
    if (
      ticket.assigneeId &&
      ticket.assigneeId !== ticket.createdById &&
      ticket.assigneeId !== solver?.id
    ) {
      await storage.createNotification({
        userId: ticket.assigneeId,
        type: "ticket_solved",
        title: "Assigned Ticket Solved",
        message: `A ticket assigned to you has been solved: ${ticket.subject}`,
        ticketId: ticket.id,
        actorId: solver?.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          vendorHandle: ticket.vendorHandle,
          solvedBy: solver?.name,
        },
        isRead: false,
      });
    }
  } catch (error) {
    console.error("[Notifications] Failed to create ticket solved notifications:", error);
  }
}

/**
 * Create notification when a comment is added to a ticket
 */
export async function notifyCommentAdded(
  comment: Comment,
  ticket: Ticket,
  commenter: User | undefined
) {
  try {
    const usersToNotify = new Set<string>();

    // Notify ticket creator
    if (ticket.createdById && ticket.createdById !== commenter?.id) {
      usersToNotify.add(ticket.createdById);
    }

    // Notify ticket assignee
    if (ticket.assigneeId && ticket.assigneeId !== commenter?.id) {
      usersToNotify.add(ticket.assigneeId);
    }

    // Create notifications
    const notificationPromises = Array.from(usersToNotify).map((userId) =>
      storage.createNotification({
        userId,
        type: "comment_added",
        title: "New Comment on Ticket",
        message: `${commenter?.name || "Someone"} commented on ticket: ${ticket.subject}`,
        ticketId: ticket.id,
        commentId: comment.id,
        actorId: commenter?.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          vendorHandle: ticket.vendorHandle,
          commentAuthor: commenter?.name,
        },
        isRead: false,
      })
    );

    await Promise.all(notificationPromises);
    console.log(`[Notifications] Created ${notificationPromises.length} notifications for new comment on ticket ${ticket.ticketNumber}`);
  } catch (error) {
    console.error("[Notifications] Failed to create comment notifications:", error);
  }
}

/**
 * Create notifications for mentioned users in a comment
 * Supports @username or @email mentions
 */
export async function notifyMentions(
  comment: Comment,
  ticket: Ticket,
  commenter: User | undefined
) {
  try {
    // Extract mentions from comment body using regex
    // Supports @username or @email format
    const mentionRegex = /@(\w+(?:\.\w+)*@?\w*\.?\w+)/g;
    const mentions = comment.body.match(mentionRegex);

    if (!mentions || mentions.length === 0) return;

    // Get all users to check for mentions
    const allUsers = await storage.getUsers();

    // Find users who were mentioned
    const mentionedUsers = allUsers.filter((user) => {
      if (user.id === commenter?.id) return false; // Don't notify the commenter

      return mentions.some((mention) => {
        const cleanMention = mention.substring(1); // Remove @
        return (
          user.email.toLowerCase().includes(cleanMention.toLowerCase()) ||
          user.name.toLowerCase().includes(cleanMention.toLowerCase())
        );
      });
    });

    // Create notifications for mentioned users
    const notificationPromises = mentionedUsers.map((user) =>
      storage.createNotification({
        userId: user.id,
        type: "comment_mention",
        title: "You Were Mentioned",
        message: `${commenter?.name || "Someone"} mentioned you in ticket: ${ticket.subject}`,
        ticketId: ticket.id,
        commentId: comment.id,
        actorId: commenter?.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          vendorHandle: ticket.vendorHandle,
          mentionedBy: commenter?.name,
        },
        isRead: false,
      })
    );

    await Promise.all(notificationPromises);
    console.log(`[Notifications] Created ${notificationPromises.length} mention notifications for ticket ${ticket.ticketNumber}`);
  } catch (error) {
    console.error("[Notifications] Failed to create mention notifications:", error);
  }
}

/**
 * Get current user from request body or session
 * Uses createdById from request body as fallback
 */
export async function getCurrentUser(req: any): Promise<User | undefined> {
  // Try to get user ID from request body (for updates/comments)
  const userId = req.body?.createdById || req.body?.userId;

  if (userId) {
    return await storage.getUserById(userId);
  }

  // Fallback to session (when auth is fully implemented)
  // return req.user as User;
  return undefined;
}
