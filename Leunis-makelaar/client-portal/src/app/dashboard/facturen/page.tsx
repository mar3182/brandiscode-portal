'use client'

import { useEffect, useMemo, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import type { Factuur } from '@/lib/types'
import { Loader2, Receipt } from 'lucide-react'

function formatEuro(value: number) {
  return `EUR ${value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('nl-NL')
}

export default function FacturenPage() {
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/facturen')
      const data = await res.json()
      if (Array.isArray(data)) setFacturen(data)
      setLoading(false)
    }

    load()
  }, [])

  const openFacturen = useMemo(
    () => facturen.filter((f) => f.status === 'verstuurd' || f.status === 'herinnering'),
    [facturen]
  )

  const paidFacturen = useMemo(
    () => facturen.filter((f) => f.status === 'betaald'),
    [facturen]
  )

  const otherFacturen = useMemo(
    () => facturen.filter((f) => f.status !== 'betaald'),
    [facturen]
  )

  const openTotal = useMemo(
    () => openFacturen.reduce((sum, f) => sum + f.total_amount, 0),
    [openFacturen]
  )

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Facturen</h1>
        <p className="text-white/50 mt-1">Overzicht van je facturen en betalingen.</p>
      </div>

      {openFacturen.length > 0 && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
          Je hebt {openFacturen.length} openstaande factuur(en) - totaal {formatEuro(openTotal)}
        </div>
      )}

      {facturen.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Receipt className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Er zijn nog geen facturen aangemaakt.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/50">
                <tr>
                  <th className="text-left p-3">Factuur nr</th>
                  <th className="text-left p-3">Omschrijving</th>
                  <th className="text-left p-3">Sprint</th>
                  <th className="text-right p-3">Bedrag excl. BTW</th>
                  <th className="text-right p-3">BTW (21%)</th>
                  <th className="text-right p-3">Totaal incl. BTW</th>
                  <th className="text-left p-3">Factuurdatum</th>
                  <th className="text-left p-3">Vervaldatum</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {otherFacturen.map((factuur) => (
                  <tr key={factuur.id} className="border-t border-white/5 text-white/80">
                    <td className="p-3 font-medium">{factuur.factuur_nummer}</td>
                    <td className="p-3">{factuur.title}</td>
                    <td className="p-3">{factuur.sprint?.title ? `Sprint ${factuur.sprint.number}: ${factuur.sprint.title}` : '-'}</td>
                    <td className="p-3 text-right">{formatEuro(factuur.amount)}</td>
                    <td className="p-3 text-right">{formatEuro(factuur.btw_amount)}</td>
                    <td className="p-3 text-right font-semibold">{formatEuro(factuur.total_amount)}</td>
                    <td className="p-3">{formatDate(factuur.issue_date)}</td>
                    <td className="p-3">{formatDate(factuur.due_date)}</td>
                    <td className="p-3"><StatusBadge status={factuur.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paidFacturen.length > 0 && (
            <>
              <div className="border-t border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-white/40">
                Betaald
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm opacity-60">
                  <tbody>
                    {paidFacturen.map((factuur) => (
                      <tr key={factuur.id} className="border-t border-white/5 text-white/80">
                        <td className="p-3 font-medium w-[180px]">{factuur.factuur_nummer}</td>
                        <td className="p-3">{factuur.title}</td>
                        <td className="p-3 w-[220px]">{factuur.sprint?.title ? `Sprint ${factuur.sprint.number}: ${factuur.sprint.title}` : '-'}</td>
                        <td className="p-3 text-right w-[170px]">{formatEuro(factuur.total_amount)}</td>
                        <td className="p-3 w-[140px]"><StatusBadge status={factuur.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
