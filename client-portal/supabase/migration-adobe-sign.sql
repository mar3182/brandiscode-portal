-- Migration: Add Adobe Sign fields to offertes table
-- Date: 2026-08-24

-- Voeg Adobe Sign velden toe aan offertes tabel
ALTER TABLE public.offertes
ADD COLUMN adobe_sign_agreement_id TEXT UNIQUE,
ADD COLUMN adobe_sign_status TEXT,
ADD COLUMN signed_pdf_url TEXT,
ADD COLUMN signed_by_email TEXT;

-- Voeg constraint toe voor geldige Adobe Sign status values
ALTER TABLE public.offertes
ADD CONSTRAINT adobe_sign_status_check CHECK (
  adobe_sign_status IS NULL 
  OR adobe_sign_status IN ('pending', 'signed', 'expired', 'declined', 'cancelled')
);

-- Indexering voor snellere queries
CREATE INDEX idx_offertes_adobe_sign_agreement_id 
ON public.offertes(adobe_sign_agreement_id);

CREATE INDEX idx_offertes_adobe_sign_status 
ON public.offertes(adobe_sign_status);

CREATE INDEX idx_offertes_signed_at 
ON public.offertes(signed_at DESC);

-- Voeg constraint toe voor status relatie
-- signed_at mag alleen ingevuld zijn als adobe_sign_status = 'signed'
ALTER TABLE public.offertes
ADD CONSTRAINT adobe_sign_signed_at_consistency CHECK (
  (adobe_sign_status = 'signed' AND signed_at IS NOT NULL) OR 
  (adobe_sign_status != 'signed' AND signed_at IS NULL) OR 
  (adobe_sign_status IS NULL AND signed_at IS NULL)
);

-- Update RLS policies (admin kan alles zien, klanten kunnen alleen hun eigen zien)
-- Deze policies worden in de application code afgedwongen, maar we documenteren ze hier:
-- 
-- For table offertes:
-- - Admin (ADMIN_EMAIL) can SELECT/UPDATE adobe_sign fields
-- - Client users can SELECT their own offerte but cannot UPDATE adobe_sign fields directly
-- - Webhooks handler (via service role) can UPDATE status fields only
