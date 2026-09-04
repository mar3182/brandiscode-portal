# Klant-specifieke Routing

Dit document uitleggen hoe de klant-specifieke routing werkt in de Brand is Code client portal.

## Overzicht

Elke klant krijgt nu een eigen URL in het formaat:
```
https://portal.brandiscode.com/[klant-slug]/dashboard
```

Voorbeeld:
- Leunis Makelaars: `https://portal.brandiscode.com/leunis-makelaars/dashboard`
- Andere klant: `https://portal.brandiscode.com/andere-klant/dashboard`

## Structuur

```
client-portal/src/app/
├── [clientId]/              ← Dynamische klant routing
│   ├── layout.tsx           ← Haalt client data op via slug
│   ├── page.tsx             ← Klant-specifiek dashboard
│   ├── offertes/            ← Klant-specifieke offertes
│   ├── sprints/             ← Klant-specifieke sprints
│   └── documents/           ← Klant-specifieke documenten
├── admin/                   ← Admin panel (alle klanten)
├── dashboard/               ← Bestaande dashboard (kan verwijderd worden)
└── login/
```

## Database

### Clients tabel — nieuwe `slug` kolom

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
```

De slug wordt gegenereerd op basis van de `company` naam:
- "Leunis Makelaars" → "leunis-makelaars"
- "Andere Bedrijf" → "andere-bedrijf"

### Middleware

De middleware controleert of de URL een bekende client slug is:

```typescript
// src/middleware.ts
const CLIENT_SLUGS = new Set(['leunis-makelaars', ...])
```

Voeg nieuwe klanten toe aan deze set wanneer ze worden aangemaakt.

### Assets

Klant-specifieke assets (logo's, documenten) worden opgeslagen in:

```
src/assets/clients/
└── [clientId]/
    ├── logo.png
    └── ...
```

Beveiligde API route:
```
/api/assets/[clientId]/[filename]
```

Deze route controleert of de ingelogde gebruiker toegang heeft tot de client.

## Gebruik

### Voor klanten

Klanten krijgen hun eigen dashboard op:
```
/[klant-slug]/dashboard
```

Ze zien alleen hun eigen data (offertes, sprints, facturen, etc.).

### Voor admins

Admins kunnen alle klanten zien via:
```
/admin/clients
```

## Migratie van bestaande dashboard

De bestaande `/dashboard` pagina's moeten worden gemigreerd naar `[clientId]/dashboard`.

### Stap 1: Verplaats bestaande pagina's

```bash
# Verplaats dashboard pagina's naar [clientId]
mv src/app/dashboard/* src/app/[clientId]/dashboard/
```

### Stap 2: Update links

Update alle links in de bestaande pagina's om de klant-specifieke routing te gebruiken.

### Stap 3: Test

Test de nieuwe routing met een test klant.

## Veiligheid

- **RLS policies** zorgen dat klanten alleen hun eigen data zien
- **Middleware** controleert of de URL een bekende client slug is
- **API routes** controleren of de ingelogde gebruiker toegang heeft

## Toekomstige uitbreidingen

- Automatische slug generatie bij client aanmaak
- Dashboard voor admins om nieuwe klanten toe te voegen
- Klant-specifieke branding (kleuren, logo's)
