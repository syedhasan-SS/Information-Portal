import axios from 'axios';
import type { Ticket, Comment, User } from '@shared/schema';

/**
 * Slack Integration Module
 * Sends formatted notifications to Slack channels for ticket events
 */

interface SlackConfig {
  webhookUrl: string;
  botToken?: string;
  channelId?: string;
}

/**
 * Get Slack configuration from environment
 */
function getSlackConfig(): SlackConfig | null {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const botToken = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!webhookUrl && !botToken) {
    return null;
  }

  return {
    webhookUrl: webhookUrl || '',
    botToken,
    channelId,
  };
}

/**
 * Check if Slack is configured
 */
export function isSlackConfigured(): boolean {
  const config = getSlackConfig();
  return config !== null && (!!config.webhookUrl || !!config.botToken);
}

/**
 * Get user's Slack user ID from email
 * This requires mapping Fleek emails to Slack user IDs
 */
function getSlackUserId(email: string): string {
  // For now, return a mention format with email
  // In production, you'd maintain a mapping table or use Slack API to lookup users
  const username = email.split('@')[0];
  return `@${username}`;
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
 * Send formatted message to Slack
 */
async function sendSlackMessage(blocks: any[], text: string): Promise<boolean> {
  const config = getSlackConfig();

  if (!config || !config.webhookUrl) {
    console.log('[Slack] No webhook URL configured, skipping notification');
    return false;
  }

  try {
    const payload = {
      text, // Fallback text for notifications
      blocks,
    };

    const response = await axios.post(config.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data === 'ok' || response.status === 200) {
      console.log('[Slack] Message sent successfully');
      return true;
    } else {
      console.error('[Slack] Unexpected response:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('[Slack] Failed to send message:', error.message);
    return false;
  }
}

/**
 * Notify Slack when a ticket is created
 */
export async function notifySlackTicketCreated(
  ticket: Ticket,
  creator?: User,
  assignee?: User
): Promise<boolean> {
  if (!isSlackConfigured()) {
    return false;
  }

  const ticketUrl = getTicketUrl(ticket.id);
  const priorityEmoji = getPriorityEmoji(ticket.priorityTier);
  const creatorMention = creator ? getSlackUserId(creator.email) : 'Unknown';
  const assigneeMention = assignee ? getSlackUserId(assignee.email) : 'Unassigned';

  const blocks = [
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
          text: `*Created By:*\n${creatorMention}`,
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
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ticket.assigneeId
          ? `*Assigned to:* ${assigneeMention}`
          : '*Status:* Unassigned - Waiting for assignment',
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

  const fallbackText = `New ticket created: ${ticket.ticketNumber} - ${ticket.subject} | Created by ${creatorMention}`;

  return sendSlackMessage(blocks, fallbackText);
}

/**
 * Notify Slack when a ticket is assigned
 */
export async function notifySlackTicketAssigned(
  ticket: Ticket,
  assignee: User,
  assigner?: User
): Promise<boolean> {
  if (!isSlackConfigured()) {
    return false;
  }

  const ticketUrl = getTicketUrl(ticket.id);
  const priorityEmoji = getPriorityEmoji(ticket.priorityTier);
  const assigneeMention = getSlackUserId(assignee.email);
  const assignerMention = assigner ? getSlackUserId(assigner.email) : 'System';

  const blocks = [
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
        text: `*${assigneeMention}* has been assigned to this ticket by ${assignerMention}`,
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

  const fallbackText = `Ticket ${ticket.ticketNumber} assigned to ${assigneeMention} by ${assignerMention}`;

  return sendSlackMessage(blocks, fallbackText);
}

/**
 * Notify Slack when a comment is added with mentions
 */
export async function notifySlackCommentAdded(
  ticket: Ticket,
  comment: Comment,
  commenter: User,
  mentionedUsers: User[]
): Promise<boolean> {
  if (!isSlackConfigured() || mentionedUsers.length === 0) {
    return false;
  }

  const ticketUrl = getTicketUrl(ticket.id);
  const commenterMention = getSlackUserId(commenter.email);
  const mentionsList = mentionedUsers.map(u => getSlackUserId(u.email)).join(', ');

  // Truncate comment if too long
  const commentText = comment.text.length > 200
    ? comment.text.substring(0, 200) + '...'
    : comment.text;

  const blocks = [
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
        text: `*${commenterMention}* commented:\n> ${commentText}`,
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

  const fallbackText = `${commenterMention} mentioned ${mentionsList} in ticket ${ticket.ticketNumber}`;

  return sendSlackMessage(blocks, fallbackText);
}

/**
 * Notify Slack when a ticket is resolved
 */
export async function notifySlackTicketResolved(
  ticket: Ticket,
  resolver: User
): Promise<boolean> {
  if (!isSlackConfigured()) {
    return false;
  }

  const ticketUrl = getTicketUrl(ticket.id);
  const resolverMention = getSlackUserId(resolver.email);

  const blocks = [
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
          text: `*Resolved By:*\n${resolverMention}`,
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

  const fallbackText = `Ticket ${ticket.ticketNumber} resolved by ${resolverMention}`;

  return sendSlackMessage(blocks, fallbackText);
}
