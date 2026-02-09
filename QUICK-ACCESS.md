# 🚀 Quick Access - Information Portal

## 🌐 Your Live Application

### **Production URL**
**https://information-portal-beryl.vercel.app**

Click to access your live application ↑

---

## ⚠️ IMPORTANT: First-Time Setup

### Run Database Migration (One-Time)

```bash
# Option 1: Via migration script
npx tsx server/migrate-column-preferences.ts

# Option 2: Via SQL (connect to your production DB)
psql $DATABASE_URL < migration-user-column-preferences.sql
```

**This creates the user column preferences table needed for the new features.**

---

## 🎯 New Features Live

### 1. Configurable Columns
- Click **"Columns"** button in My Tickets
- Select which columns to show
- Settings persist per user

### 2. Bulk Transfer
- Check multiple tickets
- Click **"Transfer Selected"**
- Choose assignee and transfer

---

## 🔑 Quick Commands

```bash
# View logs
vercel logs --follow

# Check deployment
vercel ls

# Redeploy
vercel --prod

# Rollback
vercel rollback
```

---

## 📞 Help

**Deployment Details**: See [DEPLOYMENT-SUCCESS-2026.md](DEPLOYMENT-SUCCESS-2026.md)

**Full Guide**: See [VERCEL-DEPLOYMENT-2026.md](VERCEL-DEPLOYMENT-2026.md)

**Vercel Dashboard**: https://vercel.com/dashboard

---

**Status**: ✅ Live & Ready

**Last Deploy**: February 8, 2026
