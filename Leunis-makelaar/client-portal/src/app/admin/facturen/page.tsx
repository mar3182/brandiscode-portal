'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, ExternalLink, Loader2 } from 'lucide-react'
import { computeFactuurBedragen } from '@/lib/types'

const STATUS_STYLE: Record<string, string> = {
  concept:     'bg-white/10 text-white/50',
  verstuurd:   'bg-blue-500/20 text-blue-300',
  herinnering: 'bg-amber-500/20 text-amber-300',
  betaald:     'bg-green-500/20 text-green-300',
}

const STATUS_LABEL: Record<string, string> = {
  concept:     'Concept',
  verstuurd:   'Verstuurd',
  herinnering: 'Herinnering',
  betaald:     'Betaald',
}

export default function AdminFacturenPage() {
  const router = useRouter()
  const [facturen, setFacturen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/facturen')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setFacturen(d)
        else setError(d.error || 'Laden mislukt')
      })
      .catch(() => setError('Verbinding mislukt'))
      .finally(() => setLoading(false))
  }, [])

  const totaalOpenstaand = facturen
    .filter((f) => f.status === 'verstuurd' || f.status === 'herinnering')
    .reduce((sum, f) => sum + computeFactuurBedragen(f).total_amount, 0)

  return (
    <div className="min-h-screen p-4 pt-16 md:pt-8 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-blue/20 border border-brand-blue/30">
          <Receipt className="w-5 h-5 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Facturen</h1>
          {!loading && totaalOpenstaand > 0 && (
            <p className="text-sm text-amber-300 mt-0.5">
              €{totaalOpenstaand.toFixed(2).replace('.', ',')} openstaand
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/50">
          <Loader2 className="w-4 h-4 animate-spin" /> Laden…
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Nummer</th>
                <th className="px-5 py-3 text-left">Klant</th>
                <th className="px-5 py-3 text-left">Omschrijving</th>
                <th className="px-5 py-3 text-right">Bedrag</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-left">Datum</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {facturen.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-white/30">
                    Geen facturen gevonden
                  </td>
                </tr>
              )}
              {facturen.map((f) => (
                <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 font-mono text-white/70 whitespace-nowrap">{f.factuur_nummer ?? '—'}</td>
                    <td className="px-5 py-3 text-white/80">{f.clients?.company ?? f.clients?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-white/60 max-w-[200px] truncate">{f.title}</td>
                    <td className="px-5 py-3 text-right text-white font-medium tabular-nums whitespace-nowrap">
                      €{computeFactuurBedragen(f).total_amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[f.status] ?? 'bg-white/10 text-white/40'}`}>
                        {STATUS_LABEL[f.status] ?? f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/40 whitespace-nowrap">
                      {new Date(f.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => router.push(`/admin/clients/${f.client_id}?tab=facturen`)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                        title="Bekijk bij klant"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
