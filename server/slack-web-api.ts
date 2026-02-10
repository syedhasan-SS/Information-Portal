import { WebClient } from '@slack/web-api';
import type { Ticket, Comment, User } from '@shared/schema';

/**
 * Slack Web API Integration
 * Uses Slack Bot Token for secure, feature-rich notifications
 */

let slackClient: WebClient | null = null;

/**
 * Initialize Slack client
 */
function getSlackClient(): WebClient | null {
  const botToken = process.env.SLACK_BOT_TOKEN;

  if (!botToken) {
    console.log('[Slack] SLACK_BOT_TOKEN not configured, skipping Slack notifications');
    return null;
  }

  if (!slackClient) {
    slackClient = new WebClient(botToken);
    console.log('[Slack] Web API client initialized');
  }

  return slackClient;
}

/**
 * Check if Slack is configured
 */
export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN;
}

/**
 * Get channel name or ID
 */
function getChannel(): string {
  return process.env.SLACK_CHANNEL_ID || '#complaint-notifications';
}

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
 * Send ticket created notification
 */
export async function sendSlackTicketCreated(
  ticket: Ticket,
  creator?: User,
  assignee?: User
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);
    const priorityEmoji = getPriorityEmoji(ticket.priorityTier);

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} New Ticket Created`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${priorityEmoji} ${ticket.priorityTier || 'Normal'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Department:*\n${ticket.department || 'General'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Created By:*\n${creator ? creator.email : 'Unknown'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Subject:* ${ticket.subject}\n*Vendor:* ${ticket.vendorHandle || 'N/A'}`,
        },
      },
    ];

    if (assignee) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Assigned to:* ${assignee.email}`,
        },
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Status:* Unassigned - Waiting for assignment',
        },
      });
    }

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔗 View Ticket',
            emoji: true,
          },
          url: ticketUrl,
          style: 'primary',
        },
      ],
    });

    await client.chat.postMessage({
      channel: getChannel(),
      text: `New ticket created: ${ticket.ticketNumber} - ${ticket.subject}`,
      blocks,
    });

    console.log(`[Slack] Sent ticket created notification: ${ticket.ticketNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send ticket created notification:', error.message);
    return false;
  }
}

/**
 * Send ticket assigned notification
 */
export async function sendSlackTicketAssigned(
  ticket: Ticket,
  assignee: User,
  assigner?: User
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);
    const priorityEmoji = getPriorityEmoji(ticket.priorityTier);

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} Ticket Assigned`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${priorityEmoji} ${ticket.priorityTier || 'Normal'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${assignee.email}* has been assigned to this ticket by ${assigner ? assigner.email : 'System'}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Subject:* ${ticket.subject}\n*Department:* ${ticket.department || 'General'}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔗 View Ticket',
              emoji: true,
            },
            url: ticketUrl,
            style: 'primary',
          },
        ],
      },
    ];

    await client.chat.postMessage({
      channel: getChannel(),
      text: `Ticket ${ticket.ticketNumber} assigned to ${assignee.email}`,
      blocks,
    });

    console.log(`[Slack] Sent ticket assigned notification: ${ticket.ticketNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send ticket assigned notification:', error.message);
    return false;
  }
}

/**
 * Send comment mention notification
 */
export async function sendSlackCommentMention(
  ticket: Ticket,
  comment: Comment,
  commenter: User,
  mentionedUsers: User[]
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);
    const mentionsList = mentionedUsers.map(u => u.email).join(', ');

    // Truncate comment if too long
    const commentText = comment.text.length > 200
      ? comment.text.substring(0, 200) + '...'
      : comment.text;

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💬 You were mentioned in a comment',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Mentioned:*\n${mentionsList}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${commenter.email}* commented:\n> ${commentText}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Ticket Subject:* ${ticket.subject}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔗 View Comment',
              emoji: true,
            },
            url: ticketUrl,
            style: 'primary',
          },
        ],
      },
    ];

    await client.chat.postMessage({
      channel: getChannel(),
      text: `${commenter.email} mentioned ${mentionsList} in ticket ${ticket.ticketNumber}`,
      blocks,
    });

    console.log(`[Slack] Sent comment mention notification: ${ticket.ticketNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send comment mention notification:', error.message);
    return false;
  }
}

/**
 * Send ticket resolved notification
 */
export async function sendSlackTicketResolved(
  ticket: Ticket,
  resolver: User
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ Ticket Resolved',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Resolved By:*\n${resolver.email}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Subject:* ${ticket.subject}\n*Department:* ${ticket.department || 'General'}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔗 View Ticket',
              emoji: true,
            },
            url: ticketUrl,
          },
        ],
      },
    ];

    await client.chat.postMessage({
      channel: getChannel(),
      text: `Ticket ${ticket.ticketNumber} resolved by ${resolver.email}`,
      blocks,
    });

    console.log(`[Slack] Sent ticket resolved notification: ${ticket.ticketNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send ticket resolved notification:', error.message);
    return false;
  }
}

/**
 * Send urgent ticket alert
 */
export async function sendSlackUrgentAlert(
  ticket: Ticket,
  creator?: User
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 URGENT TICKET ALERT',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n🔴 ${ticket.priorityTier}`,
          },
          {
            type: 'mrkdwn',
            text: `*Department:*\n${ticket.department || 'General'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Created By:*\n${creator ? creator.email : 'Unknown'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Subject:* ${ticket.subject}\n*Vendor:* ${ticket.vendorHandle || 'N/A'}\n\n⚠️ This ticket requires immediate attention!`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔗 View Urgent Ticket',
              emoji: true,
            },
            url: ticketUrl,
            style: 'danger',
          },
        ],
      },
    ];

    await client.chat.postMessage({
      channel: getChannel(),
      text: `🚨 URGENT: ${ticket.ticketNumber} - ${ticket.subject}`,
      blocks,
    });

    console.log(`[Slack] Sent urgent ticket alert: ${ticket.ticketNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send urgent ticket alert:', error.message);
    return false;
  }
}
