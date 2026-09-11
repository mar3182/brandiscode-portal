'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Copy, RefreshCw, Filter, Download } from 'lucide-react'

interface FundaDescription {
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

interface FundaDescriptionsResponse {
  descriptions: FundaDescription[]
  total: number
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

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: 'Handmatig gegenereerd',
  synthetic: 'Fictieve woning (testdata)',
}

export default function FundaDescriptionsPage() {
  const [descriptions, setDescriptions] = useState<FundaDescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [mediaFilter, setMediaFilter] = useState<string>('all')
  const [selectedDescription, setSelectedDescription] = useState<FundaDescription | null>(null)

  const limit = 20

  useEffect(() => {
    fetchDescriptions()
  }, [page, sourceFilter, mediaFilter])

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

      const res = await fetch(`/api/client/funda-descriptions?${params}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ophalen mislukt')
      }
      const data: FundaDescriptionsResponse = await res.json()
      setDescriptions(data.descriptions)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    // Could add toast notification here
  }

  function handleExport() {
    // Export all descriptions as JSON
    const dataStr = JSON.stringify(descriptions, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `funda-descriptions-${format(new Date(), 'yyyy-MM-dd')}.json`
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
          <h1 className="text-3xl font-bold text-white mb-2">Mijn Woningbeschrijvingen</h1>
          <p className="text-white/60">Beheer en bekijk al je gegenereerde woningbeschrijvingen</p>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <Filter className="w-5 h-5 text-white/60" />
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-white/70 mb-1">
                Bron
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
              >
                <option value="all">Alle bronnen</option>
                <option value="manual">Handmatig gegenereerd</option>
                <option value="synthetic">Fictieve woningen</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-white/70 mb-1">
                Media formaat
              </label>
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

            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue/20 border border-brand-blue/30 rounded-xl text-brand-blue hover:bg-brand-blue/30 transition-all"
              >
                <Download className="w-4 h-4" />
                Exporteren
              </button>
              <button
                onClick={fetchDescriptions}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Vernieuwen
              </button>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-4 text-sm text-white/50">
              {total} beschrijvingen gevonden
            </div>
          )}
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
            <p className="text-white/60 mb-4">Nog geen beschrijvingen gevonden</p>
            <p className="text-white/40 text-sm">
              Genereer je eerste woningbeschrijving om hier te zien.
            </p>
          </div>
        )}

        {/* Cards */}
        {!loading && descriptions.map((desc) => (
          <div
            key={desc.id}
            className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-4 hover:bg-white/10 transition-all cursor-pointer"
            onClick={() => setSelectedDescription(selectedDescription?.id === desc.id ? null : desc)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    desc.is_synthetic
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                  }`}>
                    {desc.is_synthetic ? '🏠 Fictief' : '📝 Handmatig'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70">
                    {MEDIA_FORMAT_LABELS[desc.media_format] || desc.media_format}
                  </span>
                  <span className="text-xs text-white/40">
                    {format(new Date(desc.created_at), 'd MMM yyyy, HH:mm', { locale: nl })}
                  </span>
                </div>

                {/* Address info */}
                {desc.form_data?.adres && (
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {desc.form_data.adres}{(desc.form_data as { plaats?: string })?.plaats ? `, ${(desc.form_data as { plaats?: string }).plaats}` : ''}
                  </h3>
                )}

                {/* Property type */}
                {(desc.form_data as { woningtype?: string })?.woningtype && (
                  <p className="text-white/60 text-sm mb-2">
                    {(desc.form_data as { woningtype?: string }).woningtype}
                  </p>
                )}

                {/* Text preview */}
                <p className="text-white/70 text-sm line-clamp-3 mb-3">
                  {desc.generated_text.substring(0, 200)}...
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>{desc.generated_text.split(/\s+/).length} woorden</span>
                  <span>{(desc.token_count / 1000).toFixed(1)}k tokens</span>
                  <span>€{parseFloat(String(desc.cost_eur)).toFixed(4)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(desc.generated_text)
                  }}
                  className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"
                  title="Kopiëren"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded view */}
            {selectedDescription?.id === desc.id && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="prose prose-invert max-w-none">
                  <h4 className="text-white font-medium mb-2">Volledige beschrijving:</h4>
                  <div className="bg-white/5 rounded-xl p-4 text-white/80 whitespace-pre-wrap text-sm">
                    {desc.generated_text}
                  </div>
                </div>

                {/* Form data */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-white/60 mb-2">Woninggegevens:</h5>
                    <div className="bg-white/5 rounded-xl p-3 text-sm text-white/70">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(desc.form_data, null, 2)}</pre>
                    </div>
                  </div>
                  
                  {desc.images && desc.images.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-white/60 mb-2">Afbeeldingen:</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {desc.images.slice(0, 4).map((img, idx) => (
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
              </div>
            )}
          </div>
        ))}

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
