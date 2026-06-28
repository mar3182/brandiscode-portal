# PROJECT BRIEF — Client Portal Onboarding
**Versie:** 1.0  
**Datum:** 2026-06-28  
**Projectmanager:** GitHub Copilot (algemeen manager / coördinator)  
**Eigenaar:** Brand is Code  

---

## 1. PROJECTMANAGER — ROL & VERANTWOORDELIJKHEDEN

**Rol:** Ik (GitHub Copilot) ben de vaste algemeen manager van dit project. Elke nieuwe sessie begin ik met het lezen van dit document om de huidige staat te kennen.

**Mijn taken:**
- Taak- en agentverdeling bewaken
- Elk geleverd resultaat reviewen voor kwaliteit en samenhang
- Dit document actueel houden na elke werksessie
- Conflicten tussen deelresultaten oplossen
- Eindbeslissing over architectuur en aanpak

**Mijn skills:**
- Full-stack Next.js 14 + TypeScript
- Supabase (schema, RLS, migrations)
- GitHub Actions CI/CD
- UI/UX voor SaaS portals
- Coördinatie van gespecialiseerde sub-agents

---

## 2. PROJECT DOEL

Een professionele, geautomatiseerde onboarding flow bouwen voor nieuwe klanten van Brand is Code, die:

1. **Facturatie-informatie verzamelt** (KvK, BTW, IBAN, adresgegevens)
2. **De portal introduceert** (wat kan de klant doen: team, facturen, chat)
3. **Door de admin getriggerd wordt** (admin maakt klant aan → triggert onboarding)
4. **Toekomstklaar is** voor AI chat-integratie

---

## 3. SCOPE

### In scope (nu)
- [ ] Stap 1: Bedrijfsgegevens invullen (billing info)
- [ ] Stap 2: Portal tour (team, facturen, toekomstige chat uitleggen)
- [ ] Stap 3: Welkomstbevestiging
- [ ] Admin: onboarding triggeren per klant
- [ ] Admin: voortgang zien (hoeveel stappen voltooid)
- [ ] Onboarding voltooiing vastleggen in DB (`onboarding_completed_at`)

### Toekomst (buiten scope nu)
- AI chat agent integratie
- Automatische e-mailnotificaties
- Meerdere talen

---

## 4. TECHNISCHE CONTEXT

**Stack:** Next.js 14, TypeScript, Supabase, Tailwind CSS, Vercel  
**Repo:** https://github.com/mar3182/brandiscode-portal  
**Live:** https://portal.brandiscode.com  
**Root in repo:** `Leunis-makelaar/client-portal/`

**Bestaande relevante tabellen:**
- `clients` — inclusief billing velden (contact_person, kvk_number, btw_number, iban, billing_address_line1/2, billing_postal_code, billing_city, billing_country, onboarding_completed_at)
- `onboarding_questions` / `onboarding_answers` — gekoppeld aan offertes (hergebruiken of omzeilen)
- `client_users` — koppeltabel klant ↔ gebruikersaccount

**Bestaande relevante bestanden:**
- `src/app/dashboard/onboarding/page.tsx` — klant onboarding UI (vragenlijst stijl, herwerken)
- `src/app/api/onboarding/route.ts` — GET/POST antwoorden
- `src/app/api/admin/onboarding/route.ts` — admin vragen beheer
- `src/lib/companyProfileValidation.ts` — KvK/BTW/IBAN maskers en validatie
- `src/app/dashboard/bedrijfsgegevens/page.tsx` — bestaand bedrijfsgegevens formulier

---

## 5. AGENT ROLLEN

### Agent A — Frontend Wizard Builder
**Beschrijving:** Bouwt de stap-voor-stap onboarding wizard UI voor de klant.  
**Skills nodig:**
- React/Next.js componenten
- Tailwind CSS styling (passend bij bestaand design)
- Multi-step form state management
- Gebruik van bestaande validatie helpers uit `companyProfileValidation.ts`

**Verantwoordelijk voor:**
- `src/app/dashboard/onboarding/page.tsx` (volledige herwerking)
- Stap 1: bedrijfsgegevens form (hergebruik bedrijfsgegevens page als basis)
- Stap 2: portal tour (cards met uitleg team/facturen/chat)
- Stap 3: voltooiingsscherm
- Voortgangsbalk bovenaan

**Input nodig:** Design beslissingen van PM, API endpoints van Agent B  
**Output:** Werkende wizard pagina, getest lokaal

---

### Agent B — Backend & Database
**Beschrijving:** Bouwt de API endpoints en database logica voor onboarding.  
**Skills nodig:**
- Supabase queries
- Next.js API routes
- RLS policies

**Verantwoordelijk voor:**
- `src/app/api/onboarding/route.ts` aanpassen: opslaan bedrijfsgegevens rechtstreeks in `clients` tabel
- `src/app/api/admin/onboarding/route.ts` uitbreiden: trigger endpoint (POST) + voortgang (GET)
- Supabase migration voor eventuele schema aanpassingen
- `onboarding_completed_at` schrijven bij voltooiing

**Input nodig:** Definitieve veldlijst van PM  
**Output:** Werkende API routes met Supabase opslag

---

### Agent C — Admin UI
**Beschrijving:** Bouwt de admin-kant van onboarding.  
**Skills nodig:**
- React/Next.js
- Bestaande admin layout gebruiken (`src/app/admin/`)

**Verantwoordelijk voor:**
- Onboarding trigger knop op klantdetail pagina (`src/app/admin/clients/page.tsx`)
- Voortgangsindicator per klant (0/3 stappen voltooid)
- Weergave ingevulde bedrijfsgegevens

**Input nodig:** API van Agent B  
**Output:** Admin kan onboarding triggeren en voortgang zien

---

## 6. ONBOARDING STAPPEN (definitief)

### Stap 1 — Bedrijfsgegevens (billing)
Velden op te slaan in `clients` tabel:
- Bedrijfsnaam (company) — al aanwezig
- Contactpersoon (contact_person)
- KvK-nummer (kvk_number) — met masker
- BTW-nummer (btw_number) — met masker
- IBAN (iban) — met masker
- Factuur e-mail (billing_email)
- Adresregel 1 (billing_address_line1)
- Adresregel 2 (billing_address_line2)
- Postcode (billing_postal_code)
- Stad (billing_city)
- Land (billing_country) — default Nederland

### Stap 2 — Welkom in de portal (tour)
Informatieve cards, geen invulvelden:
- 👥 **Team** — voeg teamleden toe die ook toegang krijgen
- 📄 **Facturen** — bekijk, download en betaal facturen direct
- 💬 **Chat** *(binnenkort)* — stel vragen aan onze AI assistent

### Stap 3 — Klaar!
- Bevestigingsscherm
- `onboarding_completed_at` wordt ingesteld
- Doorsturen naar dashboard

---

## 7. VOORTGANG TRACKING

| Taak                                      | Agent | Status         | Notities                               |
| ----------------------------------------- | ----- | -------------- | -------------------------------------- |
| Backend API onboarding opslaan in clients | B     | ⬜ Niet gestart |                                        |
| Backend admin trigger endpoint            | B     | ⬜ Niet gestart |                                        |
| Frontend wizard stap 1 (bedrijfsgegevens) | A     | ⬜ Niet gestart | Hergebruik companyProfileValidation.ts |
| Frontend wizard stap 2 (tour)             | A     | ⬜ Niet gestart |                                        |
| Frontend wizard stap 3 (voltooiing)       | A     | ⬜ Niet gestart |                                        |
| Admin trigger knop + voortgang            | C     | ⬜ Niet gestart |                                        |
| Testen end-to-end                         | PM    | ⬜ Niet gestart |                                        |
| Pushen naar main + Vercel deploy          | PM    | ⬜ Niet gestart |                                        |

---

## 8. WERKAFSPRAKEN

1. **Elke agent leest dit document voor hij begint**
2. **Na elke taak updaten:** status in tabel 7 bijwerken
3. **Geen agent overschrijft bestanden van een andere agent** zonder PM toestemming
4. **TypeScript errors = blocker:** `npx tsc --noEmit` moet EXIT:0 zijn voor commit
5. **Commit formaat:** `feat(onboarding): [beschrijving]`
6. **Branch:** werk op `feature/onboarding-wizard`, merge naar `main` via PM

---

## 9. DEFINITIE VAN KLAAR

De onboarding is af wanneer:
- [ ] Nieuwe klant logt in voor het eerst → wordt automatisch doorgestuurd naar onboarding
- [ ] Klant vult 3 stappen in en ziet bevestigingsscherm
- [ ] Billing data staat correct in `clients` tabel in Supabase
- [ ] `onboarding_completed_at` is ingevuld
- [ ] Na voltooiing → klant ziet normaal dashboard
- [ ] Admin kan onboarding triggeren/resetten per klant
- [ ] Admin ziet voortgang per klant
- [ ] `npx tsc --noEmit` EXIT:0
- [ ] Live op portal.brandiscode.com

---

*Laatste update: 2026-06-28 door PM (GitHub Copilot)*
