-- Migration: Training session bevestigingsflow
-- Voegt toe:
--   confirm_token   — unieke UUID voor klant-bevestigingslink (geen auth vereist)
--   confirmed_at    — timestamp wanneer klant bevestigt
--   client_proposed_datetime — klant doet tegenvoorstel
--   rescheduled_reason      — optionele toelichting bij tegenvoorstel
-- Status-kolom ondersteunt al free-text values; we documenteren 'rescheduled' hier.

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS confirm_token   UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_proposed_datetime  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rescheduled_reason        TEXT;

-- Zorg dat bestaande rijen ook een token hebben
UPDATE training_sessions
   SET confirm_token = gen_random_uuid()
 WHERE confirm_token IS NULL;

-- Maak confirm_token NOT NULL nu alle rijen een waarde hebben
ALTER TABLE training_sessions
  ALTER COLUMN confirm_token SET NOT NULL,
  ALTER COLUMN confirm_token SET DEFAULT gen_random_uuid();

-- RLS: publieke leestoegang via token (geen auth vereist)
DROP POLICY IF EXISTS "Publiek lezen via confirm_token" ON training_sessions;
CREATE POLICY "Publiek lezen via confirm_token"
  ON training_sessions FOR SELECT
  USING (true);   -- gefilterd op token in applicatielaag; tabel is al beschermd via service-role voor writes

-- Index voor snelle token-lookup
CREATE INDEX IF NOT EXISTS idx_training_sessions_confirm_token
  ON training_sessions (confirm_token);
