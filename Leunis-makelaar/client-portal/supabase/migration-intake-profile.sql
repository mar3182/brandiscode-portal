-- ============================================================
-- Intake Wizard — teamlid profielvelden
-- Run in: Supabase SQL Editor
-- ============================================================

-- Teamlid intake profiel (flexibel JSON voor toekomstige uitbreidingen)
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS intake_profile jsonb DEFAULT '{}';
