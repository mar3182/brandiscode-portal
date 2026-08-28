# Admin AI Workbench & UI-Simplificatie
**Versie:** 1.0
**Datum:** 28 augustus 2026
**Status:** Voorstel — klaar voor uitvoering na akkoord PM
**Eigenaar:** PM (GitHub Copilot, algemeen manager) namens Brand is Code

## 0. Aanleiding

Twee afzonderlijke, maar samenhangende problemen zijn gesignaleerd:

1. **Geen werkwijze als admin per opdracht.** Voor elke klant bouwt Brand is Code een AI-tool (bijv. woningbeschrijvingen voor Leunis). Er is nu geen plek in het admin-gedeelte om die tool per klant te **bekijken, testen, aanpassen en monitoren** zonder dat dit de klant raakt.
2. **De omgeving oogt onrustig.** Vijf merkkleuren, verlopende StatCards in vier varianten en veertien losse statuskleuren zorgen voor visuele ruis. Gevraagd is een rustigere, duidelijkere UI/UX — met de vraag of Streamlit hiervoor een optie is.

Dit document legt vast **wat** er gebouwd wordt, **waarom** zo, en **wie** (welke agent) welk onderdeel oppakt.

## 1. RFC-0001 alignment (verplicht per RFC-GOVERNANCE)

- **Data First:** de workbench bouwt voort op bestaande tabellen (`client_ai_settings`, `ai_usage_events`); er komt geen schaduwadministratie naast de bestaande.
- **System of Record:** klantconfiguratie blijft in `client_ai_settings`; gebruiksdata blijft in `ai_usage_events`. Nieuwe tabellen (promptversies, evals) zijn uitbreidingen, geen duplicaten.
- **Vendor Independence:** de workbench werkt met de al ondersteunde providers (`openai`/`azure-openai`/`anthropic`/`github-models`) via de bestaande resolver-logica in `ai-usage.ts`; er wordt geen provider hard-coded.
- **Privacy First:** admin-testruns mogen nooit als klantcontent worden opgeslagen of meetellen in het klantquotum.
- **Vendor-onafhankelijkheid van UI-stack:** zie sectie 4 (Streamlit-beslissing) — geen tweede technologiestack voor een kernonderdeel van het product.

## 2. Wat de Admin AI Workbench moet kunnen

| Behoefte (letterlijk gevraagd) | Vertaling naar functionaliteit                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Zien                           | Overzicht per klant: welke AI-tool(s) actief zijn, huidige promptversie, recente uitvoer, kosten deze maand                              |
| Testen                         | Sandbox: dezelfde tool met dezelfde configuratie draaien met testinvoer, zonder dat dit bij de klant verschijnt of het klantquotum raakt |
| Aanpassen/verbeteren           | Promptbeheer: nieuwe promptversie schrijven, vergelijken met de vorige, activeren — met geschiedenis                                     |
| Monitoren                      | Gebruik, kosten, foutpercentage en kwaliteitsscores (evals) in de tijd, per klant                                                        |

### 2.1 Datamodel-uitbreiding (Backend Specialist)

Idempotente migratie, met verificatie- en rollbackpad conform `docs/DATA-SAFETY-PROTOCOL.md`:

```sql
-- Onderscheid admin-testruns van echte klantgebruik
ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS is_admin_test boolean NOT NULL DEFAULT false;

-- Promptversies per tool, optioneel per klant (client_id NULL = standaardsjabloon)
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  tool_name text NOT NULL,
  version_number integer NOT NULL,
  system_prompt text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Vaste evaluatiecases (bijv. de 10 goedgekeurde Leunis-referentiewoningen)
CREATE TABLE IF NOT EXISTS ai_eval_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  tool_name text NOT NULL,
  label text NOT NULL,
  input_payload jsonb NOT NULL,
  reference_facts jsonb,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Resultaten per evaluatierun
CREATE TABLE IF NOT EXISTS ai_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_case_id uuid REFERENCES ai_eval_cases(id),
  prompt_version_id uuid REFERENCES ai_prompt_versions(id),
  output_text text NOT NULL,
  scores jsonb,
  reviewer text,
  passed boolean,
  created_at timestamptz DEFAULT now()
);
```

RLS: alleen service-role (admin-client) mag deze tabellen lezen/schrijven; geen klanttoegang. Verificatiequery na migratie: bevestig dat `client_users`-rollen geen SELECT-rechten krijgen op de drie nieuwe tabellen.

### 2.2 API-uitbreiding (Backend Specialist)

Alle routes achter `requireAdmin()`, met `Cache-Control: no-store`:

- `GET /api/admin/clients/[id]/ai-tools` — overzicht: actieve tool, actieve promptversie, laatste gebruik, kosten deze maand.
- `GET|POST /api/admin/clients/[id]/ai-tools/[tool]/prompt-versions` — lijst/aanmaken; activeren deactiveert de vorige versie.
- `POST /api/admin/clients/[id]/ai-tools/[tool]/test` — genereert output met gekozen promptversie en testinvoer; logt met `is_admin_test = true`; schrijft nooit naar klantzichtbare tabellen.
- `GET|POST /api/admin/ai-tools/evals` — evaluatiecases tonen/uitvoeren tegen een promptversie; scores opslaan.
- `GET /api/admin/clients/[id]/ai-tools/monitoring` — gebruik/kosten/foutpercentage/evalscores in de tijd, afgeleid van `ai_usage_events` (standaard exclusief `is_admin_test`).

### 2.3 UI-uitbreiding (Frontend Developer)

Het bestaande tabblad **"AI Instellingen"** op de klantdetailpagina wordt uitgebreid tot **"AI Tools"** met subnavigatie in plaats van een nieuw hoofdtabblad (voorkomt extra visuele drukte):

```text
AI Tools
├── Overzicht     (huidige status, actieve versie, kosten deze maand)
├── Testen        (sandbox — duidelijk gelabeld "TEST-omgeving, niet zichtbaar voor klant")
├── Promptbeheer  (versiegeschiedenis, vergelijken, activeren)
└── Monitoring    (gebruik/kosten/foutpercentage/evalscores, grafiek)
```

Dit hergebruikt de bestaande tab-architectuur van [admin/clients/[id]/page.tsx](client-portal/src/app/admin/clients/[id]/page.tsx) in plaats van een nieuwe navigatiestructuur te introduceren.

## 3. UI/UX-simplificatie

### 3.1 Wat er nu is (feitelijk vastgesteld)

- 5 merkkleuren (`brand.dark`, `brand.gold`, `brand.blue`, `brand.pink`, `brand.orange`) in actief gebruik.
- `StatCard` heeft 4 kleurvarianten met eigen gradient per kaart.
- `StatusBadge` kent 14 losse statusklassen, elk met eigen kleur.
- Geen animatiebibliotheek — puur Tailwind, wat op zich een goede basis is voor rust.

### 3.2 Simplificatieprincipes (Frontend Developer voert uit, PM keurt tokens vooraf goed)

1. **Eén primaire accentkleur** (goud) voor actiegerichte elementen (knoppen, actieve status, links). Overige merkkleuren alleen nog voor data-visualisatie (bijv. grafieken), niet voor UI-chrome.
2. **Eén oppervlaktestijl**: `glass-card` blijft, maar zonder per-kaart afwijkende gradients — één neutrale variant plus één geaccentueerde variant (voor de belangrijkste KPI).
3. **Statusbadges naar 4 semantische tinten** in plaats van 14 unieke kleuren: neutraal (concept/gepland/todo), in behandeling (verstuurd/bekeken/in_progress/review), positief (getekend/betaald/afgerond/done), aandacht nodig (afgewezen/herinnering). Labeltekst blijft ongewijzigd; alleen de kleurgrammatica wordt consistent.
4. **Minder gelijktijdige signalen per kaart**: niet tegelijk kleur + icoon + gradient + badge voor hetzelfde gegeven.

### 3.3 Uitvoeringsvolgorde (laag risico, omkeerbaar)

1. Frontend Developer levert eerst een kort **ontwerptokens-voorstel** (geen herbouw) ter goedkeuring.
2. Na akkoord: eerst toepassen op het **admin-dashboard en klantdetailpagina** (dagelijks gebruik door jou als eigenaar).
3. Daarna pas op de klant-facing dashboardpagina's, zodat lopende Sprint 1-oplevering voor Leunis niet wordt verstoord.

## 4. Streamlit-beslissing

**Voorstel:** geen Streamlit voor het admin-gedeelte of de AI Workbench. Reden:

1. Supabase Row Level Security is het fundament van de huidige beveiliging (zie architectuurdocumentatie). Een tweede applicatie (Streamlit/Python) zou ofwel eigen authenticatie moeten bouwen, ofwel de service-role sleutel moeten gebruiken — beide verzwakken het bestaande beveiligingsmodel.
2. Twee technologiestacks (Next.js/Vercel + Python/Streamlit) betekent twee deploy- en onderhoudslijnen voor één zelfstandig ondernemer — dat vergroot de kans op drift en fouten, niet kleiner.
3. Bestaande investeringen (Nederlandse foutmeldingen, `no-store`-headers, Adobe Sign, Resend, RLS-patronen) zijn al in Next.js gebouwd; Streamlit zou dit dupliceren, niet vereenvoudigen.

**Wel mogelijk, optioneel en losstaand:** een lokaal Streamlit- of notebook-scriptje dat **alleen leest** uit een geëxporteerde CSV/JSON van evaluatieresultaten (`ai_eval_runs`), voor snelle analyse/grafieken. Geen live databaseverbinding, geen schrijfrechten, geen onderdeel van het product. Dit is optioneel en pas relevant als de workbench data oplevert die je buiten de portal wilt analyseren.

**Conclusie:** de workbench en de simplificatie worden gebouwd binnen de bestaande Next.js/Tailwind-stack.

## 5. Gefaseerd plan met agenttoewijzing

| Fase | Taak                                                                                                                      | Agent                      | Afhankelijk van |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------- |
| A1   | Idempotente migratie: `is_admin_test`, `ai_prompt_versions`, `ai_eval_cases`, `ai_eval_runs` + RLS + verificatie/rollback | Backend Specialist         | —               |
| A2   | Ontwerptokens-voorstel: semantische statuskleuren, één accentkleur, kaartvarianten terugbrengen                           | Frontend Developer         | —               |
| A3   | Beoordelen en goedkeuren A1/A2                                                                                            | PM                         | A1, A2          |
| B1   | Admin-API: overzicht, promptversies CRUD, testendpoint (`is_admin_test=true`, geen klantzichtbare schrijfactie)           | Backend Specialist         | A1              |
| B2   | Eval-API: cases tonen/uitvoeren tegen promptversie, scores opslaan                                                        | Backend Specialist         | A1              |
| C1   | UI: "AI Tools" subnavigatie (Overzicht/Testen/Promptbeheer/Monitoring) met goedgekeurde tokens                            | Frontend Developer         | A3, B1          |
| C2   | UI: Testen-sandbox, duidelijk gelabeld, gescheiden van klantweergave                                                      | Frontend Developer         | B1              |
| C3   | UI: Promptbeheer (versiehistorie/activeren) en Monitoring (grafiek uit `ai_usage_events`)                                 | Frontend Developer         | B1, B2          |
| D1   | Tokens toepassen op admin-dashboard, sidebar, StatusBadge/StatCard                                                        | Frontend Developer         | A3              |
| D2   | Tokens toepassen op klant-facing dashboard (na Sprint 1-oplevering Leunis)                                                | Frontend Developer         | D1              |
| E1   | Data Safety Gates 3-4: typecheck/build, verificatiequeries, RLS-check, productielogcontrole                               | PM                         | B1, B2, C1-C3   |
| E2   | Scope-toets vóór uitrol naar meerdere klanten (schaalbaarheid promptbeheer, onderhoudslast)                               | Brand is Code — Red Teamer | E1              |

**Karakter van deze verandering:** additief en omkeerbaar. Niets aan het bestaande klantproduct wordt vervangen; de workbench is een nieuw, admin-only onderdeel en de UI-tokens worden incrementeel doorgevoerd, te beginnen bij het admin-gedeelte.

## 6. Validatie

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` slagen na elke fase.
2. Verificatiequery: bevestig dat `client_users`-rollen geen toegang hebben tot `ai_prompt_versions`, `ai_eval_cases`, `ai_eval_runs`.
3. Bevestig dat admin-testruns (`is_admin_test = true`) niet meetellen in `checkAiLimit()` voor het klantquotum en niet verschijnen in klant-facing geschiedenis.
4. Handmatige acceptatie: admin doorloopt Overzicht → Testen → Promptbeheer → Monitoring voor minimaal één klant (Leunis) vóór uitrol naar andere klanten.

## Relevante bestanden

- `client-portal/src/app/admin/clients/[id]/page.tsx` — bestaand "AI Instellingen"-tabblad, uit te breiden.
- `client-portal/src/app/api/admin/clients/[id]/ai-settings/route.ts` — bestaande configuratie-API, blijft ongewijzigd naast de nieuwe routes.
- `client-portal/src/lib/ai-usage.ts` — bestaande quotalogica; testruns moeten hier expliciet worden uitgesloten.
- `client-portal/tailwind.config.js`, `client-portal/src/app/globals.css` — huidige designtokens, uitgangspunt voor het simplificatievoorstel.
- `client-portal/src/components/StatCard.tsx`, `client-portal/src/components/StatusBadge.tsx`, `client-portal/src/components/AdminSidebar.tsx` — componenten die worden aangepast.
- `docs/AI-INSTELLINGEN-EN-BILLING-SPEC.md` — bestaande spec waarop dit voorstel voortbouwt, niet mee in tegenspraak.
- `docs/DATA-SAFETY-PROTOCOL.md` — verplichte gates voor alle datawijzigingen in dit plan.
