# 🚀 Deploy Information Portal to Vercel (2026)

## ✅ Pre-Deployment Checklist

### Latest Features Deployed:
- ✅ Configurable Ticket List Columns (Customer Support vs Seller Support)
- ✅ Bulk Selection & Transfer (My Tickets + All Tickets)
- ✅ User Column Preferences with database migration
- ✅ Department-based default columns
- ✅ Dynamic table rendering

### Files Ready:
- ✅ `vercel.json` - Vercel configuration
- ✅ `api/index.js` - Serverless function handler
- ✅ `script/build-vercel.ts` - Build script
- ✅ `.vercelignore` - Ignore unnecessary files

---

## 📋 Required Environment Variables

You'll need to set these in Vercel Dashboard:

### 1. Database (Required)
```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```
**Get from**: Neon Dashboard → Connection String

### 2. Session Secret (Required)
```bash
SESSION_SECRET=your-random-secret-key-here
```
**Generate with**: `openssl rand -hex 32`

### 3. Email (Optional - for notifications)
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### 4. BigQuery (Optional - for vendor sync)
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET_ID=your-dataset-id
```

### 5. Node Environment
```bash
NODE_ENV=production
```

---

## 🚀 Deployment Methods

### Option 1: Deploy via Vercel CLI (Recommended)

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Link Project (First Time Only)
```bash
cd /Users/syedfaezhasan/Downloads/Information-Portal
vercel link
```
- Select your account
- Choose or create a project
- Link to current directory

#### Step 4: Set Environment Variables
```bash
# Set DATABASE_URL
vercel env add DATABASE_URL

# Paste your Neon connection string when prompted
# Example: postgresql://neondb_owner:npg_xxx@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=require

# Set SESSION_SECRET
vercel env add SESSION_SECRET

# Paste a secure random string (generate with: openssl rand -hex 32)

# Set NODE_ENV
vercel env add NODE_ENV
# Enter: production
```

#### Step 5: Deploy to Production
```bash
vercel --prod
```

**Wait 2-3 minutes for build to complete**

✅ Your app will be live at: `https://your-project.vercel.app`

---

### Option 2: Deploy via GitHub (Auto-Deploy)

#### Step 1: Push to GitHub
```bash
# Check git status
git status

# Add all changes
git add .

# Commit with message
git commit -m "feat: add bulk transfer and configurable columns"

# Push to main branch
git push origin main
```

#### Step 2: Connect Vercel to GitHub
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Click "Import"
5. Configure project settings:
   - Framework Preset: **Other**
   - Build Command: **npm run build** (or leave default)
   - Output Directory: **dist/public**

#### Step 3: Add Environment Variables
In Vercel Dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add all required variables (see list above)
3. Select environment: **Production**, **Preview**, **Development**
4. Click **Save**

#### Step 4: Deploy
Click **Deploy** button

Vercel will automatically:
- Build the project
- Run migrations (if configured)
- Deploy to production

---

## 🗃️ Database Setup on Vercel

### Option A: Run Migrations Manually (After First Deploy)

Connect to your production database and run:

```sql
-- 1. User column preferences table (if not exists)
CREATE TABLE IF NOT EXISTS user_column_preferences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visible_columns TEXT[] NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ucp_user_id_idx UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS ucp_user_idx ON user_column_preferences(user_id);

-- 2. Set default column preferences for existing users
INSERT INTO user_column_preferences (user_id, visible_columns)
SELECT
  u.id,
  CASE
    WHEN u.sub_department = 'Seller Support' THEN
      ARRAY['ticketId', 'vendor', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
    WHEN u.sub_department = 'Customer Support' THEN
      ARRAY['ticketId', 'customer', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
    ELSE
      ARRAY['ticketId', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
  END as visible_columns
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_column_preferences ucp WHERE ucp.user_id = u.id
);
```

### Option B: Use Migration Script

From your local machine:
```bash
# Set DATABASE_URL to production
export DATABASE_URL="your-production-database-url"

# Run migration
npx tsx server/migrate-column-preferences.ts
```

---

## 🧪 Post-Deployment Testing

### Test 1: Column Customization
1. Login as Customer Support agent (faez@joinfleek.com)
2. Go to **My Tickets**
3. Click **Columns** button
4. ✅ Should see default: ticketId, customer, department, etc.
5. Toggle columns on/off
6. Click **Save**
7. ✅ Table should update immediately
8. Refresh page
9. ✅ Settings should persist

### Test 2: Bulk Transfer (My Tickets)
1. Go to **My Tickets**
2. Check 2-3 tickets
3. ✅ Should see: "X selected" badge
4. Click **Transfer Selected**
5. Select assignee from dropdown
6. Click **Transfer**
7. ✅ Tickets should update to "Open" status
8. ✅ Assignee should change
9. ✅ Selection should clear

### Test 3: Bulk Transfer (All Tickets)
1. Go to **All Tickets**
2. Check multiple tickets
3. Click **Transfer Selected**
4. Select assignee
5. Click **Transfer**
6. ✅ Should see success toast
7. ✅ Table should refresh

### Test 4: Department Separation
1. Login as Seller Support
2. ✅ Should see "Vendor" column by default
3. ✅ Should NOT see "Customer" column
4. Login as Customer Support
5. ✅ Should see "Customer" column by default
6. ✅ Should NOT see "Vendor" column

---

## 📊 Build Verification (Before Deploy)

Test the build locally first:

```bash
# Build the project
npm run build

# Check output
ls -la dist/

# Expected structure:
# dist/
#   ├── public/          (client files)
#   │   ├── index.html
#   │   └── assets/
#   └── server/          (server bundles)
#       ├── routes.js
#       ├── storage.js
#       └── db.js

# Start production server locally
npm start

# Test at http://localhost:5000
```

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check build logs
vercel logs

# Common issues:
# 1. Missing environment variables
# 2. TypeScript errors
# 3. Missing dependencies

# Fix: Check vercel.json buildCommand matches package.json
```

### Database Connection Fails
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Should include ?sslmode=require for Neon
# Example: postgresql://user:pass@host/db?sslmode=require

# Test connection
psql $DATABASE_URL -c "SELECT NOW();"
```

### Column Preferences Not Loading
```bash
# Check if table exists
psql $DATABASE_URL -c "\d user_column_preferences"

# Run migration if missing
npx tsx server/migrate-column-preferences.ts
```

### Bulk Transfer Not Working
```bash
# Check API endpoint
curl -X PATCH https://your-app.vercel.app/api/tickets/TICKET_ID \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": "USER_ID", "status": "Open"}'

# Should return 200 OK
```

---

## 🔒 Security Checklist

Before going live:
- ✅ DATABASE_URL has ?sslmode=require
- ✅ SESSION_SECRET is random and secure (32+ chars)
- ✅ Environment variables are set to Production
- ✅ No .env files committed to git
- ✅ CORS settings reviewed (if custom)
- ✅ Rate limiting enabled (if needed)

---

## 📱 Monitoring & Logs

### View Logs
```bash
# Real-time logs
vercel logs --follow

# Recent logs
vercel logs

# Logs for specific deployment
vercel logs DEPLOYMENT_URL
```

### Check Performance
1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Analytics**
4. Monitor:
   - Response times
   - Error rates
   - Traffic patterns

---

## 🎯 Quick Commands Reference

```bash
# Deploy to production
vercel --prod

# Deploy to preview (test)
vercel

# Check deployment status
vercel ls

# View environment variables
vercel env ls

# Pull environment variables locally
vercel env pull

# Rollback to previous deployment
vercel rollback

# Check project info
vercel inspect
```

---

## 📞 Support

If you encounter issues:
1. Check Vercel logs: `vercel logs`
2. Check build output in Vercel Dashboard
3. Verify environment variables
4. Test database connection
5. Check browser console for client errors

---

## ✅ Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Database migrations run
- [ ] Build succeeds locally (`npm run build`)
- [ ] Git committed and pushed
- [ ] Deployed to Vercel
- [ ] Production URL accessible
- [ ] Login works
- [ ] Column customization works
- [ ] Bulk transfer works
- [ ] All permissions work correctly

---

**Status**: Ready to deploy! 🚀

**Deployment URL**: Will be provided after running `vercel --prod`

**Expected Build Time**: 2-3 minutes

**Next**: Run `vercel --prod` or push to GitHub
