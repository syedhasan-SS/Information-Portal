/**
 * Slack Analytics Reporter
 * Builds and sends formatted analytics reports with embedded charts to Slack.
 * Charts are generated via QuickChart.io (no extra dependencies — URL-based Chart.js rendering).
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
    if (channelId) channels.push({ id: channelId, name });
  }

  const defaultChannel = process.env.SLACK_CHANNEL_ID;
  if (defaultChannel && defaultChannel.startsWith('C') && !channels.find(c => c.id === defaultChannel)) {
    channels.push({ id: defaultChannel, name: 'General Notifications' });
  }

  return channels;
}

// ── Report data structures ─────────────────────────────────────────────────────

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
  onTrack: number;
  resolutionRate: number;
  departments: DepartmentStat[];
  topAgents: AgentStat[];
}

// ── QuickChart.io helpers ─────────────────────────────────────────────────────

/**
 * Builds a QuickChart.io URL for a Chart.js config object.
 * Uses Chart.js v4 (via version=4 param) for modern features like indexAxis.
 */
function chartUrl(config: object, width = 700, height = 260): string {
  const encoded = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encoded}&w=${width}&h=${height}&backgroundColor=white&version=4`;
}

/** Truncates a label so bar charts don't overflow */
function short(name: string, max = 12): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

// ── Chart builders ────────────────────────────────────────────────────────────

/**
 * Horizontal stacked bar: one row per department, stacked open/pending/solved/breached.
 */
function buildDeptChartUrl(departments: DepartmentStat[]): string {
  const depts = departments.slice(0, 7);
  const anyBreached = depts.some(d => d.breached > 0);

  const config = {
    type: 'bar',
    data: {
      labels: depts.map(d => short(d.name)),
      datasets: [
        {
          label: 'Solved',
          data: depts.map(d => d.solved),
          backgroundColor: '#10b981',
          stack: 'stack',
        },
        {
          label: 'Pending',
          data: depts.map(d => d.pending),
          backgroundColor: '#f59e0b',
          stack: 'stack',
        },
        {
          label: 'Open / New',
          data: depts.map(d => d.open),
          backgroundColor: '#3b82f6',
          stack: 'stack',
        },
        ...(anyBreached
          ? [{
              label: 'SLA Breached',
              data: depts.map(d => d.breached),
              backgroundColor: '#ef4444',
              stack: 'stack',
            }]
          : []),
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: {
          stacked: true,
          ticks: { font: { size: 11 }, color: '#374151' },
          grid: { color: '#f3f4f6' },
        },
        y: {
          stacked: true,
          ticks: { font: { size: 11 }, color: '#374151' },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 12, color: '#374151' },
        },
        title: {
          display: true,
          text: '🏢 Tickets by Department',
          font: { size: 13, weight: 'bold' },
          color: '#111827',
          padding: { bottom: 12 },
        },
      },
    },
  };

  const height = Math.max(220, depts.length * 38 + 100);
  return chartUrl(config, 700, height);
}

/**
 * Doughnut chart: SLA compliance breakdown.
 */
function buildSlaChartUrl(summary: ReportSummary, slaEmoji: string, slaHealth: number): string {
  const noSla = Math.max(0, summary.total - summary.onTrack - summary.atRisk - summary.breached);

  const labels: string[] = [];
  const data: number[] = [];
  const colors: string[] = [];

  if (summary.onTrack > 0) { labels.push('On Track'); data.push(summary.onTrack); colors.push('#10b981'); }
  if (summary.atRisk > 0)  { labels.push('At Risk');  data.push(summary.atRisk);  colors.push('#f59e0b'); }
  if (summary.breached > 0) { labels.push('Breached'); data.push(summary.breached); colors.push('#ef4444'); }
  if (noSla > 0)            { labels.push('No SLA');   data.push(noSla);           colors.push('#d1d5db'); }

  const config = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff' }],
    },
    options: {
      cutout: '58%',
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 12 }, boxWidth: 14, padding: 14, color: '#374151' },
        },
        title: {
          display: true,
          text: `${slaEmoji} SLA Compliance — ${slaHealth}%`,
          font: { size: 13, weight: 'bold' },
          color: '#111827',
          padding: { bottom: 10 },
        },
        doughnutlabel: {
          labels: [
            { text: `${slaHealth}%`, font: { size: 22, weight: 'bold' }, color: '#111827' },
            { text: 'SLA health', font: { size: 11 }, color: '#6b7280' },
          ],
        },
      },
    },
  };

  return chartUrl(config, 500, 240);
}

/**
 * Grouped bar chart: resolved vs open/pending per top agent, with a breached overlay.
 */
function buildAgentChartUrl(agents: AgentStat[]): string {
  const top = agents.slice(0, 6);
  const anyBreached = top.some(a => a.breached > 0);
  // First name or first word, trimmed
  const labels = top.map(a => short(a.name.split(' ')[0], 10));

  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Solved',
          data: top.map(a => a.solved),
          backgroundColor: '#10b981',
          stack: 'stack',
          borderRadius: 3,
        },
        {
          label: 'Active',
          data: top.map(a => Math.max(0, a.total - a.solved - a.breached)),
          backgroundColor: '#93c5fd',
          stack: 'stack',
          borderRadius: 3,
        },
        ...(anyBreached
          ? [{
              label: 'Breached',
              data: top.map(a => a.breached),
              backgroundColor: '#ef4444',
              stack: 'stack',
              borderRadius: 3,
            }]
          : []),
      ],
    },
    options: {
      scales: {
        x: {
          stacked: true,
          ticks: { font: { size: 11 }, color: '#374151' },
          grid: { display: false },
        },
        y: {
          stacked: true,
          ticks: { font: { size: 11 }, color: '#374151' },
          grid: { color: '#f3f4f6' },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 12, color: '#374151' },
        },
        title: {
          display: true,
          text: '👤 Agent Performance (Top 6)',
          font: { size: 13, weight: 'bold' },
          color: '#111827',
          padding: { bottom: 12 },
        },
      },
    },
  };

  return chartUrl(config, 700, 250);
}

// ── Block builder ─────────────────────────────────────────────────────────────

function buildReportBlocks(summary: ReportSummary): any[] {
  const dateLabel = `${summary.dateFrom} → ${summary.dateTo}`;
  const slaHealth =
    summary.total > 0
      ? Math.round(((summary.total - summary.breached) / summary.total) * 100)
      : 100;
  const slaEmoji = slaHealth >= 90 ? '🟢' : slaHealth >= 70 ? '🟡' : '🔴';

  const appUrl = process.env.APP_URL || 'https://information-portal-beryl.vercel.app';
  const generatedAt = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const blocks: any[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `📊 ${summary.label}`, emoji: true },
  });
  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `*Period:* ${dateLabel}  •  Generated at ${generatedAt} PKT` },
    ],
  });
  blocks.push({ type: 'divider' });

  // ── KPI grid ──────────────────────────────────────────────────────────────
  blocks.push({
    type: 'section',
    fields: [
      { type: 'mrkdwn', text: `*📋 Total*\n\`${summary.total}\`` },
      { type: 'mrkdwn', text: `*✅ Solved*\n\`${summary.solved}\` _(${summary.resolutionRate}%)_` },
      { type: 'mrkdwn', text: `*🔵 Open / New*\n\`${summary.open}\`` },
      { type: 'mrkdwn', text: `*⏳ Pending*\n\`${summary.pending}\`` },
      { type: 'mrkdwn', text: `*🔴 SLA Breached*\n\`${summary.breached}\`` },
      {
        type: 'mrkdwn',
        text: `*${slaEmoji} SLA Health*\n\`${slaHealth}%\`${summary.atRisk > 0 ? ` _(+${summary.atRisk} at risk)_` : ''}`,
      },
    ],
  });
  blocks.push({ type: 'divider' });

  // ── Chart 1: Department stacked bar ───────────────────────────────────────
  if (summary.departments.length > 0) {
    blocks.push({
      type: 'image',
      title: { type: 'plain_text', text: 'Department Breakdown', emoji: false },
      image_url: buildDeptChartUrl(summary.departments),
      alt_text: 'Stacked bar chart: ticket status by department',
    });
    blocks.push({ type: 'divider' });
  }

  // ── Chart 2: SLA doughnut ─────────────────────────────────────────────────
  if (summary.total > 0) {
    blocks.push({
      type: 'image',
      title: { type: 'plain_text', text: 'SLA Compliance', emoji: false },
      image_url: buildSlaChartUrl(summary, slaEmoji, slaHealth),
      alt_text: 'Doughnut chart: SLA compliance breakdown',
    });
    blocks.push({ type: 'divider' });
  }

  // ── Top agents text + Chart 3: Agent performance bar ─────────────────────
  if (summary.topAgents.length > 0) {
    const medals = ['🥇', '🥈', '🥉', '4.', '5.', '6.'];
    const lines = summary.topAgents.slice(0, 5).map((a, i) => {
      const breachTag = a.breached > 0 ? ` · 🔴 ${a.breached} SLA` : '';
      return `${medals[i] ?? `${i + 1}.`} *${a.name}* — ${a.total} tickets · ${a.rate}% resolved${breachTag}`;
    });

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*🏆 Agent Leaderboard*\n${lines.join('\n')}` },
    });

    if (summary.topAgents.length > 1) {
      blocks.push({
        type: 'image',
        title: { type: 'plain_text', text: 'Agent Performance', emoji: false },
        image_url: buildAgentChartUrl(summary.topAgents),
        alt_text: 'Bar chart: tickets solved/active/breached per agent',
      });
    }

    blocks.push({ type: 'divider' });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `🔗 <${appUrl}/analytics|Open FLOW Analytics Portal>`,
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
      unfurl_links: false,
      unfurl_media: false,
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
  const solved = tickets.filter((t) => t.status === 'Solved' || t.status === 'Closed').length;
  const breached = tickets.filter((t) => t.slaStatus === 'breached').length;
  const atRisk = tickets.filter((t) => t.slaStatus === 'at_risk').length;
  const onTrack = tickets.filter((t) => t.slaStatus === 'on_track').length;
  const resolutionRate = total > 0 ? Math.round((solved / total) * 100) : 0;

  // Department breakdown
  const deptMap = new Map<
    string,
    { total: number; open: number; pending: number; solved: number; breached: number }
  >();
  tickets.forEach((t) => {
    const dept = t.department || 'Unassigned';
    const cur = deptMap.get(dept) || { total: 0, open: 0, pending: 0, solved: 0, breached: 0 };
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
    .slice(0, 6);

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
    onTrack,
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

    // Cover: all currently open/pending + tickets created in last 24h
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

// ── Scheduler ─────────────────────────────────────────────────────────────────

/**
 * Starts the daily report scheduler.
 * Fires at TARGET_HOUR_UTC:TARGET_MINUTE_UTC every day → 08:00 AM PKT (03:00 UTC).
 * Uses a recursive setTimeout so it re-syncs wall-clock time after each fire.
 */
export function startDailyReportScheduler(): void {
  const TARGET_HOUR_UTC = 3;   // 08:00 PKT
  const TARGET_MINUTE_UTC = 0;

  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(TARGET_HOUR_UTC, TARGET_MINUTE_UTC, 0, 0);

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
      scheduleNext();
    }, msUntilNext);
  }

  scheduleNext();
}
