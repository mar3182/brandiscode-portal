'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  concept:   'bg-white/10 text-white/50',
  verstuurd: 'bg-blue-500/20 text-blue-300',
  bekeken:   'bg-purple-500/20 text-purple-300',
  getekend:  'bg-green-500/20 text-green-300',
  afgewezen: 'bg-red-500/20 text-red-300',
  afgerond:  'bg-white/5 text-white/30',
}

const STATUS_LABEL: Record<string, string> = {
  concept:   'Concept',
  verstuurd: 'Verstuurd',
  bekeken:   'Bekeken',
  getekend:  'Getekend',
  afgewezen: 'Afgewezen',
  afgerond:  'Afgerond',
}

export default function AdminOffertesPage() {
  const router = useRouter()
  const [offertes, setOffertes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/offertes')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setOffertes(d)
        else setError(d.error || 'Laden mislukt')
      })
      .catch(() => setError('Verbinding mislukt'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen p-4 pt-16 md:pt-8 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-blue/20 border border-brand-blue/30">
          <FileText className="w-5 h-5 text-brand-blue" />
        </div>
        <h1 className="text-2xl font-bold text-white">Offertes & Sprints</h1>
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
                <th className="px-5 py-3 text-left">Klant</th>
                <th className="px-5 py-3 text-left">Titel</th>
                <th className="px-5 py-3 text-right">Bedrag</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Sprints</th>
                <th className="px-5 py-3 text-left">Datum</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {offertes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-white/30">
                    Geen offertes gevonden
                  </td>
                </tr>
              )}
              {offertes.map((o) => (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3 text-white/80">{o.clients?.company ?? o.clients?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-white/70 max-w-[220px] truncate">{o.title}</td>
                  <td className="px-5 py-3 text-right text-white font-medium tabular-nums whitespace-nowrap">
                    {o.total_amount != null ? `€${Number(o.total_amount).toFixed(2).replace('.', ',')}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[o.status] ?? 'bg-white/10 text-white/40'}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-white/40">
                    {Array.isArray(o.sprints) ? o.sprints.length : '—'}
                  </td>
                  <td className="px-5 py-3 text-white/40 whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => router.push(`/admin/clients/${o.client_id}?tab=offertes`)}
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
