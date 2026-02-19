/**
 * Slack Channel Routing Logic
 * Determines which Slack channels to notify based on ticket properties
 */

interface TicketNotificationContext {
  department: string;
  priorityTier?: string;
  status?: string;
  isEscalated?: boolean;
  slaStatus?: string;
  ownerTeam?: string; // For CX subdepartments
}

/**
 * Get list of channels to notify for a ticket
 * Returns array of channel IDs to send notifications to
 */
export function getNotificationChannels(context: TicketNotificationContext): string[] {
  const channels: string[] = [];

  // 1. Primary department channel
  const deptChannel = getDepartmentChannel(context.department, context.ownerTeam);
  if (deptChannel) {
    channels.push(deptChannel);
  }

  // 2. Urgent/Critical priority → Additional urgent channel
  if (context.priorityTier === 'urgent' || context.priorityTier === 'critical') {
    const urgentChannel = process.env.SLACK_CHANNEL_URGENT;
    if (urgentChannel && !channels.includes(urgentChannel)) {
      channels.push(urgentChannel);
    }
  }

  // 3. Escalated tickets → Escalation channel
  if (context.isEscalated || context.status === 'Escalated') {
    const escalationChannel = process.env.SLACK_CHANNEL_ESCALATION;
    if (escalationChannel && !channels.includes(escalationChannel)) {
      channels.push(escalationChannel);
    }
  }

  // 4. SLA breach → SLA breach channel
  if (context.slaStatus === 'breached') {
    const slaChannel = process.env.SLACK_CHANNEL_SLA_BREACH;
    if (slaChannel && !channels.includes(slaChannel)) {
      channels.push(slaChannel);
    }
  }

  // Fallback: If no channels found, use main channel
  if (channels.length === 0) {
    const fallback = process.env.SLACK_CHANNEL_ID;
    if (fallback) {
      channels.push(fallback);
    }
  }

  return channels;
}

/**
 * Get department-specific channel
 * Supports subdepartments (e.g., CX > Customer Support)
 */
function getDepartmentChannel(department: string, ownerTeam?: string): string | undefined {
  // Special handling for CX subdepartments
  if (department === 'CX' && ownerTeam) {
    const subDeptKey = `SLACK_CHANNEL_CX_${ownerTeam.toUpperCase().replace(/\s+/g, '_')}`;
    const subDeptChannel = process.env[subDeptKey];
    if (subDeptChannel) {
      console.log(`[Slack Routing] Using CX subdepartment channel: ${subDeptKey}`);
      return subDeptChannel;
    }
  }

  // Standard department channel
  const deptKey = `SLACK_CHANNEL_${department.toUpperCase()}`;
  const deptChannel = process.env[deptKey];
  if (deptChannel) {
    console.log(`[Slack Routing] Using department channel: ${deptKey}`);
    return deptChannel;
  }

  console.log(`[Slack Routing] No specific channel for department: ${department}`);
  return undefined;
}

/**
 * Get human-readable channel name for logging
 */
export function getChannelName(channelId: string): string {
  // Reverse lookup from env vars
  const envVar = Object.entries(process.env).find(([key, value]) =>
    key.startsWith('SLACK_CHANNEL_') && value === channelId
  );

  if (envVar) {
    const name = envVar[0]
      .replace('SLACK_CHANNEL_', '')
      .toLowerCase()
      .replace(/_/g, '-');
    return `#${name}`;
  }

  return channelId;
}

/**
 * Log routing decision for debugging
 */
export function logRoutingDecision(context: TicketNotificationContext, channels: string[]): void {
  console.log('[Slack Routing] Decision:', {
    department: context.department,
    ownerTeam: context.ownerTeam,
    priorityTier: context.priorityTier,
    status: context.status,
    slaStatus: context.slaStatus,
    channels: channels.map(c => getChannelName(c)),
    channelCount: channels.length,
  });
}
