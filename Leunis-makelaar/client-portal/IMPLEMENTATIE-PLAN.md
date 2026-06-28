# Implementatieplan — Client Portal Uitbreidingen
## Brand is Code · Client Portal v2
**Project:** `/Users/admin/Desktop/Leunis-makelaar/client-portal`  
**Status bijhouden:** vervang `[ ]` door `[x]` als een taak klaar is

---

## Codebase overzicht (lees dit eerst)

```
src/
  app/
    admin/          ← admin-only pagina's (beschermd via middleware)
      clients/      ← klantenoverzicht
      offertes/     ← offertes + sprints + deliverables + berichten
      page.tsx      ← admin dashboard
    api/
      admin/        ← server-side API routes voor admin
      team/         ← team API
      onboarding/   ← (nog te maken)
      facturen/     ← (nog te maken)
    dashboard/      ← klant-facing pagina's (beschermd via middleware)
      page.tsx      ← klant dashboard
      projecten/    ← sprint voortgang + deliverables
      offertes/     ← offertes bekijken + tekenen + berichten
      feedback/     ← feedback geven
      team/         ← teamleden beheren
      onboarding/   ← (nog te maken)
      facturen/     ← (nog te maken)
    login/
    auth/
  components/
    Sidebar.tsx         ← navigatie voor klant
    AdminSidebar.tsx    ← navigatie voor admin
    StatusBadge.tsx     ← herbruikbaar status-badge component
    StatCard.tsx        ← herbruikbaar statistieken-kaart
  lib/
    types.ts            ← alle TypeScript types
    auth.ts
    supabase/
      client.ts         ← browser client
      server.ts         ← server client (API routes + server components)
      admin.ts          ← service role client (bypast RLS)
  middleware.ts         ← route bescherming
supabase/
  schema.sql            ← basis schema
  migration-sprint-approval.sql
  seed.sql
  seed-leunis.sql       ← (nog te maken)
  migration-onboarding.sql  ← (nog te maken)
  migration-facturen.sql    ← (nog te maken)
```

### Hergebruik patronen

**Admin check in API routes:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}
```

**Client auth in API routes:**
```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**CSS patronen:**
- Kaart: `glass-card p-6`
- Pagina wrapper: `max-w-4xl` of `max-w-6xl`
- Koptekst: `text-2xl font-bold text-white`
- Subtekst: `text-white/50 mt-1`
- Lege staat: `glass-card p-12 text-center` met `text-white/40`
- Primaire knop: `btn-primary` (al gedefinieerd in globals.css)

**StatusBadge kleuren** (bestaand in StatusBadge.tsx):
- `gepland` → grijs
- `actief` → goud/amber
- `review` → paars
- `afgerond` → groen
- `afgewezen` → rood
- `getekend` → groen
- `verstuurd` → blauw

---

## FASE 1 — Leunis Makelaars seed data
> Geen code — alleen SQL. Hierna is de klant direct zichtbaar in het systeem.

### Taak 1.1 — SQL seed bestand aanmaken
- [x] Maak `/supabase/seed-leunis.sql`

Inhoud:
```sql
-- Seed: Leunis Makelaars
-- Voer dit uit in de Supabase SQL Editor NADAT schema.sql en migration-sprint-approval.sql zijn uitgevoerd.
-- Pas e-mailadressen en telefoonnummer aan voor productie.

DO $$
DECLARE
  v_client_id UUID;
  v_offerte_id UUID;
  v_sprint_id UUID;
BEGIN

-- 1. Client aanmaken
INSERT INTO clients (name, company, email, phone)
VALUES (
  'Arno Leunis & Henk Sturris',
  'Leunis Makelaars',
  'arno@leunismakelaars.nl',
  '+31 166 604 490'
)
ON CONFLICT (email) DO UPDATE SET company = EXCLUDED.company
RETURNING id INTO v_client_id;

-- 2. Offerte aanmaken
INSERT INTO offertes (client_id, title, description, total_amount, status)
VALUES (
  v_client_id,
  'AI-Implementatie in Sprints — OFR-2026-004-001',
  'Veilige AI-omgeving, woningbeschrijvingen-tool en teamtraining voor Leunis Makelaars.',
  2500.00,
  'getekend'
)
RETURNING id INTO v_offerte_id;

-- 3. Sprint 1 aanmaken
INSERT INTO sprints (offerte_id, number, title, description, amount, status, start_date, end_date)
VALUES (
  v_offerte_id,
  1,
  'Veilige AI-Omgeving & Woningbeschrijvingen',
  'Beveiligd intern AI-systeem via Microsoft 365 Copilot, prompt-templates voor woningbeschrijvingen en teamtraining on-site.',
  2500.00,
  'actief',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '14 days'
)
RETURNING id INTO v_sprint_id;

-- 4. Deliverables aanmaken voor Sprint 1
INSERT INTO deliverables (sprint_id, title, description, status) VALUES
  (v_sprint_id, 'Tijdelijk Microsoft-account aanvragen bij klant', 'Klant maakt consultant-account aan (bijv. consultant@leunismakelaars.nl) met toegang tot M365 admin center', 'todo'),
  (v_sprint_id, 'Microsoft 365-abonnement en Copilot-licenties controleren', 'Checken welk M365-abonnement actief is en of Copilot add-on beschikbaar is', 'todo'),
  (v_sprint_id, 'Copilot-licenties activeren en toewijzen aan medewerkers', 'Via admin.microsoft.com licenties kopen en toewijzen aan alle relevante medewerkers', 'todo'),
  (v_sprint_id, 'Woningbeschrijvingen-agent bouwen in Copilot Studio', 'Agent aanmaken met system prompt voor Funda-tekst, brochure en social media (3 varianten)', 'todo'),
  (v_sprint_id, 'Agent delen met het hele team', 'Via Copilot Studio de agent publiceren naar de organisatie', 'todo'),
  (v_sprint_id, 'Invoerformulier-sjabloon aanmaken in Word', 'Standaard .dotx sjabloon met alle woninginvoer-velden', 'todo'),
  (v_sprint_id, 'Sjabloon opslaan in gedeelde Teams-map', 'Map "AI-Tools / Woningbeschrijvingen" aanmaken en sjabloon erin plaatsen', 'todo'),
  (v_sprint_id, 'Testen met testwoning van klant', 'Samen met Arno of Henk: 2-3 actuele woningen door de agent halen en output vergelijken', 'todo'),
  (v_sprint_id, 'Privacy-protocol schrijven', '1 A4 document: "Zo gaan wij bij Leunis Makelaars om met AI en klantdata" — klaar als PDF', 'todo'),
  (v_sprint_id, 'Verwerkersovereenkomst Microsoft ophalen', 'DPA van Microsoft voor M365 Copilot ophalen en archiveren', 'todo'),
  (v_sprint_id, 'Workshop-presentatie bouwen', 'Presentatie incl. historische intro (drukpers, fiets, etc.) + Copilot demo slides', 'todo'),
  (v_sprint_id, 'Open Huizen Dag cadeau-demo voorbereiden', 'Kant-en-klare prompts voor het plannen van een open huizen dag — als verrassing tijdens training', 'todo'),
  (v_sprint_id, 'Spiekbriefje team opmaken', 'Lamineerbare 1-pager met stap-voor-stap gebruik van de woningbeschrijvings-agent', 'todo'),
  (v_sprint_id, 'Training on-site uitvoeren (2 uur)', 'Workshop bij Leunis Makelaars kantoor Tholen — alle medewerkers aanwezig', 'todo'),
  (v_sprint_id, 'Opleveringspakket overdragen', 'Alle bestanden, documentatie en toegangsgegevens overdragen', 'todo'),
  (v_sprint_id, 'Factuur versturen na oplevering', 'Factuur Sprint 1: €2.500,- excl. BTW, betaaltermijn 14 dagen', 'todo');

END $$;
```

### Taak 1.2 — ClientUser aanmaken (na seed)
- [x] Voeg onderstaande stap toe als **instructie in de README** — dit is handmatig via Supabase Auth dashboard:

```
Na het uitvoeren van seed-leunis.sql:
1. Ga naar Supabase dashboard → Authentication → Users
2. Klik "Invite user" → arno@leunismakelaars.nl
3. Ga naar de client_users tabel en voeg toe:
   - client_id: (het UUID van Leunis Makelaars uit de clients tabel)
   - email: arno@leunismakelaars.nl
   - name: Arno Leunis
   - role: owner
```

---

## FASE 2 — Onboarding Checklist Module
> Gestructureerde intake-vragen per project. Klant beantwoordt via portal. Admin ziet antwoorden.

### Taak 2.1 — Database migratie
- [x] Maak `/supabase/migration-onboarding.sql`

```sql
-- Migration: Onboarding vragen en antwoorden per offerte

CREATE TABLE onboarding_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offerte_id UUID REFERENCES offertes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  hint TEXT,
  answer_type TEXT DEFAULT 'text' CHECK (answer_type IN ('text', 'choice', 'yesno')),
  options JSONB,           -- array van strings bij answer_type = 'choice'
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE onboarding_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES onboarding_questions(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, client_id)
);

ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_answers ENABLE ROW LEVEL SECURITY;

-- Klant mag eigen vragen lezen
CREATE POLICY "Clients see own questions" ON onboarding_questions
  FOR SELECT USING (
    offerte_id IN (
      SELECT o.id FROM offertes o
      JOIN clients c ON c.id = o.client_id
      WHERE c.email = auth.jwt() ->> 'email'
    )
  );

-- Klant mag eigen antwoorden beheren
CREATE POLICY "Clients manage own answers" ON onboarding_answers
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  ) WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  );

CREATE INDEX idx_onboarding_questions_offerte ON onboarding_questions(offerte_id);
CREATE INDEX idx_onboarding_answers_question ON onboarding_answers(question_id);
CREATE INDEX idx_onboarding_answers_client ON onboarding_answers(client_id);
```

Voeg ook onderstaande vragen toe aan `/supabase/seed-leunis.sql` (na de DO $$ block, als aparte INSERT):

```sql
-- Onboarding vragen voor Leunis Makelaars Sprint 1
-- Voer dit uit NA migration-onboarding.sql

INSERT INTO onboarding_questions (offerte_id, question, hint, answer_type, options, sort_order, is_required)
SELECT
  o.id,
  q.question,
  q.hint,
  q.answer_type::TEXT,
  q.options::JSONB,
  q.sort_order,
  true
FROM offertes o,
(VALUES
  ('Welk Microsoft 365-abonnement hebben jullie?', 'Niet zeker? Kijk op admin.microsoft.com → Facturering → Uw producten', 'choice', '["Business Basic", "Business Standard", "Business Premium", "Microsoft 365 Apps", "Weet ik niet"]', 1),
  ('Hoeveel medewerkers krijgen toegang tot Copilot?', 'Denk aan iedereen die woningbeschrijvingen schrijft of e-mails beheert', 'text', NULL, 2),
  ('Wie beheert jullie Microsoft-omgeving?', 'Naam + e-mailadres van de beheerder, of "wij regelen dit zelf"', 'text', NULL, 3),
  ('Hebben jullie al een gedeelde Teams-omgeving?', NULL, 'yesno', NULL, 4),
  ('Welk e-mailadres wil je gebruiken voor het tijdelijke consultant-account?', 'Bijv. consultant@leunismakelaars.nl — dit account verwijderen we na de sprint', 'text', NULL, 5)
) AS q(question, hint, answer_type, options, sort_order)
WHERE o.title LIKE '%OFR-2026-004-001%';
```

### Taak 2.2 — Types toevoegen
- [x] Voeg toe aan `/src/lib/types.ts`:

```typescript
export interface OnboardingQuestion {
  id: string
  offerte_id: string
  question: string
  hint: string | null
  answer_type: 'text' | 'choice' | 'yesno'
  options: string[] | null
  sort_order: number
  is_required: boolean
  created_at: string
  answer?: string | null  // joined vanuit onboarding_answers
}

export interface OnboardingAnswer {
  id: string
  question_id: string
  client_id: string
  answer: string
  answered_at: string
}
```

### Taak 2.3 — Client API route
- [x] Maak `/src/app/api/onboarding/route.ts`

**GET** — haalt vragen op voor de offerte van de ingelogde klant, inclusief bestaande antwoorden:
```
1. Haal ingelogde user op via createClient()
2. Haal client_id op via client_users tabel (email = user.email)
3. Haal client_id ook op via clients tabel voor antwoorden
4. Haal onboarding_questions op gekoppeld aan offertes van deze klant
   (JOIN: onboarding_questions → offertes → clients)
5. Haal onboarding_answers op voor deze client_id
6. Merge: voeg answer toe aan elk question object
7. Return: gesorteerd op sort_order
```

**POST** — sla antwoord op (upsert):
```
Body: { question_id: string, answer: string }
1. Haal client_id op (clients tabel via user email)
2. Upsert in onboarding_answers op (question_id, client_id)
3. Return: { success: true }
```

### Taak 2.4 — Admin API route
- [x] Maak `/src/app/api/admin/onboarding/route.ts`

**GET** — `?offerte_id=xxx` → alle vragen + antwoorden voor die offerte:
```
1. checkAdmin()
2. Haal onboarding_questions op voor offerte_id
3. Haal alle onboarding_answers op voor die questions
4. Return: questions met embedded answers
```

**POST** — nieuwe vraag aanmaken:
```
Body: { offerte_id, question, hint, answer_type, options, sort_order, is_required }
1. checkAdmin()
2. Insert in onboarding_questions
3. Return: nieuwe vraag
```

**DELETE** — `?id=xxx` → vraag verwijderen:
```
1. checkAdmin()
2. Delete onboarding_question by id (antwoorden cascaden automatisch)
3. Return: { success: true }
```

### Taak 2.5 — Client dashboard pagina
- [x] Maak `/src/app/dashboard/onboarding/page.tsx`

Vereisten:
- `'use client'`
- Titel: `"Informatie doorgeven"`
- Subtitel: `"Beantwoord de onderstaande vragen zodat we direct aan de slag kunnen."`
- Voortgangsbalk bovenaan: `"X van Y vragen beantwoord"` met progress bar
- Als alle verplichte vragen beantwoord: groene banner `"Alles ingevuld — we gaan aan de slag! ✓"`
- Per vraag een `glass-card p-5` met:
  - Vraagnummer + vraag (wit, font-medium)
  - Hint indien aanwezig (text-white/40, text-sm, mt-1)
  - Input afhankelijk van `answer_type`:
    - `text` → `<textarea>` met 3 rijen, Tailwind class `input-field` of gelijkwaardig
    - `choice` → radio buttons, één per optie, gestyled als pill-buttons
    - `yesno` → twee knoppen: "Ja" en "Nee", gestyled als toggle
  - Automatisch opslaan: gebruik `useCallback` + `setTimeout` debounce (500ms) bij elke wijziging
  - Visuele bevestiging na opslaan: kleine groene checkmark naast het veld (verdwijnt na 2s)
- Laadstate: toon `<Loader2 className="animate-spin" />` tijdens ophalen
- Lege staat (geen vragen): `"Er zijn nog geen vragen ingesteld voor dit project."`

### Taak 2.6 — Admin view: intake antwoorden
- [x] Voeg toe aan `/src/app/admin/offertes/page.tsx`

Per offerte, voeg een uitklapbaar gedeelte toe "Intake" (naast de bestaande sprint-weergave):
- Knop/tab "Intake antwoorden" per offerte
- Bij klik: laad vragen + antwoorden via `GET /api/admin/onboarding?offerte_id=xxx`
- Toon als lijst: vraag in grijs klein lettertype, antwoord in wit
- Onbeantwoorde vragen: toon `"Nog niet beantwoord"` in `text-white/30 italic`
- Toon voortgang: `"X van Y ingevuld"`

### Taak 2.7 — Sidebar link toevoegen
- [x] Pas `/src/components/Sidebar.tsx` aan:
  - Voeg navigatie-item toe: label `"Informatie"`, icon `ClipboardList` (lucide-react), href `/dashboard/onboarding`
  - Voeg badge toe als er nog onbeantwoorde verplichte vragen zijn (haal count op via API)
  - Plaats het item vóór of na "Projecten" — houd bestaande volgorde zo intact mogelijk

---

## FASE 3 — Facturen Module
> Admin maakt facturen aan per sprint. Klant ziet ze in het portal met betaalstatus.

### Taak 3.1 — Database migratie
- [x] Maak `/supabase/migration-facturen.sql`

```sql
-- Migration: Facturen module

CREATE TABLE facturen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  factuur_nummer TEXT UNIQUE NOT NULL,  -- bijv. FAC-2026-001
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,        -- excl. BTW
  btw_percentage NUMERIC(5,2) DEFAULT 21.00,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'verstuurd', 'betaald', 'herinnering')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Berekende kolommen als views (computed in app layer voor compatibiliteit)
-- btw_amount = ROUND(amount * btw_percentage / 100, 2)
-- total_amount = amount + btw_amount

ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;

-- Klant mag eigen facturen lezen
CREATE POLICY "Clients see own facturen" ON facturen
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  );

CREATE INDEX idx_facturen_client ON facturen(client_id);
CREATE INDEX idx_facturen_sprint ON facturen(sprint_id);
CREATE INDEX idx_facturen_status ON facturen(status);
```

### Taak 3.2 — Types toevoegen
- [x] Voeg toe aan `/src/lib/types.ts`:

```typescript
export type FactuurStatus = 'concept' | 'verstuurd' | 'betaald' | 'herinnering'

export interface Factuur {
  id: string
  client_id: string
  sprint_id: string | null
  factuur_nummer: string
  title: string
  description: string | null
  amount: number          // excl. BTW
  btw_percentage: number
  status: FactuurStatus
  issue_date: string
  due_date: string | null
  paid_at: string | null
  pdf_path: string | null
  created_at: string
  updated_at: string
  // computed in app
  btw_amount: number
  total_amount: number
  // joined
  sprint?: Sprint | null
}
```

Voeg helper functie toe aan types.ts (of een apart utils bestand):
```typescript
export function computeFactuurBedragen(factuur: Pick<Factuur, 'amount' | 'btw_percentage'>) {
  const btw_amount = Math.round(factuur.amount * factuur.btw_percentage) / 100
  const total_amount = factuur.amount + btw_amount
  return { btw_amount, total_amount }
}
```

### Taak 3.3 — Client API route
- [x] Maak `/src/app/api/facturen/route.ts`

**GET** — alle facturen voor de ingelogde klant:
```
1. Haal ingelogde user op
2. Haal client_id op (clients tabel via email)
3. Haal facturen op + sprint titel via join
   .select('*, sprints(number, title)')
4. Bereken btw_amount en total_amount per factuur (in JS, niet in DB)
5. Sorteer: openstaand bovenaan (verstuurd, herinnering), betaald onderaan
6. Return: array van facturen
```

### Taak 3.4 — Admin API route
- [x] Maak `/src/app/api/admin/facturen/route.ts`

**GET** — alle facturen, optioneel gefilterd op `?client_id=xxx`:
```
1. checkAdmin()
2. Haal facturen op met client en sprint info
   .select('*, clients(name, company), sprints(number, title)')
3. Sorteer op created_at desc
4. Bereken btw en totaal bedragen
5. Return: array
```

**POST** — nieuwe factuur aanmaken:
```
Body: { client_id, sprint_id?, title, description?, amount, btw_percentage?, due_date? }
1. checkAdmin()
2. Genereer factuur_nummer: haal hoogste bestaande nummer op, increment
   Formaat: FAC-2026-XXX (jaar uit CURRENT_DATE, nummer 3 cijfers met leading zeros)
3. Insert factuur met status 'concept'
4. Return: nieuwe factuur
```

**PATCH** — status bijwerken:
```
Body: { id, status }
1. checkAdmin()
2. Als status === 'betaald': zet paid_at = now()
3. Als status !== 'betaald': zet paid_at = null
4. Update status + updated_at
5. Return: bijgewerkte factuur
```

### Taak 3.5 — Client dashboard pagina
- [x] Maak `/src/app/dashboard/facturen/page.tsx`

Vereisten:
- `'use client'`
- Titel: `"Facturen"`
- Subtitel: `"Overzicht van je facturen en betalingen."`
- Als er openstaande facturen zijn (status 'verstuurd' of 'herinnering'):
  - Gele/amber banner bovenaan: `"Je hebt X openstaande factuur(en) — totaal €X.XXX,-"`
- Tabel met kolommen:
  - Factuur nr
  - Omschrijving
  - Sprint (indien gekoppeld)
  - Bedrag excl. BTW
  - BTW (21%)
  - Totaal incl. BTW
  - Factuurdatum
  - Vervaldatum
  - Status (gebruik StatusBadge — zie taak 3.7 voor extra statussen)
- Betaalde facturen tonen met lagere opacity of in apart gedeelte onder een scheidingslijn
- Lege staat: `"Er zijn nog geen facturen aangemaakt."`
- Laadstate: spinner

### Taak 3.6 — Admin facturen pagina
- [x] Maak `/src/app/admin/facturen/page.tsx`

Vereisten:
- `'use client'`
- Titel: `"Facturen"`
- Overzicht statistieken bovenaan (gebruik StatCard):
  - Totaal openstaand (som van amount excl. BTW, status verstuurd/herinnering)
  - Totaal betaald dit jaar
  - Aantal openstaande facturen
- Filter-knoppen: Alle · Concept · Verstuurd · Betaald · Herinnering
- Tabel met alle facturen over alle klanten:
  - Factuur nr · Klant · Sprint · Bedrag · Totaal incl. BTW · Status · Vervaldatum · Acties
- Kolom "Acties" per rij:
  - Dropdown of knoppen om status te wijzigen (concept → verstuurd → betaald of herinnering)
  - Statuswijziging direct via PATCH /api/admin/facturen
- Knop "Nieuwe factuur" (rechtsboven) → inline modal/formulier met velden:
  - Klant (select, laad via /api/admin/clients)
  - Sprint (select, optioneel, geladen op basis van gekozen klant)
  - Titel (text input)
  - Beschrijving (textarea, optioneel)
  - Bedrag excl. BTW (number input)
  - BTW % (number input, default 21)
  - Vervaldatum (date input, default +30 dagen)
  - Knop "Aanmaken"
- Na aanmaken: modal sluiten, lijst verversen

### Taak 3.7 — StatusBadge uitbreiden
- [x] Pas `/src/components/StatusBadge.tsx` aan

Voeg de volgende FactuurStatus waarden toe aan de bestaande switch/map:
- `'verstuurd'` → blauw (zelfde als bestaande 'verstuurd' als die al bestaat, anders: `bg-blue-500/20 text-blue-300`)
- `'betaald'` → groen (`bg-emerald-500/20 text-emerald-300`)
- `'herinnering'` → oranje/amber (`bg-amber-500/20 text-amber-300`)
- `'concept'` → grijs (zelfde als 'gepland')

Zorg dat de component zowel SprintStatus als FactuurStatus als OfferteStatus accepteert — pas het type aan als nodig.

### Taak 3.8 — Sidebar links toevoegen
- [x] Pas `/src/components/Sidebar.tsx` aan:
  - Voeg navigatie-item toe: label `"Facturen"`, icon `Receipt` (lucide-react), href `/dashboard/facturen`
  - Voeg rode badge toe met aantal openstaande facturen (haal count op via API bij mount)

- [x] Pas `/src/components/AdminSidebar.tsx` aan:
  - Voeg navigatie-item toe: label `"Facturen"`, icon `Receipt` (lucide-react), href `/admin/facturen`
  - Optioneel: badge met aantal openstaande facturen

---

## Volgorde van implementatie

Werk de fases en taken in deze volgorde af:

```
[x] FASE 1 — Seed data (SQL alleen, geen code)
  [x] 1.1 seed-leunis.sql aanmaken
  [x] 1.2 README instructie voor ClientUser

[x] FASE 2 — Onboarding module
  [x] 2.1 migration-onboarding.sql
  [x] 2.2 Types toevoegen aan types.ts
  [x] 2.3 Client API route /api/onboarding
  [x] 2.4 Admin API route /api/admin/onboarding
  [x] 2.5 Client pagina /dashboard/onboarding
  [x] 2.6 Admin view in /admin/offertes
  [x] 2.7 Sidebar link toevoegen

[x] FASE 3 — Facturen module
  [x] 3.1 migration-facturen.sql
  [x] 3.2 Types toevoegen aan types.ts
  [x] 3.3 Client API route /api/facturen
  [x] 3.4 Admin API route /api/admin/facturen
  [x] 3.5 Client pagina /dashboard/facturen
  [x] 3.6 Admin pagina /admin/facturen
  [x] 3.7 StatusBadge uitbreiden
  [x] 3.8 Sidebar links toevoegen
```

---

## Buiten scope (voor later)

- PDF generatie voor facturen
- E-mail notificaties bij nieuwe factuur of antwoord
- Betalingsintegratie (Mollie / Stripe)
- Onboarding vragen aanmaken via admin UI (nu via SQL seed)
- Meerdere sprints per klant in onboarding (nu: eerste offerte)

---

## Wat NIET gewijzigd mag worden

- Bestaande database tabellen en RLS policies (alleen toevoegen, niet aanpassen)
- Bestaande API routes in /api/admin/offertes, /api/admin/clients, /api/team
- Bestaande pagina's buiten de wijzigingen beschreven in taak 2.6, 2.7, 3.7 en 3.8
- Middleware.ts — route bescherming blijft ongewijzigd
- globals.css — geen stijlwijzigingen tenzij een nieuwe utility class nodig is
