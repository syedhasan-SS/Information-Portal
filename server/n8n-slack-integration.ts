import { triggerN8nWorkflow } from './n8n-integration';
import type { Ticket, Comment, User } from '@shared/schema';

/**
 * n8n-based Slack Integration
 * Routes all Slack notifications through n8n workflows for security and flexibility
 *
 * Benefits:
 * - No direct Slack webhook exposure in code
 * - Easy to modify workflows without code changes
 * - Can route to multiple channels/services
 * - Better audit trail
 * - Compliance-friendly
 */

/**
 * Build ticket URL
 */
function getTicketUrl(ticketId: string): string {
  const baseUrl = process.env.APP_URL || 'https://information-portal-beryl.vercel.app';
  return `${baseUrl}/ticket/${ticketId}`;
}

/**
 * Get priority emoji
 */
function getPriorityEmoji(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return '🔴';
    case 'high':
      return '🟠';
    case 'normal':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}

/**
 * Send ticket created notification via n8n
 */
export async function sendTicketCreatedToN8n(
  ticket: Ticket,
  creator?: User,
  assignee?: User
): Promise<boolean> {
  const ticketUrl = getTicketUrl(ticket.id);
  const priorityEmoji = getPriorityEmoji(ticket.priorityTier);

  const payload = {
    event: 'slack.ticket.created',
    ticket: {
      id: ticket.id,
      number: ticket.ticketNumber,
      subject: ticket.subject,
      priority: ticket.priorityTier || 'Normal',
      priorityEmoji,
      department: ticket.department || 'General',
      vendorHandle: ticket.vendorHandle || 'N/A',
      status: ticket.status,
      url: ticketUrl,
    },
    creator: creator ? {
      id: creator.id,
      name: creator.name,
      email: creator.email,
      department: creator.department,
    } : null,
    assignee: assignee ? {
      id: assignee.id,
      name: assignee.name,
      email: assignee.email,
      department: assignee.department,
    } : null,
    timestamp: new Date().toISOString(),
  };

  console.log('[n8n-Slack] Sending ticket created notification:', ticket.ticketNumber);
  return triggerN8nWorkflow('slack.ticket.created', payload);
}

/**
 * Send ticket assigned notification via n8n
 */
export async function sendTicketAssignedToN8n(
  ticket: Ticket,
  assignee: User,
  assigner?: User
): Promise<boolean> {
  const ticketUrl = getTicketUrl(ticket.id);
  const priorityEmoji = getPriorityEmoji(ticket.priorityTier);

  const payload = {
    event: 'slack.ticket.assigned',
    ticket: {
      id: ticket.id,
      number: ticket.ticketNumber,
      subject: ticket.subject,
      priority: ticket.priorityTier || 'Normal',
      priorityEmoji,
      department: ticket.department || 'General',
      url: ticketUrl,
    },
    assignee: {
      id: assignee.id,
      name: assignee.name,
      email: assignee.email,
      department: assignee.department,
    },
    assigner: assigner ? {
      id: assigner.id,
      name: assigner.name,
      email: assigner.email,
    } : null,
    timestamp: new Date().toISOString(),
  };

  console.log('[n8n-Slack] Sending ticket assigned notification:', ticket.ticketNumber);
  return triggerN8nWorkflow('slack.ticket.assigned', payload);
}

/**
 * Send comment mention notification via n8n
 */
export async function sendCommentMentionToN8n(
  ticket: Ticket,
  comment: Comment,
  commenter: User,
  mentionedUsers: User[]
): Promise<boolean> {
  const ticketUrl = getTicketUrl(ticket.id);

  // Truncate comment if too long
  const commentText = comment.text.length > 200
    ? comment.text.substring(0, 200) + '...'
    : comment.text;

  const payload = {
    event: 'slack.comment.mention',
    ticket: {
      id: ticket.id,
      number: ticket.ticketNumber,
      subject: ticket.subject,
      url: ticketUrl,
    },
    comment: {
      id: comment.id,
      text: commentText,
      fullText: comment.text,
      createdAt: comment.createdAt,
    },
    commenter: {
      id: commenter.id,
      name: commenter.name,
      email: commenter.email,
    },
    mentionedUsers: mentionedUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
    timestamp: new Date().toISOString(),
  };

  console.log('[n8n-Slack] Sending comment mention notification:', ticket.ticketNumber);
  return triggerN8nWorkflow('slack.comment.mention', payload);
}

/**
 * Send ticket resolved notification via n8n
 */
export async function sendTicketResolvedToN8n(
  ticket: Ticket,
  resolver: User
): Promise<boolean> {
  const ticketUrl = getTicketUrl(ticket.id);

  const payload = {
    event: 'slack.ticket.resolved',
    ticket: {
      id: ticket.id,
      number: ticket.ticketNumber,
      subject: ticket.subject,
      department: ticket.department || 'General',
      url: ticketUrl,
    },
    resolver: {
      id: resolver.id,
      name: resolver.name,
      email: resolver.email,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('[n8n-Slack] Sending ticket resolved notification:', ticket.ticketNumber);
  return triggerN8nWorkflow('slack.ticket.resolved', payload);
}

/**
 * Send high priority alert via n8n
 * This can be routed to urgent channels or trigger different workflows
 */
export async function sendUrgentTicketAlertToN8n(
  ticket: Ticket,
  creator?: User
): Promise<boolean> {
  const ticketUrl = getTicketUrl(ticket.id);

  const payload = {
    event: 'slack.ticket.urgent',
    ticket: {
      id: ticket.id,
      number: ticket.ticketNumber,
      subject: ticket.subject,
      priority: ticket.priorityTier,
      department: ticket.department || 'General',
      vendorHandle: ticket.vendorHandle || 'N/A',
      url: ticketUrl,
    },
    creator: creator ? {
      id: creator.id,
      name: creator.name,
      email: creator.email,
    } : null,
    timestamp: new Date().toISOString(),
  };

  console.log('[n8n-Slack] Sending urgent ticket alert:', ticket.ticketNumber);
  return triggerN8nWorkflow('slack.ticket.urgent', payload);
}
