# Adobe Sign Backend - Correct Setup Instructions

**Date:** 2026-08-24  
**Status:** ⚠️ UPDATED - Fixed SQL permission issue

---

## 🚨 Issue & Fix

**Problem:** The original `setup-adobe-sign-storage.sql` tried to create RLS policies on `storage.objects` table via SQL, causing permission error:
```
ERROR: 42501: must be owner of table objects
```

**Root Cause:**
- Supabase doesn't allow direct SQL modification of storage RLS policies
- Storage policies must be configured via Supabase Dashboard UI
- Environment variables can't be directly queried from SQL

**Solution:**
- ✅ Database RLS policies (setup-adobe-sign-storage.sql) - works via SQL
- ✅ Storage policies - must be configured via Dashboard
- ✅ Updated instructions - clear step-by-step guide

---

## ✅ Correct Setup Flow

### Phase 1: Database Schema

**Run this SQL in Supabase SQL Editor:**

File: `supabase/migration-adobe-sign.sql`

```bash
# Steps:
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy content from: supabase/migration-adobe-sign.sql
4. Replace '{ADMIN_EMAIL}' with your actual admin email
5. Click "Run"
```

**Status:** ✅ Can be run via SQL

---

### Phase 2: Storage Bucket Creation

**Create bucket via Dashboard (NOT SQL):**

1. Go to **Storage** → **Create a new bucket**
2. Name: `signed-offertes`
3. Visibility: **Private**
4. Click **Create bucket**

**Status:** ✅ Must be done via Dashboard UI

---

### Phase 3: Database RLS Policies

**Run this SQL in Supabase SQL Editor:**

File: `supabase/setup-adobe-sign-storage.sql`

```bash
# Steps:
1. Open file: supabase/setup-adobe-sign-storage.sql
2. Find: auth.jwt() ->> 'email' = '{ADMIN_EMAIL}'
3. Replace {ADMIN_EMAIL} with actual admin email:
   - Example: 'admin@brandiscode.com'
4. Go to Supabase Dashboard → SQL Editor
5. Copy updated SQL content (database policies only)
6. Click "Run"
```

**Included policies:**
- ✅ Admin SELECT all offertes
- ✅ Admin UPDATE all offertes
- ✅ Admin DELETE all offertes
- ✅ Clients SELECT own offertes
- ✅ Service role UPDATE (webhooks/backend)

**Status:** ✅ Can be run via SQL

---

### Phase 4: Storage RLS Policies

**Create via Dashboard (NOT SQL):**

File: `supabase/STORAGE_POLICIES.md`

```bash
# Steps:
1. Go to Supabase Dashboard → Storage → signed-offertes
2. Click "Policies" tab
3. Follow instructions in STORAGE_POLICIES.md
4. Create 4 policies (Admin SELECT, Admin UPDATE, Clients SELECT, Service Role)
```

**Status:** ✅ Must be done via Dashboard UI

---

### Phase 5: Environment Variables

Add to `.env.local`:
```bash
ADOBE_SIGN_CLIENT_ID=your-client-id
ADOBE_SIGN_CLIENT_SECRET=your-client-secret
ADOBE_SIGN_TENANT_ID=your-tenant-id
ADOBE_SIGN_API_BASE_URL=https://api.adobe.io
NEXT_PUBLIC_BASE_URL=https://portal.brandiscode.com
```

Deploy to Vercel:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all ADOBE_SIGN_* variables
3. Redeploy

**Status:** ✅ Via env file and Vercel dashboard

---

### Phase 6: Implement Server-Side PDF Generation

**Edit:** `src/app/api/offertes/[id]/send-signature/route.ts`

Choose one option:
- Option A: Pre-generate PDFs on offerte creation (RECOMMENDED)
- Option B: Puppeteer for HTML → PDF
- Option C: jsPDF with Buffer

**Status:** ⏳ TO IMPLEMENT

---

## 📋 Implementation Checklist

### SQL Setup ✅
- [ ] Run migration-adobe-sign.sql
- [ ] Replace {ADMIN_EMAIL} placeholder
- [ ] Run setup-adobe-sign-storage.sql (database policies only)

### Supabase Dashboard ✅
- [ ] Create storage bucket "signed-offertes" (Private)
- [ ] Create 4 storage RLS policies (see STORAGE_POLICIES.md)
- [ ] Verify all policies are active

### Code ✅
- [ ] Adobe Sign API client implemented (src/lib/adobeSign.ts)
- [ ] API endpoints created (send-signature, signature-status, webhook)
- [ ] Types updated (src/lib/types.ts)
- [ ] TypeScript validation passes

### Configuration ⏳
- [ ] Set environment variables in .env.local
- [ ] Deploy to Vercel with env vars
- [ ] Implement server-side PDF generation
- [ ] Test with Adobe Sign sandbox account

---

## 🚀 Quick Commands

```bash
# Verify TypeScript compilation
cd client-portal
npx tsc --noEmit  # Should output nothing (EXIT:0)

# Check current setup
# 1. Verify migration applied:
#    SELECT column_name FROM information_schema.columns 
#    WHERE table_name = 'offertes' AND column_name LIKE 'adobe%'

# 2. Verify storage bucket exists:
#    SELECT id, name FROM storage.buckets WHERE id = 'signed-offertes'

# 3. Verify database policies:
#    SELECT policyname FROM pg_policies WHERE tablename = 'offertes'
```

---

## ❌ Common Mistakes to Avoid

1. **Running storage policies via SQL** ❌
   - Storage RLS policies can ONLY be created via Dashboard
   - SQL will fail with "must be owner of table objects"

2. **Forgetting to replace {ADMIN_EMAIL}** ❌
   - Will cause "permission denied" errors for admin
   - Always search & replace before running SQL

3. **Creating bucket via SQL** ❌
   - Use Dashboard UI only
   - SQL INSERT won't work with Supabase auth system

4. **Not implementing PDF generation** ❌
   - API endpoint will return 501
   - Must choose Option A, B, or C

5. **Mixing environment variable references** ❌
   - SQL can't query environment variables
   - Use hardcoded values or environment-specific scripts

---

## ✅ Verification Steps

After completing setup:

```bash
# 1. Check database migration
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'offertes' AND column_name LIKE 'adobe%'
ORDER BY ordinal_position;

# Should return 4 columns:
# - adobe_sign_agreement_id
# - adobe_sign_status
# - signed_pdf_url
# - signed_by_email

# 2. Check storage bucket
SELECT id, name, public FROM storage.buckets 
WHERE id = 'signed-offertes';

# Should return 1 row with: signed-offertes | false

# 3. Check database policies
SELECT policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'offertes' AND schemaname = 'public';

# Should return 5 rows:
# - Admin can select all offertes
# - Admin can update all offertes
# - Admin can delete offertes
# - Clients can select own offertes
# - Service role can update Adobe Sign fields

# 4. Check storage policies (via Dashboard)
# Go to: Storage → signed-offertes → Policies tab
# Should see 4 policies listed
```

---

## 📞 Troubleshooting

**Q: "ERROR: 42501: must be owner of table objects"**
- A: Don't run storage policies via SQL. Use Dashboard UI only.
- Go to Storage → signed-offertes → Policies tab
- Follow instructions in STORAGE_POLICIES.md

**Q: "Admin can't see any offertes"**
- A: Check that {ADMIN_EMAIL} was replaced with actual email
- Verify email matches ADMIN_EMAIL env var
- Check that admin user email in auth matches policy condition

**Q: "Clients see error accessing offertes"**
- A: Verify client_users table has correct client_id for user
- Check that user is authenticated (auth.uid() not null)
- Verify client_id in offertes table matches

**Q: "PDF generation endpoint returns 501"**
- A: Server-side PDF generation not implemented
- Choose option A, B, or C in send-signature/route.ts
- Uncomment and implement the PDF generation logic

---

## 📚 Documentation Files

- **setup-adobe-sign-storage.sql** - Database RLS policies (SQL)
- **STORAGE_POLICIES.md** - Storage RLS policies (Dashboard UI)
- **migration-adobe-sign.sql** - Database schema migration (SQL)
- **ADOBE-SIGN-BACKEND-IMPLEMENTATION.md** - Full technical details
- **ADOBE-SIGN-QUICKSTART.md** - Quick reference

---

## 🎯 Next Steps

1. ✅ Run migration-adobe-sign.sql
2. ✅ Create signed-offertes storage bucket
3. ✅ Run setup-adobe-sign-storage.sql (with email replaced)
4. ✅ Create storage RLS policies via Dashboard
5. ⏳ **Implement server-side PDF generation** (blocking item)
6. ⏳ Set up Adobe Sign API credentials
7. ⏳ Deploy to staging
8. ⏳ Test end-to-end flow

---

*Last updated: 2026-08-24*  
*Status: Ready for use - permission issue resolved*
