/**
 * Improved BigQuery Vendor Synchronization
 *
 * This module provides a robust, accurate vendor sync from BigQuery
 * addressing the issues:
 * - Missing vendor names
 * - Inconsistent synchronization
 * - Data accuracy problems
 */

import { BigQuery } from '@google-cloud/bigquery';
import { db } from './db';
import { vendors } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

interface BigQueryVendor {
  handle: string;
  shop_name: string | null;
  email: string | null;
  phone: string | null;
  zone: string | null;
  profile_image: string | null;
  description: string | null;
  origin: string | null;
  vendor_signup_date: string | null;
  status: string | null;
  // Order metrics
  lifetime_orders: number;
  last_3_months_orders: number;
  gmv_90d: number;
  // Ratings
  average_rating: number;
  // Geo flag
  geo_flag: string | null;
}

/**
 * Get BigQuery client
 */
function getBigQueryClient(): BigQuery {
  const projectId = process.env.BIGQUERY_PROJECT_ID || 'dogwood-baton-345622';
  const credentialsJson = process.env.BIGQUERY_CREDENTIALS_JSON;

  const options: any = { projectId };

  if (credentialsJson) {
    try {
      options.credentials = JSON.parse(credentialsJson);
    } catch (err) {
      console.error('[BigQuery] Invalid credentials JSON');
    }
  }

  return new BigQuery(options);
}

/**
 * Calculate GMV tier based on 90-day GMV
 */
function calculateGMVTier(gmv90Day: number): string {
  if (gmv90Day >= 5000000) return 'Platinum';  // $5M+
  if (gmv90Day >= 2500000) return 'XL';       // $2.5M+
  if (gmv90Day >= 1000000) return 'Gold';     // $1M+
  if (gmv90Day >= 500000) return 'L';         // $500K+
  if (gmv90Day >= 250000) return 'Silver';    // $250K+
  if (gmv90Day >= 100000) return 'M';         // $100K+
  if (gmv90Day >= 50000) return 'Bronze';     // $50K+
  return 'S';                                  // <$50K
}

/**
 * Improved vendor sync using optimized BigQuery query
 *
 * Strategy:
 * 1. Start with aurora_postgres_public.vendors (most complete vendor data)
 * 2. Enrich with sign_up data (email, phone, origin)
 * 3. Add order metrics (GMV, order counts)
 * 4. Add vendor ratings
 * 5. Smart upsert to local database
 */
export async function syncVendorsFromBigQueryImproved(): Promise<{
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  totalProcessed: number;
  errorDetails: string[];
}> {
  console.log('[Vendor Sync v2] Starting improved vendor synchronization...');

  const bigquery = getBigQueryClient();
  const projectId = process.env.BIGQUERY_PROJECT_ID || 'dogwood-baton-345622';
  const location = 'us-west1'; // Correct location for the tables

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
    // Optimized query starting from vendors table (most complete)
    const query = `
      WITH vendors_base AS (
        SELECT
          handle,
          shop_name,
          email,
          phone,
          zone,
          profile_image,
          description,
          status,
          created_at
        FROM \`${projectId}.aurora_postgres_public.vendors\`
        WHERE _fivetran_deleted = FALSE
          AND handle IS NOT NULL
          AND deleted_at IS NULL
      ),

      sign_up_data AS (
        SELECT
          handle,
          MAX(email) AS signup_email,
          MAX(phone_number) AS signup_phone,
          MAX(origin) AS origin,
          MIN(DATE(timestamp)) AS vendor_signup_date
        FROM \`${projectId}.fleek_vendor_app.sign_up\`
        WHERE handle IS NOT NULL
        GROUP BY handle
      ),

      order_metrics AS (
        SELECT
          vendor AS handle,
          COUNT(DISTINCT order_number) AS lifetime_orders,
          COUNT(CASE
            WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
            THEN order_line_id
          END) AS last_3_months_orders,
          SUM(CASE
            WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
              AND ol_financial_status = 'Paid'
            THEN gmv_post_all_discounts
            ELSE 0
          END) AS gmv_90d
        FROM \`${projectId}.fleek_hub.order_line_details\`
        WHERE vendor IS NOT NULL
        GROUP BY vendor
      ),

      ratings_data AS (
        SELECT
          vendor AS handle,
          AVG(CAST(rating AS FLOAT64)) AS average_rating
        FROM \`${projectId}.fleek_customer_app.product_detail_page_viewed\`
        WHERE vendor IS NOT NULL
          AND rating IS NOT NULL
          AND CAST(rating AS FLOAT64) > 0
        GROUP BY vendor
      ),

      geo_flags AS (
        SELECT
          vendor AS handle,
          MAX(CASE
            WHEN is_zone_vendor = TRUE THEN 'Zone'
            WHEN is_zone_vendor = FALSE THEN 'Non Zone'
            ELSE NULL
          END) AS geo_flag
        FROM \`${projectId}.fleek_hub.order_line_details\`
        WHERE vendor IS NOT NULL
        GROUP BY vendor
      )

      SELECT
        v.handle,
        v.shop_name,
        COALESCE(v.email, s.signup_email) AS email,
        COALESCE(v.phone, s.signup_phone) AS phone,
        COALESCE(v.zone, g.geo_flag) AS zone,
        v.profile_image,
        v.description,
        s.origin,
        s.vendor_signup_date,
        v.status,
        COALESCE(o.lifetime_orders, 0) AS lifetime_orders,
        COALESCE(o.last_3_months_orders, 0) AS last_3_months_orders,
        COALESCE(o.gmv_90d, 0) AS gmv_90d,
        COALESCE(r.average_rating, 0) AS average_rating,
        g.geo_flag
      FROM vendors_base v
      LEFT JOIN sign_up_data s ON s.handle = v.handle
      LEFT JOIN order_metrics o ON o.handle = v.handle
      LEFT JOIN ratings_data r ON r.handle = v.handle
      LEFT JOIN geo_flags g ON g.handle = v.handle
      WHERE v.handle IS NOT NULL
      ORDER BY o.gmv_90d DESC NULLS LAST
    `;

    console.log('[Vendor Sync v2] Executing query...');
    const [rows] = await bigquery.query({ query, location });

    console.log(`[Vendor Sync v2] Retrieved ${rows.length} vendors from BigQuery`);

    // Process each vendor
    for (const row of rows as BigQueryVendor[]) {
      try {
        // Validation: require handle and name
        if (!row.handle) {
          skipped++;
          errorDetails.push(`Skipped: Missing handle`);
          continue;
        }

        // Determine vendor name (priority: shop_name)
        let vendorName = row.shop_name || row.handle;
        if (!vendorName || vendorName.trim() === '') {
          vendorName = row.handle;
        }

        // Calculate GMV tier
        const gmvTier = calculateGMVTier(row.gmv_90d || 0);

        // Check if vendor exists
        const existingVendor = await db
          .select()
          .from(vendors)
          .where(eq(vendors.handle, row.handle))
          .limit(1);

        const vendorData = {
          handle: row.handle,
          name: vendorName,
          email: row.email || null,
          phone: row.phone || null,
          zone: row.zone || null,
          profilePicture: row.profile_image || null,
          description: row.description || null,
          origin: row.origin || null,
          gmv90Day: row.gmv_90d || 0,
          gmvTier: gmvTier as any,
          averageRating: row.average_rating || 0,
          updatedAt: new Date(),
        };

        if (existingVendor.length > 0) {
          // Update existing vendor
          await db
            .update(vendors)
            .set(vendorData)
            .where(eq(vendors.handle, row.handle));
          updated++;

          if (updated % 100 === 0) {
            console.log(`[Vendor Sync v2] Progress: ${updated} updated, ${imported} imported`);
          }
        } else {
          // Insert new vendor
          await db.insert(vendors).values({
            ...vendorData,
            createdAt: new Date(),
          });
          imported++;

          if (imported % 100 === 0) {
            console.log(`[Vendor Sync v2] Progress: ${updated} updated, ${imported} imported`);
          }
        }
      } catch (error: any) {
        errors++;
        const errorMsg = `Error processing vendor ${row.handle}: ${error.message}`;
        errorDetails.push(errorMsg);
        console.error(`[Vendor Sync v2] ${errorMsg}`);

        // Continue processing other vendors
        if (errors > 50) {
          console.error('[Vendor Sync v2] Too many errors, aborting sync');
          break;
        }
      }
    }

    const totalProcessed = imported + updated + skipped;

    console.log('[Vendor Sync v2] Sync complete!');
    console.log(`  ✅ Imported: ${imported}`);
    console.log(`  🔄 Updated: ${updated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📊 Total: ${totalProcessed}`);

    return {
      success: errors < totalProcessed / 2, // Success if less than 50% errors
      imported,
      updated,
      skipped,
      errors,
      totalProcessed,
      errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
    };
  } catch (error: any) {
    console.error('[Vendor Sync v2] Fatal error:', error.message);

    return {
      success: false,
      imported,
      updated,
      skipped,
      errors: errors + 1,
      totalProcessed: imported + updated + skipped,
      errorDetails: [...errorDetails, `Fatal error: ${error.message}`],
    };
  }
}

/**
 * Quick vendor name fix - Update vendors with missing names from BigQuery
 */
export async function fixMissingVendorNames(): Promise<{
  fixed: number;
  errors: number;
}> {
  console.log('[Vendor Name Fix] Starting name fix...');

  const bigquery = getBigQueryClient();
  const projectId = process.env.BIGQUERY_PROJECT_ID || 'dogwood-baton-345622';
  const location = 'us-west1';

  let fixed = 0;
  let errors = 0;

  try {
    // Get vendors with shop_name from BigQuery
    const query = `
      SELECT
        handle,
        shop_name
      FROM \`${projectId}.aurora_postgres_public.vendors\`
      WHERE _fivetran_deleted = FALSE
        AND handle IS NOT NULL
        AND shop_name IS NOT NULL
        AND TRIM(shop_name) != ''
        AND deleted_at IS NULL
    `;

    const [rows] = await bigquery.query({ query, location });
    console.log(`[Vendor Name Fix] Found ${rows.length} vendors with shop names`);

    for (const row of rows as { handle: string; shop_name: string }[]) {
      try {
        // Check if vendor exists and name is missing/empty
        const existing = await db
          .select()
          .from(vendors)
          .where(eq(vendors.handle, row.handle))
          .limit(1);

        if (existing.length > 0 && (!existing[0].name || existing[0].name === row.handle)) {
          await db
            .update(vendors)
            .set({
              name: row.shop_name,
              updatedAt: new Date(),
            })
            .where(eq(vendors.handle, row.handle));
          fixed++;

          if (fixed % 50 === 0) {
            console.log(`[Vendor Name Fix] Fixed ${fixed} names so far...`);
          }
        }
      } catch (error: any) {
        errors++;
        console.error(`[Vendor Name Fix] Error fixing ${row.handle}:`, error.message);
      }
    }

    console.log(`[Vendor Name Fix] Complete! Fixed ${fixed} names, ${errors} errors`);

    return { fixed, errors };
  } catch (error: any) {
    console.error('[Vendor Name Fix] Fatal error:', error.message);
    return { fixed, errors: errors + 1 };
  }
}
