-- ============================================================
-- Intake Wizard migration
-- Run in: Supabase SQL Editor
-- ============================================================

-- Intake tokens tabel
CREATE TABLE IF NOT EXISTS intake_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE intake_tokens ENABLE ROW LEVEL SECURITY;
-- Geen directe client-toegang nodig (publiek via API route met token lookup)

-- Extra kolommen op clients tabel (als nog niet aanwezig)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS microsoft_subscription text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS software_inventory jsonb DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_goals text;

-- Extra kolom op client_users voor functietitel
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS function_title text;

-- Koppeling met Supabase Auth user voor portal-login en beheer
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
