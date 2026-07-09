# RFC-0005: Multi-Agent Operating Model

**RFC ID:** RFC-0005
**Version:** 1.0
**Status:** Draft
**Owner:** PM — Brand is Code
**Date:** 2026-07-09

---

## Context

Brand is Code werkt met een reeks gespecialiseerde AI-agents (in VS Code Copilot). Momenteel ontbreekt een formeel model voor:
- Welke agent welke taak uitvoert.
- Hoe agents parallel kunnen werken zonder conflicten.
- Hoe handoffs plaatsvinden.
- Hoe kwaliteit wordt bewaakt over agent-grenzen heen.

Zonder dit model:
- Worden taken te sequentieel uitgevoerd (agent A klaar → dan agent B).
- Ontbreekt eigenaarschap per domein.
- Kan een agent een beslissing nemen die conflicteert met een andere agent.

---

## Decision

### Agent Roster (normatief)

| Agent                    | Eigenaarschap                                         | Parallel met              |
| ------------------------ | ----------------------------------------------------- | ------------------------- |
| PM — Brand is Code       | Roadmap, KPI's, priorities, sprint reviews            | Allen (coördineert)       |
| Brand is Code — Strateeg | Positionering, copy framework, GTM, merkbeslissingen  | Frontend, Content Factory |
| Frontend Developer       | Website UX, portal componenten, responsive design     | Backend, Strateeg         |
| Backend Specialist       | API routes, Supabase, CI/CD, integraties              | Frontend, Content Factory |
| Content Factory          | Blog-generatie, social-transformatie, contentkalender | Frontend, Strateeg        |
| Klantenservice Agent     | Klantcommunicatie, onboarding-mails, FAQ              | Backend (mail templates)  |
| Administratie            | Facturen, offertes, betalingen, KvK/BTW               | PM                        |

### Parallelisatiemodel

Agents die tegelijk kunnen werken (geen data-dependency):

```
Sprint 1 parallelle tracks:

TRACK A (Merk + Website)
  Strateeg:        RFC-0002 uitwerken → website copy schrijven
  Frontend Dev:    servicepagina's herbouwen + CTA-architectuur

TRACK B (Platform + Funnel)
  Backend:         /api/leads/capture bouwen + admin-notificatie
  Frontend Dev:    website lead-form (afhankelijk van Backend API spec)

TRACK C (Content)
  Content Factory: blog thema 1 + social-transformatie
  Strateeg:        approval gate content (reviewrol)
```

### Handoff Protocol

Elke handoff heeft:
1. **Output artifact**: een concreet deliverable (bestand, endpoint, schema, copy-doc).
2. **Acceptance criteria**: hoe weet de ontvanger dat het klaar en correct is.
3. **PM-notificatie**: PM wordt geïnformeerd bij elke handoff.

Voorbeeld handoff Strateeg → Frontend:
```
Output:       docs/website-copy-v1.md (per pagina, per sectie)
Criteria:     Alle pagina's aanwezig, CTA-teksten conform RFC-0002, NL copy
PM-notificatie: "Website copy gereed voor implementatie"
```

### Escalatieregels

Een agent **stopt en escaleert naar PM** als:
- Een beslissing conflicteert met RFC-0001 of een ander vastgesteld RFC.
- Een wijziging destructieve data-impact heeft (conform DATA-SAFETY-PROTOCOL).
- De scope buiten het eigen domein gaat zonder expliciete opdracht.

### Sprint-structuur (normatief)

Elke sprint duurt 1–2 weken en heeft:

```
Sprint start:
  PM:     Sprint brief schrijven (scope, agents, KPI's)
  Agents: Eigen backlog ophalen + capaciteit bevestigen

Tijdens sprint:
  Parallel tracks werken onafhankelijk
  Handoffs gebaseerd op concrete artifacts, niet "mondeling"

Sprint einde:
  Agents: Output rapportage naar PM
  PM:     Review, acceptatie, volgende sprint planning
  Docs:   PROJECT-BRIEF-ONBOARDING.md status update (verplicht)
```

### KPI-dashboard per agent (PM bijhoudt)

| Agent           | KPI                                               | Meetfrequentie |
| --------------- | ------------------------------------------------- | -------------- |
| Frontend        | Pagina's live, Lighthouse score, mobile test pass | Per sprint     |
| Backend         | Build pass, test pass, endpoint response time     | Per deploy     |
| Content Factory | Blogs gepubliceerd, social posts scheduled        | Wekelijks      |
| Strateeg        | Copy-docs goedgekeurd, RFC's vastgesteld          | Per sprint     |
| Administratie   | Openstaande facturen, betalingstermijn            | Wekelijks      |

---

## Sprint Plan: Sprint 1 (Week 1–2, start: 2026-07-14)

### Track A — Merk & Website (Strateeg + Frontend)

**Strateeg:**
| Taak                               | Deliverable                     | Deadline |
| ---------------------------------- | ------------------------------- | -------- |
| RFC-0002 finaliseren naar Accepted | PR + goedkeuring                | Dag 2    |
| Website copy herschrijven Home     | `docs/website-copy-home.md`     | Dag 4    |
| Website copy Diensten-pagina       | `docs/website-copy-diensten.md` | Dag 5    |
| Website copy Werkwijze + Over mij  | `docs/website-copy-overig.md`   | Dag 7    |

**Frontend Developer:**
| Taak                                           | Deliverable         | Deadline |
| ---------------------------------------------- | ------------------- | -------- |
| Audit huidige website-componenten              | Bevindingen-doc     | Dag 2    |
| Home + Diensten herbouwen met nieuwe copy      | Live op staging     | Dag 8    |
| CTA-componenten bouwen (RFC-0002 architectuur) | Reusable components | Dag 6    |
| Mobile-first test alle pagina's                | Lighthouse rapport  | Dag 10   |

### Track B — Platform Funnel (Backend + Frontend)

**Backend Specialist:**
| Taak                                    | Deliverable              | Deadline |
| --------------------------------------- | ------------------------ | -------- |
| RFC-0003: `/api/leads/capture` endpoint | Gedocumenteerd + getest  | Dag 5    |
| Admin-notificatie bij nieuwe lead       | Email via Resend         | Dag 6    |
| GDPR-consent veld in clients tabel      | Idempotente SQL migratie | Dag 3    |
| Rate-limiting op leads endpoint         | Middleware config        | Dag 5    |

**Frontend Developer:**
| Taak                                  | Deliverable         | Deadline |
| ------------------------------------- | ------------------- | -------- |
| Website lead-form component           | React component     | Dag 7    |
| Koppeling form → `/api/leads/capture` | Werkende integratie | Dag 8    |
| Succes/fout states lead-form          | UX states           | Dag 9    |

### Track C — Content (Content Factory + Strateeg)

**Content Factory:**
| Taak                                             | Deliverable             | Deadline |
| ------------------------------------------------ | ----------------------- | -------- |
| Blog #1: "Waarom je CRM-data je groei blokkeert" | `blog-01-draft.md`      | Dag 3    |
| LinkedIn long + short post voor blog #1          | Social copy doc         | Dag 4    |
| Instagram caption + carousel copy blog #1        | Social copy doc         | Dag 4    |
| Facebook post blog #1                            | Social copy doc         | Dag 4    |
| Scheduling-tool kiezen + inrichten               | Tool live met 3 kanalen | Dag 5    |

**Strateeg (approval rol):**
| Taak                         | Deliverable                 | Deadline |
| ---------------------------- | --------------------------- | -------- |
| Review + goedkeuring blog #1 | Approved `blog-01-final.md` | Dag 5    |
| Review social posts blog #1  | Approved social copy        | Dag 5    |

---

## Alternatives Considered

### A. Sequentieel één agent tegelijk
Te langzaam; blokkeert onnodig niet-afhankelijke tracks.

### B. Volledig autonome agents zonder PM-coördinatie
Risico op conflicterende beslissingen en scope-creep.

### C. Externe projectmanagement-tool (Jira, Notion)
Onnodige overhead voor huidige teamgrootte; docs-in-repo is voldoende en blijft dicht bij de code.

---

## Consequences

**Positief:**
- Maximale parallelle doorput per sprint.
- Heldere accountability per domein.
- Transparante handoffs zonder afhankelijkheid van mondelinge afstemming.

**Risico:**
- PM-rol vereist actieve betrokkenheid bij elke sprint-start en -einde.
- Agents die te autonoom opereren kunnen RFC-0001 constraints overtreden.

---

## Compatibility with RFC-0001

- Dit RFC regelt uitvoeringslogistiek, niet dataarchitectuur.
- Alle agents moeten RFC-0001 respecteren in hun domein.
- De escalatieregel (stop en meld bij RFC-conflict) is de directe operationele vertaling van RFC-0001's normative status.

Geen conflict met RFC-0001.

---

## Security and Privacy Impact

- Agents werken nooit direct op productiedata zonder expliciete PM-goedkeuring.
- DATA-SAFETY-PROTOCOL.md is verplicht voor Backend Specialist bij elke datawijziging.
- Geen agent-to-agent communicatie over externe kanalen; alles via git-artifacts en docs.

---

## Rollout and Rollback

**Rollout:**
1. RFC-0005 intern goedgekeurd → Accepted (Dag 1 sprint 1).
2. Sprint 1 brief aangemaakt en gecommuniceerd naar agents.
3. Parallelle tracks gestart per planning hierboven.
4. Sprint 1 review op dag 10.

**Rollback:**
- Dit RFC regelt werkproces; rollback = terug naar ad-hoc werkwijze.
- Geen technische rollback nodig.

---

## References

- RFC-0001: Data-First AI Platform Strategy
- RFC-0002: Brand Messaging & Go-To-Market Architecture
- RFC-0003: Website-to-Portal Funnel & Conversion Flow
- RFC-0004: Content-to-Social Automation Pipeline
- docs/DATA-SAFETY-PROTOCOL.md
- docs/PROJECT-BRIEF-ONBOARDING.md
