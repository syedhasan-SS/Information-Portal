import { BigQuery } from '@google-cloud/bigquery';

let bigQueryClient: BigQuery | null = null;

/**
 * Initialize BigQuery client with credentials
 * In production, use service account key file or ADC (Application Default Credentials)
 */
function getBigQueryClient(): BigQuery | null {
  if (bigQueryClient) {
    return bigQueryClient;
  }

  try {
    // Check if BigQuery is configured
    const projectId = process.env.BIGQUERY_PROJECT_ID;
    const credentialsPath = process.env.BIGQUERY_CREDENTIALS_PATH;
    const credentialsJson = process.env.BIGQUERY_CREDENTIALS_JSON;

    if (!projectId) {
      console.log('[BigQuery] No project ID configured, BigQuery integration disabled');
      return null;
    }

    const options: any = { projectId };

    // Support both file path and inline JSON credentials
    if (credentialsJson) {
      try {
        options.credentials = JSON.parse(credentialsJson);
      } catch (err) {
        console.error('[BigQuery] Invalid credentials JSON:', err);
        return null;
      }
    } else if (credentialsPath) {
      options.keyFilename = credentialsPath;
    }

    bigQueryClient = new BigQuery(options);
    console.log('[BigQuery] Client initialized successfully');
    return bigQueryClient;
  } catch (error) {
    console.error('[BigQuery] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Order data structure from BigQuery
 */
export interface FleetOrderData {
  orderId: string;
  orderDate?: string;
  orderStatus?: string;
  orderAmount?: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  vendorHandle?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  [key: string]: any; // Allow additional fields
}

/**
 * Fetch order details from BigQuery by Fleek Order IDs
 */
export async function getOrdersByIds(orderIds: string[]): Promise<FleetOrderData[]> {
  const client = getBigQueryClient();

  if (!client) {
    console.log('[BigQuery] Client not available, returning empty results');
    return [];
  }

  if (!orderIds || orderIds.length === 0) {
    return [];
  }

  try {
    const dataset = process.env.BIGQUERY_DATASET || 'fleek_data';
    const table = process.env.BIGQUERY_ORDERS_TABLE || 'orders';

    // Construct SQL query with parameterized order IDs
    const orderIdParams = orderIds.map((_, i) => `@orderId${i}`).join(', ');
    const query = `
      SELECT
        order_id as orderId,
        order_date as orderDate,
        order_status as orderStatus,
        order_amount as orderAmount,
        currency,
        customer_name as customerName,
        customer_email as customerEmail,
        vendor_handle as vendorHandle
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.${dataset}.${table}\`
      WHERE order_id IN (${orderIdParams})
      ORDER BY order_date DESC
    `;

    // Build query parameters
    const params: any = {};
    orderIds.forEach((id, i) => {
      params[`orderId${i}`] = id;
    });

    const options = {
      query,
      params,
      location: process.env.BIGQUERY_LOCATION || 'US',
    };

    console.log('[BigQuery] Executing query for order IDs:', orderIds);
    const [rows] = await client.query(options);

    console.log(`[BigQuery] Found ${rows.length} orders`);
    return rows as FleetOrderData[];
  } catch (error) {
    console.error('[BigQuery] Query failed:', error);
    return [];
  }
}

/**
 * Fetch order metrics/analytics from BigQuery for a vendor
 */
export async function getVendorOrderMetrics(vendorHandle: string, days: number = 90): Promise<any> {
  const client = getBigQueryClient();

  if (!client) {
    return null;
  }

  try {
    const dataset = process.env.BIGQUERY_DATASET || 'fleek_data';
    const table = process.env.BIGQUERY_ORDERS_TABLE || 'orders';

    const query = `
      SELECT
        COUNT(DISTINCT order_id) as totalOrders,
        SUM(order_amount) as totalRevenue,
        AVG(order_amount) as avgOrderValue,
        COUNT(DISTINCT customer_email) as uniqueCustomers
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.${dataset}.${table}\`
      WHERE vendor_handle = @vendorHandle
        AND order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    `;

    const options = {
      query,
      params: { vendorHandle, days },
      location: process.env.BIGQUERY_LOCATION || 'US',
    };

    const [rows] = await client.query(options);
    return rows[0] || null;
  } catch (error) {
    console.error('[BigQuery] Metrics query failed:', error);
    return null;
  }
}

/**
 * Test BigQuery connection
 */
export async function testBigQueryConnection(): Promise<boolean> {
  const client = getBigQueryClient();

  if (!client) {
    return false;
  }

  try {
    // Simple query to test connection
    const query = 'SELECT 1 as test';
    await client.query({ query, location: process.env.BIGQUERY_LOCATION || 'US' });
    console.log('[BigQuery] Connection test successful');
    return true;
  } catch (error) {
    console.error('[BigQuery] Connection test failed:', error);
    return false;
  }
}
