#!/usr/bin/env tsx
/**
 * Import specific vendors immediately (for testing/debugging)
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { eq } from "drizzle-orm";

dotenv.config();

async function importSpecificVendors(handles: string[]) {
  console.log(`🚀 Importing specific vendors: ${handles.join(', ')}\n`);

  const projectId = 'dogwood-baton-345622';
  const bigquery = new BigQuery({ projectId });

  // Initialize database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    for (const handle of handles) {
      console.log(`🔄 Fetching ${handle} from BigQuery...`);

      // Use the comprehensive query for this specific vendor
      const query = `
        WITH base AS (
          SELECT
            handle,
            MIN(DATE(timestamp)) AS vendor_signup_date,
            MAX(email) AS email,
            MAX(origin) AS origin,
            MAX(phone_number) AS phone_number
          FROM fleek_vendor_app.sign_up
          WHERE handle = '${handle}'
          GROUP BY handle
        ),
        orders AS (
          SELECT
            vendor AS handle,
            COUNT(order_number) AS lifetime_orders,
            COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH) THEN order_line_id END) AS last_3_months_orders
          FROM \`${projectId}.fleek_hub.order_line_details\`
          WHERE vendor = '${handle}'
          GROUP BY vendor
        ),
        geo_flag AS (
          SELECT
            vendor AS handle,
            MAX(CASE
              WHEN is_zone_vendor = TRUE THEN 'Zone'
              WHEN is_zone_vendor = FALSE THEN 'Non Zone'
            END) AS geo
          FROM \`${projectId}.fleek_hub.order_line_details\`
          WHERE vendor = '${handle}'
          GROUP BY vendor
        ),
        ratings AS (
          SELECT
            t0.vendor,
            AVG(t0.rating) AS average_rating
          FROM \`${projectId}.fleek_customer_app.product_detail_page_viewed\` AS t0
          WHERE t0.vendor = '${handle}'
          GROUP BY t0.vendor
        )
        SELECT
          base.*,
          COALESCE(orders.lifetime_orders, 0) AS lifetime_orders,
          COALESCE(orders.last_3_months_orders, 0) AS last_3_months_orders,
          v.shop_name,
          COALESCE(geo_flag.geo, 'Non Zone') AS geo,
          COALESCE(ratings.average_rating, 0) AS average_rating
        FROM base
        LEFT JOIN orders ON orders.handle = base.handle
        LEFT JOIN \`${projectId}.aurora_postgres_public.vendors\` AS v ON v.handle = base.handle
        LEFT JOIN geo_flag ON geo_flag.handle = base.handle
        LEFT JOIN ratings ON ratings.vendor = base.handle
      `;

      const [rows] = await bigquery.query({
        query,
        location: 'us-west1',
      });

      if (rows.length === 0) {
        console.log(`❌ ${handle} not found in BigQuery\n`);
        continue;
      }

      const row: any = rows[0];

      // Check if vendor exists
      const existing = await db.select()
        .from(vendors)
        .where(eq(vendors.handle, row.handle))
        .limit(1);

      // Calculate GMV tier
      let gmvTier: any = null;
      if (row.lifetime_orders > 1000) gmvTier = 'Platinum';
      else if (row.lifetime_orders > 500) gmvTier = 'Gold';
      else if (row.lifetime_orders > 100) gmvTier = 'Silver';
      else if (row.lifetime_orders > 0) gmvTier = 'Bronze';

      const vendorData = {
        handle: row.handle,
        name: row.shop_name || row.handle,
        email: row.email || null,
        phone: row.phone_number || null,
        country: row.origin || null,
        geo: row.geo || 'Non Zone',
        gmvTier: gmvTier,
        gmv90Day: row.last_3_months_orders || null,
        zone: row.geo || null,
        region: row.origin || null,
        kam: null,
        persona: row.average_rating > 4 ? 'Top Rated' : row.lifetime_orders > 100 ? 'Active' : 'New',
      };

      if (existing.length > 0) {
        await db.update(vendors)
          .set({ ...vendorData, updatedAt: new Date() })
          .where(eq(vendors.handle, row.handle));
        console.log(`✅ Updated: ${row.handle} → ${vendorData.name}\n`);
      } else {
        await db.insert(vendors).values(vendorData);
        console.log(`✅ Imported: ${row.handle} → ${vendorData.name}\n`);
      }
    }

    await pool.end();
    console.log('🎉 Specific vendor import complete!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// Import the vendors you're looking for
const targetVendors = [
  'creed-vintage',
  'diamond-vintage',
  'diamond-vintage-1',
  'creed-women',
  'diamond-vintage-wholeseller',
  'diamond-vintage-clothing'
];

importSpecificVendors(targetVendors);
