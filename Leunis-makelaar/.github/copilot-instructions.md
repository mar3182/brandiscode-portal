# GitHub Copilot — Project Instructies: Brand is Code Client Portal

## Rol & Verantwoordelijkheid
Je werkt als ontwikkelaar aan het **Brand is Code client portal** — een Next.js 14 SaaS portal voor klantbeheer, onboarding, facturen en offertes.

**Projectmanager:** GitHub Copilot (algemeen manager). Het centrale projectplan staat in `docs/PROJECT-BRIEF-ONBOARDING.md`. Lees dit bij elke nieuwe sessie.

---

## Stack & Technologie

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Supabase client:** `@supabase/ssr` — gebruik ALTIJD de juiste client:
  - Server components / API routes: `createClient()` uit `@/lib/supabase/server`
  - Client components: `createClient()` uit `@/lib/supabase/client`
  - Admin operaties (omzeil RLS): `createAdminClient()` uit `@/lib/supabase/admin`
- **Deploy:** Vercel, root directory = `Leunis-makelaar/client-portal`
- **Repo:** https://github.com/mar3182/brandiscode-portal (git root = `/Users/admin/Desktop`)
- **Live URL:** https://portal.brandiscode.com

---

## Project Structuur

```
/Users/admin/Desktop/               ← git root
  Leunis-makelaar/
    client-portal/                  ← Next.js app (Vercel root)
      src/
        app/                        ← App router pagina's
        components/                 ← Gedeelde componenten
        lib/
          supabase/                 ← client.ts, server.ts, admin.ts
          companyProfileValidation.ts  ← KvK/BTW/IBAN maskers + validatie
          types.ts                  ← Alle TypeScript types
      supabase/                     ← SQL migrations
    docs/                           ← Projectdocumentatie
    .github/
      workflows/                    ← CI/CD (01-pr-checks, 02-staging-cd, 03-production-cd)
```

---

## Database Tabellen (Supabase)

| Tabel | Doel |
|-------|------|
| `clients` | Klantbedrijven inclusief billing fields |
| `client_users` | Koppeling klant ↔ Supabase auth gebruiker |
| `offertes` | Offertes per klant |
| `onboarding_questions` | Vragen gekoppeld aan offerte |
| `onboarding_answers` | Antwoorden per klant |
| `sprints` | Sprint planning per klant |
| `deliverables` | Deliverables per sprint |

**Billing velden in `clients`:** contact_person, kvk_number, btw_number, iban, billing_email, billing_address_line1/2, billing_postal_code, billing_city, billing_country, onboarding_completed_at

---

## Authenticatie

- Admin check: `user.email === process.env.ADMIN_EMAIL`
- Client check: opzoeken via `client_users` tabel op email
- Middleware beschermt `/dashboard/*` en `/admin/*`

---

## Coding Regels

1. **TypeScript strict** — `npx tsc --noEmit` moet EXIT:0 zijn voor elke commit
2. **Input maskers** — gebruik `formatKvkInput`, `formatBtwInput`, `formatIbanInput` uit `companyProfileValidation.ts`
3. **Foutmeldingen** — altijd in het **Nederlands** voor eindgebruikers
4. **Geen `any`** — gebruik de types uit `src/lib/types.ts`
5. **Cache-Control** — API routes die gevoelige data retourneren krijgen `no-store` headers
6. **Geen hardcoded secrets** — gebruik altijd `process.env.*`

7. **Responsive-first** — elke pagina werkt op mobiel (320px+), tablet en desktop. Gebruik Tailwind responsive prefixes (`sm:`, `md:`, `lg:`). Test altijd op kleine schermen. De portal wordt in de toekomst een native app (Android + macOS) — mobile-first is de standaard.

8. **Data Safety First (niet onderhandelbaar)** — elke agent volgt bij elke wijziging verplicht de stappen in `docs/DATA-SAFETY-PROTOCOL.md`.

## Verplichte Data Safety Gates (voor ALLE agents)

Iedere agent (frontend, backend, PM, sub-agent) moet dit uitvoeren:

1. **Voor wijziging**
  - Bevestig impact op data (schema, deletes, updates, migraties).
  - Gebruik geen destructieve SQL in productie zonder expliciete PM-goedkeuring.

2. **Tijdens wijziging**
  - Gebruik idempotente migraties (`IF NOT EXISTS`, veilige checks).
  - Voorkom hardcoded IDs in SQL seeds; gebruik dynamische lookups.
  - Respecteer tenant-isolatie (`client_id` filters + RLS).

3. **Voor oplevering**
  - Voeg verificatiequeries en rollback-notities toe bij datawijzigingen.
  - Meld expliciet resterende risico's en handmatige stappen.

4. **Nooit doen zonder expliciete opdracht**
  - Bulk delete op productiedata.
  - Historische data overschrijven zonder back-up/restoreplan.
  - Geheimen of keys loggen/opslaan in plaintext buiten beveiligde context.

---

- **Productie branch:** `main` (deployt automatisch naar Vercel)
- **Feature branches:** `feature/[naam]`
- **Commit formaat:** `feat|fix|chore|docs(scope): beschrijving`
- **Push:** `git -c http.version=HTTP/1.1 push origin [branch]` (HTTP/2 geeft soms framing errors)

---

## Voortgang Bijhouden

Na elke werksessie:
1. Update de statustabel in `docs/PROJECT-BRIEF-ONBOARDING.md` (sectie 7)
2. Commit met: `docs: update project brief na [agent naam] sessie`
3. Meld aan de PM wat af is en wat de volgende stap is
4. Noteer bij datawijzigingen expliciet dat de Data Safety Gates zijn doorlopen

---

## Huidige Prioriteit

**Onboarding wizard bouwen** — zie `docs/PROJECT-BRIEF-ONBOARDING.md` voor volledig plan.  
Volgorde: Agent B (backend) → Agent A (frontend) + Agent C (admin UI) → PM test → deploy
