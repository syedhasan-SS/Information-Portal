# BigQuery setup

Use this to connect the Information Portal to your GCP BigQuery project (e.g. for Fleek order data).

## 1. Get GCP credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select (or create) the project that has your BigQuery data.
2. Go to **IAM & Admin → Service Accounts** and create a service account (or pick an existing one).
3. Grant it **BigQuery Data Viewer** (and **BigQuery Job User** if you run queries).
4. Create a **JSON key** for that service account and download it.
5. Put the key file somewhere safe, e.g. project root:  
   `Information-Portal/service-account-key.json`  
   (That path is in `.gitignore`; do not commit it.)

## 2. Configure environment variables

Copy the BigQuery section from `.env.example` into your `.env` and set **your** values:

```bash
# BigQuery (use your GCP project and key)
BIGQUERY_PROJECT_ID=your-gcp-project-id
BIGQUERY_DATASET=fleek_hub
BIGQUERY_ORDERS_TABLE=order_line_details
BIGQUERY_LOCATION=US
BIGQUERY_CREDENTIALS_PATH=./service-account-key.json
```

- **BIGQUERY_PROJECT_ID** – Your GCP project ID (from Cloud Console).
- **BIGQUERY_CREDENTIALS_PATH** – Path to the JSON key file (e.g. `./service-account-key.json` if it’s in the project root).

Alternatively, for Vercel or no key file, use inline JSON (one line, no line breaks):

```bash
BIGQUERY_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}
```

Paste the **entire** contents of your service account JSON as the value (escape any quotes if your shell requires it).

## 3. Test the connection

From the project root:

```bash
npx tsx test-bigquery.ts
```

You should see “BigQuery client initialized” and a small query result. If that works, the app’s BigQuery integration (e.g. `/api/bigquery/orders`, vendor order IDs) will use the same config.

## Summary: what you need

| Variable | Example | Required |
|----------|--------|----------|
| `BIGQUERY_PROJECT_ID` | `my-gcp-project` | Yes |
| `BIGQUERY_CREDENTIALS_PATH` | `./service-account-key.json` | Yes* |
| `BIGQUERY_CREDENTIALS_JSON` | `{"type":"service_account",...}` | Yes* |
| `BIGQUERY_DATASET` | `fleek_hub` | No (default: `fleek_hub`) |
| `BIGQUERY_ORDERS_TABLE` | `order_line_details` | No (default: `order_line_details`) |
| `BIGQUERY_LOCATION` | `US` | No (default: `US`) |

\* Use either `BIGQUERY_CREDENTIALS_PATH` or `BIGQUERY_CREDENTIALS_JSON`, not both.

If you share your **GCP project ID** and whether you’re using a key file or inline JSON, the exact `.env` lines can be tailored for you (without pasting any private key content).
