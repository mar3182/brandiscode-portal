-- LEUNIS MAKELAARS — Teamleden toevoegen
-- =========================================================
-- Voer dit uit in Supabase SQL Editor NADAT je de e-mailadressen
-- hebt geverifieerd op locatie (6 juli 2026)
--
-- Vervang elke [EMAILADRES] met het echte zakelijke e-mailadres
-- Dit script zoekt het client_id dynamisch op basis van company='Leunis Makelaars'.
-- =========================================================

DO $$
DECLARE
  v_client_id UUID;
BEGIN
  SELECT id
  INTO v_client_id
  FROM clients
  WHERE company = 'Leunis Makelaars'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Client "Leunis Makelaars" niet gevonden in tabel clients. Voer eerst seed-leunis.sql uit of maak de client handmatig aan.';
  END IF;

  INSERT INTO client_users (client_id, name, email, role)
  SELECT * FROM (VALUES
    (v_client_id, 'Arno Leunis',            '[EMAILADRES_ARNO]',    'owner'),
    (v_client_id, 'Henk Sturris',           '[EMAILADRES_HENK]',    'owner'),
    (v_client_id, 'Jorinda van Eenennaam',  '[EMAILADRES_JORINDA]', 'member'),
    (v_client_id, 'Rian Punt',              '[EMAILADRES_RIAN]',    'member'),
    (v_client_id, 'Teunice Buijs',          '[EMAILADRES_TEUNICE]', 'member')
  ) AS v(client_id, name, email, role)
  WHERE NOT EXISTS (
    SELECT 1 FROM client_users cu WHERE cu.email = v.email
  );
END $$;

-- Verificatie: toon de ingevoerde teamleden
SELECT cu.name, cu.email, cu.role
FROM client_users cu
JOIN clients c ON c.id = cu.client_id
WHERE c.company = 'Leunis Makelaars'
ORDER BY cu.name;
