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
 * Get channel name or ID based on department
 */
function getChannel(department?: string): string {
  // Department-specific channels (configure in .env)
  if (department) {
    const deptChannel = process.env[`SLACK_CHANNEL_${department.toUpperCase()}`];
    if (deptChannel) return deptChannel;
  }

  // Fallback to main channel
  return process.env.SLACK_CHANNEL_ID || '#flow-complaint-notifications';
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
 * Send ticket created notification with @mentions for assignee and manager
 */
export async function sendSlackTicketCreated(
  ticket: Ticket,
  creator?: User,
  assignee?: User,
  manager?: User
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
      // Build @mention string for assignee
      const assigneeMention = assignee.slackUserId
        ? `<@${assignee.slackUserId}>`
        : assignee.email;

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Assigned to:* ${assigneeMention}`,
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

    // Add manager notification if available
    if (manager && manager.slackUserId) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `👔 *Manager notified:* <@${manager.slackUserId}>`,
          },
        ],
      });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔗 <${ticketUrl}|View Ticket in Portal>`,
      },
    });

    await client.chat.postMessage({
      channel: getChannel(ticket.department),
      text: `New ticket created: ${ticket.ticketNumber} - ${ticket.subject}`,
      blocks,
      link_names: true, // Enable @mentions to trigger notifications
    });

    console.log(`[Slack] Sent ticket created notification: ${ticket.ticketNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send ticket created notification:', error.message);
    return false;
  }
}

/**
 * Send ticket assigned notification with @mentions for assignee and manager
 */
export async function sendSlackTicketAssigned(
  ticket: Ticket,
  assignee: User,
  assigner?: User,
  manager?: User
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);
    const priorityEmoji = getPriorityEmoji(ticket.priorityTier);

    // Build @mention string for assignee
    const assigneeMention = assignee.slackUserId
      ? `<@${assignee.slackUserId}>`
      : assignee.email;

    const assignerText = assigner ? assigner.email : 'System';

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
          text: `*${assigneeMention}* has been assigned to this ticket by ${assignerText}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Subject:* ${ticket.subject}\n*Department:* ${ticket.department || 'General'}`,
        },
      },
    ];

    // Add manager notification if available
    if (manager && manager.slackUserId) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `👔 *Manager notified:* <@${manager.slackUserId}>`,
          },
        ],
      });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔗 <${ticketUrl}|View Ticket in Portal>`,
      },
    });

    await client.chat.postMessage({
      channel: getChannel(ticket.department),
      text: `Ticket ${ticket.ticketNumber} assigned to ${assignee.email}`,
      blocks,
      link_names: true, // Enable @mentions to trigger notifications
    });

    console.log(`[Slack] Sent ticket assigned notification: ${ticket.ticketNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send ticket assigned notification:', error.message);
    return false;
  }
}

/**
 * Send comment mention notification with proper @mentions
 */
export async function sendSlackCommentMention(
  ticket: Ticket,
  comment: Comment,
  commenter: User,
  mentionedUsers: User[],
  managers?: User[]
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);

    // Create proper Slack @mentions for users who have Slack IDs
    const slackMentions = mentionedUsers
      .filter(u => u.slackUserId)
      .map(u => `<@${u.slackUserId}>`)
      .join(', ');

    const emailMentions = mentionedUsers
      .filter(u => !u.slackUserId)
      .map(u => u.email)
      .join(', ');

    const mentionsList = [slackMentions, emailMentions].filter(Boolean).join(', ');

    // Add manager mentions if provided
    const managerMentions = managers
      ?.filter(m => m.slackUserId)
      .map(m => `<@${m.slackUserId}>`)
      .join(', ') || '';

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
    ];

    // Add manager notification section if managers are included
    if (managerMentions) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `👔 *Managers notified:* ${managerMentions}`,
          },
        ],
      });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔗 <${ticketUrl}|View Comment in Portal>`,
      },
    });

    await client.chat.postMessage({
      channel: getChannel(ticket.department),
      text: `${commenter.email} mentioned ${mentionsList} in ticket ${ticket.ticketNumber}`,
      blocks,
      // This will actually @mention users in Slack, triggering notifications
      link_names: true,
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
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔗 <${ticketUrl}|View Ticket in Portal>`,
        },
      },
    ];

    await client.chat.postMessage({
      channel: getChannel(ticket.department),
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
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔗 <${ticketUrl}|View Urgent Ticket in Portal>`,
        },
      },
    ];

    await client.chat.postMessage({
      channel: getChannel(ticket.department),
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
