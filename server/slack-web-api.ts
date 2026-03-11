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

function getChannel(department?: string): string | null {
  if (department) {
    const deptChannel = process.env[`SLACK_CHANNEL_${department.toUpperCase()}`]?.trim();
    if (deptChannel) return deptChannel;
    console.warn(`[Slack] No channel configured for department "${department}" (SLACK_CHANNEL_${department.toUpperCase()}) — skipping notification`);
    return null;
  }
  // Only fall back to SLACK_CHANNEL_ID when no department is provided at all
  return process.env.SLACK_CHANNEL_ID?.trim() || null;
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

  const channel = getChannel(ticket.department);
  if (!channel) return null;

  try {
    const ticketUrl = getTicketUrl(ticket.id);
    const priorityEmoji = getPriorityEmoji(ticket.priorityTier);

    const assigneeMention = assignee
      ? (assignee.slackUserId ? `<@${assignee.slackUserId}>` : assignee.name)
      : 'Unassigned';
    const managerMention = manager?.slackUserId
      ? `<@${manager.slackUserId}>`
      : manager?.name || '—';
    const creatorLabel = creator?.name || creator?.email || 'Unknown';

    // Truncate description to keep the message concise
    const description = (ticket.description || '').trim();
    const descSnippet = description.length > 300
      ? description.slice(0, 297) + '…'
      : description || '—';

    const blocks: any[] = [
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Ticket Number:*\n${ticket.ticketNumber}` },
          { type: 'mrkdwn', text: `*Priority:*\n${priorityEmoji} ${ticket.priorityTier || 'Normal'}` },
          { type: 'mrkdwn', text: `*Assigned:*\n${assigneeMention}` },
          { type: 'mrkdwn', text: `*Manager:*\n${managerMention}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Department:*\n${ticket.department || 'General'}` },
          { type: 'mrkdwn', text: `*Created By:*\n${creatorLabel}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Subject:*\n${ticket.subject || '—'}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Description:*\n${descSnippet}` },
      },
    ];

    const result = await client.chat.postMessage({
      channel,
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
 * Post a compact reply in the ticket thread when the ticket is (re)assigned.
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

  const channel = getChannel(ticket.department);
  if (!channel) return false;

  try {
    const ticketUrl  = getTicketUrl(ticket.id);
    const assigneeMention = assignee.slackUserId ? `<@${assignee.slackUserId}>` : `*${assignee.name}*`;
    const assignerLabel   = assigner ? (assigner.slackUserId ? `<@${assigner.slackUserId}>` : assigner.name) : 'System';

    const payload: any = {
      channel,
      text: `🔄 ${ticket.ticketNumber} assigned to ${assignee.name} by ${assigner?.name || 'System'}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔄 *<${ticketUrl}|${ticket.ticketNumber}>* assigned to ${assigneeMention} by ${assignerLabel}`,
          },
        },
      ],
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
 * Post a compact reply in the ticket thread when any comment is added.
 */
export async function sendSlackCommentAdded(
  ticket: Ticket,
  comment: Comment,
  commenter: User,
  threadTs?: string | null
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  const channel = getChannel(ticket.department);
  if (!channel) return false;

  try {
    const ticketUrl    = getTicketUrl(ticket.id);
    const commenterLabel = commenter.slackUserId ? `<@${commenter.slackUserId}>` : `*${commenter.name || commenter.email}*`;
    const commentText  = (comment.body || '').length > 300
      ? comment.body.substring(0, 297) + '…'
      : (comment.body || '');

    const payload: any = {
      channel,
      text: `${commenter.name || commenter.email} added a comment on ${ticket.ticketNumber}: ${commentText}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `💬 ${commenterLabel} added a comment on *<${ticketUrl}|${ticket.ticketNumber}>*\n> ${commentText}`,
          },
        },
      ],
      link_names: true,
    };

    if (threadTs) payload.thread_ts = threadTs;

    await client.chat.postMessage(payload);
    console.log(`[Slack] Comment notification sent: ${ticket.ticketNumber}${threadTs ? ' (in thread)' : ''}`);
    return true;
  } catch (error: any) {
    console.error('[Slack] Failed to send comment notification:', error.message);
    return false;
  }
}

/**
 * Post a compact reply in the ticket thread when a comment @mentions someone.
 * Only fires for @mentions (on top of the regular comment notification).
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

  const channel = getChannel(ticket.department);
  if (!channel) return false;

  try {
    const slackMentions = mentionedUsers.filter(u => u.slackUserId).map(u => `<@${u.slackUserId}>`).join(', ');
    const nameMentions  = mentionedUsers.filter(u => !u.slackUserId).map(u => u.name).join(', ');
    const mentionsList  = [slackMentions, nameMentions].filter(Boolean).join(', ');
    const managerMentions = managers?.filter(m => m.slackUserId).map(m => `<@${m.slackUserId}>`).join(', ') || '';

    const text = `📌 ${mentionsList} — you were mentioned in ${ticket.ticketNumber}${managerMentions ? ` | Managers: ${managerMentions}` : ''}`;

    const payload: any = {
      channel,
      text,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text },
        },
      ],
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
 * Post a compact reply in the ticket thread when a ticket is resolved.
 */
export async function sendSlackTicketResolved(
  ticket: Ticket,
  resolver: User,
  threadTs?: string | null
): Promise<boolean> {
  const client = getSlackClient();
  if (!client) return false;

  const channel = getChannel(ticket.department);
  if (!channel) return false;

  try {
    const ticketUrl     = getTicketUrl(ticket.id);
    const resolverLabel = resolver.slackUserId ? `<@${resolver.slackUserId}>` : `*${resolver.name || resolver.email}*`;

    const payload: any = {
      channel,
      text: `✅ ${ticket.ticketNumber} resolved by ${resolver.name || resolver.email}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *<${ticketUrl}|${ticket.ticketNumber}>* resolved by ${resolverLabel}`,
          },
        },
      ],
      link_names: true,
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

  const channel = getChannel(ticket.department);
  if (!channel) return false;

  try {
    const ticketUrl = getTicketUrl(ticket.id);

    const payload: any = {
      channel,
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
