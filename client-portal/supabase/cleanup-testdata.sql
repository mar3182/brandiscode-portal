-- CLEANUP: Testdata verwijderen uit productie Supabase
-- ========================================================================
-- DOEL: Verwijder alle testdata BEHALVE het echte klantaccount
-- 
-- VOORZORGSMAATREGELEN:
-- 1. Dit is ALLEEN REVIEW — voer NIET uit zonder toezicht
-- 2. Maak eerst een BACKUP van je productie database
-- 3. Controleer de SELECT statements hieronder goed
-- 4. Testdata filter: bedrijfsnaam LIKE '%Test%' of '%test%' of companyname = 'Test BV'
-- 5. Behoud: mar3182@zeelandnet.nl en gerelateerde data
-- 
-- VOLGORDE: DELETE statements in foreign-key-respecting volgorde
-- ========================================================================

-- STAP 0: PREVIEW — Wat gaat er verwijderd worden?
-- ========================================================================

-- PREVIEW: Testdata te verwijderen
-- ================================

-- 1. Testclients (bedrijven):
SELECT 
  id, 
  name, 
  company, 
  email, 
  created_at 
FROM clients 
WHERE (company ILIKE '%test%' OR company = 'Test BV')
  AND email != 'mar3182@zeelandnet.nl'
LIMIT 20;

-- 2. Trainingsintakes gekoppeld aan testclients:
SELECT 
  ti.id, 
  ti.status, 
  c.company, 
  ti.created_at 
FROM training_intakes ti
JOIN clients c ON ti.client_id = c.id
WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
  AND c.email != 'mar3182@zeelandnet.nl';

-- 3. Trainingsessies gekoppeld aan testintakes:
SELECT 
  ts.id, 
  ts.status, 
  c.company, 
  ts.created_at 
FROM training_sessions ts
JOIN training_intakes ti ON ts.intake_id = ti.id
JOIN clients c ON ti.client_id = c.id
WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
  AND c.email != 'mar3182@zeelandnet.nl';

-- 4. Trainingsintake leden:
SELECT 
  tm.id, 
  tm.full_name, 
  c.company, 
  tm.created_at 
FROM training_intake_members tm
JOIN clients c ON tm.client_id = c.id
WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
  AND c.email != 'mar3182@zeelandnet.nl';

-- 5. Offertes gekoppeld aan testclients:
SELECT 
  o.id, 
  o.title, 
  c.company, 
  o.status, 
  o.created_at 
FROM offertes o
JOIN clients c ON o.client_id = c.id
WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
  AND c.email != 'mar3182@zeelandnet.nl';

-- 6. Teamleden (client_users) van testclients:
SELECT 
  cu.id, 
  cu.email, 
  cu.name, 
  cu.role, 
  c.company 
FROM client_users cu
JOIN clients c ON cu.client_id = c.id
WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
  AND c.email != 'mar3182@zeelandnet.nl';

-- ========================================================================
-- STAP 1: DELETE in correct order (respecting foreign keys)
-- ========================================================================
-- 
-- Foreign key dependency tree:
--   clients (root)
--     ├─ offertes → sprints → deliverables
--     ├─ offertes → onboarding_questions → onboarding_answers
--     ├─ training_intakes → training_sessions
--     ├─ training_intakes → training_intake_members
--     ├─ training_intakes (UNIQUE constraint: one per client)
--     ├─ feedback
--     └─ client_users

-- 
-- DELETE statements (voer handmatig uit na review):
-- ==================================================

-- 1. Delete training_sessions
-- -- 1. Training sessies verwijderen
DELETE FROM training_sessions 
WHERE intake_id IN (
  SELECT ti.id FROM training_intakes ti
  JOIN clients c ON ti.client_id = c.id
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 2. Delete training_intake_members
-- -- 2. Training intake leden verwijderen
DELETE FROM training_intake_members 
WHERE client_id IN (
  SELECT c.id FROM clients c
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 3. Delete training_intakes
-- -- 3. Training intakes verwijderen
DELETE FROM training_intakes 
WHERE client_id IN (
  SELECT c.id FROM clients c
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 4. Delete onboarding_answers
-- -- 4. Onboarding antwoorden verwijderen
DELETE FROM onboarding_answers 
WHERE client_id IN (
  SELECT c.id FROM clients c
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 5. Delete onboarding_questions (via offertes)
-- -- 5. Onboarding vragen verwijderen
DELETE FROM onboarding_questions 
WHERE offerte_id IN (
  SELECT o.id FROM offertes o
  JOIN clients c ON o.client_id = c.id
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 6. Delete deliverables
-- -- 6. Deliverables verwijderen
DELETE FROM deliverables 
WHERE sprint_id IN (
  SELECT s.id FROM sprints s
  JOIN offertes o ON s.offerte_id = o.id
  JOIN clients c ON o.client_id = c.id
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 7. Delete sprints
-- -- 7. Sprints verwijderen
DELETE FROM sprints 
WHERE offerte_id IN (
  SELECT o.id FROM offertes o
  JOIN clients c ON o.client_id = c.id
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 8. Delete offertes
-- -- 8. Offertes verwijderen
DELETE FROM offertes 
WHERE client_id IN (
  SELECT c.id FROM clients c
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 9. Delete feedback
-- -- 9. Feedback verwijderen
DELETE FROM feedback 
WHERE client_id IN (
  SELECT c.id FROM clients c
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 10. Delete client_users (teamleden)
-- -- 10. Teamleden (client_users) verwijderen
DELETE FROM client_users 
WHERE client_id IN (
  SELECT c.id FROM clients c
  WHERE (c.company ILIKE '%test%' OR c.company = 'Test BV')
    AND c.email != 'mar3182@zeelandnet.nl'
);

-- 11. Delete clients (last)
-- -- 11. Testclients verwijderen
DELETE FROM clients 
WHERE (company ILIKE '%test%' OR company = 'Test BV')
  AND email != 'mar3182@zeelandnet.nl';

-- ========================================================================
-- STAP 2: VERIFY — Controleer wat overgebleven is
-- ========================================================================

-- 
-- VERIFY: Nog aanwezige data:
-- ============================

-- 1. Remaining clients:
SELECT COUNT(*) as total_clients FROM clients;

-- 2. Remaining offertes:
SELECT COUNT(*) as total_offertes FROM offertes;

-- 3. Remaining training_intakes:
SELECT COUNT(*) as total_intakes FROM training_intakes;

-- 4. Remaining training_sessions:
SELECT COUNT(*) as total_sessions FROM training_sessions;

-- 5. Bevestig: mar3182@zeelandnet.nl is nog present:
SELECT id, email, company FROM clients WHERE email = 'mar3182@zeelandnet.nl';

-- ========================================================================
-- KLAAR
-- ========================================================================
