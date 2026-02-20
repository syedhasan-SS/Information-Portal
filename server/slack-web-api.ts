import { WebClient } from '@slack/web-api';
import type { Ticket, Comment, User } from '@shared/schema';

/**
 * Slack Web API Integration
 * Uses Slack Bot Token for secure, feature-rich notifications
 *
 * Threading: All ticket updates are posted as replies to the original
 * ticket creation message, keeping one thread per ticket.
 */

let slackClient: WebClient | null = null;

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

export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN;
}

function getChannel(department?: string): string {
  if (department) {
    const deptChannel = process.env[`SLACK_CHANNEL_${department.toUpperCase()}`];
    if (deptChannel) return deptChannel;
  }
  return process.env.SLACK_CHANNEL_ID || '#flow-complaint-notifications';
}

function getTicketUrl(ticketId: string): string {
  const baseUrl = process.env.APP_URL || 'https://information-portal-beryl.vercel.app';
  return `${baseUrl}/ticket/${ticketId}`;
}

function getPriorityEmoji(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical': return '🔴';
    case 'high':     return '🟠';
    case 'medium':   return '🟡';
    case 'low':      return '🟢';
    default:         return '⚪';
  }
}

/**
 * Send the FIRST notification when a ticket is created.
 * Returns the Slack message ts so it can be stored and used as thread_ts for all future updates.
 */
export async function sendSlackTicketCreated(
  ticket: Ticket,
  creator?: User,
  assignee?: User,
  manager?: User
): Promise<string | null> {
  const client = getSlackClient();
  if (!client) return null;

  try {
    const ticketUrl = getTicketUrl(ticket.id);
    const priorityEmoji = getPriorityEmoji(ticket.priorityTier);

    const assigneeMention = assignee
      ? (assignee.slackUserId ? `<@${assignee.slackUserId}>` : assignee.name)
      : 'Unassigned';

    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${priorityEmoji} New Ticket — ${ticket.ticketNumber}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>` },
          { type: 'mrkdwn', text: `*Priority:*\n${priorityEmoji} ${ticket.priorityTier || 'Normal'}` },
          { type: 'mrkdwn', text: `*Department:*\n${ticket.department || 'General'}` },
          { type: 'mrkdwn', text: `*Created By:*\n${creator?.name || creator?.email || 'Unknown'}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Subject:* ${ticket.subject}\n*Vendor:* ${ticket.vendorHandle || 'N/A'}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Assigned To:* ${assigneeMention}` },
      },
    ];

    if (manager?.slackUserId) {
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `👔 *Manager notified:* <@${manager.slackUserId}>` }],
      });
    }

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `🔗 <${ticketUrl}|View Ticket in Portal>` },
    });

    const result = await client.chat.postMessage({
      channel: getChannel(ticket.department),
      text: `New ticket ${ticket.ticketNumber}: ${ticket.subject}`,
      blocks,
      link_names: true,
    });

    const ts = result.ts as string;
    console.log(`[Slack] Ticket created notification sent: ${ticket.ticketNumber} (ts: ${ts})`);
    return ts;
  } catch (error: any) {
    console.error('[Slack] Failed to send ticket created notification:', error.message);
    return null;
  }
}

/**
 * Post a reply in the ticket thread when the ticket is assigned.
 * threadTs = the ts returned from sendSlackTicketCreated.
 */
export async function sendSlackTicketAssigned(
  ticket: Ticket,
  assignee: User,
  assigner?: User,
  manager?: User,
  threadTs?: string | null
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);
    const priorityEmoji = getPriorityEmoji(ticket.priorityTier);
    const assigneeMention = assignee.slackUserId ? `<@${assignee.slackUserId}>` : assignee.name;
    const assignerText = assigner?.name || assigner?.email || 'System';

    const blocks: any[] = [
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>` },
          { type: 'mrkdwn', text: `*Priority:*\n${priorityEmoji} ${ticket.priorityTier || 'Normal'}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `✅ *Assigned:* ${assigneeMention} (by ${assignerText})` },
      },
    ];

    if (manager?.slackUserId) {
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `👔 *Manager notified:* <@${manager.slackUserId}>` }],
      });
    }

    const payload: any = {
      channel: getChannel(ticket.department),
      text: `Ticket ${ticket.ticketNumber} assigned to ${assignee.name}`,
      blocks,
      link_names: true,
    };

    if (threadTs) payload.thread_ts = threadTs;

    await client.chat.postMessage(payload);
    console.log(`[Slack] Ticket assigned notification sent: ${ticket.ticketNumber}${threadTs ? ' (in thread)' : ''}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send ticket assigned notification:', error.message);
    return false;
  }
}

/**
 * Post a reply in the ticket thread when a comment mentions someone.
 */
export async function sendSlackCommentMention(
  ticket: Ticket,
  comment: Comment,
  commenter: User,
  mentionedUsers: User[],
  managers?: User[],
  threadTs?: string | null
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);

    const slackMentions = mentionedUsers.filter(u => u.slackUserId).map(u => `<@${u.slackUserId}>`).join(', ');
    const nameMentions  = mentionedUsers.filter(u => !u.slackUserId).map(u => u.name).join(', ');
    const mentionsList  = [slackMentions, nameMentions].filter(Boolean).join(', ');
    const managerMentions = managers?.filter(m => m.slackUserId).map(m => `<@${m.slackUserId}>`).join(', ') || '';

    const commentText = comment.body?.length > 200 ? comment.body.substring(0, 200) + '...' : (comment.body || '');

    const blocks: any[] = [
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>` },
          { type: 'mrkdwn', text: `*Mentioned:*\n${mentionsList}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `💬 *${commenter.name || commenter.email}* commented:\n> ${commentText}` },
      },
    ];

    if (managerMentions) {
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `👔 *Managers notified:* ${managerMentions}` }],
      });
    }

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `🔗 <${ticketUrl}|View Comment in Portal>` },
    });

    const payload: any = {
      channel: getChannel(ticket.department),
      text: `${commenter.name || commenter.email} mentioned ${mentionsList} in ${ticket.ticketNumber}`,
      blocks,
      link_names: true,
    };

    if (threadTs) payload.thread_ts = threadTs;

    await client.chat.postMessage(payload);
    console.log(`[Slack] Comment mention notification sent: ${ticket.ticketNumber}${threadTs ? ' (in thread)' : ''}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send comment mention notification:', error.message);
    return false;
  }
}

/**
 * Post a reply in the ticket thread when a ticket is resolved.
 */
export async function sendSlackTicketResolved(
  ticket: Ticket,
  resolver: User,
  threadTs?: string | null
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);

    const payload: any = {
      channel: getChannel(ticket.department),
      text: `✅ Ticket ${ticket.ticketNumber} resolved by ${resolver.name || resolver.email}`,
      blocks: [
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>` },
            { type: 'mrkdwn', text: `*Resolved By:*\n${resolver.name || resolver.email}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `✅ *Ticket resolved*\n*Subject:* ${ticket.subject}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `🔗 <${ticketUrl}|View Ticket in Portal>` },
        },
      ],
    };

    if (threadTs) payload.thread_ts = threadTs;

    await client.chat.postMessage(payload);
    console.log(`[Slack] Ticket resolved notification sent: ${ticket.ticketNumber}${threadTs ? ' (in thread)' : ''}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send ticket resolved notification:', error.message);
    return false;
  }
}

/**
 * Post an urgent alert — always a new top-level message so it's impossible to miss.
 */
export async function sendSlackUrgentAlert(
  ticket: Ticket,
  creator?: User,
  threadTs?: string | null
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);

    const payload: any = {
      channel: getChannel(ticket.department),
      text: `🚨 URGENT: ${ticket.ticketNumber} — ${ticket.subject}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 URGENT TICKET ALERT', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>` },
            { type: 'mrkdwn', text: `*Priority:*\n🔴 ${ticket.priorityTier}` },
            { type: 'mrkdwn', text: `*Department:*\n${ticket.department || 'General'}` },
            { type: 'mrkdwn', text: `*Created By:*\n${creator?.name || creator?.email || 'Unknown'}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Subject:* ${ticket.subject}\n\n⚠️ This ticket requires immediate attention!` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `🔗 <${ticketUrl}|View Urgent Ticket>` },
        },
      ],
    };

    // Urgent alerts also thread under the original message if available
    if (threadTs) payload.thread_ts = threadTs;

    await client.chat.postMessage(payload);
    console.log(`[Slack] Urgent alert sent: ${ticket.ticketNumber}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send urgent ticket alert:', error.message);
    return false;
  }
}
