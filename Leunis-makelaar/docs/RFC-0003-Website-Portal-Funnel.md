# RFC-0003: Website-to-Portal Funnel & Conversion Flow

**RFC ID:** RFC-0003
**Version:** 1.0
**Status:** Draft
**Owner:** PM + Frontend Developer + Backend Specialist
**Date:** 2026-07-09

---

## Context

De merkpositionering (RFC-0002) heeft waarde alleen als de bezoeker een duidelijk pad heeft van eerste contact tot actief klant. Momenteel zijn website en portal twee losse werelden:

- De website heeft geen coherente lead-capture die aansluit op de portal-onboarding.
- De intakewizard in de portal is direct benaderbaar maar niet gekoppeld aan website-CTA's.
- Er is geen segmentatie op instapniveau die de juiste onboarding-route triggert.

Dit RFC definieert de normatieve funnel-architectuur van eerste websitebezoek tot actief klant in de portal.

---

## Decision

### Funnelmodel: 5 fasen

```
Fase 1: BEWUSTWORDING
Website servicepagina's → blog → social
Doel: herkenning + vertrouwen

Fase 2: OVERWEGING
Casestudies, werkwijze, referenties
Doel: differentiatie bevestigen

Fase 3: CONVERSIE
CTA → Strategie-call of Intake-link
Doel: leadkwalificatie

Fase 4: ONBOARDING
Intakewizard → Offerte → Portal-activatie
Doel: klant operationeel maken

Fase 5: RETENTIE
Portal: sprint-updates, deliverables, KPI-dashboard
Doel: langetermijnwaarde zichtbaar maken
```

### Fase 1–2: Website structuur (brandiscode.com)

Verplichte pagina's per RFC-0002 messaging:

| Pagina    | Doel                         | Primaire CTA                |
| --------- | ---------------------------- | --------------------------- |
| Home      | Positionering + urgentie     | "Plan een strategie-call"   |
| Diensten  | Aanbod per segment           | "Start jouw intake"         |
| Werkwijze | Vertrouwen en aanpak         | "Bekijk een case"           |
| Over mij  | Persoonlijk vertrouwen       | "Maak kennis"               |
| Blog      | Kennis + SEO + social feed   | "Lees meer" → nieuwsbrief   |
| Contact   | Laagdrempelig eerste contact | Formulier + direct afspraak |

Elke pagina volgt de CTA-architectuur uit RFC-0002.

### Fase 3: Conversie — twee routes

**Route A: Strategie-call**
- Bezoeker klikt "Plan een strategie-call"
- Cal.com of Calendly integratie (extern, geen portal login nodig)
- Na gesprek: admin maakt handmatig klant + stuurt intake-link

**Route B: Directe intake**
- Bezoeker klikt "Start jouw intake" op diensten-pagina
- Website-formulier vraagt: naam, bedrijf, email, sector, doel
- Backend maakt lead-record aan + stuurt automatisch intake-link naar email
- Portal verwerkt intake → offerte wordt aangemaakt

### Fase 4: Intakewizard (bestaande portal, uitbreiden)

Huidige flow: admin genereert token → verstuurt handmatig.
Gewenste flow (dit RFC):

```
Website-form → API /api/leads/capture
  → Supabase: maak client record (status: lead)
  → Genereer intake-token (bestaande logica)
  → Stuur intake-email (bestaande Resend/onboardingEmails.mjs)
Admin krijgt Slack/email notificatie van nieuwe lead
```

Na intake-submit:
```
Intake-API (bestaand) → sector-classificatie → offerte-aanmaak (handmatig/auto)
  → Portal-activatie email
  → Klant krijgt toegang tot dashboard
```

### Fase 5: Retentie in portal (bestaand + uitbreiden)

- Sprint-voortgang per klant zichtbaar in dashboard.
- Wekelijkse statusupdate per email (automatisch).
- KPI-sectie: meetbare resultaten per sprint.

### Technische scope van dit RFC

| Component                         | Status              | Actie                              |
| --------------------------------- | ------------------- | ---------------------------------- |
| Website servicepagina's           | Bestaand, verouderd | Herschrijven (Strateeg + Frontend) |
| Website lead-form                 | Nieuw               | Bouwen (Frontend + Backend)        |
| `/api/leads/capture` endpoint     | Nieuw               | Bouwen (Backend)                   |
| Intake-token flow                 | Bestaand            | Hergebruiken                       |
| Admin notificatie bij nieuwe lead | Nieuw               | Bouwen (Backend + Resend)          |
| Portal retentie-emails            | Deels bestaand      | Uitbreiden                         |

---

## Alternatives Considered

### A. Alles via handmatige admin-actie
Niet schaalbaar; blokkeert groei zodra volume toeneemt.

### B. Extern leadformulier (Typeform, HubSpot)
Creëert data-silo; conflicteert met RFC-0001 "Integrate, Don't Duplicate".

### C. Volledig zelfbediening zonder sales-call optie
Te vroeg voor huidige marktfase; strategie-call bouwt vertrouwen bij MKB.

---

## Consequences

**Positief:**
- Eén doorgaande klantreis zonder handmatige gaten.
- Leads worden automatisch klanten in de portal.
- Schaalbaar van 5 naar 50+ klanten zonder extra admin-overhead.

**Risico:**
- `/api/leads/capture` vereist correcte RLS en data-isolatie (zie Security).
- Website-form moet spam-bescherming hebben (CAPTCHA of honeypot).

---

## Compatibility with RFC-0001

- Funnel-architectuur volgt "Integrate, Don't Duplicate": website-leads gaan direct de portal-database in, geen kopie in extern systeem.
- "System of Record" principe: klantdata heeft één bron (Supabase `clients` tabel).
- Lead-form segmentatie (sector, doel) vult de data-architectuur die nodig is voor AI-enablement later.

Geen conflict met RFC-0001.

---

## Security and Privacy Impact

- `/api/leads/capture`: publiek endpoint → verplicht rate-limiting + honeypot/CAPTCHA.
- Lead-email is PII: GDPR-consent checkbox vereist op website-form.
- Nieuwe `leads` status in `clients` tabel: RLS policy mag geen cross-tenant lekkage toestaan.
- Intake-token blijft tijdgebonden (bestaande logica).

---

## Rollout and Rollback

**Rollout volgorde:**
1. Website copy herschrijven (Strateeg + Frontend) — geen backend dependency.
2. `/api/leads/capture` bouwen + testen (Backend) — parallel aan website.
3. Admin-notificatie implementeren (Backend).
4. Website lead-form koppelen aan API (Frontend).
5. End-to-end smoke test: website-form → intake-email → portal-login.
6. Go-live per route A eerst (strategie-call), daarna route B (directe intake).

**Rollback:**
- API-endpoint kan geflagd worden met `LEAD_CAPTURE_ENABLED=false` env-var.
- Website-form valt terug op mailto-link.

---

## References

- RFC-0001: Data-First AI Platform Strategy
- RFC-0002: Brand Messaging & Go-To-Market Architecture
- RFC-0004: Content-to-Social Automation Pipeline
