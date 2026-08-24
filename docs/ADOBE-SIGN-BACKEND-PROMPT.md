# Adobe Acrobat Sign API-integratie voor Offertes
**Agent:** Backend Specialist  
**Feature:** Digitale handtekening op offertes via Adobe Sign  
**Versie:** 1.0  
**Datum:** 2026-08-24

---

## 🎯 Doel

Implementeer een complete backend flow voor Adobe Acrobat Sign-ondertekening van offertes. Een offerte-PDF wordt naar Adobe Sign verstuurd, de klant ondertekent digitaal, en de ondertekende PDF wordt teruggehaald en gekoppeld aan de offerte in Supabase.

---

## 📋 Scope

- Adobe Sign API-client setup en credentials management
- offerte PDF versturen naar Adobe Sign
- agreement aanmaken met signer e-mailadres
- status polling of webhook handling
- ondertekende PDF downloaden en opslaan
- database velden en RLS-policies updaten
- API endpoints voor frontend
- security en data safety

---

## 🔧 Stap 1: Voorbereiding

1. Zorg dat je Adobe Sign API-credentials hebt:
   - Client ID
   - Client Secret
   - Tenant ID
   - of een valid API token
2. Sla deze veilig op in environment variables (`.env.local`)

Checklist:
```
[ ] Adobe Sign account is actief
[ ] API credentials zijn beschikbaar
[ ] Microsoft 365 integration is ingesteld
[ ] .env.local bestand is updated met credentials
```

---

## 📝 Stap 2: Adobe Sign Client Module

Bestand: `src/lib/adobeSign.ts`

Implementeer een Adobe Sign client met deze functies:

```typescript
/**
 * Verkrijg access token voor Adobe Sign API
 * Ondersteunt OAuth of direct API token
 */
export async function getAccessToken(): Promise<string>

/**
 * Upload PDF naar Adobe Sign
 * @param pdfBuffer - PDF als Buffer
 * @param fileName - naam van het document
 */
export async function uploadDocument(
  pdfBuffer: Buffer,
  fileName: string
): Promise<{ documentId: string; name: string }>

/**
 * Maak een signing agreement aan
 * @param documentId - document ID van uploaded PDF
 * @param signerEmail - e-mail van ondertekener
 * @param signerName - naam van ondertekener
 * @param offerteName - titel van offerte voor tracking
 */
export async function createAgreement(
  documentId: string,
  signerEmail: string,
  signerName: string,
  offerteName: string
): Promise<{
  agreementId: string
  signingUrl?: string
  status: string
}>

/**
 * Poll de status van een agreement
 * @param agreementId - Adobe Sign agreement ID
 */
export async function getAgreementStatus(
  agreementId: string
): Promise<{
  status: 'SIGNED' | 'PENDING' | 'EXPIRED' | 'DECLINED' | 'CANCELLED'
  signedAt?: Date
  signerEmail?: string
}>

/**
 * Download de ondertekende PDF
 * @param agreementId - Adobe Sign agreement ID
 */
export async function downloadSignedDocument(
  agreementId: string
): Promise<Buffer>
```

**Type definitions** - voeg toe aan `src/lib/types.ts`:
```typescript
export interface AdobeSignAgreement {
  agreementId: string
  documentId: string
  signerEmail: string
  signerName: string
  status: 'SIGNED' | 'PENDING' | 'EXPIRED' | 'DECLINED'
  createdAt: Date
  signedAt?: Date
}
```

**Error handling:**
- Zorg voor duidelijke error messages
- Log errors op debug-niveau (geen credentials)
- Handle rate-limiting van Adobe API
- Implementeer retry logic met exponential backoff

---

## 🗄️ Stap 3: Database Velden & Migrations

Bestand: `supabase/migration-adobe-sign.sql`

```sql
-- Voeg Adobe Sign velden toe aan offertes tabel
ALTER TABLE public.offertes
ADD COLUMN adobe_sign_agreement_id TEXT,
ADD COLUMN adobe_sign_status TEXT,
ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN signed_pdf_url TEXT,
ADD COLUMN signed_by_email TEXT;

-- Voeg constraints toe
ALTER TABLE public.offertes
ADD CONSTRAINT adobe_sign_status_check CHECK (
  adobe_sign_status IN ('pending', 'signed', 'expired', 'declined', 'cancelled')
);

-- Update status constraint voor offertes
ALTER TABLE public.offertes
DROP CONSTRAINT offertes_status_check;

ALTER TABLE public.offertes
ADD CONSTRAINT offertes_status_check CHECK (
  status IN ('concept', 'verstuurd', 'bekeken', 'getekend', 'afgewezen', 'afgerond')
);

-- Indexering voor snellere queries
CREATE INDEX idx_offertes_adobe_sign_agreement_id 
ON public.offertes(adobe_sign_agreement_id);

CREATE INDEX idx_offertes_signed_at 
ON public.offertes(signed_at DESC);
```

**Voer migration uit:**
```bash
# In Supabase SQL Editor
# Kopieër en run de bovenstaande SQL
```

---

## 🔌 Stap 4: API Endpoints

### Endpoint 1: POST `/api/offertes/:id/send-signature`

Bestand: `src/app/api/offertes/[id]/send-signature/route.ts`

**Functionaliteit:**
```typescript
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Authenticatie checken
  // 2. Offerte uit database halen
  // 3. Klant e-mailadres controleren
  // 4. PDF genereren (gebruik generateOffertePdf())
  // 5. PDF uploaden naar Adobe Sign
  // 6. Agreement aanmaken
  // 7. adobe_sign_agreement_id opslaan in database
  // 8. Return agreement info

  return Response.json({
    success: true,
    agreementId: string,
    signingUrl?: string,
    message: "Ondertekening gestart. Controleer uw e-mail."
  })
}
```

**Validation:**
- Offerte moet bestaan
- Offerte mag niet al getekend zijn
- Klant moet geverifieerd zijn
- E-mailadres moet geldig zijn

**Error responses:**
```
400: Offerte niet gevonden
400: Offerte is al getekend
401: Niet geautoriseerd
500: Adobe Sign API error
```

---

### Endpoint 2: GET `/api/offertes/:id/signature-status`

Bestand: `src/app/api/offertes/[id]/signature-status/route.ts`

**Functionaliteit:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Offerte uit database halen
  // 2. agreement_id checken
  // 3. Adobe Sign status polling
  // 4. Als status = SIGNED:
  //    - Download signed PDF
  //    - Sla op in Supabase Storage
  //    - Update offerte.signed_pdf_url
  //    - Update offerte.signed_at
  //    - Set offerte.status = 'getekend'
  // 5. Return status

  return Response.json({
    status: 'signed' | 'pending' | 'expired' | 'declined',
    signedAt?: Date,
    signedPdfUrl?: string,
    signerEmail?: string
  })
}
```

**Polling logic:**
- Max poll duration: 15 minuten
- Poll interval: 2-3 seconden
- Stop als status != PENDING

---

### Endpoint 3: POST `/api/webhooks/adobe-sign`

Bestand: `src/app/api/webhooks/adobe-sign/route.ts`

**Functionaliteit:**
```typescript
export async function POST(request: Request) {
  // 1. Webhook signature verifiëren (Adobe Sign security)
  // 2. Request body parsen
  // 3. Extract agreement_id en status
  // 4. Als status = 'SIGNED':
  //    - Find offerte by adobe_sign_agreement_id
  //    - Download signed PDF
  //    - Sla op in storage
  //    - Update offerte status naar 'getekend'
  //    - Send notification to customer
  // 5. Log webhook event
  // 6. Return 200 OK

  return Response.json({ success: true })
}
```

**Security:**
- Verifieer webhook signature met Adobe public key
- Validate timestamp tegen request time
- Implementeer idempotency (gebruik agreement_id als idempotency key)
- Rate limiting: max X requests per minute per IP

**Error handling:**
- Invalid signature → 401
- Invalid payload → 400
- Processing error → 500 (Adobe zal later retry)

---

## 💾 Stap 5: Supabase Storage voor Ondertekende PDFs

**Bucket instellen:**
```bash
# In Supabase dashboard:
# Storage → New bucket
# Name: signed-offertes
# Public: OFF (private)
```

**RLS Policies:**
```sql
-- Alleen klanten kunnen hun eigen ondertekende PDFs zien
CREATE POLICY "Klanten kunnen eigen signed offertes zien"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'signed-offertes'
  AND auth.uid()::text = (
    SELECT cu.user_id
    FROM client_users cu
    WHERE cu.client_id = (
      SELECT client_id FROM offertes
      WHERE id = (storage.objects.name::uuid)::text
    )
  )
);

-- Admin kan alles zien
CREATE POLICY "Admin kan alle signed offertes zien"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'signed-offertes'
  AND auth.jwt() ->> 'email' = (SELECT ADMIN_EMAIL FROM environment_variables)
);
```

**Upload en download:**
```typescript
// Upload signed PDF
const { data, error } = await supabaseAdmin
  .storage
  .from('signed-offertes')
  .upload(
    `${clientId}/${offerteId}/signed.pdf`,
    pdfBuffer,
    { contentType: 'application/pdf', upsert: true }
  )

// Download URL (ondertekende link)
const { data: { publicUrl } } = supabaseAdmin
  .storage
  .from('signed-offertes')
  .getPublicUrl(`${clientId}/${offerteId}/signed.pdf`)
```

---

## 🔐 Stap 6: Security & RLS

**Environment variables (`.env.local`):**
```
ADOBE_SIGN_CLIENT_ID=xxx
ADOBE_SIGN_CLIENT_SECRET=xxx
ADOBE_SIGN_TENANT_ID=xxx
ADOBE_SIGN_API_BASE_URL=https://api.adobe.io
```

**Never hardcode:**
- API keys
- Tenant IDs
- Signing tokens

**Logging:**
```typescript
// OK
console.log('Adobe Sign request sent for offerte', offerteId)

// NOT OK
console.log('Token:', token)
console.log('Agreement:', agreementJson)
```

**RLS Policies:**
- Klanten kunnen alleen hun eigen ondertekeningen zien
- Admin kan alles zien
- Geen cross-tenant leaks

---

## ✅ Acceptatiecriteria

Backend implementatie is klaar wanneer:

- [ ] Adobe Sign API credentials zijn geconfigureerd
- [ ] `src/lib/adobeSign.ts` is geïmplementeerd met alle functies
- [ ] Database migration is uitgevoerd
- [ ] POST `/api/offertes/:id/send-signature` werkt
- [ ] GET `/api/offertes/:id/signature-status` werkt
- [ ] POST `/api/webhooks/adobe-sign` is beveiligd
- [ ] Ondertekende PDF wordt gedownload en opgeslagen
- [ ] offerte.status verandert naar "getekend" zodra Adobe Sign bevestigt
- [ ] RLS-policies voorkomen ongeautoriseerde toegang
- [ ] Geen hardcoded secrets in code
- [ ] Error handling is robuust
- [ ] TypeScript: `npx tsc --noEmit` = EXIT:0

---

## 🧪 Testing

```bash
# Type check
npx tsc --noEmit

# Unit tests voor adobeSign.ts
npm test -- lib/adobeSign

# API route tests
npm test -- api/offertes

# Integration test (lokaal)
# 1. Start development server
npm run dev

# 2. Test send-signature endpoint
curl -X POST http://localhost:3000/api/offertes/TEST_ID/send-signature \
  -H "Content-Type: application/json" \
  -d '{"signerEmail": "test@example.com"}'

# 3. Check database voor adobe_sign_agreement_id
# 4. Check storage voor PDF
```

---

## 📚 Dependencies

- `@adobe/sign-sdk` of HTTP calls met `axios`/`fetch`
- `@supabase/supabase-js` (reeds aanwezig)
- `jspdf` (reeds aanwezig voor PDF gen)

---

## 🔗 Gerelateerde bestanden

- [generateOffertePdf.ts](../client-portal/src/lib/generateOffertePdf.ts)
- [types.ts](../client-portal/src/lib/types.ts)
- [DATA-SAFETY-PROTOCOL.md](./DATA-SAFETY-PROTOCOL.md)

---

*Status: ACTIEF — Wacht op implementatie door Backend Specialist*
