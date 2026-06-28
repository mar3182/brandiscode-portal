# HARDENING-FIXPACK-v1.1

## Doel
Dit fix-pack brengt de CI/CD-hardening van **NO-GO** naar **GO** door de resterende kritieke gaten te sluiten.

## Scope
- `.github/workflows/03-production-cd.yml`
- `.github/workflows/02-staging-cd.yml`
- `.github/workflows/01-pr-checks.yml`
- `client-portal/src/app/api/health/route.ts` (nieuw)

---

## 1) Production required-checks harden (kritiek)

### Probleem
De huidige verificatie kan slagen zonder dat alle vereiste checks echt bestaan en geslaagd zijn.

### Actie
In `.github/workflows/03-production-cd.yml`:
- Definieer expliciete lijst met required check names.
- Fail als een check ontbreekt.
- Fail als een check niet `success` is.

### Acceptatie
Een production run faalt direct als 1 required check ontbreekt of faalt.

---

## 2) Database migrations echt uitvoeren (kritiek)

### Probleem
Migration step bevat nog placeholders en geen harde execution path.

### Actie
In `.github/workflows/03-production-cd.yml`:
- Kies 1 concrete route (Supabase CLI of psql) en implementeer echt.
- Valideer verplichte secrets vóór start.
- Hard fail bij migration error.

### Acceptatie
Migration step voert SQL echt uit en stopt pipeline bij fout.

---

## 3) Backup step mag niet fake-successen (kritiek)

### Probleem
Bij ontbrekende backup-id wordt een lokale fallback-id gemaakt en deploy gaat toch door.

### Actie
In `.github/workflows/03-production-cd.yml`:
- Valideer backup API response strikt.
- Als geen echte backup-id: `exit 1`.
- Geen fabricated backup-id meer.

### Acceptatie
Production deploy start nooit zonder verifieerbare backup-checkpoint.

---

## 4) Health endpoint implementeren (kritiek)

### Probleem
Workflows verwachten `/api/health`, maar endpoint ontbreekt in codebase.

### Actie
Maak nieuw bestand:
- `client-portal/src/app/api/health/route.ts`

Minimale response:
- `GET` => HTTP 200
- JSON met minimaal:
  - `status: "ok"`
  - `timestamp`

### Acceptatie
`curl <base>/api/health` geeft 200 en valide JSON.

---

## 5) PR workflow context cleanup

### Probleem
Reporting-logica is deels context-afhankelijk en kan onnodige failures veroorzaken.

### Actie
In `.github/workflows/01-pr-checks.yml`:
- Gebruik primair `$GITHUB_STEP_SUMMARY` voor rapportage.
- PR-comment alleen als event echt PR-context heeft en bewust gewenst is.
- Geen reporting steps die gates kunnen maskeren of fout triggeren.

### Acceptatie
Workflow faalt alleen op echte quality/security gates.

---

## 6) Staging smoke contract synchroniseren

### Actie
In `.github/workflows/02-staging-cd.yml` exact afdwingen:
- `GET /login` => 200
- `GET /api/client-profile` => 401
- `GET /api/admin/clients` => 401
- `GET /api/onboarding` => 401
- `GET /api/facturen` => 401
- `GET /api/health` => 200

### Acceptatie
Staging deploy hard-failt bij afwijkende statuscode.

---

## 7) Eindvalidatie (verplicht)

Specialist levert:
1. Bewijs van workflow-runs:
- PR fail op lint/test
- Staging fail bij verkeerde endpointstatus
- Production fail bij ontbrekende backup-id

2. Eindrapport met:
- Gewijzigde bestanden
- Per fix: risico dat is afgedicht
- Definitieve `GO` of `NO-GO`

---

## Definition of Done
- [ ] Required checks strikt geverifieerd
- [ ] Real migration execution actief
- [ ] Backup gate hard fail zonder echte backup-id
- [ ] `/api/health` endpoint aanwezig en stabiel
- [ ] Staging smoke suite conform contract
- [ ] Reporting context-safe
- [ ] Eindrapport + run-bewijs opgeleverd
