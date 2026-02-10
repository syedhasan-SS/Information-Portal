import { storage } from "./storage";
import type { Ticket, Comment, User } from "@shared/schema";
import {
  sendTicketCreatedToN8n,
  sendTicketAssignedToN8n,
  sendCommentMentionToN8n,
  sendTicketResolvedToN8n,
  sendUrgentTicketAlertToN8n,
} from "./n8n-slack-integration";

/**
 * Helper functions for creating notifications based on ticket events
 */

/**
 * Create notification when a new ticket is created
 */
export async function notifyTicketCreated(ticket: Ticket, creator: User | undefined) {
  try {
    // Notify team members in the owner team/department (optimized query)
    const teamMembers = await storage.getUsersByDepartment(ticket.ownerTeam, { isActive: true });

    // Filter out the creator
    const relevantUsers = teamMembers.filter(
      (user) => user.id !== ticket.createdById
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

    // Send Slack notification via n8n
    const assignee = ticket.assigneeId ? await storage.getUserById(ticket.assigneeId) : undefined;
    sendTicketCreatedToN8n(ticket, creator, assignee).catch(err => {
      console.error('[n8n-Slack] Failed to send ticket created notification:', err);
    });

    // Send urgent alert if priority is urgent
    if (ticket.priorityTier?.toLowerCase() === 'urgent') {
      sendUrgentTicketAlertToN8n(ticket, creator).catch(err => {
        console.error('[n8n-Slack] Failed to send urgent ticket alert:', err);
      });
    }
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

    // Only notify active users
    if (!assignee.isActive) {
      console.log(`[Notifications] Skipping notification - assignee ${assignee.name} is inactive`);
      return;
    }

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

    // Send Slack notification via n8n
    sendTicketAssignedToN8n(ticket, assignee, actor).catch(err => {
      console.error('[n8n-Slack] Failed to send ticket assigned notification:', err);
    });
  } catch (error) {
    console.error("[Notifications] Failed to create ticket assignment notification:", error);
  }
}

/**
 * Create notification when a ticket is solved
 */
export async function notifyTicketSolved(ticket: Ticket, solver: User | undefined) {
  try {
    // Use Set to deduplicate user IDs (if creator == assignee)
    const usersToNotify = new Set<string>();

    // Add ticket creator (if not the solver)
    if (ticket.createdById && ticket.createdById !== solver?.id) {
      usersToNotify.add(ticket.createdById);
    }

    // Add ticket assignee (if not the solver and not already added)
    if (ticket.assigneeId && ticket.assigneeId !== solver?.id) {
      usersToNotify.add(ticket.assigneeId);
    }

    // Create notifications for all unique users
    const notificationPromises = Array.from(usersToNotify).map(async (userId) => {
      const user = await storage.getUserById(userId);

      // Only notify active users
      if (!user?.isActive) {
        console.log(`[Notifications] Skipping notification - user ${userId} is inactive`);
        return;
      }

      const isCreator = userId === ticket.createdById;

      await storage.createNotification({
        userId,
        type: "ticket_solved",
        title: isCreator ? "Ticket Solved" : "Assigned Ticket Solved",
        message: isCreator
          ? `Your ticket has been solved: ${ticket.subject}`
          : `A ticket assigned to you has been solved: ${ticket.subject}`,
        ticketId: ticket.id,
        actorId: solver?.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          vendorHandle: ticket.vendorHandle,
          solvedBy: solver?.name,
        },
        isRead: false,
      });

      console.log(`[Notifications] Notified ${isCreator ? 'creator' : 'assignee'} about ticket resolution: ${ticket.ticketNumber}`);
    });

    await Promise.all(notificationPromises);

    // Send Slack notification via n8n
    if (solver) {
      sendTicketResolvedToN8n(ticket, solver).catch(err => {
        console.error('[n8n-Slack] Failed to send ticket resolved notification:', err);
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

    // Notify ticket creator (only if active)
    if (ticket.createdById && ticket.createdById !== commenter?.id) {
      const creator = await storage.getUserById(ticket.createdById);
      if (creator?.isActive) {
        usersToNotify.add(ticket.createdById);
      }
    }

    // Notify ticket assignee (only if active)
    if (ticket.assigneeId && ticket.assigneeId !== commenter?.id) {
      const assignee = await storage.getUserById(ticket.assigneeId);
      if (assignee?.isActive) {
        usersToNotify.add(ticket.assigneeId);
      }
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
    // Matches @email.address or @username (no spaces)
    const mentionRegex = /@([\w.+-]+@[\w.-]+\.\w+|[\w.+-]+)/g;
    const mentions = comment.body.match(mentionRegex);

    if (!mentions || mentions.length === 0) return;

    // Get all users to check for mentions
    const allUsers = await storage.getUsers();

    // Track mentioned user IDs to deduplicate (same user mentioned multiple times)
    const mentionedUserIds = new Set<string>();

    // Find users who were mentioned using EXACT matching
    mentions.forEach((mention) => {
      const cleanMention = mention.substring(1).toLowerCase(); // Remove @ and lowercase

      const matchedUser = allUsers.find((user) => {
        // Skip commenter and inactive users
        if (user.id === commenter?.id || !user.isActive) return false;

        // Exact match on email or name (case-insensitive)
        return (
          user.email.toLowerCase() === cleanMention ||
          user.name.toLowerCase() === cleanMention
        );
      });

      if (matchedUser) {
        mentionedUserIds.add(matchedUser.id);
      }
    });

    // Get user objects for notification
    const mentionedUsers = allUsers.filter(user => mentionedUserIds.has(user.id));

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

    // Send Slack notification for mentions via n8n
    if (mentionedUsers.length > 0 && commenter) {
      sendCommentMentionToN8n(ticket, comment, commenter, mentionedUsers).catch(err => {
        console.error('[n8n-Slack] Failed to send comment mention notification:', err);
      });
    }
  } catch (error) {
    console.error("[Notifications] Failed to create mention notifications:", error);
  }
}

/**
 * Get current user from request headers (x-user-email)
 * SECURITY: Never trust client-provided user IDs from request body
 */
export async function getCurrentUser(req: any): Promise<User | undefined> {
  // Get user email from auth header (set by frontend after login)
  const email = req.headers["x-user-email"] as string;

  if (!email) {
    console.warn("[getCurrentUser] No x-user-email header found in request");
    return undefined;
  }

  // Look up user by email from auth header
  const user = await storage.getUserByEmail(email);

  if (!user) {
    console.warn(`[getCurrentUser] No user found for email: ${email}`);
    return undefined;
  }

  return user;
}
