# Vendor Import from BigQuery

This script imports vendor data from your BigQuery table (`dogwood-baton-345622.aurora_postgres_public.vendors`) into the application database.

## Prerequisites

1. **BigQuery Configuration** - Ensure you have BigQuery credentials configured in your `.env` file:
   ```bash
   BIGQUERY_PROJECT_ID=dogwood-baton-345622
   BIGQUERY_CREDENTIALS_PATH=./service-account-key.json
   # OR
   BIGQUERY_CREDENTIALS_JSON={"type":"service_account",...}
   BIGQUERY_LOCATION=US
   ```

2. **Database Connection** - Ensure `DATABASE_URL` is set in your `.env` file:
   ```bash
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

## Running the Import

From the project root, run:

```bash
npx tsx import-vendors-from-bigquery.ts
```

## What the Script Does

1. **Connects to BigQuery** - Uses your service account credentials to access BigQuery
2. **Fetches Vendors** - Queries all vendors from `aurora_postgres_public.vendors` table
3. **Imports/Updates** - For each vendor:
   - If the vendor handle already exists: Updates the vendor data
   - If the vendor is new: Creates a new vendor record
4. **Shows Summary** - Displays how many vendors were imported, updated, or had errors

## Vendor Data Mapping

The script maps BigQuery columns to the application database:

| BigQuery Column | Application Field | Required |
|----------------|-------------------|----------|
| `handle` | `handle` | Yes |
| `name` | `name` | Yes |
| `email` | `email` | No |
| `phone` | `phone` | No |
| `gmv_tier` | `gmvTier` | No |
| `gmv_90_day` | `gmv90Day` | No |
| `kam` | `kam` | No |
| `zone` | `zone` | No |
| `region` | `region` | No |
| `country` | `country` | No |
| `persona` | `persona` | No |

## Expected Output

```
🚀 Starting vendor import from BigQuery...

🔄 Connecting to BigQuery...
🔄 Connecting to application database...
🔄 Fetching vendors from BigQuery (aurora_postgres_public.vendors)...
✅ Found 150 vendors in BigQuery

🔄 Importing vendors...

✅ Imported: creed-vintage (Creed Vintage)
✅ Imported: acme-corp (Acme Corporation)
✅ Updated: existing-vendor (Existing Vendor)
...

============================================================
📊 Import Summary:
============================================================
✅ New vendors imported: 145
🔄 Existing vendors updated: 5
⏭️  Vendors skipped: 0
❌ Errors: 0
📈 Total processed: 150
============================================================

✅ Database connection closed
```

## Troubleshooting

### Error: "BIGQUERY_PROJECT_ID is required"
Make sure you have `BIGQUERY_PROJECT_ID=dogwood-baton-345622` in your `.env` file.

### Error: "Invalid BIGQUERY_CREDENTIALS_JSON"
Check that your credentials JSON is valid and properly escaped.

### Error: "DATABASE_URL is required"
Ensure your `.env` file has a valid `DATABASE_URL` connection string.

### Error: "Table not found"
Verify that the table `dogwood-baton-345622.aurora_postgres_public.vendors` exists in BigQuery and your service account has access to it.

## After Import

Once vendors are imported, you can:
1. Create tickets with vendor handles from the dropdown
2. View vendor details on ticket pages
3. The vendors will be available in the ticket creation form

## Re-running the Import

You can safely re-run this script multiple times. It will:
- Update existing vendors with the latest data from BigQuery
- Import any new vendors that were added since the last run
- Not create duplicates (vendors are matched by `handle`)
