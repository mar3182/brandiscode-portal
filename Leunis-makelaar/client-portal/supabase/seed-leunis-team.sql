-- LEUNIS MAKELAARS — Teamleden toevoegen
-- =========================================================
-- Voer dit uit in Supabase SQL Editor NADAT je de e-mailadressen
-- hebt geverifieerd op locatie (6 juli 2026)
--
-- Vervang elke [EMAILADRES] met het echte zakelijke e-mailadres
-- Client ID Leunis Makelaars: 727593cc-f430-42a2-b2e1-b287150afe53
-- =========================================================

INSERT INTO client_users (client_id, name, email, role)
SELECT * FROM (VALUES
  ('727593cc-f430-42a2-b2e1-b287150afe53'::uuid, 'Arno Leunis',            '[EMAILADRES_ARNO]',    'owner'),
  ('727593cc-f430-42a2-b2e1-b287150afe53'::uuid, 'Henk Sturris',           '[EMAILADRES_HENK]',    'owner'),
  ('727593cc-f430-42a2-b2e1-b287150afe53'::uuid, 'Jorinda van Eenennaam',  '[EMAILADRES_JORINDA]', 'member'),
  ('727593cc-f430-42a2-b2e1-b287150afe53'::uuid, 'Rian Punt',              '[EMAILADRES_RIAN]',    'member'),
  ('727593cc-f430-42a2-b2e1-b287150afe53'::uuid, 'Teunice Buijs',          '[EMAILADRES_TEUNICE]', 'member')
) AS v(client_id, name, email, role)
WHERE NOT EXISTS (
  SELECT 1 FROM client_users cu WHERE cu.email = v.email
);

-- Verificatie: toon de ingevoerde teamleden
SELECT name, email, role FROM client_users
WHERE client_id = '727593cc-f430-42a2-b2e1-b287150afe53'
ORDER BY name;
