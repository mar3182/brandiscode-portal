# Opruimtaak: ESLint-configuratie & bestaande lintfouten
**Versie:** 1.0
**Datum:** 28 augustus 2026
**Status:** Plan — nog niet uitgevoerd, ter goedkeuring PM
**Aanleiding:** ontdekt tijdens validatie van de Admin AI Workbench (zie `docs/ADMIN-AI-WORKBENCH-EN-UI-SIMPLIFICATIE.md`)

## 0. Wat er is gevonden

`client-portal` heeft **geen gecommit `.eslintrc.json`**. Toen `npm run lint` voor het eerst interactief werd doorlopen, bleek dat `npm run build` (die `next lint` intern aanroept) **faalt met exit code 1** zodra er wél een ESLint-configuratie aanwezig is — er staan tientallen bestaande fouten in de code die nooit eerder lokaal zijn blootgelegd.

**Belangrijk om vast te stellen, niet aan te nemen:** de CI-workflow ([.github/workflows/01-pr-checks.yml](.github/workflows/01-pr-checks.yml)) draait `npm run lint` als verplichte gate op elke PR. Als daar ook geen `.eslintrc.json` gecommit staat, is onduidelijk of die stap in CI ooit echt heeft gefaald, stilzwijgend is geslaagd met een ander default-gedrag, of nooit non-interactief goed heeft gewerkt. Dit moet eerst geverifieerd worden voordat we concluderen dat dit "altijd al kapot was".

**Wat we NIET doen:** blind tientallen ongerelateerde bestanden aanpassen. Dit plan behandelt de opruiming als een eigen, aparte werkstroom — niet vermengd met de AI Workbench-taak.

## 1. Volledige foutenlijst (uit de daadwerkelijke lint-run van vandaag)

| #      | Bestand                                         | Regel(s)                                                      | Type                                         | Risico van fix                                                                                                                                  |
| ------ | ----------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | `src/app/admin/clients/[id]/page.tsx`           | 1972, 2282                                                    | `react-hooks/exhaustive-deps` (waarschuwing) | Laag-middel — dependency toevoegen kan extra re-renders/refetches veroorzaken, per geval beoordelen                                             |
| 2      | `src/app/admin/facturen/page.tsx`               | 38:44                                                         | `no-explicit-any`                            | Laag                                                                                                                                            |
| 3      | `src/app/admin/offertes/page.tsx`               | 27:44                                                         | `no-explicit-any`                            | Laag                                                                                                                                            |
| 4      | `src/app/admin/page.tsx`                        | 22, 38, 39, 40, 71, 84, 85, 134                               | `no-explicit-any` (8x)                       | Laag                                                                                                                                            |
| 5      | `src/app/admin/training-intakes/page.tsx`       | 23:42                                                         | `no-explicit-any`                            | Laag                                                                                                                                            |
| 6      | `src/app/api/admin/facturen/route.ts`           | 34, 122                                                       | `no-explicit-any`                            | Laag                                                                                                                                            |
| 7      | `src/app/api/admin/onboarding/route.ts`         | 14, 115, 116(×2), 126, 147, 161, 166, 167, 206, 245, 266, 267 | `no-explicit-any` (9x) + `prefer-const` (3x) | Laag — grootste concentratie, wel meeste tijd                                                                                                   |
| 8      | `src/app/api/facturen/route.ts`                 | 37:62                                                         | `no-explicit-any`                            | Laag                                                                                                                                            |
| 9      | `src/app/dashboard/funda-tekst/page.tsx`        | 1301:38                                                       | `react-hooks/rules-of-hooks`                 | **Hoog** — dit is een echte correctheidsfout (hook aangeroepen binnen een callback), niet alleen stijl. Raakt de Sprint 1-kerntool voor Leunis. |
| 10     | `src/app/dashboard/offertes/[id]/page.tsx`      | 8, 261                                                        | `no-unused-vars` (2x)                        | Laag                                                                                                                                            |
| 11     | `src/app/dashboard/page.tsx`                    | 75:50                                                         | `no-explicit-any`                            | Laag                                                                                                                                            |
| 12     | `src/app/debug/page.tsx`                        | 7, 108(×4)                                                    | `no-explicit-any` + `no-unescaped-entities`  | Laag — debugpagina, geen klantimpact                                                                                                            |
| 13     | `src/app/diagnostic/page.tsx`                   | 7:40                                                          | `no-explicit-any`                            | Laag                                                                                                                                            |
| 14     | `src/app/login/wachtwoord-vergeten/page.tsx`    | 57:26                                                         | `no-explicit-any`                            | Laag                                                                                                                                            |
| 15     | `src/app/wachtwoord-wijzigen/page.tsx`          | 14:9                                                          | `no-unused-vars`                             | Laag                                                                                                                                            |
| 16     | `src/components/AdminSidebar.tsx`               | 24, 39                                                        | `no-explicit-any`                            | Laag                                                                                                                                            |
| 17     | `src/components/Sidebar.tsx`                    | 54:19                                                         | `no-explicit-any`                            | Laag                                                                                                                                            |
| 18     | `src/lib/adminClientsFlow.ts`                   | 137:96                                                        | `no-unused-vars`                             | Laag                                                                                                                                            |
| 19     | `src/lib/generateFactuurPDF.ts`                 | 29, 101                                                       | `no-unused-vars` (2x)                        | Laag                                                                                                                                            |
| ~~20~~ | ~~`src/app/api/admin/ai-tools/evals/route.ts`~~ | ~~44:7~~                                                      | ~~`prefer-const`~~                           | **Al opgelost** (bestand van vandaag, tijdens Workbench-validatie)                                                                              |

**Totaal:** circa 45 losse meldingen in 18 bestanden, waarvan 1 een echte functionele bug (#9) en de rest stijl-/typeringskwesties. Dit is een schending van projectregel 4 ("Geen `any`") die kennelijk lange tijd niet werd afgedwongen.

## 1A. Stap 0 — Resultaat (uitgevoerd 28 augustus 2026)

**Bevinding 1:** `client-portal` heeft nooit een `.eslintrc.json` gehad. De twee git-commits die ooit `.eslintrc*`-bestanden raakten, horen bij een volledig andere, niet-gerelateerde monorepo (`packages/backend`/`frontend`, React/Vite/Express) die toevallig in dezelfde Desktop-map als git-repo staat.

**Bevinding 2:** de workflow `PR Quality & Security Gates` ([.github/workflows/01-pr-checks.yml](.github/workflows/01-pr-checks.yml)) heeft **nog nooit gedraaid** — hij triggerde uitsluitend op `pull_request`, terwijl er in de praktijk altijd rechtstreeks naar `main` wordt gepusht.

**Bevinding 3 (urgenter, apart van lint):** als rechtstreeks gevolg hiervan blokkeerde de **Production CD Pipeline** ([.github/workflows/03-production-cd.yml](.github/workflows/03-production-cd.yml)) minstens 15 opeenvolgende pushes over 3+ dagen. De stap "Verify all required status checks passed" vraagt via `github.rest.checks.listForRef` de check-runs op voor de exacte commit-SHA en eist 8 met naam genoemde checks (waaronder `Lint & Code Quality`, `Build Artifact`, `Type Safety Check`) met `conclusion: success`. Omdat `01-pr-checks.yml` nooit voor die SHA draaide (geen PR-event), bestonden die check-runs nooit → deploy terecht geblokkeerd, maar onbedoeld.

**Doorgevoerde fix (klein, additief, omkeerbaar):** `01-pr-checks.yml` triggert nu ook op `push: branches: [main]`, zodat elke rechtstreekse push naar `main` alsnog de 8 vereiste checks op die commit genereert. Bijkomende correctie: `concurrency.group` viel terug op een lege `github.head_ref` bij push-events; dit valt nu terug op `github.ref_name`. **Nog niet gecommit/gepusht** — ter review, zie diff in `.github/workflows/01-pr-checks.yml`.

**Nog niet geverifieerd (vraagt Vercel-dashboardtoegang die hier ontbreekt):** of portal.brandiscode.com via Vercel's eigen git-integratie los van deze Action toch is bijgewerkt de afgelopen 3 dagen. Aanbevolen: dit handmatig controleren (laatste deploy-commit in Vercel vergelijken met laatste `main`-commit) zodra de fix hierboven is gepusht.

**Optionele vervolgstap (niet uitgevoerd, aparte beslissing):** branch protection op `main` instellen die de 8 checks verplicht vóór mergen, in combinatie met altijd via feature branches + PR's werken. Dit voorkomt dat risicovolle code ooit op `main` komt, niet alleen dat hij niet wordt gedeployed. Dit is een grotere workflowverandering (geen directe pushes meer mogelijk) en wordt hier bewust niet zelf geactiveerd.

## 1B. Vervolgbevinding na de eerste live-test (28 augustus 2026, na push `cb50394`)

Na het pushen van de Stap 0-fix bleek dat "PR Quality & Security Gates" inderdaad triggerde (de fix werkt), maar **3 losstaande, nieuwe problemen** aan het licht kwamen — geen van alle onderdeel van de eerder genoemde 45 lintmeldingen:

1. **`Setup & Cache Dependencies` faalt fundamenteel.** De stap draait `npm ci --workspaces --if-present` op repo-root, gevolgd door `cd client-portal && npm ci` en `cd ../brandiscode && npm ci || true`. Er bestaat **geen root-`package.json`** en **geen `brandiscode/`-map** in deze repository. Dit is onmogelijk om ooit te laten slagen — de workflow lijkt geschreven (of gekopieerd) voor een heel andere monorepo-structuur dan wat hier daadwerkelijk staat. **Conclusie: de volledige CI-kwaliteitspijplijn heeft vermoedelijk nog nooit één keer succesvol gedraaid sinds het aanmaken van dit bestand**, los van de ontbrekende push-trigger uit 1A.
2. **GitGuardian secretscan faalt met "Invalid GitGuardian API key."** De `GITGUARDIAN_API_KEY`-secret in de GitHub-repo-instellingen ontbreekt of is ongeldig. Dit kan alleen door jou opgelost worden (nieuwe/geldige sleutel aanmaken bij GitGuardian en als repo-secret instellen), of bewust worden overgeslagen als je geen GitGuardian gebruikt.
3. **Mijn eigen `migration-ai-workbench.sql` werd terecht gemarkeerd** door de migratie-veiligheidscheck: die zoekt letterlijk naar `-- MIGRATION PURPOSE:`, `-- ROLLBACK:`, `-- RISICO:` zodra `DROP TABLE` ergens in het bestand voorkomt (ook in documentatie-commentaar). **Al opgelost** — de exacte markers zijn toegevoegd, lokaal geverifieerd met dezelfde grep-logica als de CI-check.

**Impact:** dit is groter dan de oorspronkelijke opruimtaak. De structurele `npm ci`-fout blokkeert **elke toekomstige push** volledig, ongeacht lintstatus. Aanbevolen aanpak, in volgorde:

1. **`Install dependencies`-stap in `01-pr-checks.yml` corrigeren naar de werkelijke structuur.** **Doorgevoerd (28 augustus 2026):** `npm ci --workspaces --if-present` en de `brandiscode/`-fallback verwijderd; de stap draait nu alleen `cd client-portal && npm ci`. Downstream jobs (lint, typecheck, test, build, dependency-check) deden dit al correct — alleen de `setup`-job had de fout. De harmless cache-padverwijzingen naar `brandiscode/node_modules` in de overige jobs zijn bewust ongemoeid gelaten (geen fout, `actions/cache` slaat ontbrekende paden simpelweg over).
2. GitGuardian-sleutel: door jou te leveren of bewust de stap tijdelijk niet-blokkerend te maken (aparte beslissing, geen technische keuze). **Doorgevoerd (28 augustus 2026):** `continue-on-error: true` toegevoegd aan de "Run GitGuardian"-stap, met een comment dat dit tijdelijk is totdat een geldige `GITGUARDIAN_API_KEY`-secret is ingesteld. TruffleHog (de andere secretscan in dezelfde job) blijft onaangetast en blijft wél blokkerend.
3. Pas daarna verdergaan met Stap 1 t/m 5 van dit document (de 45 lintmeldingen), want die zijn nu pas voor het eerst *daadwerkelijk* te zien zodra de pipeline voorbij `setup` komt.

**Extra bevindingen tijdens verificatie (28 augustus 2026), na live pipeline-run op commit `868005d`:**
- De metadata-comments (`-- MIGRATION PURPOSE:` / `-- RISICO:` / `-- ROLLBACK:`) in `migration-ai-workbench.sql` bleken alleen lokaal aangepast en nooit gecommit te zijn — `Database Migration Safety Validation` faalde daardoor alsnog. **Gefixt in commit `8d1e391`.**
- `actions/upload-artifact@v3` (gebruikt in zowel `01-pr-checks.yml` als `03-production-cd.yml`) wordt sinds april 2024 door GitHub automatisch als failure behandeld (deprecated), waardoor `Dependency Vulnerability Scan` en `Build Artifact` faalden. **Gefixt in commit `ef538ae`**, omgezet naar `@v4`.

**Status na alle fixes (run [33155266984](https://github.com/mar3182/brandiscode-portal/actions/runs/33155266984)):** alle jobs slagen behalve `Lint & Code Quality` — precies de reeds geplande Stap 1 t/m 5 hieronder (de 45 bekende lintmeldingen). De CI-infrastructuur zelf is nu gezond en levert voor het eerst betrouwbare signalen.

## 2. Volgorde van aanpak (risico-gebaseerd, niet bestandsvolgorde)

### Stap 0 — CI-status verifiëren (verplicht, eerst) — ✅ afgerond, zie 1A hierboven

### Stap 1 — De echte bug eerst, geïsoleerd (#9)
`funda-tekst/page.tsx` is de Sprint 1-kerntool voor Leunis. Dit wordt apart gedaan, met een korte handmatige regressietest (genereer een testwoning vóór en na de fix, vergelijk output) vóórdat verder wordt gegaan met de rest. Geen combinatie met de mechanische opruiming, om oorzaak en gevolg niet te vermengen.

### Stap 2 — Triviale, nul-risico fixes (batch)
`prefer-const`, `no-unused-vars`, `no-unescaped-entities` — mechanisch, geen gedragswijziging. In één batch per map (`api/*` → Backend Specialist, overige pagina's/componenten → Frontend Developer).

### Stap 3 — `no-explicit-any` vervangen door echte types (batch, grootste volume)
Per bestand het juiste type bepalen (meestal een bestaand type uit `src/lib/types.ts`, of een nieuw, klein interface toevoegen als het echt ontbreekt). Gesplitst:
- API-routes (`api/admin/facturen`, `api/admin/onboarding`, `api/facturen`) → Backend Specialist.
- Pagina's/componenten (`admin/*`, `dashboard/*`, `AdminSidebar.tsx`, `Sidebar.tsx`, `debug/*`, `diagnostic/*`, `login/*`) → Frontend Developer.

### Stap 4 — `react-hooks/exhaustive-deps`-waarschuwingen (#1, laatst, meeste zorgvuldigheid)
Per geval beoordelen of de ontbrekende dependency toevoegen veilig is (geen extra fetch-loops). Alleen aanpakken nadat stap 1-3 zijn gevalideerd, zodat een eventuele regressie hier niet vermengd raakt met de rest.

### Stap 5 — Commit een definitieve `.eslintrc.json`
Pas nadat bovenstaande stappen zijn afgerond: commit een expliciete, niet-interactieve ESLint-configuratie zodat CI en lokale runs deterministisch zijn (geen prompt meer, geen verrassingen bij de volgende ontwikkelaar).

## 3. Agenttoewijzing

| Stap | Taak                                                                             | Agent              |
| ---- | -------------------------------------------------------------------------------- | ------------------ |
| 0    | CI-lint-geschiedenis en aanwezigheid `.eslintrc` op `main` verifiëren            | PM                 |
| 1    | Hook-bug in `funda-tekst/page.tsx` fixen + handmatige regressietest              | Frontend Developer |
| 2    | Triviale fixes in `api/*`                                                        | Backend Specialist |
| 2    | Triviale fixes in pagina's/componenten                                           | Frontend Developer |
| 3    | `any` → echte types in `api/*`                                                   | Backend Specialist |
| 3    | `any` → echte types in pagina's/componenten                                      | Frontend Developer |
| 4    | `exhaustive-deps`-waarschuwingen, per geval beoordeeld                           | Frontend Developer |
| 5    | Definitieve `.eslintrc.json` committen                                           | Backend Specialist |
| —    | Eindcontrole: `npx tsc --noEmit`, `npm run lint`, `npm run build` allemaal groen | PM                 |

**Karakter:** additief/correctief, geen architectuurwijziging. Losstaand van de AI Workbench-taak — kan parallel lopen zodra jij akkoord geeft, maar wordt niet door dezelfde agentaanroep gedaan om scopevermenging te voorkomen.

## 4. Validatie

1. Na stap 1: handmatige vergelijking van Funda-tekst-output vóór/na fix (zelfde testinvoer).
2. Na elke stap: `npx tsc --noEmit` moet slagen.
3. Na stap 5: `npm run lint` en `npm run build` moeten allebei slagen zonder interactieve prompt (non-interactief te testen, bijv. met `CI=true npm run build`).
4. Geen wijziging aan gedrag die niet expliciet in deze lijst staat.

## Relevante bestanden
- `.github/workflows/01-pr-checks.yml` — CI-lintgate, status te verifiëren in stap 0.
- `client-portal/src/app/dashboard/funda-tekst/page.tsx` — enige functionele bug (#9).
- Overige 17 bestanden uit sectie 1 — mechanische fixes.
