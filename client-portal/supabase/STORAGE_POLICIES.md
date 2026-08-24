# Storage Policies Setup - Adobe Sign Integration

**Status:** Manual dashboard configuration required  
**Location:** Supabase Dashboard → Storage  
**Bucket Name:** `signed-offertes`

---

## 📋 Step-by-Step Setup

### Step 1: Create Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"Create a new bucket"**
3. Fill in:
   - **Name:** `signed-offertes`
   - **Visibility:** Private ✓
4. Click **"Create bucket"**

---

### Step 2: Configure RLS Policies

Go to **Storage** → **signed-offertes** → **Policies** tab

Create these 4 policies:

#### Policy 1: Admin - SELECT (Read)

```
Name: "Admin can select signed offertes"
Type: SELECT
Authentication: Any authenticated user
Which users: Custom SQL expression

Condition:
bucket_id = 'signed-offertes' AND 
auth.jwt() ->> 'email' = 'admin@brandiscode.com'
```

**Note:** Replace `admin@brandiscode.com` with your actual admin email

#### Policy 2: Admin - UPDATE (Write)

```
Name: "Admin can update signed offertes"
Type: UPDATE
Authentication: Any authenticated user
Which users: Custom SQL expression

Condition:
bucket_id = 'signed-offertes' AND 
auth.jwt() ->> 'email' = 'admin@brandiscode.com'
```

#### Policy 3: Clients - SELECT (Read Own)

```
Name: "Clients can select own signed offertes"
Type: SELECT
Authentication: Any authenticated user
Which users: Custom SQL expression

Condition:
bucket_id = 'signed-offertes' AND 
substring(name, 1, 36) = (
  SELECT client_id::text
  FROM public.client_users
  WHERE user_id = auth.uid()
  LIMIT 1
)
```

**Note:** File naming format must be: `{client_id}/{offerte_id}/signed.pdf`

#### Policy 4: Service Role - Full Access

```
Name: "Service role can manage signed PDFs"
Type: All operations (SELECT, INSERT, UPDATE, DELETE)
Authentication: Service role
Which users: Service role users

Condition: true
```

---

## ✅ Verification

After setup, verify the policies are active:

```sql
-- In Supabase SQL Editor:
SELECT 
  policyname, 
  permissive, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY cmd;
```

You should see 4 policies listed.

---

## 🔐 Security Notes

- **Private Bucket** - Files are not publicly accessible
- **Admin Full Access** - Admin can manage all signed PDFs
- **Client Isolation** - Clients can only access their own files
- **Service Role** - Backend can upload/download/update PDFs
- **File Path Convention** - `{client_id}/{offerte_id}/signed.pdf` ensures isolation

---

## 📂 File Structure

Files in `signed-offertes` bucket will be stored as:

```
signed-offertes/
├── {client_id_1}/
│   ├── {offerte_id_1}/
│   │   └── signed.pdf
│   └── {offerte_id_2}/
│       └── signed.pdf
└── {client_id_2}/
    └── {offerte_id_3}/
        └── signed.pdf
```

---

## 🧪 Testing

After setup, test access:

```bash
# As authenticated client user:
# Should succeed if the file path starts with user's client_id
curl https://supabase-project.supabase.co/storage/v1/object/signed-offertes/{client_id}/{offerte_id}/signed.pdf

# As admin:
# Should always succeed
curl https://supabase-project.supabase.co/storage/v1/object/signed-offertes/any-file.pdf

# As unauthorized user:
# Should fail with 403 Forbidden
```

---

## ⚠️ Troubleshooting

**Error: "must be owner of table objects"**
- This means you're trying to run SQL policies via SQL Editor
- Storage policies must be created via Dashboard UI only
- Use the steps above instead

**Error: "Bucket not found"**
- Ensure bucket "signed-offertes" was created in step 1
- Check bucket name spelling (case-sensitive)

**Clients can't access their files**
- Verify file naming: `{client_id}/{offerte_id}/signed.pdf`
- Check that `client_users` table has correct `client_id` and `user_id`
- Verify policy condition references correct table name

**Admin can't access files**
- Check that admin email in policy matches `ADMIN_EMAIL` env var
- Verify authenticated user has correct JWT email claim

---

## 🔗 Related Files

- `setup-adobe-sign-storage.sql` - Database RLS policies (run via SQL)
- `migration-adobe-sign.sql` - Database schema changes
- `ADOBE-SIGN-BACKEND-IMPLEMENTATION.md` - Full implementation guide

---

*Last updated: 2026-08-24*
