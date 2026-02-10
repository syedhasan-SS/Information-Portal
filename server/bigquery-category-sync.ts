/**
 * BigQuery Category Sync
 * Syncs categories from zendesk_new.ticket custom fields to categoryHierarchy table
 */

import { BigQuery } from '@google-cloud/bigquery';
import { db } from './db';
import { categoryHierarchy } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface CategoryRow {
  l1: string | null;
  l2: string | null;
  l3: string | null;
  ticket_count: number;
}

interface SyncResult {
  success: boolean;
  categoriesProcessed: number;
  categoriesCreated: number;
  categoriesSkipped: number;
  errors: string[];
  details: {
    level1Count: number;
    level2Count: number;
    level3Count: number;
  };
}

// Initialize BigQuery client
function getBigQueryClient() {
  const projectId = 'dogwood-baton-345622';

  // Check if credentials are available
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    return new BigQuery({ projectId, credentials });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new BigQuery({ projectId });
  } else {
    throw new Error('BigQuery credentials not configured');
  }
}

/**
 * Normalize category name for display
 */
function normalizeCategory(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\s-\s/g, ' - ')
    .replace(/Pq\s/g, 'PQ ');
}

/**
 * Generate unique ID for category
 */
function generateCategoryId(level: string, name: string, parentId?: string): string {
  const base = parentId ? `${parentId}_${name}` : name;
  return `${level}_${base.toLowerCase().replace(/\s/g, '_')}`;
}

/**
 * Determine department type based on category name
 */
function getDepartmentType(l1: string): 'All' | 'Seller Support' | 'Customer Support' {
  const sellerKeywords = ['seller', 'vendor', 'payout', 'listing'];
  const customerKeywords = ['buyer', 'customer', 'order', 'tracking', 'refund'];

  const normalized = l1.toLowerCase();

  if (sellerKeywords.some(kw => normalized.includes(kw))) {
    return 'Seller Support';
  } else if (customerKeywords.some(kw => normalized.includes(kw))) {
    return 'Customer Support';
  }

  return 'All';
}

/**
 * Sync categories from BigQuery to categoryHierarchy table
 */
export async function syncCategoriesFromBigQuery(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    categoriesProcessed: 0,
    categoriesCreated: 0,
    categoriesSkipped: 0,
    errors: [],
    details: {
      level1Count: 0,
      level2Count: 0,
      level3Count: 0,
    }
  };

  try {
    console.log('🔄 Starting BigQuery category sync...');

    // Initialize BigQuery client
    const bigquery = getBigQueryClient();

    // Query to get all distinct category combinations
    const query = `
      SELECT
        custom_issue_type as l1,
        custom_issue_type_level_2 as l2,
        custom_issue_type_level_3 as l3,
        COUNT(*) as ticket_count
      FROM \`dogwood-baton-345622.zendesk_new.ticket\`
      WHERE custom_issue_type IS NOT NULL
      GROUP BY l1, l2, l3
      ORDER BY ticket_count DESC
    `;

    console.log('📊 Querying BigQuery for category data...');
    const [rows] = await bigquery.query({ query, location: 'us-west1' });
    const categoryRows = rows as CategoryRow[];

    console.log(`✅ Retrieved ${categoryRows.length} category combinations`);

    // Track created categories to avoid duplicates
    const createdL1 = new Set<string>();
    const createdL2 = new Set<string>();
    const createdL3 = new Set<string>();

    // Process each category combination
    for (const row of categoryRows) {
      if (!row.l1) continue;

      result.categoriesProcessed++;

      try {
        // Level 1 (Root category)
        const l1Name = normalizeCategory(row.l1);
        const l1Id = generateCategoryId('l1', row.l1);

        if (!createdL1.has(l1Id)) {
          const existingL1 = await db.query.categoryHierarchy.findFirst({
            where: eq(categoryHierarchy.id, l1Id)
          });

          if (!existingL1) {
            await db.insert(categoryHierarchy).values({
              id: l1Id,
              name: l1Name,
              level: 1,
              parentId: null,
              isActive: true,
              departmentType: getDepartmentType(row.l1),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            result.categoriesCreated++;
            result.details.level1Count++;
          } else {
            result.categoriesSkipped++;
          }
          createdL1.add(l1Id);
        }

        // Level 2 (if exists)
        if (row.l2 && row.l2 !== 'null') {
          const l2Name = normalizeCategory(row.l2);
          const l2Id = generateCategoryId('l2', row.l2, l1Id);

          if (!createdL2.has(l2Id)) {
            const existingL2 = await db.query.categoryHierarchy.findFirst({
              where: eq(categoryHierarchy.id, l2Id)
            });

            if (!existingL2) {
              await db.insert(categoryHierarchy).values({
                id: l2Id,
                name: l2Name,
                level: 2,
                parentId: l1Id,
                isActive: true,
                departmentType: getDepartmentType(row.l1),
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              result.categoriesCreated++;
              result.details.level2Count++;
            } else {
              result.categoriesSkipped++;
            }
            createdL2.add(l2Id);
          }

          // Level 3 (if exists)
          if (row.l3 && row.l3 !== 'null') {
            const l3Name = normalizeCategory(row.l3);
            const l3Id = generateCategoryId('l3', row.l3, l2Id);

            if (!createdL3.has(l3Id)) {
              const existingL3 = await db.query.categoryHierarchy.findFirst({
                where: eq(categoryHierarchy.id, l3Id)
              });

              if (!existingL3) {
                await db.insert(categoryHierarchy).values({
                  id: l3Id,
                  name: l3Name,
                  level: 3,
                  parentId: l2Id,
                  isActive: true,
                  departmentType: getDepartmentType(row.l1),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                result.categoriesCreated++;
                result.details.level3Count++;
              } else {
                result.categoriesSkipped++;
              }
              createdL3.add(l3Id);
            }
          }
        }
      } catch (error: any) {
        result.errors.push(`Error processing category ${row.l1} > ${row.l2} > ${row.l3}: ${error.message}`);
        console.error(`❌ Error processing category:`, error);
      }
    }

    result.success = result.errors.length === 0;

    console.log('✅ Category sync complete!');
    console.log(`📊 Processed: ${result.categoriesProcessed}`);
    console.log(`➕ Created: ${result.categoriesCreated}`);
    console.log(`⏭️  Skipped: ${result.categoriesSkipped}`);
    console.log(`📁 L1: ${result.details.level1Count}, L2: ${result.details.level2Count}, L3: ${result.details.level3Count}`);

    return result;

  } catch (error: any) {
    console.error('❌ BigQuery sync failed:', error);
    result.errors.push(error.message);
    return result;
  }
}
