import { storage } from "./storage";
import type { Ticket, Comment, User } from "@shared/schema";
import {
  sendSlackTicketCreated,
  sendSlackTicketAssigned,
  sendSlackCommentAdded,
  sendSlackCommentMention,
  sendSlackTicketResolved,
  sendSlackUrgentAlert,
  sendSlackTicketTransferred,
} from "./slack-web-api";

/**
 * Helper functions for creating notifications based on ticket events
 */

/**
 * Ensures a Slack thread exists for the ticket.
 *
 * If slackMessageTs is already stored → returns it immediately.
 * If not (ticket was created before Slack was set up, or the creation
 * notification failed) → creates the initial ticket message now, stores
 * the returned ts on the ticket, and returns it.
 *
 * This guarantees every notification is always a thread reply, never a
 * stray top-level message.
 */
async function ensureSlackThread(ticket: Ticket): Promise<string | null> {
  const existing = (ticket as any).slackMessageTs as string | null | undefined;
  if (existing) return existing;

  console.log(`[Slack] No thread for ${ticket.ticketNumber} — creating on-demand`);
  const creator  = ticket.createdById ? await storage.getUserById(ticket.createdById) : undefined;
  const assignee = ticket.assigneeId  ? await storage.getUserById(ticket.assigneeId)  : undefined;
  const manager  = assignee?.managerId ? await storage.getUserById(assignee.managerId) : undefined;

  const newTs = await sendSlackTicketCreated(ticket, creator, assignee, manager);
  if (newTs) {
    await storage.updateTicket(ticket.id, { slackMessageTs: newTs } as any);
    console.log(`[Slack] On-demand thread created for ${ticket.ticketNumber}: ${newTs}`);
  }
  return newTs;
}

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
    // If creator wasn't resolved from the request, fall back to looking up by ticket.createdById
    const resolvedCreator = creator
      ?? (ticket.createdById ? await storage.getUserById(ticket.createdById) : undefined);
    const assignee = ticket.assigneeId ? await storage.getUserById(ticket.assigneeId) : undefined;
    const manager  = assignee?.managerId ? await storage.getUserById(assignee.managerId) : undefined;

    const slackTs = await sendSlackTicketCreated(ticket, resolvedCreator, assignee, manager);
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
  if (!ticket.assigneeId) return;
  if (!assignee.isActive) {
    console.log(`[Notifications] Skipping notification - assignee ${assignee.name} is inactive`);
    return;
  }

  // ── 1. In-app notification (DB) — failure must NOT block Slack ─────────
  storage.createNotification({
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
  }).then(() => {
    console.log(`[Notifications] In-app notification created for ${assignee.name} — ${ticket.ticketNumber}`);
  }).catch(err => {
    console.error('[Notifications] Failed to create in-app notification for assignment:', err);
  });

  // ── 2. Slack thread reply — runs independently of DB result ────────────
  try {
    const manager  = assignee.managerId ? await storage.getUserById(assignee.managerId) : undefined;
    const threadTs = await ensureSlackThread(ticket);
    await sendSlackTicketAssigned(ticket, assignee, actor, manager, threadTs);
    console.log(`[Slack] Assignment notification sent for ${ticket.ticketNumber} → ${assignee.name}`);
  } catch (err) {
    console.error('[Slack] Failed to send ticket assigned notification:', err);
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
      const threadTs = await ensureSlackThread(ticket);
      // Await so callers can sequence multiple notifications (prevents Slack grouping them as one)
      await sendSlackTicketResolved(ticket, solver, threadTs).catch(err => {
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

    // Post the comment in the ticket's Slack thread (non-blocking)
    if (commenter) {
      ensureSlackThread(ticket).then(threadTs => {
        if (threadTs) {
          sendSlackCommentAdded(ticket, comment, commenter, threadTs).catch(err => {
            console.error('[Slack] Failed to send comment notification:', err);
          });
        }
      }).catch(err => console.error('[Slack] Failed to ensure thread for comment:', err));
    }
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
 * Notify when a ticket is transferred to a different department.
 *
 * In-app:
 *   - All active members of the NEW department receive a "ticket_transferred" notification.
 *
 * Slack:
 *   - Departure note posted in the OLD department's thread.
 *   - Fresh arrival notice posted in the NEW department's channel.
 *   - The new Slack ts replaces slackMessageTs on the ticket so all
 *     future replies go to the new department's thread.
 */
export async function notifyDepartmentTransfer(
  ticket: Ticket,
  fromDepartment: string,
  actor: User | undefined
) {
  try {
    const newDept = ticket.department || ticket.ownerTeam;

    // ── In-app notifications → all active members of the new department ──
    const newTeamMembers = await storage.getUsersByDepartment(newDept, { isActive: true });
    const relevantUsers = newTeamMembers.filter(u => u.id !== actor?.id);

    const notificationPromises = relevantUsers.map(user =>
      storage.createNotification({
        userId: user.id,
        type: "ticket_transferred",
        title: "Ticket Transferred to Your Department",
        message: `${actor?.name || "Someone"} transferred ticket ${ticket.ticketNumber} from ${fromDepartment} to ${newDept}: ${ticket.subject}`,
        ticketId: ticket.id,
        actorId: actor?.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          fromDepartment,
          toDepartment: newDept,
          transferredBy: actor?.name,
        },
        isRead: false,
      })
    );

    await Promise.all(notificationPromises);
    console.log(`[Notifications] Created ${relevantUsers.length} transfer notifications for ${ticket.ticketNumber} (${fromDepartment} → ${newDept})`);

    // ── Slack ──
    const oldThreadTs = (ticket as any).slackMessageTs as string | null | undefined;
    if (actor) {
      const newTs = await sendSlackTicketTransferred(ticket, fromDepartment, actor, oldThreadTs).catch(err => {
        console.error('[Slack] Failed to send transfer notification:', err);
        return null;
      });
      // Replace slackMessageTs so all future thread replies go to the new channel
      if (newTs) {
        await storage.updateTicket(ticket.id, { slackMessageTs: newTs } as any);
        console.log(`[Slack] Updated slackMessageTs for ${ticket.ticketNumber}: ${newTs}`);
      }
    }
  } catch (error) {
    console.error("[Notifications] Failed to create department transfer notifications:", error);
  }
}

// ── Leave Request Notifications ────────────────────────────────────────────

/**
 * Notify manager when an employee submits a leave request.
 * - In-app: notification to the employee's manager (or all dept managers)
 * - Slack:  post to SLACK_CHANNEL_MANAGERS channel
 */
export async function notifyLeaveSubmitted(opts: {
  leaveId:   string;
  employee:  User;
  startDate: Date;
  endDate:   Date;
  leaveType: string;
  reason:    string;
}) {
  try {
    const { leaveId, employee, startDate, endDate, leaveType, reason } = opts;

    const fmtDate = (d: Date) =>
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const leaveTypeLabel: Record<string, string> = {
      sick: "Sick Leave", annual: "Annual Leave",
      personal: "Personal Leave", emergency: "Emergency Leave",
    };

    const summary = `${employee.name} has submitted a ${leaveTypeLabel[leaveType] ?? leaveType} request (${fmtDate(startDate)} – ${fmtDate(endDate)}).`;

    // In-app: notify manager if known, otherwise all active dept members with manager+ role
    const managerUsers = employee.managerId
      ? [await storage.getUserById(employee.managerId)].filter(Boolean) as User[]
      : (await storage.getUsersByDepartment(employee.department ?? "", { isActive: true }))
          .filter(u => ["Owner","Admin","Head","Manager","Lead"].includes(u.role));

    await Promise.all(
      managerUsers.map(mgr =>
        storage.createNotification({
          userId:  mgr.id,
          type:    "ticket_updated",
          title:   "New Leave Request",
          message: summary,
          data:    { leaveId, employeeId: employee.id },
        })
      )
    );

    // Slack: leave notifications are handled by a dedicated flow — not posted to the pulse channel
  } catch (err) {
    console.error("[Leave] notifyLeaveSubmitted error:", err);
  }
}

/**
 * Notify employee when their leave request is approved or rejected.
 * - In-app: notification to the employee
 * - Slack:  DM to employee (if slackUserId set), else managers channel
 */
export async function notifyLeaveReviewed(opts: {
  leaveId:    string;
  employee:   User;
  reviewer:   User;
  status:     "approved" | "rejected";
  reviewNote?: string;
  startDate:  Date;
  endDate:    Date;
}) {
  try {
    const { leaveId, employee, reviewer, status, reviewNote, startDate, endDate } = opts;

    const fmtDate = (d: Date) =>
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const emoji   = status === "approved" ? "✅" : "❌";
    const word    = status === "approved" ? "Approved" : "Rejected";
    const message = `Your leave request (${fmtDate(startDate)} – ${fmtDate(endDate)}) has been ${word.toLowerCase()} by ${reviewer.name}.${reviewNote ? `\nNote: ${reviewNote}` : ""}`;

    // In-app
    await storage.createNotification({
      userId:  employee.id,
      type:    "ticket_updated",
      title:   `Leave Request ${word}`,
      message,
      data:    { leaveId },
    });

    // Slack: DM the employee directly if they have a Slack user ID linked
    if (employee.slackUserId) {
      try {
        const { WebClient } = await import("@slack/web-api");
        const botToken = process.env.SLACK_BOT_TOKEN?.trim();
        if (botToken) {
          const client = new WebClient(botToken);
          const dm = await client.conversations.open({ users: employee.slackUserId });
          const dmChannel = (dm as any).channel?.id;
          if (dmChannel) {
            await client.chat.postMessage({
              channel: dmChannel,
              text: `${emoji} *Leave Request ${word}*\n*Period:* ${fmtDate(startDate)} – ${fmtDate(endDate)}\n*Reviewed by:* ${reviewer.name}${reviewNote ? `\n*Note:* ${reviewNote}` : ""}`,
            });
          }
        }
      } catch (dmErr) {
        console.error("[Leave] Failed to DM employee:", dmErr);
      }
    }
    // Note: leave notifications are NOT posted to the pulse/managers group channel
  } catch (err) {
    console.error("[Leave] notifyLeaveReviewed error:", err);
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
