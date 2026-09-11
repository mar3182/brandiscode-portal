'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Filter, Download, Eye, Trash2 } from 'lucide-react'

interface AdminFundaDescription {
  id: string
  client_id: string
  tool_id: string
  access_id: string | null
  form_data: Record<string, unknown>
  generated_text: string
  media_format: string
  source_type: 'manual' | 'synthetic'
  synthetic_label: string | null
  images: string[]
  generation_key: string | null
  token_count: number
  cost_eur: number
  is_synthetic: boolean
  created_at: string
  updated_at: string
  clients?: {
    id: string
    company_name: string
    contact_person: string
  }
}

interface AdminFundaDescriptionsResponse {
  descriptions: AdminFundaDescription[]
  statistics: {
    total: number
    totalTokens: number
    totalCost: number
    syntheticCount: number
    manualCount: number
  }
  page: number
  limit: number
  totalPages: number
}

const MEDIA_FORMAT_LABELS: Record<string, string> = {
  funda: 'Funda',
  instagram: 'Instagram',
  facebook: 'Facebook',
  brochure: 'Brochure',
}

export default function AdminFundaDescriptionsPage() {
  const [descriptions, setDescriptions] = useState<AdminFundaDescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statistics, setStatistics] = useState<{
    total: number
    totalTokens: number
    totalCost: number
    syntheticCount: number
    manualCount: number
  } | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [mediaFilter, setMediaFilter] = useState<string>('all')
  const [syntheticFilter, setSyntheticFilter] = useState<string>('all')
  const [clientIdFilter, setClientIdFilter] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedDescription, setSelectedDescription] = useState<AdminFundaDescription | null>(null)

  const limit = 50

  useEffect(() => {
    fetchDescriptions()
  }, [page, sourceFilter, mediaFilter, syntheticFilter, clientIdFilter, startDate, endDate])

  async function fetchDescriptions() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      
      if (sourceFilter !== 'all') {
        params.append('sourceType', sourceFilter)
      }
      if (mediaFilter !== 'all') {
        params.append('mediaFormat', mediaFilter)
      }
      if (syntheticFilter !== 'all') {
        params.append('isSynthetic', syntheticFilter)
      }
      if (clientIdFilter) {
        params.append('clientId', clientIdFilter)
      }
      if (startDate) {
        params.append('startDate', startDate)
      }
      if (endDate) {
        params.append('endDate', endDate)
      }

      const res = await fetch(`/api/admin/funda-descriptions?${params}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ophalen mislukt')
      }
      const data: AdminFundaDescriptionsResponse = await res.json()
      setDescriptions(data.descriptions)
      setTotalPages(data.totalPages)
      setStatistics(data.statistics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    const dataStr = JSON.stringify(descriptions, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `admin-funda-descriptions-${format(new Date(), 'yyyy-MM-dd')}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin: Woningbeschrijvingen</h1>
          <p className="text-white/60">Beheer en analyseer alle gegenereerde woningbeschrijvingen</p>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Totaal</p>
              <p className="text-2xl font-bold text-white">{statistics.total}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Handmatig</p>
              <p className="text-2xl font-bold text-brand-blue">{statistics.manualCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Fictief</p>
              <p className="text-2xl font-bold text-amber-400">{statistics.syntheticCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Tokens</p>
              <p className="text-2xl font-bold text-white">{(statistics.totalTokens / 1000000).toFixed(2)}M</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Kosten</p>
              <p className="text-2xl font-bold text-emerald-400">€{statistics.totalCost.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Bron</label>
              <select
                value={sourceFilter}
                onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
              >
                <option value="all">Alle bronnen</option>
                <option value="manual">Handmatig</option>
                <option value="synthetic">Fictief</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Media formaat</label>
              <select
                value={mediaFilter}
                onChange={(e) => { setMediaFilter(e.target.value); setPage(1) }}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
              >
                <option value="all">Alle formaten</option>
                <option value="funda">Funda</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="brochure">Brochure</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Synthetisch</label>
              <select
                value={syntheticFilter}
                onChange={(e) => { setSyntheticFilter(e.target.value); setPage(1) }}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
              >
                <option value="all">Alle</option>
                <option value="true">Alleen fictief</option>
                <option value="false">Alleen handmatig</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Client ID</label>
              <input
                type="text"
                value={clientIdFilter}
                onChange={(e) => setClientIdFilter(e.target.value)}
                placeholder="Filter op client"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Start datum</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Eind datum</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setSourceFilter('all')
                  setMediaFilter('all')
                  setSyntheticFilter('all')
                  setClientIdFilter('')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
              >
                Filters wissen
              </button>
              <button
                onClick={fetchDescriptions}
                className="flex-1 px-4 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue/80 transition-all"
              >
                Filteren
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 hover:bg-emerald-500/30 transition-all"
              >
                <Download className="w-4 h-4" />
                Exporteren
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-white/60">Laden...</p>
          </div>
        )}

        {/* Descriptions List */}
        {!loading && descriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/60">Geen beschrijvingen gevonden</p>
          </div>
        )}

        {/* Table */}
        {!loading && descriptions.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Media</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Adres</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Woorden</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Tokens</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Kosten</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {descriptions.map((desc) => (
                    <tr
                      key={desc.id}
                      className={`hover:bg-white/5 transition-all ${
                        selectedDescription?.id === desc.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        {desc.clients ? (
                          <div>
                            <p className="text-sm font-medium text-white">{desc.clients.company_name}</p>
                            <p className="text-xs text-white/40">{desc.clients.contact_person}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-white/40">{desc.client_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          desc.is_synthetic
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-brand-blue/20 text-brand-blue'
                        }`}>
                          {desc.is_synthetic ? 'Fictief' : 'Handmatig'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-white/70">
                          {MEDIA_FORMAT_LABELS[desc.media_format] || desc.media_format}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white/70">
                          {(desc.form_data as { adres?: string })?.adres || '-'}
                        </p>
                        <p className="text-xs text-white/40">
                          {(desc.form_data as { plaats?: string })?.plaats || ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {desc.generated_text.split(/\s+/).length}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {(desc.token_count / 1000).toFixed(1)}k
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-400">
                        €{parseFloat(String(desc.cost_eur)).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/40">
                        {format(new Date(desc.created_at), 'd MMM yyyy, HH:mm', { locale: nl })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDescription(
                              selectedDescription?.id === desc.id ? null : desc
                            )}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all"
                            title="Bekijken"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded view */}
            {selectedDescription && (
              <div className="p-6 border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Beschikbare details
                  </h3>
                  <button
                    onClick={() => setSelectedDescription(null)}
                    className="text-white/60 hover:text-white transition-all"
                  >
                    Sluiten
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-white/60 mb-2">Volledige tekst:</h4>
                    <div className="bg-white/5 rounded-xl p-4 text-white/80 whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
                      {selectedDescription.generated_text}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-white/60 mb-2">Woninggegevens:</h4>
                    <div className="bg-white/5 rounded-xl p-4 text-sm text-white/70 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(selectedDescription.form_data, null, 2)}</pre>
                    </div>
                  </div>
                </div>

                {selectedDescription.images && selectedDescription.images.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-white/60 mb-2">Afbeeldingen:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedDescription.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Afbeelding ${idx + 1}`}
                          className="rounded-xl border border-white/10"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
            >
              Vorige
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    page === pageNum
                      ? 'bg-brand-blue text-white'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
            >
              Volgende
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
