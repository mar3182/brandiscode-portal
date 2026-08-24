# Platform Analyse en Leerhandleiding

Versie: 2026-07-20  
Doelgroep: PM, eigenaar, nieuwe developers  
Niveau: Praktisch en in gewone taal

## 1. Wat dit document je geeft

Met dit document kun je:

1. Begrijpen hoe het platform technisch in elkaar zit
2. Zien welke onderdelen echt werken en welke nog pilot/demo zijn
3. Begrijpen waar de huidige ruis vandaan komt
4. Een launchstrategie kiezen die past bij jullie merk
5. Het platform opnieuw opbouwen als dat ooit nodig is

## 2. Platform in 1 minuut

Het Brand is Code platform bestaat uit:

1. Frontend: Next.js 14 app voor klanten en admin
2. Backend: Next.js API routes
3. Database en auth: Supabase (PostgreSQL + Auth + RLS)
4. E-mail: Resend
5. AI: OpenAI of GitHub Models via server routes
6. Hosting/deploy: Vercel + GitHub Actions

Kernidee: 1 portal voor onboarding, offertes, facturatie, training-intake en AI-tools.

## 3. Repository structuur

Topniveau:

1. client-portal: hoofdapplicatie
2. docs: architectuur, RFCs, runbooks, plannen
3. .github/workflows: CI/CD pipelines
4. .github/agents: rollen en agent-definities

Belangrijkste app-structuur:

1. client-portal/src/app: routes en pagina's
2. client-portal/src/app/api: server API endpoints
3. client-portal/src/lib: business logic, types, helpers
4. client-portal/supabase: migraties en SQL

## 4. Frontend architectuur (simpel uitgelegd)

Er zijn 3 primaire UI-zones:

1. Klant-dashboard onder /dashboard
2. Admin-omgeving onder /admin
3. Publieke intake-flow onder /intake/[token]

Belangrijk:

1. Status en toegang zijn sterk afhankelijk van client_id en role
2. Onboarding en intake zijn losgekoppeld van training-intake
3. Facturatie heeft nu ook recurring abonnementen met maandelijkse automation

## 5. Backend architectuur

### 5.1 API patronen

De app gebruikt Next.js route handlers in src/app/api.

Belangrijke domeinen:

1. admin/*: beheerfuncties, altijd ADMIN_EMAIL check
2. onboarding/* en intake/*: klant intake flows
3. facturen/*: facturatie en recurring runs
4. ai/*: generatie endpoints (bijv. funda-tekst)
5. cron/*: geplande taken (bijv. recurring invoices)

### 5.2 Auth en autorisatie

1. Supabase sessie bepaalt gebruiker
2. Admin toegang: user.email moet gelijk zijn aan ADMIN_EMAIL
3. Klanttoegang: mapping via client_users tabel
4. RLS beschermt data op tabelniveau

## 6. Database model (hoog niveau)

Kernentiteiten:

1. clients: hoofdprofiel per klantbedrijf
2. client_users: teamleden en rollen per klant
3. offertes: voorstellen/contractmomenten
4. sprints en deliverables: uitvoering
5. facturen: facturatie
6. onboarding_questions en onboarding_answers: intakevraagstructuur
7. training_intakes, training_sessions, training_intake_members: trainingsproces
8. recurring_invoice_plans: maandabonnementen voor facturatie
9. client_ai_settings en ai_usage_events: AI-governance en usage

## 7. CI/CD pipeline in gewone taal

### PR checks
Bestand: .github/workflows/01-pr-checks.yml

Bij iedere PR:

1. lint
2. typecheck
3. tests
4. build
5. vulnerability scan
6. secret scan
7. migration safety checks

Als 1 check faalt, mag de PR niet door.

### Staging deploy
Bestand: .github/workflows/02-staging-cd.yml

Bij merge naar develop:

1. build
2. preview deploy op Vercel
3. smoke tests
4. health check

### Production deploy
Bestand: .github/workflows/03-production-cd.yml

Bij merge naar main/tag:

1. pre-deploy checks
2. database backup checkpoint
3. migratie uitvoering
4. production build
5. blue-green deploy + health checks
6. rollbackpad als iets faalt

## 8. Huidige ruis: waar komt die vandaan

Er zijn 4 oorzaken:

1. Feature-density in admin
De admin heeft veel functies naast elkaar (onboarding, training, AI settings, publicatieacties), waardoor een gebruiker niet snel ziet wat kern is en wat experiment.

2. Status-onduidelijkheid
Niet elke actie maakt direct duidelijk of het resultaat echt persistente data schrijft, externe publicatie doet, of alleen een draft oplevert.

3. Content-overlap in positionering
Er zijn meerdere contentlijnen tegelijk (migratie, regio-content, newsroom-achtige content), zonder hard gelabelde publicatiedoelen per lijn.

4. AI-tooling zonder duidelijke productlagen
AI endpoints werken technisch, maar productlaag ontbreekt soms: wanneer is dit intern hulpmiddel, wanneer klantfeature, wanneer publicatieklaar?

## 9. Feature-status classificatie (operationeel beeld)

### Sterk operationeel

1. Onboarding/intake flow met token
2. Offerte ondertekeningflow
3. Facturatiebasis + recurring maandfactuur automation
4. CI/CD basis met gates

### Operationeel maar governance nodig

1. AI generatie endpoints (funda-tekst, funda-multi)
2. AI fair-use limieten en usage logging
3. Feedback naar social/WordPress publicatieflow

### Ruisgevoelig

1. Meerdere contentrichtingen zonder duidelijke prioriteitsvolgorde
2. UX zonder expliciete labels zoals Pilot, Demo, Productie

## 10. Productbeslissing die nu nodig is

Voer een hard model in met 3 labels in admin UI en docs:

1. Productie: klant mag dit verwachten en gebruiken
2. Pilot: werkt, maar met voorwaarden
3. Demo: alleen intern of validatie

Alles zonder label wordt tijdelijk verborgen uit hoofdnavigatie.

## 11. Launchstrategie (Business Intelligence voorstel)

### Strategische basis

1. Eerst vertrouwen en helderheid
2. Daarna bereik en schaal
3. AI als assistent, niet als autopublisher

### 30-dagen launchplan

Week 1:

1. Feature labeling in admin (Productie/Pilot/Demo)
2. Navigatie opschonen op basis van labels
3. Contentlijnen reduceren naar 1 primaire lijn

Week 2:

1. A/B-test op homepage messaging
2. A/B-test op portal onboarding CTA
3. KPI tracking live zetten

Week 3:

1. Pilotgroep gebruiksanalyse
2. AI usage review per klantsegment
3. Contentkwaliteit review met redactiechecklist

Week 4:

1. Beslismoment: doorgroeien, versmallen of herpositioneren
2. Roadmap update op basis van meetdata

### KPI's

1. Activation rate: % klanten dat onboarding afrondt
2. Time to value: tijd tot eerste bruikbare output
3. Feature adoption: gebruik per kernmodule
4. AI quality acceptance: % AI-output dat na redactie wordt gepubliceerd
5. Support friction: aantal hulpvragen per 100 sessies

## 12. AI-governance (jullie expliciete wens)

Jullie policy:

1. Geen automatische AI-artikelen live zetten
2. AI alleen voor versnellen van voorbereidende taken
3. Publicatie altijd via menselijke redactie

Aanbevolen workflow:

1. Draft door AI
2. Redactie door mens
3. Factcheck
4. Goedkeuring
5. Publicatie

## 13. PM-agent orchestration: wie doet wat

Nieuwe agents toegevoegd in .github/agents:

1. business-intelligence-launch.agent.md
2. platform-audit.agent.md
3. editorial-governance.agent.md

Gebruik als PM deze volgorde:

1. Platform Audit agent: label alle features op werkingsstatus
2. BI Launch agent: kies 30-dagen experimentstrategie
3. Editorial Governance agent: borg AI quality policy in workflow
4. Frontend/Backend specialist: implementeer labels, feature gates, metrics

## 14. Rebuild handleiding (als je opnieuw moet beginnen)

### Stap 1: Infrastructuur

1. Maak Supabase project
2. Zet auth aan
3. Run alle SQL migraties in client-portal/supabase
4. Configureer RLS policies

### Stap 2: App setup

1. Clone repo
2. Ga naar client-portal
3. npm ci
4. .env.local vullen met Supabase, Resend, AI keys
5. npm run dev

### Stap 3: Kernflows valideren

1. Admin login
2. Klant aanmaken
3. Intake token versturen
4. Intake invullen
5. Offerte tekenen
6. Factuur maken
7. Recurring plan testen

### Stap 4: CI/CD

1. Configureer GitHub secrets
2. Verifieer PR workflow
3. Verifieer staging deploy
4. Verifieer production gate

### Stap 5: Governance

1. Label features
2. Zet AI redactiepolicy live
3. Definieer publicatie-eigenaarschap
4. Run maandelijkse platform audit

## 15. Concrete aanbevelingen voor deze week

1. Admin UI: label Productie/Pilot/Demo zichtbaar per tool
2. Verberg demo-onderdelen uit hoofdmenu
3. Kies 1 primaire contentrichting voor 30 dagen
4. Maak AI-publicatiepad human-in-the-loop verplicht in UI
5. Zet maandelijkse audit ritme met de nieuwe agents

---

## Bijlage A: Belangrijke technische bestanden

1. .github/workflows/01-pr-checks.yml
2. .github/workflows/02-staging-cd.yml
3. .github/workflows/03-production-cd.yml
4. docs/CI-CD-ARCHITECTURE.md
5. docs/PLAN-VAN-AANPAK-PORTAL.md
6. client-portal/src/lib/ai-usage.ts
7. client-portal/src/app/api/intake/[token]/route.ts
8. client-portal/src/app/api/admin/clients/[id]/ai-settings/route.ts
9. client-portal/src/app/api/admin/feedback/[id]/publiceer/route.ts
10. client-portal/src/app/api/ai/funda-multi/route.ts

## Bijlage B: Beslisregel voor AI-content

Publicatie zonder menselijke review is niet toegestaan.
AI is assistive, niet autonomous publishing.
