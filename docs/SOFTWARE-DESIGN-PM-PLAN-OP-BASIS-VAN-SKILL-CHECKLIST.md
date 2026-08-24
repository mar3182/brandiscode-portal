# Software Design PM Plan op basis van de Skill Checklist

Versie: 2026-07-20  
Bron: transcript Building Great Agent Skills: The Missing Manual

## 1. Waarom dit belangrijk is

Jouw vraag is precies de kern van goed software design:

1. Welk probleem lossen we op
2. Voor wie lossen we het op
3. Met welke minimale set onderdelen lossen we het op
4. Hoe houden we het systeem beheersbaar na groei

De video geeft hiervoor een praktisch denkkader met 4 onderdelen:

1. Trigger
2. Structuur
3. Sturing
4. Snoeien

Dit document vertaalt die 4 onderdelen naar jullie platform als PM-werkmethode.

## 2. Het echte product van jullie platform

Volgens RFC-0001 is jullie product niet een losse AI-toolset, maar:

1. Een informatie-architectuur platform voor MKB
2. Waar AI ondersteunend is, niet leidend
3. Waar bedrijfskennis wordt omgezet in bruikbare acties

Dat betekent:

1. Geen feature-sprawl zonder doel
2. Geen auto-publicatie van AI-content
3. Wel duidelijke workflows met menselijke regie

## 3. Welke problemen lossen jullie op

### Primair probleem

Klanten hebben data, tools en processen, maar die zijn gefragmenteerd.

### Secundair probleem

In het admin-platform ontstaat ruis: wat is productie, wat is pilot, wat is demo.

### Tertiair probleem

AI wordt snel als featurebundel ervaren in plaats van als kwaliteitsgestuurde assistent.

## 4. Software design principes voor dit project

1. Data-first boven AI-first
2. Systeemgrenzen expliciet maken
3. Single source of truth per domein
4. Zo weinig mogelijk cognitieve belasting voor gebruikers
5. Zo weinig mogelijk contextbelasting voor agents
6. Iedere flow krijgt expliciete status en eigenaar

## 5. Vertaling van de 4-checklist naar platformmanagement

## 5.1 Trigger: wanneer activeer je welke agent

Doel: voorkom willekeurige agent-invocaties en context-overload.

Regels:

1. User-invoked voor kritieke beslissingen en governance
2. Model-invoked alleen voor stabiele, lage-risico routines
3. Elk agenttype heeft een duidelijke activatieregel in docs

Projecttoepassing:

1. Platform Audit agent altijd handmatig starten door PM
2. Launch Strategist handmatig starten na auditresultaten
3. Editorial Governance handmatig starten voor contentprocessen

Waarom:

1. Je houdt controle op strategische keuzes
2. Je voorkomt onvoorspelbaar agentgedrag bij high-stakes beslissingen

## 5.2 Structuur: splits stappen en referentie

Doel: minder chaos in prompts en runbooks.

Regels:

1. Ieder proces krijgt vaste stappen
2. Achtergrondkennis staat los als referentie
3. Branch-specifieke instructies niet in het hoofdscript

Projecttoepassing:

1. PM-runbook bevat alleen procedurestappen
2. Templates en policy-blokken in aparte bestanden
3. Per domein 1 primaire beslisdocument

Waarom:

1. Makkelijker onderhoud
2. Sneller auditten
3. Minder dubbeling

## 5.3 Sturing: gebruik leidende woorden

Doel: agentuitvoer consistenter maken.

Leidende woorden voor dit project:

1. Vertical slice
2. Productie eerst
3. Human-in-the-loop
4. Data-first
5. Label before launch

Projecttoepassing:

1. Zet deze woorden in agentprompts en reviewcriteria
2. Controleer bij output of dezelfde woorden terugkomen in plannen
3. Als dat niet gebeurt, prompt herformuleren

Waarom:

1. Kleine woorden met grote gedragsimpact
2. Betere voorspelbaarheid van agentkwaliteit

## 5.4 Snoeien: verwijder no-ops en sediment

Doel: minder ruis, meer focus.

Regels:

1. Verwijder tekst zonder operationeel effect
2. Verwijder dubbele instructies
3. Archiveer stale processen en demo-elementen
4. Houd één bron van waarheid per onderwerp

Projecttoepassing:

1. Maandelijkse PM-pruning op docs en agentfiles
2. Feature met status Demo verbergen uit hoofdnavigatie
3. Geen nieuwe module zonder probleemdefinitie en eigenaar

Waarom:

1. Lagere onderhoudslast
2. Minder foutkans
3. Hogere duidelijkheid voor klanten

## 6. Concreet implementatieplan (6 weken)

## Week 1: Trigger en scope governance

Doelen:

1. Activatieregels per agent vastleggen
2. Feature-inventaris met statuslabels maken

Deliverables:

1. Agent activation matrix
2. Productie/Pilot/Demo register

Owner:

1. PM met Platform Audit agent

## Week 2: Structuur normaliseren

Doelen:

1. PM-runbooks opschonen op stappen vs referentie
2. Dubbele contentlijnen identificeren

Deliverables:

1. Geconsolideerde runbooks
2. Branching references lijst

Owner:

1. PM en Backend Specialist

## Week 3: Sturing standaardiseren

Doelen:

1. Leidende woorden opnemen in alle kernprompts
2. Reviewformat aanpassen op die woorden

Deliverables:

1. Prompt library v1
2. Review checklist v1

Owner:

1. PM met BI Launch Strategist

## Week 4: Pruning en IA simplificatie

Doelen:

1. Demo-onderdelen uit hoofdnavigatie
2. No-op teksten uit processen verwijderen

Deliverables:

1. Navigatieversie met statuslabels
2. Pruning logboek

Owner:

1. Frontend Developer en PM

## Week 5: Launch experimenten

Doelen:

1. Start 2 A/B tests
2. KPI tracking live

Deliverables:

1. Experiment cards
2. KPI dashboard baseline

Owner:

1. BI Launch Strategist en Backend Specialist

## Week 6: Beslisweek

Doelen:

1. Go/No-Go per featurecluster
2. Scope voor volgende sprint vastleggen

Deliverables:

1. Product clarity score
2. Launch decision memo

Owner:

1. PM

## 7. Architectuur van het eindproduct in simpele taal

Het eindproduct moet altijd deze basis houden:

1. Frontend
Klant en admin zien alleen wat voor hun rol relevant is.

2. Backend
API routes voeren gecontroleerde businessregels uit.

3. Data
Supabase is bron van waarheid, met tenant-isolatie via client_id en RLS.

4. AI
AI helpt met drafts en automatisering, maar mensen publiceren.

5. Delivery
CI/CD bewaakt kwaliteit en veiligheid voor iedere release.

## 8. Welke tools horen bij welk probleem

1. Onboarding en klantstart
Tooling: intake routes, onboarding API, admin trigger

2. Facturatie en abonnementen
Tooling: facturen API, recurring plan table, cron route

3. AI-productiviteit
Tooling: ai routes, ai usage tracking, client_ai_settings

4. Contentkwaliteit
Tooling: editorial governance workflow, menselijke review

5. Releasekwaliteit
Tooling: GitHub Actions PR checks, staging smoke tests, production gates

## 9. PM toetsingsvragen per beslissing

1. Draagt dit bij aan het primaire klantprobleem
2. Is de status duidelijk voor de gebruiker
3. Is ownership duidelijk
4. Is er meetbare KPI impact
5. Is dit in lijn met data-first en human-in-the-loop

Als een voorstel 2 of meer keer nee scoort, gaat het niet naar implementatie.

## 10. Hoe jij dit leert en zelfstandig toepast

Gebruik deze volgorde bij elk nieuw initiatief:

1. Probleem in 1 zin
2. Gewenste uitkomst in 1 zin
3. Triggerkeuze: user-invoked of model-invoked
4. Processtructuur: stappen en referentie
5. Leidende woorden kiezen
6. Pruning-check voor no-ops
7. KPI kiezen
8. Pas dan implementeren

Dit is de kern van PM-gedreven software design: eerst helderheid, dan bouwen.

## 11. Beslisstatement voor jullie team

Wij bouwen geen verzameling AI trucjes.  
Wij bouwen een helder platform dat zakelijke informatie omzet in betrouwbare uitvoering, met AI als assistent en mensen als eindverantwoordelijke.
