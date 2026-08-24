-- Supabase Storage & RLS Setup for Adobe Sign Integration
-- 
-- IMPORTANT: This file contains SQL for DATABASE RLS policies only
-- Storage bucket creation and storage RLS policies must be done via Supabase Dashboard
--
-- Run this in the Supabase SQL Editor

-- ═════════════════════════════════════════════════════════════════════════
-- MANUAL SETUP VIA SUPABASE DASHBOARD (NOT VIA SQL)
-- ═════════════════════════════════════════════════════════════════════════
-- 
-- 1. Create Storage Bucket:
--    - Go to Supabase Dashboard → Storage
--    - Click "Create a new bucket"
--    - Name: signed-offertes
--    - Visibility: Private
--    - Click "Create bucket"
--
-- 2. Set Storage RLS Policies:
--    - Go to Supabase Dashboard → Storage → signed-offertes bucket
--    - Click "Policies"
--    - For each policy below, click "New Policy" → "For users based on their UID"
--    - Configure policies (see STORAGE_POLICIES.md for details)
--
-- ─────────────────────────────────────────────────────────────────────────
-- DATABASE RLS POLICIES FOR OFFERTES TABLE
-- ─────────────────────────────────────────────────────────────────────────
-- These policies can be created via SQL

-- Use environment variable for ADMIN_EMAIL
-- Set in Supabase project settings or use the constant value directly
-- For now, we use current_setting() which requires it to be set at session level
-- Alternatively, you can replace placeholders with actual admin email

-- Helper: Get admin email from session variable (must be set at connection time)
-- Alternative: Replace '{ADMIN_EMAIL}' with actual admin email value

-- Policy: Admin users can SELECT all offertes
CREATE POLICY "Admin can select all offertes"
  ON public.offertes
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = '{ADMIN_EMAIL}'
  );

-- Policy: Admin users can UPDATE offertes (including Adobe Sign fields)
CREATE POLICY "Admin can update all offertes"
  ON public.offertes
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = '{ADMIN_EMAIL}'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = '{ADMIN_EMAIL}'
  );

-- Policy: Admin users can DELETE offertes
CREATE POLICY "Admin can delete offertes"
  ON public.offertes
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = '{ADMIN_EMAIL}'
  );

-- Policy: Client users can SELECT their own offertes
CREATE POLICY "Clients can select own offertes"
  ON public.offertes
  FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT client_id
      FROM client_users
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Policy: Service role (backend/webhooks) can UPDATE Adobe Sign fields
CREATE POLICY "Service role can update Adobe Sign fields"
  ON public.offertes
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- SETUP INSTRUCTIONS
-- ─────────────────────────────────────────────────────────────────────────
-- 
-- BEFORE running this SQL, you must:
-- 1. Create storage bucket "signed-offertes" (Private) via Dashboard
-- 2. Replace '{ADMIN_EMAIL}' with your actual admin email address below
-- 3. Run this SQL in the Supabase SQL Editor
--
-- If you haven't done step 1, the policies won't work because the bucket doesn't exist.
--
-- EXAMPLE: If admin email is "admin@brandiscode.com"
-- Replace:  auth.jwt() ->> 'email' = '{ADMIN_EMAIL}'
-- With:     auth.jwt() ->> 'email' = 'admin@brandiscode.com'

-- ─────────────────────────────────────────────────────────────────────────
-- STORAGE POLICIES (Create via Dashboard, not SQL)
-- ─────────────────────────────────────────────────────────────────────────
--
-- See STORAGE_POLICIES.md for complete storage policy setup instructions
-- These policies are managed via the Supabase Dashboard UI

-- ─────────────────────────────────────────────────────────────────────────
-- ENVIRONMENT VARIABLES (Set in .env.local and Vercel)
-- ─────────────────────────────────────────────────────────────────────────
--
-- ADOBE_SIGN_CLIENT_ID=your-client-id
-- ADOBE_SIGN_CLIENT_SECRET=your-client-secret
-- ADOBE_SIGN_TENANT_ID=your-tenant-id
-- ADOBE_SIGN_API_BASE_URL=https://api.adobe.io
-- NEXT_PUBLIC_BASE_URL=https://portal.brandiscode.com

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- ─────────────────────────────────────────────────────────────────────────

-- Check if storage bucket was created:
-- SELECT id, name, public FROM storage.buckets WHERE id = 'signed-offertes';

-- List all RLS policies for offertes:
-- SELECT tablename, policyname, permissive, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'offertes' AND schemaname = 'public';

-- Check which policies are enabled on offertes:
-- SELECT tablname, rowsecurity 
-- FROM pg_class 
-- WHERE relname = 'offertes';
