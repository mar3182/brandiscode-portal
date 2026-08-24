# Offerte-ondertekeningsflow in de Portal
**Agent:** Frontend Developer  
**Feature:** Digitale handtekening op offertes via Adobe Sign  
**Versie:** 1.0  
**Datum:** 2026-08-24

---

## 🎯 Doel

Bouw een gebruiksvriendelijke UI zodat de klant een offerte kan ondertekenen via Adobe Sign. De klant kan de ondertekende PDF zelf downloaden en bewaren.

---

## 📋 Scope

- Offerte detailpagina aanpassen
- "Ondertekenen" knop toevoegen
- Status weergave: concept / verzonden / bekeken / getekend
- Download van ondertekende PDF
- Mobile-first design (320px+)
- Real-time status polling
- Error handling
- Responsive UI

---

## 🔧 Stap 1: Update offerte-detailpagina

Bestand: `src/app/dashboard/offertes/[id]/page.tsx`

**Voeg deze sectie toe:**

```typescript
import { Badge } from '@/components/ui/badge'
import OfferteSignatureFlow from '@/components/OfferteSignatureFlow'
import OffertePdfDownload from '@/components/OffertePdfDownload'

export default function OfferteDetailPage() {
  // ... existing code ...

  return (
    <div className="space-y-8">
      {/* === OFFERTE HEADER === */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-white">{offerte.title}</h1>
        <StatusBadge status={offerte.status} />
      </div>

      {/* === OFFERTE CONTENT === */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Offerte details, sprints, etc. */}
        </div>

        {/* === SIGNATURE SECTION (SIDEBAR) === */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Ondertekening
          </h2>

          {offerte.status === 'concept' || offerte.status === 'verstuurd' ? (
            <OfferteSignatureFlow
              offerteId={offerte.id}
              onSuccess={() => {
                // Refresh offerte data
                router.refresh()
              }}
            />
          ) : offerte.status === 'getekend' ? (
            <>
              <p className="mb-4 text-sm text-white/60">
                Deze offerte is ondertekend op{' '}
                {new Date(offerte.signed_at).toLocaleDateString('nl-NL')}
              </p>
              <OffertePdfDownload offerteId={offerte.id} />
            </>
          ) : (
            <p className="text-sm text-white/60">
              Status: {offerte.status}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 🎨 Stap 2: Ondertekeningsflow Component

Bestand: `src/components/OfferteSignatureFlow.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface OfferteSignatureFlowProps {
  offerteId: string
  onSuccess: () => void
}

export default function OfferteSignatureFlow({
  offerteId,
  onSuccess
}: OfferteSignatureFlowProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'signing' | 'signed' | 'error'>(
    'idle'
  )
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const MAX_POLL_ATTEMPTS = 300 // 15 min @ 3sec intervals

  const handleStartSigning = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Call backend to send document to Adobe Sign
      const response = await fetch(
        `/api/offertes/${offerteId}/send-signature`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (!response.ok) {
        throw new Error('Kon ondertekening niet starten')
      }

      const data = await response.json()
      setStatus('signing')
      setIsWaiting(true)

      // Start polling for signature status
      pollSignatureStatus()
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error ? err.message : 'Er is iets misgegaan'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const pollSignatureStatus = async () => {
    let attempts = 0

    const poll = async () => {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setStatus('error')
        setError('Ondertekening duurde te lang. Probeer later opnieuw.')
        setIsWaiting(false)
        return
      }

      try {
        const response = await fetch(
          `/api/offertes/${offerteId}/signature-status`
        )
        if (!response.ok) throw new Error('Status polling failed')

        const data = await response.json()

        if (data.status === 'signed') {
          setStatus('signed')
          setIsWaiting(false)
          onSuccess()
          return
        }

        attempts++
        setPollCount(attempts)

        // Poll elke 3 seconden
        setTimeout(poll, 3000)
      } catch (err) {
        console.error('Polling error:', err)
        attempts++
        setTimeout(poll, 5000) // Retry na 5 sec bij error
      }
    }

    poll()
  }

  return (
    <div className="space-y-3">
      {status === 'idle' && (
        <>
          <p className="text-sm text-white/60">
            Onderteken deze offerte digitaal via Adobe Sign.
          </p>
          <button
            onClick={handleStartSigning}
            disabled={isLoading}
            className="w-full rounded-lg bg-brand-gold px-4 py-3 font-semibold text-brand-dark hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Even geduld...
              </>
            ) : (
              'Ondertekenen via Adobe Sign'
            )}
          </button>
          <p className="text-xs text-white/40">
            U ontvangt een e-mail met een link om te ondertekenen.
          </p>
        </>
      )}

      {status === 'signing' && isWaiting && (
        <>
          <p className="text-sm text-white/60">
            Wacht op uw handtekening... ({pollCount * 3}s)
          </p>
          <div className="rounded-lg bg-white/5 p-3 text-sm text-white/60">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Controleer uw e-mail en volg de link om te ondertekenen.
          </div>
        </>
      )}

      {status === 'signed' && (
        <>
          <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
            Offerte ondertekend! De PDF is klaar om te downloaden.
          </div>
        </>
      )}

      {status === 'error' && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}
```

**Key features:**
- Polling stopt automatisch na 15 minuten
- Duidelijke status messages in het Nederlands
- Loading indicator
- Error messaging
- Responsive buttons

---

## 📥 Stap 3: Download Component

Bestand: `src/components/OffertePdfDownload.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface OffertePdfDownloadProps {
  offerteId: string
}

export default function OffertePdfDownload({
  offerteId
}: OffertePdfDownloadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch offerte data to get PDF URL
      const response = await fetch(`/api/offertes/${offerteId}`)
      if (!response.ok) throw new Error('Kon offerte niet laden')

      const offerte = await response.json()

      if (!offerte.signed_pdf_url) {
        throw new Error('Getekende PDF is niet beschikbaar')
      }

      // Download the PDF
      const pdfResponse = await fetch(offerte.signed_pdf_url)
      if (!pdfResponse.ok) throw new Error('Kon PDF niet downloaden')

      const blob = await pdfResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `offerte-${offerte.title}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Download mislukt'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="w-full rounded-lg bg-brand-gold px-4 py-3 font-semibold text-brand-dark hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Downloaden...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download getekende PDF
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
```

---

## 🎯 Stap 4: Status Badge Component

Update bestaand component: `src/components/StatusBadge.tsx`

```typescript
import { OfferteStatus } from '@/lib/types'
import {
  FileText,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'

interface StatusBadgeProps {
  status: OfferteStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<OfferteStatus, {
    label: string
    className: string
    icon: React.ReactNode
  }> = {
    concept: {
      label: 'Concept',
      className: 'bg-gray-500/20 text-gray-300',
      icon: <FileText className="w-4 h-4" />
    },
    verstuurd: {
      label: 'Verstuurd',
      className: 'bg-blue-500/20 text-blue-300',
      icon: <Send className="w-4 h-4" />
    },
    bekeken: {
      label: 'Bekeken',
      className: 'bg-yellow-500/20 text-yellow-300',
      icon: <Eye className="w-4 h-4" />
    },
    getekend: {
      label: 'Getekend',
      className: 'bg-green-500/20 text-green-300',
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    afgewezen: {
      label: 'Afgewezen',
      className: 'bg-red-500/20 text-red-300',
      icon: <XCircle className="w-4 h-4" />
    },
    afgerond: {
      label: 'Afgerond',
      className: 'bg-purple-500/20 text-purple-300',
      icon: <Clock className="w-4 h-4" />
    }
  }

  const config = statusConfig[status]

  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${config.className}`}>
      {config.icon}
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  )
}
```

---

## 📱 Stap 5: Mobile-First Responsive Design

Zorg dat alle components responsive zijn:

```typescript
// Container: mobile first, tablet en desktop
<div className="grid gap-6 md:grid-cols-3">
  <div className="md:col-span-2">
    {/* Offerte content */}
  </div>
  <div className="md:sticky md:top-6 md:h-fit">
    {/* Signature section */}
  </div>
</div>

// Buttons: groot genoeg voor touch (min 44px height)
<button className="py-3 px-4 rounded-lg">

// Text: lesbaar op kleine schermen
<p className="text-sm sm:text-base">

// Images/PDFs: responsive
<img className="w-full h-auto" />
```

---

## ⚠️ Stap 6: Error Handling

Voeg error boundaries toe:

```typescript
interface OfferteDetailPageProps {
  params: { id: string }
}

export default async function OfferteDetailPage({
  params
}: OfferteDetailPageProps) {
  try {
    const offerte = await fetchOfferte(params.id)
    if (!offerte) throw new Error('Offerte niet gevonden')
    // ... render
  } catch (error) {
    return (
      <div className="rounded-lg bg-red-500/10 p-4 text-red-400">
        <h2 className="font-semibold">Er is iets misgegaan</h2>
        <p className="text-sm mt-2">
          Probeer de pagina opnieuw te laden of neem contact op.
        </p>
      </div>
    )
  }
}
```

Errors:
- Offerte niet gevonden → 404
- Niet geautoriseerd → 401
- Server error → 500

---

## ✅ Acceptatiecriteria

Frontend implementatie is klaar wanneer:

- [ ] Offerte detailpagina toont status badge
- [ ] Status "Concept" en "Verstuurd" toont "Ondertekenen" knop
- [ ] "Ondertekenen" knop triggert backend endpoint
- [ ] Status polling werkt en toont progress
- [ ] Status "Getekend" toont "Download PDF" knop
- [ ] Download PDF werkt en slaat bestand lokaal op
- [ ] Mobile design is responsive (320px+)
- [ ] Loading states voorkomen UI-jitter
- [ ] Error messages zijn duidelijk in het Nederlands
- [ ] TypeScript: `npx tsc --noEmit` = EXIT:0
- [ ] Buttons zijn groot genoeg voor touch (44px+)
- [ ] Geen hardcoded content — alles uit API/database

---

## 🧪 Testing

```bash
# Type check
npx tsc --noEmit

# Component test
npm test -- components/OfferteSignatureFlow
npm test -- components/OffertePdfDownload

# Local dev test
npm run dev

# Test flow:
# 1. Navigate to offerte detail
# 2. Click "Ondertekenen" button
# 3. Verify polling starts
# 4. Manually update database status to 'signed'
# 5. Verify download button appears
# 6. Test download
```

---

## 📚 Dependencies

- `lucide-react` (icons, reeds aanwezig)
- `next/router` (navigation)
- `fetch` API (browsers API)

---

## 🔗 Gerelateerde bestanden

- [types.ts](../client-portal/src/lib/types.ts) - OfferteStatus type
- [StatusBadge.tsx](../client-portal/src/components/StatusBadge.tsx)
- Backend API: `/api/offertes/:id/send-signature`
- Backend API: `/api/offertes/:id/signature-status`

---

*Status: ACTIEF — Wacht op implementatie door Frontend Developer*
