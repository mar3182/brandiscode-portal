'use client'

import { useEffect, useMemo, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import type { Factuur } from '@/lib/types'
import { generateFactuurPDF, type FactuurClientInfo } from '@/lib/generateFactuurPDF'
import { Download, Loader2, Receipt } from 'lucide-react'

function formatEuro(value: number) {
  return `EUR ${value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('nl-NL')
}

export default function FacturenPage() {
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [clientInfo, setClientInfo] = useState<FactuurClientInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [facturenRes, profileRes] = await Promise.all([
        fetch('/api/facturen'),
        fetch('/api/client-profile'),
      ])
      const [facturenData, profileData] = await Promise.all([
        facturenRes.json(),
        profileRes.json(),
      ])
      if (Array.isArray(facturenData)) setFacturen(facturenData)
      if (profileData && !profileData.error) {
        setClientInfo({
          name: profileData.name ?? '',
          company: profileData.company ?? null,
          billing_address_line1: profileData.billing_address_line1 ?? null,
          billing_address_line2: profileData.billing_address_line2 ?? null,
          billing_postal_code: profileData.billing_postal_code ?? null,
          billing_city: profileData.billing_city ?? null,
          billing_email: profileData.billing_email ?? null,
          btw_number: profileData.btw_number ?? null,
        })
      }
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

  const handleDownload = async (factuur: Factuur) => {
    await generateFactuurPDF(factuur, clientInfo)
  }

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
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-white">Facturen</h1>
        <p className="text-white/50 mt-1">Overzicht van je facturen en betalingen.</p>
      </div>

      {openFacturen.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
          Je hebt {openFacturen.length} openstaande factuur{openFacturen.length > 1 ? 'en' : ''} — totaal {formatEuro(openTotal)}
        </div>
      )}

      {facturen.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Receipt className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Er zijn nog geen facturen aangemaakt.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile card view (< md) ─────────────────────────── */}
          <div className="md:hidden space-y-3">
            {otherFacturen.map((factuur) => (
              <div key={factuur.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-white font-semibold text-sm">{factuur.factuur_nummer}</p>
                    <p className="text-white/70 text-sm mt-0.5">{factuur.title}</p>
                    {factuur.sprint?.title && (
                      <p className="text-white/40 text-xs mt-0.5">Sprint {factuur.sprint.number}: {factuur.sprint.title}</p>
                    )}
                  </div>
                  <StatusBadge status={factuur.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-white/40">Totaal incl. BTW</p>
                    <p className="text-white font-semibold">{formatEuro(factuur.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-white/40">Vervaldatum</p>
                    <p className="text-white">{formatDate(factuur.due_date)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(factuur)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-brand-gold/30 text-brand-gold text-xs hover:bg-brand-gold/10 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>
            ))}

            {paidFacturen.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wide text-white/40 pt-2 px-1">Betaald</p>
                {paidFacturen.map((factuur) => (
                  <div key={factuur.id} className="glass-card p-4 opacity-60">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-white font-semibold text-sm">{factuur.factuur_nummer}</p>
                        <p className="text-white/70 text-sm mt-0.5">{factuur.title}</p>
                      </div>
                      <StatusBadge status={factuur.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm font-semibold">{formatEuro(factuur.total_amount)}</p>
                      <button
                        onClick={() => handleDownload(factuur)}
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/10 text-white/60 text-xs hover:bg-white/5 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── Desktop table view (≥ md) ───────────────────────── */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/50">
                  <tr>
                    <th className="text-left p-3">Factuur nr</th>
                    <th className="text-left p-3">Omschrijving</th>
                    <th className="text-left p-3">Sprint</th>
                    <th className="text-right p-3">Excl. BTW</th>
                    <th className="text-right p-3">BTW</th>
                    <th className="text-right p-3">Totaal</th>
                    <th className="text-left p-3">Datum</th>
                    <th className="text-left p-3">Vervaldatum</th>
                    <th className="text-left p-3">Status</th>
                    <th className="p-3"></th>
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
                      <td className="p-3">
                        <button
                          onClick={() => handleDownload(factuur)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-brand-gold/30 text-brand-gold text-xs hover:bg-brand-gold/10 transition-all"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      </td>
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
                          <td className="p-3 font-medium w-[160px]">{factuur.factuur_nummer}</td>
                          <td className="p-3">{factuur.title}</td>
                          <td className="p-3 w-[200px]">{factuur.sprint?.title ? `Sprint ${factuur.sprint.number}: ${factuur.sprint.title}` : '-'}</td>
                          <td className="p-3 text-right w-[150px]">{formatEuro(factuur.total_amount)}</td>
                          <td className="p-3 w-[120px]"><StatusBadge status={factuur.status} /></td>
                          <td className="p-3 w-[80px]">
                            <button
                              onClick={() => handleDownload(factuur)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 text-white/60 text-xs hover:bg-white/5 transition-all"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
