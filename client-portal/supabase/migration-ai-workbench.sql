-- Migration: Admin AI Workbench (promptversies, evals, admin-testruns)
-- Ref: docs/ADMIN-AI-WORKBENCH-EN-UI-SIMPLIFICATIE.md sectie 2.1
-- Ref: docs/DATA-SAFETY-PROTOCOL.md (Gate 1-3)
--
-- Gate 1 — Impactcheck
--   Geraakte tabellen:
--     - ai_usage_events (ALTER: nieuwe kolom is_admin_test, default false, NOT NULL)
--     - ai_prompt_versions (NIEUW)
--     - ai_eval_cases (NIEUW)
--     - ai_eval_runs (NIEUW)
--   Er wordt GEEN bestaande data overschreven: de ALTER voegt alleen een kolom
--   toe met een default (bestaande rijen krijgen is_admin_test = false, wat
--   feitelijk correct is — het waren allemaal echte klantgebruiksregels).
--   De drie nieuwe tabellen bevatten geen bestaande data.
--   Tenant-isolatie: client_id is nullable FK naar clients(id) (NULL =
--   standaardsjabloon, niet klantgebonden). Er komt bewust GEEN SELECT/INSERT-
--   policy voor gewone (client) rollen — alleen de service-role (admin-client,
--   die RLS omzeilt) mag deze tabellen benaderen. Dit is veilig op productie:
--   idempotent (IF NOT EXISTS overal), additief, geen DROP/DELETE.
--
-- Gate 2 — Tijdens wijziging
--   - Alle DDL is idempotent (IF NOT EXISTS / DO-block voor de kolom-check).
--   - Geen hardcoded klant-IDs.
--   - Geen destructieve SQL.
--
-- Gate 3 — Verificatie (uitvoeren na migratie)
--   -- Bevestig dat client_users-rollen (authenticated, anon) GEEN SELECT-
--   -- toegang hebben tot de drie nieuwe tabellen (verwacht: 0 rijen / rowsecurity = true, geen policies):
--   SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public'
--     AND c.relname IN ('ai_prompt_versions', 'ai_eval_cases', 'ai_eval_runs');
--
--   SELECT schemaname, tablename, policyname, roles
--   FROM pg_policies
--   WHERE tablename IN ('ai_prompt_versions', 'ai_eval_cases', 'ai_eval_runs');
--   -- Verwacht resultaat: 0 rijen (geen policies gedefinieerd -> default-deny voor
--   -- alle rollen behalve service-role, die RLS altijd omzeilt).
--
--   -- Bevestig dat de nieuwe kolom bestaande rijen niet heeft geraakt:
--   SELECT count(*) AS totaal, count(*) FILTER (WHERE is_admin_test) AS admin_test_rijen
--   FROM ai_usage_events;
--   -- Verwacht: admin_test_rijen = 0 direct na migratie.
--
-- MIGRATION PURPOSE: Admin AI Workbench (promptversies, evals, admin-testruns)
-- toevoegen zonder bestaande klantdata te raken; zie sectie Gate 1 hierboven.
-- RISICO: Laag. Alleen additieve DDL (nieuwe kolom met default, nieuwe tabellen).
-- Geen bestaande rijen worden verwijderd of overschreven.
--
-- Rollback-pad (in omgekeerde volgorde van aanmaken)
-- ROLLBACK: onderstaande statements zijn documentatie voor handmatige rollback,
-- niet onderdeel van deze migratie zelf.
--   DROP TABLE IF EXISTS ai_eval_runs;
--   DROP TABLE IF EXISTS ai_eval_cases;
--   DROP TABLE IF EXISTS ai_prompt_versions;
--   ALTER TABLE ai_usage_events DROP COLUMN IF EXISTS is_admin_test;
--   -- Impact van rollback: verlies van promptversie-/evalgeschiedenis en van het
--   -- onderscheid admin-test vs. echt gebruik in ai_usage_events. Geen impact op
--   -- overige klantdata (clients, offertes, sprints, facturen, etc.).

-- Onderscheid admin-testruns van echte klantgebruiksregels
ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS is_admin_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_is_admin_test
  ON ai_usage_events (client_id, is_admin_test, created_at DESC);

-- Promptversies per tool, optioneel per klant (client_id NULL = standaardsjabloon)
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  version_number integer NOT NULL,
  system_prompt text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_scope
  ON ai_prompt_versions (client_id, tool_name, version_number DESC);

-- Maximaal 1 actieve versie per (client_id, tool_name); NULL client_id
-- (standaardsjabloon) wordt via COALESCE als eigen, gedeelde scope behandeld
-- zodat ook daar maar 1 actieve versie per tool mogelijk is.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_prompt_versions_active_per_scope
  ON ai_prompt_versions (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid), tool_name)
  WHERE is_active;

-- Vaste evaluatiecases (bijv. de 10 goedgekeurde Leunis-referentiewoningen)
CREATE TABLE IF NOT EXISTS ai_eval_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  label text NOT NULL,
  input_payload jsonb NOT NULL,
  reference_facts jsonb,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_eval_cases_scope
  ON ai_eval_cases (client_id, tool_name, created_at DESC);

-- Resultaten per evaluatierun
CREATE TABLE IF NOT EXISTS ai_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_case_id uuid NOT NULL REFERENCES ai_eval_cases(id) ON DELETE CASCADE,
  prompt_version_id uuid NOT NULL REFERENCES ai_prompt_versions(id) ON DELETE CASCADE,
  output_text text NOT NULL,
  scores jsonb,
  reviewer text,
  passed boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_eval_runs_case_created_at
  ON ai_eval_runs (eval_case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_eval_runs_prompt_version
  ON ai_eval_runs (prompt_version_id);

-- RLS: alleen service-role (admin-client) mag lezen/schrijven.
-- Bewust GEEN policy voor authenticated/client rollen -> default-deny.
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_eval_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_eval_runs ENABLE ROW LEVEL SECURITY;
