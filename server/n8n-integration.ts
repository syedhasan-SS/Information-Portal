import axios from 'axios';

/**
 * n8n Integration Module
 * Handles all interactions with n8n workflows for automation
 */

interface N8nWebhookPayload {
  event: string;
  data: any;
  timestamp: string;
}

/**
 * Get n8n configuration from environment
 */
function getN8nConfig() {
  return {
    apiKey: process.env.N8N_API_KEY || process.env.n8n_api_key,
    baseUrl: process.env.N8N_BASE_URL || process.env.n8n_base_url,
    webhookUrl: process.env.N8N_WEBHOOK_URL || process.env.n8n_webhook_url,
  };
}

/**
 * Check if n8n is configured
 */
export function isN8nConfigured(): boolean {
  const config = getN8nConfig();
  return !!(config.apiKey || config.webhookUrl);
}

/**
 * Send event to n8n webhook
 */
export async function triggerN8nWorkflow(
  event: string,
  data: any,
  webhookUrl?: string
): Promise<boolean> {
  const config = getN8nConfig();
  const url = webhookUrl || config.webhookUrl;

  if (!url) {
    console.log('[n8n] No webhook URL configured, skipping workflow trigger');
    return false;
  }

  try {
    const payload: N8nWebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const headers: any = {
      'Content-Type': 'application/json',
    };

    // Add API key if configured
    if (config.apiKey) {
      headers['X-N8N-API-KEY'] = config.apiKey;
    }

    console.log(`[n8n] Triggering workflow: ${event}`);
    const response = await axios.post(url, payload, {
      headers,
      timeout: 10000, // 10 second timeout
    });

    console.log(`[n8n] Workflow triggered successfully: ${response.status}`);
    return true;
  } catch (error: any) {
    console.error(`[n8n] Failed to trigger workflow:`, error.message);
    return false;
  }
}

/**
 * Trigger ticket creation workflow
 */
export async function triggerTicketCreated(ticketData: any): Promise<boolean> {
  return triggerN8nWorkflow('ticket.created', ticketData);
}

/**
 * Trigger ticket updated workflow
 */
export async function triggerTicketUpdated(ticketData: any): Promise<boolean> {
  return triggerN8nWorkflow('ticket.updated', ticketData);
}

/**
 * Trigger ticket assigned workflow
 */
export async function triggerTicketAssigned(ticketData: any): Promise<boolean> {
  return triggerN8nWorkflow('ticket.assigned', ticketData);
}

/**
 * Trigger ticket resolved workflow
 */
export async function triggerTicketResolved(ticketData: any): Promise<boolean> {
  return triggerN8nWorkflow('ticket.resolved', ticketData);
}

/**
 * Trigger vendor sync workflow
 */
export async function triggerVendorSync(vendorData: any): Promise<boolean> {
  return triggerN8nWorkflow('vendor.sync', vendorData);
}

/**
 * Trigger BigQuery data import workflow
 */
export async function triggerBigQueryImport(importType: string, params?: any): Promise<boolean> {
  return triggerN8nWorkflow('bigquery.import', {
    importType,
    params,
  });
}

/**
 * Send notification via n8n
 */
export async function sendN8nNotification(
  type: 'email' | 'slack' | 'sms',
  recipient: string,
  message: string,
  metadata?: any
): Promise<boolean> {
  return triggerN8nWorkflow('notification.send', {
    type,
    recipient,
    message,
    metadata,
  });
}

/**
 * Trigger scheduled automation
 */
export async function triggerScheduledAutomation(
  automationType: string,
  config: any
): Promise<boolean> {
  return triggerN8nWorkflow('automation.scheduled', {
    automationType,
    config,
  });
}
