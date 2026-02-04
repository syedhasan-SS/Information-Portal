import { BigQuery } from '@google-cloud/bigquery';
import { db } from './db';
import { vendors, tickets, categories } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { triggerN8nWorkflow } from './n8n-integration';

/**
 * BigQuery Automation Module
 * Automated data synchronization and ticket creation from BigQuery
 */

interface BigQueryVendorData {
  handle: string;
  name: string;
  email?: string;
  phone?: string;
  gmv_tier?: string;
  gmv_90_day?: number;
  kam?: string;
  zone?: string;
  region?: string;
  country?: string;
  geo?: string;
  persona?: string;
}

interface BigQueryTicketData {
  vendor_handle: string;
  order_id: string;
  issue_type?: string;
  complaint_reason?: string;
  description?: string;
  created_at?: string;
  priority?: string;
}

/**
 * Get BigQuery client
 */
function getBigQueryClient(): BigQuery | null {
  const projectId = process.env.BIGQUERY_PROJECT_ID;
  const credentialsPath = process.env.BIGQUERY_CREDENTIALS_PATH;
  const credentialsJson = process.env.BIGQUERY_CREDENTIALS_JSON;

  if (!projectId) {
    console.log('[BigQuery Automation] No project ID configured');
    return null;
  }

  try {
    const options: any = { projectId };

    if (credentialsJson) {
      options.credentials = JSON.parse(credentialsJson);
    } else if (credentialsPath) {
      options.keyFilename = credentialsPath;
    }

    return new BigQuery(options);
  } catch (error) {
    console.error('[BigQuery Automation] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Sync vendors from BigQuery to database
 * Returns: { imported: number, updated: number, errors: number }
 */
export async function syncVendorsFromBigQuery(): Promise<{
  imported: number;
  updated: number;
  errors: number;
}> {
  console.log('[BigQuery Automation] Starting vendor sync...');

  const client = getBigQueryClient();
  if (!client) {
    throw new Error('BigQuery client not configured');
  }

  const projectId = process.env.BIGQUERY_PROJECT_ID;
  let imported = 0;
  let updated = 0;
  let errors = 0;

  try {
    const query = `
      SELECT
        handle,
        name,
        email,
        phone,
        gmv_tier,
        gmv_90_day,
        kam,
        zone,
        region,
        country,
        geo,
        persona
      FROM \`${projectId}.aurora_postgres_public.vendors\`
      WHERE handle IS NOT NULL
      ORDER BY handle
    `;

    const [rows] = await client.query({
      query,
      location: process.env.BIGQUERY_LOCATION || 'US',
    });

    console.log(`[BigQuery Automation] Found ${rows.length} vendors in BigQuery`);

    for (const row of rows as BigQueryVendorData[]) {
      try {
        const existing = await db.select()
          .from(vendors)
          .where(eq(vendors.handle, row.handle))
          .limit(1);

        const vendorData = {
          handle: row.handle,
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          gmvTier: row.gmv_tier as any || null,
          gmv90Day: row.gmv_90_day || null,
          kam: row.kam || null,
          zone: row.zone || null,
          region: row.region || null,
          country: row.country || null,
          geo: row.geo || null,
          persona: row.persona || null,
        };

        if (existing.length > 0) {
          await db.update(vendors)
            .set({
              ...vendorData,
              updatedAt: new Date(),
            })
            .where(eq(vendors.handle, row.handle));
          updated++;
        } else {
          await db.insert(vendors).values(vendorData);
          imported++;
        }
      } catch (error: any) {
        console.error(`[BigQuery Automation] Error processing vendor ${row.handle}:`, error.message);
        errors++;
      }
    }

    console.log(`[BigQuery Automation] Vendor sync complete: ${imported} imported, ${updated} updated, ${errors} errors`);

    // Trigger n8n workflow with results
    await triggerN8nWorkflow('vendor.sync.complete', {
      imported,
      updated,
      errors,
      totalProcessed: rows.length,
    });

    return { imported, updated, errors };
  } catch (error: any) {
    console.error('[BigQuery Automation] Vendor sync failed:', error.message);
    throw error;
  }
}

/**
 * Auto-create tickets from BigQuery complaint/issue data
 * This would query a BigQuery table that tracks complaints/issues
 */
export async function autoCreateTicketsFromBigQuery(
  tableName: string = 'complaints'
): Promise<number> {
  console.log('[BigQuery Automation] Checking for new tickets in BigQuery...');

  const client = getBigQueryClient();
  if (!client) {
    console.log('[BigQuery Automation] BigQuery client not configured');
    return 0;
  }

  const projectId = process.env.BIGQUERY_PROJECT_ID;
  let createdCount = 0;

  try {
    // Query for unprocessed complaints/issues
    const query = `
      SELECT
        vendor_handle,
        order_id,
        issue_type,
        complaint_reason,
        description,
        created_at,
        priority
      FROM \`${projectId}.aurora_postgres_public.${tableName}\`
      WHERE processed = FALSE
        AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const [rows] = await client.query({
      query,
      location: process.env.BIGQUERY_LOCATION || 'US',
    });

    console.log(`[BigQuery Automation] Found ${rows.length} unprocessed issues`);

    for (const row of rows as BigQueryTicketData[]) {
      try {
        // Create ticket in the system
        // This is a placeholder - you'd need to implement the full ticket creation logic
        console.log(`[BigQuery Automation] Would create ticket for vendor: ${row.vendor_handle}, order: ${row.order_id}`);

        // Trigger n8n workflow for each ticket
        await triggerN8nWorkflow('ticket.auto_created', {
          vendorHandle: row.vendor_handle,
          orderId: row.order_id,
          issueType: row.issue_type,
          description: row.description,
        });

        createdCount++;
      } catch (error: any) {
        console.error(`[BigQuery Automation] Error creating ticket:`, error.message);
      }
    }

    console.log(`[BigQuery Automation] Auto-created ${createdCount} tickets`);
    return createdCount;
  } catch (error: any) {
    console.error('[BigQuery Automation] Auto-create tickets failed:', error.message);
    return 0;
  }
}

/**
 * Sync vendor metrics from BigQuery
 * Updates vendor GMV, order counts, etc.
 */
export async function syncVendorMetricsFromBigQuery(): Promise<number> {
  console.log('[BigQuery Automation] Syncing vendor metrics...');

  const client = getBigQueryClient();
  if (!client) {
    return 0;
  }

  const projectId = process.env.BIGQUERY_PROJECT_ID;
  const dataset = process.env.BIGQUERY_DATASET || 'fleek_hub';
  const table = process.env.BIGQUERY_ORDERS_TABLE || 'order_line_details';
  let updatedCount = 0;

  try {
    // Get vendor metrics from BigQuery
    const query = `
      SELECT
        vendor as handle,
        COUNT(DISTINCT fleek_id) as order_count_90d,
        SUM(CAST(gmv AS FLOAT64)) as gmv_90d
      FROM \`${projectId}.${dataset}.${table}\`
      WHERE vendor IS NOT NULL
        AND order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
      GROUP BY vendor
    `;

    const [rows] = await client.query({
      query,
      location: process.env.BIGQUERY_LOCATION || 'US',
    });

    console.log(`[BigQuery Automation] Got metrics for ${rows.length} vendors`);

    for (const row of rows as any[]) {
      try {
        await db.update(vendors)
          .set({
            gmv90Day: row.gmv_90d,
            updatedAt: new Date(),
          })
          .where(eq(vendors.handle, row.handle));
        updatedCount++;
      } catch (error: any) {
        console.error(`[BigQuery Automation] Error updating metrics for ${row.handle}:`, error.message);
      }
    }

    console.log(`[BigQuery Automation] Updated metrics for ${updatedCount} vendors`);

    // Trigger n8n workflow
    await triggerN8nWorkflow('vendor.metrics.synced', {
      vendorsUpdated: updatedCount,
    });

    return updatedCount;
  } catch (error: any) {
    console.error('[BigQuery Automation] Metrics sync failed:', error.message);
    return 0;
  }
}

/**
 * Schedule all BigQuery automations
 * Call this periodically (e.g., via cron job or n8n scheduler)
 */
export async function runScheduledBigQuerySync(): Promise<void> {
  console.log('[BigQuery Automation] Running scheduled sync...');

  try {
    // 1. Sync vendors
    const vendorResults = await syncVendorsFromBigQuery();

    // 2. Sync vendor metrics
    const metricsUpdated = await syncVendorMetricsFromBigQuery();

    // 3. Auto-create tickets (if enabled)
    // const ticketsCreated = await autoCreateTicketsFromBigQuery();

    console.log('[BigQuery Automation] Scheduled sync complete');

    // Send summary to n8n
    await triggerN8nWorkflow('bigquery.sync.complete', {
      vendorResults,
      metricsUpdated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[BigQuery Automation] Scheduled sync failed:', error.message);

    // Alert via n8n
    await triggerN8nWorkflow('bigquery.sync.failed', {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
