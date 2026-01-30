import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testQuery() {
  try {
    // Check if BigQuery is configured
    const projectId = process.env.BIGQUERY_PROJECT_ID;
    const credentialsPath = process.env.BIGQUERY_CREDENTIALS_PATH;
    const credentialsJson = process.env.BIGQUERY_CREDENTIALS_JSON;

    if (!projectId) {
      console.log('❌ BigQuery is not configured. Please set BIGQUERY_PROJECT_ID in .env');
      console.log('\nTo configure BigQuery, add these to your .env file:');
      console.log('BIGQUERY_PROJECT_ID=your-gcp-project-id');
      console.log('BIGQUERY_DATASET=fleek_hub');
      console.log('BIGQUERY_ORDERS_TABLE=order_line_details');
      console.log('BIGQUERY_LOCATION=US');
      console.log('BIGQUERY_CREDENTIALS_PATH=/path/to/service-account-key.json');
      console.log('# OR');
      console.log('BIGQUERY_CREDENTIALS_JSON={"type":"service_account",...}');
      return;
    }

    const options: any = { projectId };

    // Support both file path and inline JSON credentials
    if (credentialsJson) {
      try {
        options.credentials = JSON.parse(credentialsJson);
      } catch (err) {
        console.error('❌ Invalid credentials JSON:', err);
        return;
      }
    } else if (credentialsPath) {
      options.keyFilename = credentialsPath;
    } else {
      console.log('❌ No credentials provided. Set either BIGQUERY_CREDENTIALS_PATH or BIGQUERY_CREDENTIALS_JSON');
      return;
    }

    console.log('🔄 Initializing BigQuery client...');
    const bigquery = new BigQuery(options);

    console.log('✅ BigQuery client initialized');
    console.log('\n🔄 Running query...\n');

    const query = `
      SELECT
        vendor,
        fleek_id
      FROM fleek_hub.order_line_details
      LIMIT 1
    `;

    const [rows] = await bigquery.query({
      query,
      location: process.env.BIGQUERY_LOCATION || 'US',
    });

    console.log('✅ Query executed successfully!\n');
    console.log('📊 Results:');
    console.log(JSON.stringify(rows, null, 2));
    console.log(`\n📈 Found ${rows.length} row(s)`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
  }
}

testQuery();
