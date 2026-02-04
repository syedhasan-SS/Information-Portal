#!/usr/bin/env tsx
/**
 * Comprehensive vendor import using the complete BigQuery query
 * This syncs all vendor data including signup info, order stats, ratings, and geo flags
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vendors } from "./shared/schema";
import { eq } from "drizzle-orm";

dotenv.config();

interface ComprehensiveVendor {
  handle: string;
  vendor_signup_date: { value: string };
  email: string | null;
  origin: string | null;
  phone_number: string | null;
  lifetime_orders: number;
  last_3_months_orders: number;
  in_process_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  shop_name: string | null;
  geo: string | null;
  average_rating: number;
  is_duplicate: number;
  duplicate_check: string | null;
  store_number: number;
  duplicate_count: number;
}

async function importVendorsComprehensive() {
  console.log('🚀 Starting comprehensive vendor import from BigQuery...\n');

  const projectId = 'dogwood-baton-345622';
  const bigquery = new BigQuery({ projectId });

  console.log('🔄 Connecting to BigQuery...');

  // Initialize database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    console.log('🔄 Fetching comprehensive vendor data from BigQuery...');
    console.log('   This includes: signup data, order stats, ratings, geo flags\n');

    // Your comprehensive query
    const query = `
      WITH base AS (
        SELECT
          handle,
          MIN(DATE(timestamp)) AS vendor_signup_date,
          MAX(email) AS email,
          MAX(origin) AS origin,
          MAX(phone_number) AS phone_number
        FROM fleek_vendor_app.sign_up
        GROUP BY handle
      ),

      orders AS (
        SELECT
          vendor AS handle,
          COUNT(order_number) AS lifetime_orders,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH) THEN order_line_id END) AS last_3_months_orders,
          COUNT(CASE
            WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH) AND latest_status IN (
              'CREATED', 'ACCEPTED', 'PICKUP_READY', 'PICKUP_SUCCESSFUL',
              'QC_PENDING', 'QC_HOLD', 'QC_APPROVED',
              'QC_VENDOR_ACTION_REQUIRED', 'HANDED_OVER_TO_LOGISTICS_PARTNER',
              'FREIGHT', 'COURIER', 'FREGHT_CUSTOMS'
            )
          THEN order_line_id END) AS in_process_orders,
          COUNT(CASE
            WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH) AND latest_status = 'DELIVERED'
          THEN order_line_id END) AS delivered_orders,
          COUNT(CASE
            WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH) AND latest_status = 'CANCELLED'
          THEN order_line_id END) AS cancelled_orders
        FROM \`${projectId}.fleek_hub.order_line_details\`
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
        GROUP BY vendor
      ),

      ratings AS (
        SELECT
          t0.vendor,
          AVG(t0.rating) AS average_rating
        FROM \`${projectId}.fleek_customer_app.product_detail_page_viewed\` AS t0
        GROUP BY t0.vendor
      ),

      combined AS (
        SELECT
          base.*,
          COALESCE(orders.lifetime_orders, 0) AS lifetime_orders,
          COALESCE(orders.last_3_months_orders, 0) AS last_3_months_orders,
          COALESCE(orders.in_process_orders, 0) AS in_process_orders,
          COALESCE(orders.delivered_orders, 0) AS delivered_orders,
          COALESCE(orders.cancelled_orders, 0) AS cancelled_orders,
          vendors.shop_name,
          COALESCE(geo_flag.geo, 'Non Zone') AS geo,
          COALESCE(ratings.average_rating, 0) AS average_rating
        FROM base
        LEFT JOIN orders
          ON orders.handle = base.handle
        LEFT JOIN \`${projectId}.aurora_postgres_public.vendors\` AS vendors
          ON vendors.handle = base.handle
        LEFT JOIN geo_flag
          ON geo_flag.handle = base.handle
        LEFT JOIN ratings
          ON ratings.vendor = base.handle
      ),

      duplicates AS (
        SELECT
          *,
          CASE
            WHEN COUNT(email) OVER (PARTITION BY email) > 1 AND COUNT(phone_number) OVER (PARTITION BY phone_number) > 1 THEN 1
            WHEN COUNT(email) OVER (PARTITION BY email) > 1 THEN 1
            WHEN COUNT(phone_number) OVER (PARTITION BY phone_number) > 1 THEN 1
            ELSE 0
          END AS is_duplicate,
          CASE
            WHEN COUNT(email) OVER (PARTITION BY email) > 1 AND COUNT(phone_number) OVER (PARTITION BY phone_number) > 1 THEN 'email+phone'
            WHEN COUNT(email) OVER (PARTITION BY email) > 1 THEN 'email'
            WHEN COUNT(phone_number) OVER (PARTITION BY phone_number) > 1 THEN 'phone'
            ELSE NULL
          END AS duplicate_check,
          ROW_NUMBER() OVER (PARTITION BY COALESCE(email, phone_number) ORDER BY vendor_signup_date ASC) AS store_number,
          GREATEST(COUNT(email) OVER (PARTITION BY email), COUNT(phone_number) OVER (PARTITION BY phone_number)) AS duplicate_count
        FROM combined
      )

      SELECT *
      FROM duplicates
      WHERE email IS NOT NULL OR phone_number IS NOT NULL
      ORDER BY vendor_signup_date DESC
    `;

    // Try different locations
    let rows: ComprehensiveVendor[] = [];
    const locations = ['us-west1', 'US', 'us-central1', 'us-east1'];

    for (const location of locations) {
      try {
        console.log(`🔄 Trying location: ${location}...`);
        const [result] = await bigquery.query({ query, location });
        rows = result as ComprehensiveVendor[];
        console.log(`✅ Successfully queried from location: ${location}\n`);
        break;
      } catch (error: any) {
        if (error.message.includes('was not found in location')) {
          continue;
        }
        console.error(`❌ Error in location ${location}:`, error.message);
        throw error;
      }
    }

    if (rows.length === 0) {
      console.log('⚠️  No vendors found');
      await pool.end();
      return;
    }

    console.log(`✅ Found ${rows.length} vendors with comprehensive data\n`);

    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    console.log('🔄 Importing vendors...\n');

    for (const row of rows) {
      try {
        // Track duplicates
        if (row.is_duplicate === 1) {
          duplicateCount++;
        }

        // Check if vendor exists
        const existing = await db.select()
          .from(vendors)
          .where(eq(vendors.handle, row.handle))
          .limit(1);

        // Calculate GMV tier based on order volume
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
          kam: null, // Can be assigned later
          persona: row.average_rating > 4 ? 'Top Rated' : row.lifetime_orders > 100 ? 'Active' : 'New',
        };

        if (existing.length > 0) {
          await db.update(vendors)
            .set({ ...vendorData, updatedAt: new Date() })
            .where(eq(vendors.handle, row.handle));
          updatedCount++;
          console.log(`✅ Updated: ${row.handle} (${vendorData.name}) - ${row.lifetime_orders} orders, ${row.average_rating.toFixed(1)}⭐`);
        } else {
          await db.insert(vendors).values(vendorData);
          importedCount++;
          console.log(`✅ Imported: ${row.handle} (${vendorData.name}) - ${row.lifetime_orders} orders, ${row.average_rating.toFixed(1)}⭐`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error processing ${row.handle}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 Comprehensive Import Summary:');
    console.log('='.repeat(70));
    console.log(`✅ New vendors imported: ${importedCount}`);
    console.log(`🔄 Existing vendors updated: ${updatedCount}`);
    console.log(`⚠️  Duplicate vendors detected: ${duplicateCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Total processed: ${rows.length}`);
    console.log('='.repeat(70) + '\n');

    console.log('📊 Data Enrichment Summary:');
    console.log('   ✅ Signup dates from fleek_vendor_app.sign_up');
    console.log('   ✅ Order statistics from fleek_hub.order_line_details');
    console.log('   ✅ Geo flags (Zone/Non Zone) from order data');
    console.log('   ✅ Average ratings from fleek_customer_app.product_detail_page_viewed');
    console.log('   ✅ Shop names from aurora_postgres_public.vendors');
    console.log('   ✅ GMV tiers calculated from order volume');
    console.log('   ✅ Persona assigned based on ratings and activity\n');

    console.log('🎉 Comprehensive vendor import completed successfully!\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Tip: Make sure BigQuery is properly configured via MCP\n');
    }
    process.exit(1);
  } finally {
    await pool.end();
    console.log('✅ Database connection closed');
  }
}

importVendorsComprehensive();
