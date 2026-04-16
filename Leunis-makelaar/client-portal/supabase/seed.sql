-- Seed data: Leunis Makelaars offerte
-- Voer dit uit in Supabase SQL Editor NA het schema

-- 1. Client aanmaken
INSERT INTO clients (id, email, name, company, phone) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'info@leunis.nl',
  'Arno Leunis',
  'Leunis Makelaars',
  NULL
);

-- 2. Offerte aanmaken
INSERT INTO offertes (id, client_id, title, description, total_amount, status) VALUES (
  'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AI-Implementatie in Sprints',
  'Veilige AI-omgeving, woningbeschrijvingen, bedrijfsvoering en optimalisatie voor Leunis Makelaars.',
  7000.00,
  'verstuurd'
);

-- 3. Sprint 1
INSERT INTO sprints (id, offerte_id, number, title, description, amount, status) VALUES (
  'a1000001-0000-0000-0000-000000000001',
  'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
  1,
  'Veilige AI-Omgeving & Woningbeschrijvingen',
  'Beveiligd intern AI-systeem + op maat gemaakte woningbeschrijvingen-tool',
  2500.00,
  'gepland'
);

-- Sprint 1 deliverables
INSERT INTO deliverables (sprint_id, title, description, status) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Beveiligde AI-omgeving', 'Veilig intern systeem met zakelijke licenties — AVG-compliant, data in EU', 'todo'),
  ('a1000001-0000-0000-0000-000000000001', 'Woningbeschrijvingen-tool', 'Prompt-templates voor Funda-teksten, brochures en social media posts', 'todo'),
  ('a1000001-0000-0000-0000-000000000001', 'Privacy-protocol', 'Documentatie voor klanten: zo gaan wij om met AI en data', 'todo'),
  ('a1000001-0000-0000-0000-000000000001', 'Team-training', 'Hands-on sessie (2 uur) zodat iedereen het systeem zelfstandig kan gebruiken', 'todo'),
  ('a1000001-0000-0000-0000-000000000001', 'Nazorg (1 week)', 'Ondersteuning via WhatsApp/e-mail na oplevering', 'todo');

-- 4. Sprint 2
INSERT INTO sprints (id, offerte_id, number, title, description, amount, status) VALUES (
  'a2000002-0000-0000-0000-000000000002',
  'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
  2,
  'AI voor Bedrijfsvoering',
  'Besluitondersteuning, workflow-automatisering en contentplanning',
  2500.00,
  'gepland'
);

-- Sprint 2 deliverables
INSERT INTO deliverables (sprint_id, title, description, status) VALUES
  ('a2000002-0000-0000-0000-000000000002', 'AI-besluitondersteuning', 'Marktdata-analyse, vergelijkend onderzoek, prijsadvies-ondersteuning', 'todo'),
  ('a2000002-0000-0000-0000-000000000002', 'Workflow-automatisering', 'Vergadernotities, e-mail-templates, documentgeneratie', 'todo'),
  ('a2000002-0000-0000-0000-000000000002', 'Contentplanning', 'AI-ondersteunde social media planning en contentkalender', 'todo'),
  ('a2000002-0000-0000-0000-000000000002', 'Uitbreiding training', 'Team-sessie voor de nieuwe toepassingen', 'todo'),
  ('a2000002-0000-0000-0000-000000000002', 'Nazorg (1 week)', 'Ondersteuning via WhatsApp/e-mail', 'todo');

-- 5. Sprint 3
INSERT INTO sprints (id, offerte_id, number, title, description, amount, status) VALUES (
  'a3000003-0000-0000-0000-000000000003',
  'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
  3,
  'Optimalisatie & Zelfstandigheid',
  'Team volledig zelfstandig maken en systeem optimaliseren',
  2000.00,
  'gepland'
);

-- Sprint 3 deliverables
INSERT INTO deliverables (sprint_id, title, description, status) VALUES
  ('a3000003-0000-0000-0000-000000000003', 'Optimalisatie', 'Verfijning van alle tools op basis van praktijkervaring', 'todo'),
  ('a3000003-0000-0000-0000-000000000003', 'Uitbreiding', 'Nieuwe toepassingen op basis van praktijkbehoeften', 'todo'),
  ('a3000003-0000-0000-0000-000000000003', 'Handleidingen', 'Stap-voor-stap documentatie voor elke toepassing', 'todo'),
  ('a3000003-0000-0000-0000-000000000003', 'AI-routekaart', 'Strategisch plan voor de komende 12 maanden', 'todo'),
  ('a3000003-0000-0000-0000-000000000003', 'Overdracht', 'Eindgesprek + evaluatie — team is zelfstandig', 'todo');
