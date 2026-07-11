'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, ExternalLink, Loader2 } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-white/10 text-white/50',
  submitted: 'bg-blue-500/20 text-blue-300',
  reviewed:  'bg-amber-500/20 text-amber-300',
  planned:   'bg-green-500/20 text-green-300',
}

const STATUS_LABEL: Record<string, string> = {
  draft:     'Concept',
  submitted: 'Ingediend',
  reviewed:  'Beoordeeld',
  planned:   'Gepland',
}

export default function AdminTrainingIntakesPage() {
  const router = useRouter()
  const [intakes, setIntakes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/training-intakes', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setIntakes(d)
        else setError(d.error || 'Laden mislukt')
      })
      .catch(() => setError('Verbinding mislukt'))
      .finally(() => setLoading(false))
  }, [])

  const openCount = intakes.filter((i) => i.status !== 'planned').length

  return (
    <div className="min-h-screen p-4 pt-16 md:pt-8 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-blue/20 border border-brand-blue/30">
          <ClipboardList className="w-5 h-5 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Training Intakes</h1>
          {!loading && openCount > 0 && (
            <p className="text-sm text-amber-300 mt-0.5">{openCount} nog niet gepland</p>
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
                <th className="px-5 py-3 text-left">Klant</th>
                <th className="px-5 py-3 text-left">Contactpersoon</th>
                <th className="px-5 py-3 text-left">Focusgebied</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-left">Ingediend</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {intakes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-white/30">
                    Geen training intakes gevonden
                  </td>
                </tr>
              )}
              {intakes.map((i) => (
                <tr key={i.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3 text-white/80">{i.clients?.company ?? i.clients?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-white/60">{i.contact_person ?? '—'}</td>
                  <td className="px-5 py-3 text-white/60 max-w-[180px] truncate">{i.focus_area ?? '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[i.status] ?? 'bg-white/10 text-white/40'}`}>
                      {STATUS_LABEL[i.status] ?? i.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white/40 whitespace-nowrap">
                    {i.submitted_at ? new Date(i.submitted_at).toLocaleDateString('nl-NL') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => router.push(`/admin/clients/${i.client_id}?tab=training`)}
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
