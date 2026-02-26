/**
 * Slack Analytics Reporter
 * Builds and sends formatted analytics reports to Slack channels.
 * Supports both manual (on-demand) sends and a scheduled daily digest.
 */

import { WebClient } from '@slack/web-api';
import { storage } from './storage';

// ── Slack client ──────────────────────────────────────────────────────────────

function getSlackClient(): WebClient | null {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) return null;
  return new WebClient(botToken);
}

export function isSlackReporterConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN;
}

// ── Available channels ────────────────────────────────────────────────────────

export interface SlackChannel {
  id: string;
  name: string;
}

/** Returns all Slack channels that have been configured via environment variables. */
export function getAvailableChannels(): SlackChannel[] {
  const channelEnvMap: Record<string, string> = {
    SLACK_CHANNEL_MANAGERS: 'Managers & Heads',
    SLACK_CHANNEL_FINANCE: 'Finance',
    SLACK_CHANNEL_OPERATIONS: 'Operations',
    SLACK_CHANNEL_GROWTH: 'Growth',
    SLACK_CHANNEL_MARKETPLACE: 'Marketplace',
    SLACK_CHANNEL_CX: 'Customer Experience',
    SLACK_CHANNEL_URGENT: 'Urgent Alerts',
  };

  const channels: SlackChannel[] = [];

  for (const [envKey, name] of Object.entries(channelEnvMap)) {
    const channelId = process.env[envKey];
    if (channelId) {
      channels.push({ id: channelId, name });
    }
  }

  // Include the default channel if not already listed
  const defaultChannel = process.env.SLACK_CHANNEL_ID;
  if (defaultChannel && defaultChannel.startsWith('C') && !channels.find(c => c.id === defaultChannel)) {
    channels.push({ id: defaultChannel, name: 'General Notifications' });
  }

  return channels;
}

// ── Report data structure ─────────────────────────────────────────────────────

export interface DepartmentStat {
  name: string;
  total: number;
  open: number;
  pending: number;
  solved: number;
  breached: number;
}

export interface AgentStat {
  name: string;
  total: number;
  solved: number;
  rate: number;
  breached: number;
}

export interface ReportSummary {
  label: string;
  dateFrom: string;
  dateTo: string;
  total: number;
  open: number;
  pending: number;
  solved: number;
  breached: number;
  atRisk: number;
  resolutionRate: number;
  departments: DepartmentStat[];
  topAgents: AgentStat[];
}

// ── Block builder ─────────────────────────────────────────────────────────────

function buildReportBlocks(summary: ReportSummary): any[] {
  const dateLabel = `${summary.dateFrom} → ${summary.dateTo}`;
  const slaHealth =
    summary.total > 0
      ? Math.round(((summary.total - summary.breached) / summary.total) * 100)
      : 100;
  const slaEmoji = slaHealth >= 90 ? '🟢' : slaHealth >= 70 ? '🟡' : '🔴';

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📊 ${summary.label}`, emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `*Period:* ${dateLabel}` }],
    },
    { type: 'divider' },
    // KPI section
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*📋 Total Tickets*\n${summary.total}` },
        {
          type: 'mrkdwn',
          text: `*✅ Solved*\n${summary.solved} _(${summary.resolutionRate}%)_`,
        },
        { type: 'mrkdwn', text: `*🔵 Open / New*\n${summary.open}` },
        { type: 'mrkdwn', text: `*⏳ Pending*\n${summary.pending}` },
        { type: 'mrkdwn', text: `*🔴 SLA Breached*\n${summary.breached}` },
        {
          type: 'mrkdwn',
          text: `*${slaEmoji} SLA Health*\n${slaHealth}%${summary.atRisk > 0 ? ` _(+${summary.atRisk} at risk)_` : ''}`,
        },
      ],
    },
    { type: 'divider' },
  ];

  // Department breakdown
  if (summary.departments.length > 0) {
    const lines = summary.departments.slice(0, 7).map((d) => {
      const breachTag = d.breached > 0 ? ` 🔴 *${d.breached} breached*` : '';
      return `• *${d.name}*: ${d.total} total — 🔵 ${d.open} open · ⏳ ${d.pending} pending · ✅ ${d.solved} solved${breachTag}`;
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🏢 Department Breakdown*\n${lines.join('\n')}`,
      },
    });
    blocks.push({ type: 'divider' });
  }

  // Top agents
  if (summary.topAgents.length > 0) {
    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    const lines = summary.topAgents.slice(0, 5).map((a, i) => {
      const breachTag = a.breached > 0 ? ` | 🔴 ${a.breached} SLA breached` : '';
      return `${medals[i] ?? `${i + 1}.`} *${a.name}*: ${a.total} tickets · ${a.rate}% resolved${breachTag}`;
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🏆 Top Agents*\n${lines.join('\n')}`,
      },
    });
    blocks.push({ type: 'divider' });
  }

  // Footer
  const appUrl =
    process.env.APP_URL || 'https://information-portal-beryl.vercel.app';
  const generatedAt = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Generated by <${appUrl}/analytics|FLOW Analytics Portal> · ${generatedAt} PKT`,
      },
    ],
  });

  return blocks;
}

// ── Send to channel ───────────────────────────────────────────────────────────

export async function sendAnalyticsReportToChannel(
  channelId: string,
  summary: ReportSummary
): Promise<{ success: boolean; ts?: string; error?: string }> {
  const client = getSlackClient();
  if (!client) {
    return {
      success: false,
      error: 'Slack is not configured. Please set SLACK_BOT_TOKEN in environment variables.',
    };
  }

  try {
    const blocks = buildReportBlocks(summary);
    const fallbackText = `${summary.label}: ${summary.total} tickets — ${summary.solved} solved (${summary.resolutionRate}%), ${summary.breached} SLA breached`;

    const result = await client.chat.postMessage({
      channel: channelId,
      text: fallbackText,
      blocks,
    });

    console.log(`[SlackReporter] Report sent to ${channelId} (ts: ${result.ts})`);
    return { success: true, ts: result.ts as string };
  } catch (error: any) {
    console.error('[SlackReporter] Failed to send report:', error.message);
    return { success: false, error: error.message };
  }
}

// ── Build summary from raw ticket + user data ─────────────────────────────────

export function buildSummaryFromTickets(
  tickets: any[],
  users: any[],
  label: string,
  dateFrom: string,
  dateTo: string
): ReportSummary {
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === 'New' || t.status === 'Open').length;
  const pending = tickets.filter((t) => t.status === 'Pending').length;
  const solved = tickets.filter(
    (t) => t.status === 'Solved' || t.status === 'Closed'
  ).length;
  const breached = tickets.filter((t) => t.slaStatus === 'breached').length;
  const atRisk = tickets.filter((t) => t.slaStatus === 'at_risk').length;
  const resolutionRate = total > 0 ? Math.round((solved / total) * 100) : 0;

  // Department breakdown
  const deptMap = new Map<
    string,
    { total: number; open: number; pending: number; solved: number; breached: number }
  >();
  tickets.forEach((t) => {
    const dept = t.department || 'Unassigned';
    const cur = deptMap.get(dept) || {
      total: 0,
      open: 0,
      pending: 0,
      solved: 0,
      breached: 0,
    };
    cur.total++;
    if (t.status === 'New' || t.status === 'Open') cur.open++;
    else if (t.status === 'Pending') cur.pending++;
    else if (t.status === 'Solved' || t.status === 'Closed') cur.solved++;
    if (t.slaStatus === 'breached') cur.breached++;
    deptMap.set(dept, cur);
  });

  const departments: DepartmentStat[] = Array.from(deptMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);

  // Agent leaderboard
  const userMap = new Map(users.map((u: any) => [u.id, u.name || u.email]));
  const agentMap = new Map<string, { total: number; solved: number; breached: number }>();
  tickets.forEach((t) => {
    if (!t.assigneeId) return;
    const cur = agentMap.get(t.assigneeId) || { total: 0, solved: 0, breached: 0 };
    cur.total++;
    if (t.status === 'Solved' || t.status === 'Closed') cur.solved++;
    if (t.slaStatus === 'breached') cur.breached++;
    agentMap.set(t.assigneeId, cur);
  });

  const topAgents: AgentStat[] = Array.from(agentMap.entries())
    .map(([id, v]) => ({
      name: (userMap.get(id) as string) || 'Unknown',
      ...v,
      rate: v.total > 0 ? Math.round((v.solved / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    label,
    dateFrom,
    dateTo,
    total,
    open,
    pending,
    solved,
    breached,
    atRisk,
    resolutionRate,
    departments,
    topAgents,
  };
}

// ── Daily scheduled report ────────────────────────────────────────────────────

async function sendDailyReport(): Promise<void> {
  const managersChannel = process.env.SLACK_CHANNEL_MANAGERS;
  if (!managersChannel) {
    console.log('[SlackReporter] SLACK_CHANNEL_MANAGERS not set — skipping daily report');
    return;
  }

  console.log('[SlackReporter] Generating daily report...');

  try {
    const allTickets = await storage.getTickets();
    const allUsers = await storage.getUsers();

    // Active tickets: all that are currently open/pending + tickets created in last 24h
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);

    const relevant = allTickets.filter(
      (t) =>
        t.status === 'New' ||
        t.status === 'Open' ||
        t.status === 'Pending' ||
        new Date(t.createdAt) >= cutoff
    );

    const now = new Date();
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Karachi',
      });

    const summary = buildSummaryFromTickets(
      relevant,
      allUsers,
      'Daily Operations Report',
      fmt(cutoff),
      fmt(now)
    );

    const result = await sendAnalyticsReportToChannel(managersChannel, summary);
    if (result.success) {
      console.log('[SlackReporter] Daily report sent successfully');
    } else {
      console.error('[SlackReporter] Daily report failed:', result.error);
    }
  } catch (error: any) {
    console.error('[SlackReporter] Error generating daily report:', error.message);
  }
}

/**
 * Start the daily report scheduler.
 * Fires at TARGET_HOUR_UTC:TARGET_MINUTE_UTC every day (08:00 PKT = 03:00 UTC).
 * Uses a recursive setTimeout pattern so it re-syncs after each fire.
 */
export function startDailyReportScheduler(): void {
  const TARGET_HOUR_UTC = 3; // 08:00 PKT
  const TARGET_MINUTE_UTC = 0;

  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(TARGET_HOUR_UTC, TARGET_MINUTE_UTC, 0, 0);

    // If we've already passed today's target, roll to tomorrow
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }

    const msUntilNext = next.getTime() - now.getTime();
    const hoursUntil = Math.round(msUntilNext / 3600000);
    console.log(
      `[SlackReporter] Daily report scheduled in ~${hoursUntil}h (${next.toISOString()} UTC)`
    );

    setTimeout(async () => {
      await sendDailyReport();
      scheduleNext(); // Reschedule for the next day
    }, msUntilNext);
  }

  scheduleNext();
}
