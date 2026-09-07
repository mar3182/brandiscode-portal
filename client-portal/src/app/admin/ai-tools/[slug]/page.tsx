'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AiTool, AiToolAccess, AiToolFeedback } from '@/lib/types'

export default function AiToolDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [tool, setTool] = useState<AiTool | null>(null)
  const [accessRecords, setAccessRecords] = useState<AiToolAccess[]>([])
  const [feedbackList, setFeedbackList] = useState<AiToolFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'access' | 'feedback' | 'billing'>('overview')
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false)
  const [grantingAccess, setGrantingAccess] = useState(false)
  const [accessForm, setAccessForm] = useState({ client_id: '', access_type: 'testing' })
  const [updatingTool, setUpdatingTool] = useState(false)
  const [readinessForm, setReadinessForm] = useState({ readiness_percentage: 0, status: 'development' })
  const [respondingFeedback, setRespondingFeedback] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')

  useEffect(() => {
    fetchData()
  }, [params.slug])

  async function fetchData() {
    try {
      setLoading(true)
      const [toolRes, accessRes, feedbackRes] = await Promise.all([
        fetch(`/api/admin/ai-tools?slug=${params.slug}`),
        fetch(`/api/admin/ai-tool-access?tool_id=${params.slug}`),
        fetch(`/api/admin/ai-tool-feedback?tool_id=${params.slug}`),
      ])

      if (toolRes.status === 403) {
        router.push('/login')
        return
      }

      const toolData = await toolRes.json()
      const tool = toolData.tools?.[0]
      if (!tool) throw new Error('Tool not found')

      setTool(tool)
      setReadinessForm({ readiness_percentage: tool.readiness_percentage, status: tool.status })

      const accessData = await accessRes.json()
      setAccessRecords(accessData.access_records || [])

      const feedbackData = await feedbackRes.json()
      setFeedbackList(feedbackData.feedback || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateTool() {
    if (!tool) return
    try {
      setUpdatingTool(true)
      const res = await fetch('/api/admin/ai-tools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: tool.id,
          readiness_percentage: readinessForm.readiness_percentage,
          status: readinessForm.status,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Fout: ${err.error}`)
        return
      }
      alert('Tool bijgewerkt!')
      fetchData()
    } catch (err) {
      alert(`Fout: ${err instanceof Error ? err.message : 'Onbekend'}`)
    } finally {
      setUpdatingTool(false)
    }
  }

  async function handleGrantAccess(e: React.FormEvent) {
    e.preventDefault()
    if (!tool || !accessForm.client_id) {
      alert('Selecteer een klant')
      return
    }

    try {
      setGrantingAccess(true)
      const res = await fetch('/api/admin/ai-tool-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: tool.id,
          client_id: accessForm.client_id,
          access_type: accessForm.access_type,
          monthly_token_limit: 500000,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Fout: ${err.error}`)
        return
      }
      setAccessForm({ client_id: '', access_type: 'testing' })
      setShowGrantAccessModal(false)
      fetchData()
      alert('Toegang verleend!')
    } catch (err) {
      alert(`Fout: ${err instanceof Error ? err.message : 'Onbekend'}`)
    } finally {
      setGrantingAccess(false)
    }
  }

  async function handleRespondToFeedback(feedbackId: string) {
    if (!responseText.trim()) {
      alert('Vul een antwoord in')
      return
    }

    try {
      const res = await fetch('/api/admin/ai-tool-feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_id: feedbackId,
          status: 'acknowledged',
          admin_response: responseText,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Fout: ${err.error}`)
        return
      }
      setRespondingFeedback(null)
      setResponseText('')
      fetchData()
      alert('Antwoord verzonden!')
    } catch (err) {
      alert(`Fout: ${err instanceof Error ? err.message : 'Onbekend'}`)
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

  if (!tool || error)
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin/ai-tools" className="text-blue-600 hover:underline mb-6 inline-block">
            ← Terug naar tools
          </Link>
          <div className="text-center py-12">
            <p className="text-red-600">{error || 'Tool niet gevonden'}</p>
          </div>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Header */}
        <Link href="/admin/ai-tools" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Terug naar tools
        </Link>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tool.name}</h1>
              <p className="text-gray-600 mt-2">{tool.description}</p>
              <p className="text-sm text-gray-500 mt-1">Slug: {tool.slug}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
              tool.status === 'production'
                ? 'bg-green-100 text-green-800'
                : tool.status === 'beta'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}>
              {tool.status.charAt(0).toUpperCase() + tool.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-200">
            {(['overview', 'access', 'feedback', 'billing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-center font-medium transition ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' && 'Overzicht'}
                {tab === 'access' && 'Toegang'}
                {tab === 'feedback' && 'Feedback'}
                {tab === 'billing' && 'Facturering'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gereedheid: {readinessForm.readiness_percentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={readinessForm.readiness_percentage}
                    onChange={(e) =>
                      setReadinessForm({ ...readinessForm, readiness_percentage: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={readinessForm.status}
                    onChange={(e) => setReadinessForm({ ...readinessForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="development">In Ontwikkeling</option>
                    <option value="beta">Beta</option>
                    <option value="production">Productie</option>
                    <option value="archived">Gearchiveerd</option>
                  </select>
                </div>

                <button
                  onClick={handleUpdateTool}
                  disabled={updatingTool}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {updatingTool ? 'Bezig...' : 'Bijwerken'}
                </button>
              </div>
            )}

            {/* Access Tab */}
            {activeTab === 'access' && (
              <div className="space-y-6">
                <button
                  onClick={() => setShowGrantAccessModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  + Klant Toegang Verlenen
                </button>

                {accessRecords.length === 0 ? (
                  <p className="text-gray-600">Geen klanten hebben nog toegang</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Klant</th>
                          <th className="px-3 py-2 text-left font-medium">Type</th>
                          <th className="px-3 py-2 text-left font-medium">Token Limit</th>
                          <th className="px-3 py-2 text-left font-medium">Verleend</th>
                          <th className="px-3 py-2 text-center font-medium">Acties</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessRecords.map((record) => (
                          <tr key={record.id} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {record.client_id}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{record.access_type}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {record.monthly_token_limit?.toLocaleString()} tokens
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {new Date(record.access_granted_at).toLocaleDateString('nl-NL')}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                className="text-sm text-red-600 hover:text-red-800"
                                onClick={() => {
                                  if (confirm('Zeker intrekken?')) {
                                    // TODO: Implement revoke
                                  }
                                }}
                              >
                                Intrekken
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="space-y-4">
                {feedbackList.length === 0 ? (
                  <p className="text-gray-600">Nog geen feedback</p>
                ) : (
                  feedbackList.map((fb) => (
                    <div key={fb.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            ⭐ {fb.rating} - {fb.feedback_type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(fb.created_at).toLocaleDateString('nl-NL')}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          fb.status === 'new' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {fb.status}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{fb.comment}</p>
                      {fb.admin_response && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                          <p className="text-sm text-blue-900">
                            <strong>Mijn antwoord:</strong> {fb.admin_response}
                          </p>
                        </div>
                      )}
                      {respondingFeedback !== fb.id && (
                        <button
                          onClick={() => setRespondingFeedback(fb.id)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {fb.admin_response ? 'Antwoord Bewerken' : 'Antwoorden'}
                        </button>
                      )}
                      {respondingFeedback === fb.id && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Uw antwoord..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespondToFeedback(fb.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Verzenden
                            </button>
                            <button
                              onClick={() => {
                                setRespondingFeedback(null)
                                setResponseText('')
                              }}
                              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                            >
                              Annuleren
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div>
                <p className="text-gray-600 mb-4">Facturering wordt spoedig beschikbaar</p>
                <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900">
                  Basistarief: €49/maand + €0.01 per 1.000 tokens (over 500.000/maand)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grant Access Modal */}
        {showGrantAccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Klant Toegang Verlenen</h2>
              <form onSubmit={handleGrantAccess} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Klant</label>
                  <input
                    type="text"
                    placeholder="Client ID (UUID)"
                    value={accessForm.client_id}
                    onChange={(e) => setAccessForm({ ...accessForm, client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Toegangstype</label>
                  <select
                    value={accessForm.access_type}
                    onChange={(e) => setAccessForm({ ...accessForm, access_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="testing">Testing</option>
                    <option value="beta">Beta</option>
                    <option value="production">Productie</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGrantAccessModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    disabled={grantingAccess}
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={grantingAccess}
                  >
                    {grantingAccess ? 'Bezig...' : 'Verlenen'}
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
