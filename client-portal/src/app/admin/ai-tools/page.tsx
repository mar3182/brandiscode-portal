'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AiTool } from '@/lib/types'

interface ToolWithFeedback extends AiTool {
  feedback_summary?: {
    total_feedback: number
    avg_rating: number
    new_feedback: number
    bug_count: number
    feature_requests: number
  }
}

export default function AiToolsPage() {
  const router = useRouter()
  const [tools, setTools] = useState<ToolWithFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({ slug: '', name: '', description: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchTools()
  }, [])

  async function fetchTools() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/ai-tools')
      if (res.status === 403) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch tools')
      const data = await res.json()
      setTools(data.tools || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTool(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.slug || !formData.name) {
      alert('Vul slug en naam in')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/admin/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Fout: ${err.error}`)
        return
      }
      setFormData({ slug: '', name: '', description: '' })
      setShowCreateModal(false)
      fetchTools()
    } catch (err) {
      alert(`Fout bij aanmaken: ${err instanceof Error ? err.message : 'Onbekend'}`)
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'development':
        return 'bg-yellow-100 text-yellow-800'
      case 'beta':
        return 'bg-blue-100 text-blue-800'
      case 'production':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'development':
        return 'In Ontwikkeling'
      case 'beta':
        return 'Beta'
      case 'production':
        return 'Productie'
      default:
        return status
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Tools</h1>
            <p className="text-gray-600 mt-2">Beheer en test AI tools voor Leunis Makelaars</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            + Nieuw Tool
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Tools Grid */}
        {tools.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">Nog geen tools</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <Link href={`/admin/ai-tools/${tool.slug}`} key={tool.id}>
                <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{tool.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{tool.slug}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(tool.status)}`}>
                      {getStatusLabel(tool.status)}
                    </span>
                  </div>

                  {/* Description */}
                  {tool.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{tool.description}</p>
                  )}

                  {/* Readiness Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-700">Gereedheid</label>
                      <span className="text-xs font-semibold text-gray-900">{tool.readiness_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${tool.readiness_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Feedback Summary */}
                  {tool.feedback_summary && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600">Feedback</p>
                        <p className="text-lg font-bold text-gray-900">
                          {tool.feedback_summary.total_feedback}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Gemiddeld</p>
                        <p className="text-lg font-bold text-gray-900">
                          ⭐ {tool.feedback_summary.avg_rating || '—'}
                        </p>
                      </div>
                      {tool.feedback_summary.bug_count > 0 && (
                        <div>
                          <p className="text-xs text-red-600">Bugs</p>
                          <p className="text-lg font-bold text-red-600">
                            {tool.feedback_summary.bug_count}
                          </p>
                        </div>
                      )}
                      {tool.feedback_summary.feature_requests > 0 && (
                        <div>
                          <p className="text-xs text-blue-600">Features</p>
                          <p className="text-lg font-bold text-blue-600">
                            {tool.feedback_summary.feature_requests}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Feedback Badge */}
                  {tool.feedback_summary && tool.feedback_summary.new_feedback > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded">
                        {tool.feedback_summary.new_feedback} nieuw
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Tool Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Nieuw AI Tool</h2>
              <form onSubmit={handleCreateTool} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (uniek)
                  </label>
                  <input
                    type="text"
                    placeholder="bijv. funda-tekst"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naam
                  </label>
                  <input
                    type="text"
                    placeholder="bijv. Funda Tekst Generator"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschrijving
                  </label>
                  <textarea
                    placeholder="Optioneel"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    disabled={creating}
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    disabled={creating}
                  >
                    {creating ? 'Bezig...' : 'Aanmaken'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
