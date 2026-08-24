-- ============================================================
-- Seed: Leunis Makelaars — Sprint 2 & Sprint 3
-- Idempotent: veilig meerdere keren uitvoeren
-- Gebruik: Supabase SQL Editor (geen DROP, geen DELETE)
-- Client ID:  81762635-6e58-4731-b88a-9960bfe03983
-- Offerte ID: 4593b86d-797a-4c8c-8e67-f671285e4194
-- Sprint 1 ID (bestaand): abf01b3a-06b7-4372-ad55-78100b50ca98
-- ============================================================

DO $$
DECLARE
  v_client_id  UUID := '81762635-6e58-4731-b88a-9960bfe03983';
  v_offerte_id UUID := '4593b86d-797a-4c8c-8e67-f671285e4194';
  v_sprint2_id UUID;
  v_sprint3_id UUID;
BEGIN

  -- --------------------------------------------------------
  -- SPRINT 2 — AI voor Bedrijfsvoering
  -- --------------------------------------------------------
  -- Controleer of Sprint 2 al bestaat
  SELECT id INTO v_sprint2_id
  FROM sprints
  WHERE offerte_id = v_offerte_id
    AND number = 2
  LIMIT 1;

  IF v_sprint2_id IS NULL THEN
    INSERT INTO sprints (offerte_id, number, title, description, amount, status, start_date, end_date)
    VALUES (
      v_offerte_id,
      2,
      'AI voor Bedrijfsvoering',
      'AI inzetten voor besluitondersteuning, marktanalyse, workflow-automatisering en contentplanning.',
      2500.00,
      'gepland',
      '2026-08-01',
      '2026-08-14'
    )
    RETURNING id INTO v_sprint2_id;

    -- Deliverables Sprint 2
    INSERT INTO deliverables (sprint_id, title, description, status) VALUES
      (v_sprint2_id, 'AI-besluitondersteuning inrichten', 'Marktdata-analyse, vergelijkend onderzoek, prijsadvies-ondersteuning — alles binnen de beveiligde M365-omgeving', 'todo'),
      (v_sprint2_id, 'Automatische vergadernotities activeren', 'Microsoft 365 Copilot meeting summary instellen voor alle relevante medewerkers', 'todo'),
      (v_sprint2_id, 'E-mail-template bibliotheek aanmaken', 'Prompt-templates voor terugkerende e-mailsoorten: bezichtigingsbevestiging, bod-terugkoppeling, oplevering', 'todo'),
      (v_sprint2_id, 'Documentgeneratie instellen (brochures)', 'Copilot Studio agent voor automatische brochure-opmaak op basis van woningdata', 'todo'),
      (v_sprint2_id, 'Contractsjablonen koppelen aan AI', 'Standaard contractonderdelen ophaalbaar via Copilot — teamleden vullen alleen klantspecifieke velden in', 'todo'),
      (v_sprint2_id, 'Social media contentplanning opzetten', 'AI-ondersteunde contentkalender: wekelijks 3-5 posts op basis van actueel aanbod', 'todo'),
      (v_sprint2_id, 'Uitbreiding training on-site uitvoeren', 'Hands-on sessie (1,5 uur) voor nieuwe AI-toepassingen met het volledige team', 'todo'),
      (v_sprint2_id, 'Nazorg week 2 (WhatsApp/e-mail)', '1 week opvolging na oplevering voor vragen en aanpassingen', 'todo'),
      (v_sprint2_id, 'Factuur Sprint 2 versturen', 'Factuur Sprint 2: €2.500,- excl. BTW, betaaltermijn 14 dagen', 'todo');

    RAISE NOTICE 'Sprint 2 aangemaakt: %', v_sprint2_id;
  ELSE
    RAISE NOTICE 'Sprint 2 bestaat al (id: %) — overgeslagen', v_sprint2_id;
  END IF;

  -- --------------------------------------------------------
  -- SPRINT 3 — Optimalisatie & Zelfstandigheid
  -- --------------------------------------------------------
  -- Controleer of Sprint 3 al bestaat
  SELECT id INTO v_sprint3_id
  FROM sprints
  WHERE offerte_id = v_offerte_id
    AND number = 3
  LIMIT 1;

  IF v_sprint3_id IS NULL THEN
    INSERT INTO sprints (offerte_id, number, title, description, amount, status, start_date, end_date)
    VALUES (
      v_offerte_id,
      3,
      'Optimalisatie & Zelfstandigheid',
      'Verfijning van alle tools op basis van praktijkervaring, nieuwe toepassingen en volledige overdracht aan het team.',
      2000.00,
      'gepland',
      '2026-08-22',
      '2026-09-04'
    )
    RETURNING id INTO v_sprint3_id;

    -- Deliverables Sprint 3
    INSERT INTO deliverables (sprint_id, title, description, status) VALUES
      (v_sprint3_id, 'Gebruiksdata Sprint 1 & 2 analyseren', 'Bekijken welke tools het meest gebruikt worden, waar pijnpunten zitten en wat verfijning nodig heeft', 'todo'),
      (v_sprint3_id, 'Prompt-templates optimaliseren', 'Verfijning van woningbeschrijvings-agent en alle e-mail/document-templates op basis van 4 weken praktijkervaring', 'todo'),
      (v_sprint3_id, 'Nieuwe toepassingen implementeren', 'Op basis van teamfeedback: maximaal 2 nieuwe AI-toepassingen die in de praktijk zijn opgekomen', 'todo'),
      (v_sprint3_id, 'Stap-voor-stap handleidingen schrijven', 'Per tool een helder document zodat ook nieuwe medewerkers zelfstandig aan de slag kunnen', 'todo'),
      (v_sprint3_id, 'AI-routekaart 12 maanden opstellen', 'Strategisch plan: welke AI-kansen staan op de horizon voor Leunis Makelaars?', 'todo'),
      (v_sprint3_id, 'Kennisbank opslaan in Teams', 'Alle handleidingen, sjablonen en routekaart archiveren in de gedeelde Teams-map "AI-Tools"', 'todo'),
      (v_sprint3_id, 'Eindgesprek & evaluatie on-site', 'Eindgesprek met Arno en Henk: terugblik, resultaten, zelfstandigheidsbeoordeling', 'todo'),
      (v_sprint3_id, 'Officiële overdracht afronden', 'Alle toegangsgegevens, documentatie en ownership-overdracht voltooien — team is zelfstandig', 'todo'),
      (v_sprint3_id, 'Factuur Sprint 3 versturen', 'Factuur Sprint 3: €2.000,- excl. BTW, betaaltermijn 14 dagen', 'todo');

    RAISE NOTICE 'Sprint 3 aangemaakt: %', v_sprint3_id;
  ELSE
    RAISE NOTICE 'Sprint 3 bestaat al (id: %) — overgeslagen', v_sprint3_id;
  END IF;

END $$;

-- ============================================================
-- Verificatie: controleer resultaat na uitvoering
-- ============================================================
SELECT
  s.number,
  s.title,
  s.amount,
  s.status,
  s.start_date,
  s.end_date,
  COUNT(d.id) AS deliverables_count
FROM sprints s
LEFT JOIN deliverables d ON d.sprint_id = s.id
WHERE s.offerte_id = '4593b86d-797a-4c8c-8e67-f671285e4194'
GROUP BY s.id, s.number, s.title, s.amount, s.status, s.start_date, s.end_date
ORDER BY s.number;
