# HANDOFF-SPECIALIST-CICD-EXECUTION

## 1) Doel
Maak de bestaande CI/CD-opzet daadwerkelijk production-grade en uitvoerbaar voor dit platform (website + klantenportaal), zonder fake-success paden en met harde quality/security gates.

## 2) Huidige status (overname)
- Branch: `release/client-profile-hardening`
- Relevante commits op deze branch:
  - `d173d805` — client profile module + migration + validatie
  - `6d5dc624` — CI/CD docs + workflows + handoff package
- Bestaande basisdocumentatie aanwezig:
  - `docs/HANDOFF-HARDENING.md`
  - `docs/CI-CD-ARCHITECTURE.md`
  - `docs/CI-CD-README.md`
  - `docs/PRODUCTION-RELEASE-CHECKLIST.md`
  - `docs/runbooks/release.md`
  - `docs/runbooks/rollback.md`
  - `docs/runbooks/incident-response.md`

## 3) Kritieke bevindingen die jij moet oplossen
1. PR quality gates zijn nu te permissief (foutgedrag kan nog doorlekken).
2. Migration-check gebruikt fout pad voor dit project.
3. Staging CD en production CD bevatten placeholder/simulatie gedrag.
4. Production prechecks valideren niet correct dat required checks geslaagd zijn.
5. Rollback-pad bevat geen harde, verifieerbare execution flow.
6. GitHub API calls worden op sommige events in verkeerde context gebruikt.
7. Handmatige GitHub setup-stappen zijn beschreven, maar niet technisch afgedwongen in workflows.

## 4) Scope van jouw uitvoering
Je werkt minimaal in deze bestanden:
- `.github/workflows/01-pr-checks.yml`
- `.github/workflows/02-staging-cd.yml`
- `.github/workflows/03-production-cd.yml`
- `docs/HANDOFF-HARDENING.md` (alleen actualiseren als fixes afwijken)
- `docs/CI-CD-README.md` (setup/secrets/required env vars finaliseren)

## 5) Must-have uitkomsten
1. **Hard-fail quality gates**
   - PR moet blokkeren op lint/typecheck/tests/build/security/migration-safety failures.
2. **Correct migration path**
   - Validatie moet gericht zijn op `client-portal/supabase/migration-*.sql`.
3. **Geen fake deployment success**
   - Placeholder success stappen vervangen door echte flow of expliciete fail-safe wanneer infra ontbreekt.
4. **Correct event-context gedrag**
   - Geen issue-comment acties in push/tag context zonder issue.
   - Gebruik job summaries en/of deployment status APIs passend bij event type.
5. **Production gate correctness**
   - Required checks en branch/tag eligibility correct afdwingen.
6. **Rollback uitvoerbaar**
   - Bij failure: duidelijke, verifieerbare rollback actie of harde fail met exacte runbook/actiepad.
7. **Secrets hygiene**
   - Geen secrets in logs.
   - Alle vereiste secrets expliciet gedocumenteerd.

## 6) Onbekenden die je eerst moet vastleggen
Voordat je CD-finalisatie doet, leg expliciet vast:
1. Staging target: Vercel, container host, SSH server of anders.
2. Production deploy target: idem.
3. Database beheerflow: Supabase managed flow en backup/restore methode.
4. Welke smoke endpoints als contract gelden voor go/no-go.

Als deze niet bekend zijn, implementeer een **fail-safe mode**:
- Workflow moet expliciet stoppen met heldere melding dat deployment target ontbreekt,
- en mag niet groen eindigen op simulatie.

## 7) Validatie die jij moet uitvoeren
1. Intentionele PR failure test (lint of test laten falen) en aantonen dat merge wordt geblokkeerd.
2. Migration safety test op bestand in `client-portal/supabase/`.
3. Staging workflow test met echte variabelen of fail-safe stop.
4. Production workflow dry-run via `workflow_dispatch` met approval gate validatie.

## 8) Gevraagde oplevering
Lever in je eindrapport:
1. Gewijzigde bestanden + korte rationale per bestand.
2. Wat exact hard-failt nu en waarom.
3. Welke GitHub settings handmatig nodig blijven (branch protections, environments, secrets).
4. Rest-risico's (max 5) met mitigatie.
5. Eindverdict: `GO` of `NO-GO` voor productie.

## 9) Acceptatiecriteria (definition of done)
- [ ] YAML syntactisch valide en workflows draaien zonder contextfouten.
- [ ] Geen `continue-on-error` op kritieke gates.
- [ ] Correct migration pad voor `client-portal/supabase`.
- [ ] Geen fake deployment success paden.
- [ ] Production deploy vereist approval en valide checks.
- [ ] Rollback-pad aantoonbaar en niet slechts log-output.
- [ ] CI/CD README bevat complete secrets/environments matrix.

## 10) Werkwijze
- Kleine, reviewbare commits.
- Geen destructieve repo-opschoning in deze opdracht.
- Focus: workflow betrouwbaarheid, safety en traceability.
