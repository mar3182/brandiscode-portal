# Plan van Aanpak — Brand is Code Client Portal
**Versie:** 1.1 — 8 juli 2026  
**Status:** In uitvoering (Sprint 1 herijkt met klant)

---

## Visie

Het Brand is Code client portal is een professioneel SaaS-platform waar:
- **Elke klant** (bedrijf) een eigen beveiligde omgeving heeft
- **Elk teamlid** van die klant met eigen login en rechten kan inloggen
- **Onboarding, AI-tools, communicatie en facturatie** op één plek staan
- **De klant zelf** voortgang ziet, vragen beantwoordt en documenten ondertekent

---

## Fase 0 — Direct te doen (deze week)

| #   | Taak                                                              | Wie            | Status   |
| --- | ----------------------------------------------------------------- | -------------- | -------- |
| 0.1 | Fix `mary@brandiscode.com` — mailbox aanmaken bij Argeweb of M365 | Jij            | 🔴 Urgent |
| 0.2 | Leunis Makelaars aanmaken in portal (database is leeg)            | Jij via admin  | ⬜        |
| 0.3 | `contact_person` invoerveld toevoegen in admin klantenbeheer      | Frontend Agent | ⬜        |
| 0.4 | WhatsApp naar Arno versturen (bericht klaarstaat)                 | Jij            | ⬜        |

---

## Fase 1 — Team Intake Wizard (Sprint 1 — Leunis)
**Doel:** Arno's assistent krijgt één link → vult intake in voor het hele team  
**Waarde:** Jij hebt alle info voor de training zonder extra gesprekken

### Wat er gebouwd wordt

**1A. Team Intake Formulier (publieke link, geen login nodig)**
- URL: `portal.brandiscode.com/intake/[token]`
- Klant vult in:
  - Bedrijfsnaam, KvK, BTW, IBAN, facturatie-adres
  - Contactpersoon naam + e-mail
  - **Microsoft-abonnement**: type (365 Basic / Business / geen), hoeveel licenties
  - **Software-inventaris**: lijst van tools die ze dagelijks gebruiken (Realworks, Word, Outlook, WhatsApp Business, etc.)
  - **Teamleden**: naam, functie, e-mail, rol in portal (eigenaar / financieel / medewerker)
  - **Doelen**: wat willen ze met AI bereiken? (open vraag + checkboxes)
- Na submit: automatische bevestigingsmail naar klant + notificatie naar `mary@brandiscode.com`

**1B. Admin genereert intake-link**
- In admin → klantdetail → knop "Stuur intake-link"
- Genereert unieke token (48 uur geldig)
- Kopieert link naar clipboard of stuurt direct per e-mail

**1C. Teamlid-accounts automatisch aanmaken**
- Na intake submit: Supabase auth-gebruikers aanmaken voor elk teamlid
- Welkomstmail met tijdelijk wachtwoord per teamlid

### Database aanpassingen
```sql
-- Nieuwe tabel voor intake tokens
CREATE TABLE intake_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Uitbreiding clients tabel
ALTER TABLE clients ADD COLUMN microsoft_subscription text; -- 'none','basic','business','enterprise'
ALTER TABLE clients ADD COLUMN software_inventory jsonb;    -- ["Realworks","Outlook","Word"]
ALTER TABLE clients ADD COLUMN ai_goals jsonb;             -- goals van klant
```

### Sprint 1 — Afspraken met klant (bevestigd) en huidige stand

| Onderdeel                      | Afgesproken voor Sprint 1                               | Huidige status (8 juli)                                                | Impact op planning                |
| ------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| Team intake + bedrijfsgegevens | Intake-link, teamrollen, software-inventaris, AI-doelen | ✅ Opgeleverd, beta klaar (nog niet gedeeld met klant)                  | Delen na account + intake-link    |
| Funda AI tool                  | Woningtekst generatie als kern deliverable              | ✅ Opgeleverd, beta klaar (single + multi-format + verfijnen)           | Live voor klant na intake         |
| Training voorbereiding         | Intake per teamrol + trainingsmoment plannen            | 🟡 In voorbereiding (afhankelijk van klantbevestiging datum/deelnemers) | Datum afstemmen met klant         |
| Training uitvoering            | On-site workshop Sprint 1                               | ⬜ Nog niet uitgevoerd                                                  | Planningsafspraak nodig           |
| Realworks CRM koppeling        | Niet in oorspronkelijke Sprint 1 scope                  | 🟡 Nieuw ontdekt tijdens uitvoering                                     | Scopegesprek nodig voor Sprint 2+ |

### Wijziging in termijnen (communicatiepunt)

De functionaliteit voor de AI tool is opgeleverd binnen Sprint 1 en staat in beta gereed. De planning voor training en eventuele Realworks-koppeling wordt apart bevestigd na afstemming met de klant over:

1. Intake afronden via portal (teamgegevens + Microsoft context)
2. Beschikbaarheid team voor training
3. Toegang en API-afspraken rond Realworks
4. Prioriteit: eerst training afronden of direct starten met CRM-integratie

---

## Fase 2 — Rol-gebaseerde Rechten (Team Permissions)
**Doel:** Elk teamlid ziet alleen wat relevant is voor zijn rol

### Rollen

| Rol       | Rechten                                                  |
| --------- | -------------------------------------------------------- |
| `owner`   | Alles zien + goedkeuren, inclusief facturen en offertes  |
| `billing` | Facturen + betalingen + bedrijfsgegevens wijzigen        |
| `member`  | AI-tools gebruiken, onboarding invullen, berichten lezen |
| `viewer`  | Alleen lezen (voortgang sprints zien)                    |

### Wat er gebouwd wordt
- Rol `billing` toevoegen aan `client_users` check constraint
- Dashboard toont menu-items per rol:
  - Owner: alles
  - Billing: Facturen, Bedrijfsgegevens, geen AI-tools tenzij ook member
  - Member: AI-tools, Onboarding, Sprint voortgang
  - Viewer: Alleen Sprint voortgang
- Admin kan rollen aanpassen per teamlid

---

## Fase 3 — Portal Messaging (E-mail via Portal)
**Doel:** Alle klantcommunicatie loopt via het portal — geen losse e-mails meer

### Wat er gebouwd wordt

**3A. Berichten-systeem in portal**
- Dashboard → "Berichten" sectie
- Klant stuurt bericht → jij krijgt notificatie op `mary@brandiscode.com`
- Jij antwoordt vanuit admin-panel → klant ziet antwoord in portal
- Optioneel: e-mailnotificatie aan klant bij nieuw bericht

**3B. Database**
```sql
CREATE TABLE portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  sender_type text CHECK (sender_type IN ('admin','client')),
  sender_user_id uuid REFERENCES auth.users(id),
  subject text,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**3C. E-mailnotificaties (via Resend)**
- Klant stuurt bericht → mail naar `mary@brandiscode.com`
- Admin antwoordt → mail naar klant (FROM: `Brand is Code <noreply@brandiscode.com>`)

---

## Fase 4 — AI Tools (Funda-teksten — Sprint 1 Leunis)
**Doel:** Leunis Makelaars genereert professionele Funda-teksten via de portal

### Wat er gebouwd wordt
- Dashboard → "AI Tools" → "Funda-tekst genereren"
- Formulier: woningtype, adres, kenmerken, bijzonderheden, oppervlakte, kamers
- Backend: POST `/api/ai/funda-tekst` → OpenAI GPT-4o
- System prompt getraind op Leunis-stijl (5 voorbeeldteksten van Arno)
- Output: 3 varianten (kort / normaal / uitgebreid)
- Kopieer-knop per variant

### Vereist
- `OPENAI_API_KEY` toevoegen aan Vercel environment variables
- 5 voorbeeldteksten van Arno nodig voor system prompt

---

## Prioriteitsvolgorde

```
WEEK 1 (nu):
  ├── 0.1 Email fix (VANDAAG)
  ├── 0.2 Leunis aanmaken in portal
  ├── 0.3 contact_person input in admin
  └── Fase 1A/1B intake wizard bouwen

WEEK 2:
  ├── Fase 1C team-accounts automatisch aanmaken
  └── Fase 4 Funda-teksten tool (Sprint 1 deliverable)

WEEK 3-4:
  └── Fase 2 Rol-gebaseerde rechten

MAAND 2:
  └── Fase 3 Portal messaging

MAAND 3+:
  └── Realworks integratie (na scopegesprek; mogelijk naar voren bij klantprioriteit)
```

---

## Technische Architectuur

```
Klant (browser)
  ↓
Next.js 14 (Vercel)
  ├── /dashboard/*     → client-side (Supabase Auth sessie)
  ├── /admin/*         → admin-only (ADMIN_EMAIL check)
  ├── /intake/[token]  → publiek (geen login)
  └── /api/*           → server-side API routes
        ├── Supabase (PostgreSQL + Auth + RLS)
        ├── Resend (e-mail)
        └── OpenAI API (AI tools)
```

---

## Kosten Overzicht (maandelijks)

| Service                | Kosten          | Waarvoor                        |
| ---------------------- | --------------- | ------------------------------- |
| Vercel Free            | €0              | Hosting                         |
| Supabase Free          | €0              | Database + Auth (tot 50k users) |
| Resend Free            | €0              | 3.000 e-mails/mnd gratis        |
| OpenAI API             | ~€5-15          | Per gebruik, alleen bij Leunis  |
| E-mail hosting (mary@) | €5-10           | M365 / Argeweb / Google         |
| **Totaal**             | **~€10-25/mnd** |                                 |

---

## Openstaande Acties

- [ ] Argeweb bellen → email pakket controleren → `mary@` aanmaken
- [ ] Leunis Makelaars aanmaken in portal (via admin)
- [ ] E-mailadressen Leunis team ophalen bij Arno's assistent  
- [ ] seed-leunis-team.sql updaten met echte client ID + emails
- [ ] 5 voorbeeld Funda-teksten van Arno ontvangen
- [ ] `OPENAI_API_KEY` toevoegen aan Vercel
