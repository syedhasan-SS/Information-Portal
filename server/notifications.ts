import { storage } from "./storage";
import type { Ticket, Comment, User } from "@shared/schema";
import {
  sendSlackTicketCreated,
  sendSlackTicketAssigned,
  sendSlackCommentMention,
  sendSlackTicketResolved,
  sendSlackUrgentAlert,
} from "./slack-web-api";

/**
 * Helper functions for creating notifications based on ticket events
 */

/**
 * Create notification when a new ticket is created.
 * The Slack ts is saved on the ticket so all future updates reply in-thread.
 */
export async function notifyTicketCreated(ticket: Ticket, creator: User | undefined) {
  try {
    const teamMembers = await storage.getUsersByDepartment(ticket.ownerTeam, { isActive: true });
    const relevantUsers = teamMembers.filter((user) => user.id !== ticket.createdById);

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

    // Send Slack — save the returned ts so all future updates post in-thread
    const assignee = ticket.assigneeId ? await storage.getUserById(ticket.assigneeId) : undefined;
    const manager  = assignee?.managerId ? await storage.getUserById(assignee.managerId) : undefined;

    const slackTs = await sendSlackTicketCreated(ticket, creator, assignee, manager);
    if (slackTs) {
      await storage.updateTicket(ticket.id, { slackMessageTs: slackTs } as any);
      console.log(`[Slack] Stored thread ts for ${ticket.ticketNumber}: ${slackTs}`);
    }

    if (ticket.priorityTier?.toLowerCase() === 'urgent') {
      sendSlackUrgentAlert(ticket, creator, slackTs).catch(err => {
        console.error('[Slack] Failed to send urgent ticket alert:', err);
      });
    }
  } catch (error) {
    console.error("[Notifications] Failed to create ticket creation notifications:", error);
  }
}

/**
 * Create notification when a ticket is assigned.
 * Replies in the original thread if slackMessageTs exists on the ticket.
 */
export async function notifyTicketAssigned(ticket: Ticket, assignee: User, actor: User | undefined) {
  try {
    if (!ticket.assigneeId) return;
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

    const manager    = assignee.managerId ? await storage.getUserById(assignee.managerId) : undefined;
    const threadTs   = (ticket as any).slackMessageTs || null;

    sendSlackTicketAssigned(ticket, assignee, actor, manager, threadTs).catch(err => {
      console.error('[Slack] Failed to send ticket assigned notification:', err);
    });
  } catch (error) {
    console.error("[Notifications] Failed to create ticket assignment notification:", error);
  }
}

/**
 * Create notification when a ticket is solved.
 * Replies in the original thread if slackMessageTs exists on the ticket.
 */
export async function notifyTicketSolved(ticket: Ticket, solver: User | undefined) {
  try {
    const usersToNotify = new Set<string>();

    if (ticket.createdById && ticket.createdById !== solver?.id) {
      usersToNotify.add(ticket.createdById);
    }
    if (ticket.assigneeId && ticket.assigneeId !== solver?.id) {
      usersToNotify.add(ticket.assigneeId);
    }

    const notificationPromises = Array.from(usersToNotify).map(async (userId) => {
      const user = await storage.getUserById(userId);
      if (!user?.isActive) return;

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
    });

    await Promise.all(notificationPromises);

    if (solver) {
      const threadTs = (ticket as any).slackMessageTs || null;
      sendSlackTicketResolved(ticket, solver, threadTs).catch(err => {
        console.error('[Slack] Failed to send ticket resolved notification:', err);
      });
    }
  } catch (error) {
    console.error("[Notifications] Failed to create ticket solved notifications:", error);
  }
}

/**
 * Create notification when a comment is added to a ticket.
 */
export async function notifyCommentAdded(
  comment: Comment,
  ticket: Ticket,
  commenter: User | undefined
) {
  try {
    const usersToNotify = new Set<string>();

    if (ticket.createdById && ticket.createdById !== commenter?.id) {
      const creator = await storage.getUserById(ticket.createdById);
      if (creator?.isActive) usersToNotify.add(ticket.createdById);
    }
    if (ticket.assigneeId && ticket.assigneeId !== commenter?.id) {
      const assignee = await storage.getUserById(ticket.assigneeId);
      if (assignee?.isActive) usersToNotify.add(ticket.assigneeId);
    }

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
 * Create notifications for @mentioned users in a comment.
 * Replies in the original thread if slackMessageTs exists on the ticket.
 */
export async function notifyMentions(
  comment: Comment,
  ticket: Ticket,
  commenter: User | undefined
) {
  try {
    const mentionRegex = /@([\w.+-]+@[\w.-]+\.\w+|[\w.+-]+)/g;
    const mentions = comment.body.match(mentionRegex);
    if (!mentions || mentions.length === 0) return;

    const allUsers = await storage.getUsers();
    const mentionedUserIds = new Set<string>();

    mentions.forEach((mention) => {
      const cleanMention = mention.substring(1).toLowerCase();
      const matchedUser = allUsers.find((user) => {
        if (user.id === commenter?.id || !user.isActive) return false;
        return (
          user.email.toLowerCase() === cleanMention ||
          user.name.toLowerCase() === cleanMention
        );
      });
      if (matchedUser) mentionedUserIds.add(matchedUser.id);
    });

    const mentionedUsers = allUsers.filter(user => mentionedUserIds.has(user.id));
    const managerIds = new Set<string>();
    mentionedUsers.forEach(user => {
      if (user.managerId && user.managerId !== commenter?.id) managerIds.add(user.managerId);
    });
    const managers = allUsers.filter(user => managerIds.has(user.id) && user.isActive);

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

    const managerNotificationPromises = managers.map((manager) =>
      storage.createNotification({
        userId: manager.id,
        type: "comment_mention",
        title: "Your Team Member Was Mentioned",
        message: `${commenter?.name || "Someone"} mentioned your team member in ticket: ${ticket.subject}`,
        ticketId: ticket.id,
        commentId: comment.id,
        actorId: commenter?.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          vendorHandle: ticket.vendorHandle,
          mentionedBy: commenter?.name,
          isManagerNotification: true,
        },
        isRead: false,
      })
    );

    await Promise.all([...notificationPromises, ...managerNotificationPromises]);
    console.log(`[Notifications] Created ${notificationPromises.length} mention + ${managerNotificationPromises.length} manager notifications for ${ticket.ticketNumber}`);

    if (mentionedUsers.length > 0 && commenter) {
      const threadTs = (ticket as any).slackMessageTs || null;
      sendSlackCommentMention(ticket, comment, commenter, mentionedUsers, managers, threadTs).catch(err => {
        console.error('[Slack] Failed to send comment mention notification:', err);
      });
    }
  } catch (error) {
    console.error("[Notifications] Failed to create mention notifications:", error);
  }
}

/**
 * Get current user from request headers (x-user-email)
 */
export async function getCurrentUser(req: any): Promise<User | undefined> {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    console.warn("[getCurrentUser] No x-user-email header found in request");
    return undefined;
  }
  const user = await storage.getUserByEmail(email);
  if (!user) {
    console.warn(`[getCurrentUser] No user found for email: ${email}`);
    return undefined;
  }
  return user;
}
