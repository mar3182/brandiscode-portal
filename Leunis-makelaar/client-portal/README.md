# Brand is Code — Client Portal

Custom mini-app voor klantcommunicatie en projectbeheer.

## Features

- **Offertes bekijken** — Klanten ontvangen een link en kunnen hun offerte bekijken
- **Digitaal ondertekenen** — Handtekening zetten direct in de browser
- **Projectstatus volgen** — Sprint voortgang en deliverables in real-time
- **Feedback geven** — Beoordelingen + berichten per sprint
- **Bedrijfsgegevens beheren** — Klant vult zelf bedrijfs- en facturatiegegevens in (KvK, BTW, IBAN, factuuradres)
- **Klantenbeheer voor admin** — Admin kan klantprofielen met bedrijfsgegevens aanmaken en bewerken

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Auth via Magic Link, PostgreSQL, Row Level Security)
- **Tailwind CSS** (glassmorphism design, Brand is Code branding)
- **signature_pad** (digitale handtekeningen)

## Setup

```bash
# Installeer dependencies
npm install

# Kopieer environment variabelen
cp .env.example .env.local
# Vul je Supabase URL + Anon Key in

# Start development server
npm run dev
```

## Tests

De standaardtest draait de onboarding-scenario's, intake-contractchecks en de geisoleerde unit-tests:

```bash
npm test
```

Alleen de regressietests voor de koppeling tussen Supabase Auth en `client_users` uitvoeren:

```bash
npm run test:unit -- --runTestsByPath src/lib/clientUsersFlow.unit.test.ts
```

Deze unit-tests gebruiken uitsluitend mocks en maken geen verbinding met Supabase of een productiedatabase.

## Supabase Setup

1. Maak een nieuw project aan op [supabase.com](https://supabase.com)
2. Ga naar SQL Editor en voer `supabase/schema.sql` uit
3. Voer daarna migraties uit:
    - `supabase/migration-sprint-approval.sql`
    - `supabase/migration-onboarding.sql`
    - `supabase/migration-facturen.sql`
    - `supabase/migration-client-profile.sql`
4. Kopieer de Project URL en Anon Key naar `.env.local`
5. Schakel Email Auth (Magic Link) in onder Authentication > Providers

Na het uitvoeren van `supabase/seed-leunis.sql`:

1. Ga naar Supabase dashboard -> Authentication -> Users
2. Klik "Invite user" -> [arno@leunismakelaars.nl](mailto:arno@leunismakelaars.nl)
3. Ga naar de `client_users` tabel en voeg toe:
    - `client_id`: het UUID van Leunis Makelaars uit de `clients` tabel
    - `email`: [arno@leunismakelaars.nl](mailto:arno@leunismakelaars.nl)
    - `name`: Arno Leunis
    - `role`: owner

## Project Structure

```
src/
├── app/
│   ├── login/              # Magische inloglink
│   ├── auth/callback/      # Supabase auth callback
│   └── dashboard/
│       ├── page.tsx         # Dashboard overzicht
│       ├── offertes/        # Offerte lijst + detail + tekenen
│       ├── projecten/       # Sprint status + deliverables
│       └── feedback/        # Feedback formulier + geschiedenis
├── components/
│   ├── Sidebar.tsx          # Navigatie sidebar
│   ├── StatCard.tsx         # Dashboard statistieken
│   ├── StatusBadge.tsx      # Status labels
│   └── SignatureCanvas.tsx  # Digitale handtekening pad
└── lib/
    ├── supabase/            # Supabase client (browser + server)
    └── types.ts             # TypeScript types
```

## Deployment

Optimaal voor Vercel:
```bash
npm run build
# Deploy via Vercel CLI of GitHub integration
```

---

Gebouwd door [Brand is Code](https://brandiscode.com) — KvK 91166667
