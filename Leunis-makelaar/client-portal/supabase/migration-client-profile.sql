-- Migration: uitgebreide klant bedrijfsgegevens voor intake, administratie en facturatie
-- NIET automatisch uitvoeren. Handmatig runnen in Supabase SQL Editor.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kvk_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS btw_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_postal_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'Nederland';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_kvk_number ON clients(kvk_number);
CREATE INDEX IF NOT EXISTS idx_clients_btw_number ON clients(btw_number);
CREATE INDEX IF NOT EXISTS idx_clients_billing_email ON clients(billing_email);