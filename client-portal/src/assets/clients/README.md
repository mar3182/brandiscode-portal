# Klant Assets

Deze map bevat klant-specifieke assets (logo's, documenten, etc.).

## Structuur

```
assets/
└── clients/
    ├── leunis-makelaars/
    │   ├── logo.png
    │   ├── brochure.pdf
    │   └── ...
    └── andere-klant/
        └── ...
```

## Beveiliging

⚠️ **Belangrijk:** Deze bestanden worden NIET direct geserveerd via Next.js.

Gebruik Supabase Storage met RLS policies voor beveiligde toegang:
- Clients kunnen alleen hun eigen assets zien
- Admins kunnen alle assets zien
- Gebruik signed URLs voor tijdelijke toegang

## Voorbeeld: Client logo laden

```typescript
// In een client component:
import Image from 'next/image'

function ClientLogo({ clientId }: { clientId: string }) {
  const logoUrl = `/api/assets/${clientId}/logo`
  
  return (
    <Image src={logoUrl} alt="Client Logo" width={200} height={100} />
  )
}
```

## API Endpoint

Maak een API route aan om assets veilig te serveren:

```typescript
// src/app/api/assets/[clientId]/[filename]/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { clientId: string; filename: string } }
) {
  const { clientId, filename } = await params
  const supabase = createClient()
  
  // Controleer of de user toegang heeft tot deze client
  const { data: { user } } = await supabase.auth.getUser()
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('slug', clientId)
    .eq('email', user?.email)
    .maybeSingle()
  
  if (!client) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Serveer het bestand
  const filePath = `src/assets/clients/${clientId}/${filename}`
  // ... lees en serveer bestand
}
```
