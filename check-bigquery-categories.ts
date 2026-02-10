/**
 * Check what category-related tables/data exist in BigQuery
 */

import { BigQuery } from '@google-cloud/bigquery';

const projectId = 'dogwood-baton-345622';
const bigquery = new BigQuery({ projectId });

async function checkCategoryTables() {
  console.log('🔍 Searching for category-related data in BigQuery...\n');

  try {
    // Search for tables with "category" in the name
    const [datasets] = await bigquery.getDatasets();
    
    for (const dataset of datasets) {
      const [tables] = await dataset.getTables();
      const categoryTables = tables.filter(t => 
        t.id?.toLowerCase().includes('category') || 
        t.id?.toLowerCase().includes('ticket') ||
        t.id?.toLowerCase().includes('zendesk')
      );
      
      if (categoryTables.length > 0) {
        console.log(`📁 Dataset: ${dataset.id}`);
        for (const table of categoryTables) {
          console.log(`  ├─ Table: ${table.id}`);
          
          // Get schema
          const [metadata] = await table.getMetadata();
          const schema = metadata.schema?.fields || [];
          console.log(`  │  Columns: ${schema.map((f: any) => f.name).join(', ')}`);
          
          // Get row count
          const query = `SELECT COUNT(*) as count FROM \`${projectId}.${dataset.id}.${table.id}\``;
          const [rows] = await bigquery.query({ query, location: 'us-west1' });
          console.log(`  │  Rows: ${rows[0].count}`);
          console.log(`  │`);
        }
      }
    }

    console.log('\n✅ Search complete');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCategoryTables();
