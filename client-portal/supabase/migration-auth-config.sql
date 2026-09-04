-- Brand is Code — Supabase Auth Configuratie
-- Pas deze instellingen aan in Supabase Dashboard

-- 1. Schakel Email Confirmation UIT
-- Ga naar: Supabase Dashboard → Authentication → Providers → Email
-- Zet "Confirm email" op OFF

-- 2. Voeg toe aan database voor automatische activatie
-- Dit zorgt dat nieuwe gebruikers direct geactiveerd worden

-- 2.1. Voeg email_confirm toe aan clients tabel (optioneel)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ DEFAULT now();

-- 2.2. Update bestaande clients om email_confirmed_at te zetten
UPDATE clients SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;

-- 3. Admin kan klanten aanmaken met directe activatie
-- Voorbeeld: nieuwe klant aanmaken
-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   'nieuwe-klant@voorbeeld.nl',
--   md5('wachtwoord123'),
--   now(),  -- ✅ Direct geactiveerd
--   now(),
--   now()
-- );

-- 4. Of gebruik de Supabase Admin API (aanbevolen)
-- POST https://[jouw-project].supabase.co/auth/v1/admin/users
-- Headers:
--   apikey: [jouw-supabase-api-key]
--   Authorization: Bearer [jouw-supabase-api-key]
-- Body:
-- {
--   "email": "nieuwe-klant@voorbeeld.nl",
--   "password": "wachtwoord123",
--   "email_confirm": true,
--   "user_metadata": {
--     "name": "Jan Jansen",
--     "company": "Voorbeeld Bedrijf"
--   }
-- }

-- 5. Voeg RLS policy toe voor admin gebruikers aanmaken
-- (alleen als je dit via API wilt doen)
-- CREATE POLICY "Admins can create users" ON auth.users
--   FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM client_users cu
--       JOIN clients c ON c.id = cu.client_id
--       WHERE cu.email = auth.jwt() ->> 'email'
--       AND c.sector = 'admin'  -- Of een andere admin indicator
--     )
--   );
