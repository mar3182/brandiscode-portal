-- Seed: Leunis Makelaars
-- Voer dit uit in de Supabase SQL Editor NADAT schema.sql en migration-sprint-approval.sql zijn uitgevoerd.
-- Pas e-mailadressen en telefoonnummer aan voor productie.

DO $$
DECLARE
  v_client_id UUID;
  v_offerte_id UUID;
  v_sprint_id UUID;
BEGIN

-- 1. Client aanmaken
INSERT INTO clients (name, company, email, phone, sector_raw, sector)
VALUES (
  'Arno Leunis & Henk Sturris',
  'Leunis Makelaars',
  'arno@leunismakelaars.nl',
  '+31 166 604 490',
  'makelaardij',
  'real_estate'
)
ON CONFLICT (email) DO UPDATE SET company = EXCLUDED.company, sector_raw = EXCLUDED.sector_raw, sector = EXCLUDED.sector
RETURNING id INTO v_client_id;

-- 2. Offerte aanmaken
INSERT INTO offertes (client_id, title, description, total_amount, status)
VALUES (
  v_client_id,
  'AI-Implementatie in Sprints — OFR-2026-004-001',
  'Veilige AI-omgeving, woningbeschrijvingen-tool en teamtraining voor Leunis Makelaars.',
  2500.00,
  'getekend'
)
RETURNING id INTO v_offerte_id;

-- 3. Sprint 1 aanmaken
INSERT INTO sprints (offerte_id, number, title, description, amount, status, start_date, end_date)
VALUES (
  v_offerte_id,
  1,
  'Veilige AI-Omgeving & Woningbeschrijvingen',
  'Beveiligd intern AI-systeem via Microsoft 365 Copilot, prompt-templates voor woningbeschrijvingen en teamtraining on-site.',
  2500.00,
  'actief',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '14 days'
)
RETURNING id INTO v_sprint_id;

-- 4. Deliverables aanmaken voor Sprint 1
INSERT INTO deliverables (sprint_id, title, description, status) VALUES
  (v_sprint_id, 'Tijdelijk Microsoft-account aanvragen bij klant', 'Klant maakt consultant-account aan (bijv. consultant@leunismakelaars.nl) met toegang tot M365 admin center', 'todo'),
  (v_sprint_id, 'Microsoft 365-abonnement en Copilot-licenties controleren', 'Checken welk M365-abonnement actief is en of Copilot add-on beschikbaar is', 'todo'),
  (v_sprint_id, 'Copilot-licenties activeren en toewijzen aan medewerkers', 'Via admin.microsoft.com licenties kopen en toewijzen aan alle relevante medewerkers', 'todo'),
  (v_sprint_id, 'Woningbeschrijvingen-agent bouwen in Copilot Studio', 'Agent aanmaken met system prompt voor Funda-tekst, brochure en social media (3 varianten)', 'todo'),
  (v_sprint_id, 'Agent delen met het hele team', 'Via Copilot Studio de agent publiceren naar de organisatie', 'todo'),
  (v_sprint_id, 'Invoerformulier-sjabloon aanmaken in Word', 'Standaard .dotx sjabloon met alle woninginvoer-velden', 'todo'),
  (v_sprint_id, 'Sjabloon opslaan in gedeelde Teams-map', 'Map "AI-Tools / Woningbeschrijvingen" aanmaken en sjabloon erin plaatsen', 'todo'),
  (v_sprint_id, 'Testen met testwoning van klant', 'Samen met Arno of Henk: 2-3 actuele woningen door de agent halen en output vergelijken', 'todo'),
  (v_sprint_id, 'Privacy-protocol schrijven', '1 A4 document: "Zo gaan wij bij Leunis Makelaars om met AI en klantdata" — klaar als PDF', 'todo'),
  (v_sprint_id, 'Verwerkersovereenkomst Microsoft ophalen', 'DPA van Microsoft voor M365 Copilot ophalen en archiveren', 'todo'),
  (v_sprint_id, 'Workshop-presentatie bouwen', 'Presentatie incl. historische intro (drukpers, fiets, etc.) + Copilot demo slides', 'todo'),
  (v_sprint_id, 'Open Huizen Dag cadeau-demo voorbereiden', 'Kant-en-klare prompts voor het plannen van een open huizen dag — als verrassing tijdens training', 'todo'),
  (v_sprint_id, 'Spiekbriefje team opmaken', 'Lamineerbare 1-pager met stap-voor-stap gebruik van de woningbeschrijvings-agent', 'todo'),
  (v_sprint_id, 'Training on-site uitvoeren (2 uur)', 'Workshop bij Leunis Makelaars kantoor Tholen — alle medewerkers aanwezig', 'todo'),
  (v_sprint_id, 'Opleveringspakket overdragen', 'Alle bestanden, documentatie en toegangsgegevens overdragen', 'todo'),
  (v_sprint_id, 'Factuur versturen na oplevering', 'Factuur Sprint 1: €2.500,- excl. BTW, betaaltermijn 14 dagen', 'todo');

END $$;

-- Onboarding vragen voor Leunis Makelaars Sprint 1
-- Voer dit uit NA migration-onboarding.sql

INSERT INTO onboarding_questions (offerte_id, question, hint, answer_type, options, sort_order, is_required)
SELECT
  o.id,
  q.question,
  q.hint,
  q.answer_type::TEXT,
  q.options::JSONB,
  q.sort_order,
  true
FROM offertes o,
(VALUES
  ('Welk Microsoft 365-abonnement hebben jullie?', 'Niet zeker? Kijk op admin.microsoft.com -> Facturering -> Uw producten', 'choice', '["Business Basic", "Business Standard", "Business Premium", "Microsoft 365 Apps", "Weet ik niet"]', 1),
  ('Hoeveel medewerkers krijgen toegang tot Copilot?', 'Denk aan iedereen die woningbeschrijvingen schrijft of e-mails beheert', 'text', NULL, 2),
  ('Wie beheert jullie Microsoft-omgeving?', 'Naam + e-mailadres van de beheerder, of "wij regelen dit zelf"', 'text', NULL, 3),
  ('Hebben jullie al een gedeelde Teams-omgeving?', NULL, 'yesno', NULL, 4),
  ('Welk e-mailadres wil je gebruiken voor het tijdelijke consultant-account?', 'Bijv. consultant@leunismakelaars.nl - dit account verwijderen we na de sprint', 'text', NULL, 5)
) AS q(question, hint, answer_type, options, sort_order)
WHERE o.title LIKE '%OFR-2026-004-001%';
