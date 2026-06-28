'use client'

import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import type { SprintStatus, DeliverableStatus } from '@/lib/types'
import { FileText, ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2, Clock, ThumbsUp, MessageSquare, Send } from 'lucide-react'

interface SprintMessage {
  id: string
  sprint_id: string
  sender_email: string
  sender_role: 'admin' | 'client'
  message: string
  created_at: string
}

const sprintStatuses: SprintStatus[] = ['gepland', 'actief', 'review', 'afgerond']
const deliverableStatuses: DeliverableStatus[] = ['todo', 'in_progress', 'review', 'done']

export default function AdminOffertesPage() {
  const [offertes, setOffertes] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [expandedIntake, setExpandedIntake] = useState<Record<string, boolean>>({})
  const [intakeData, setIntakeData] = useState<Record<string, { loading: boolean; questions: any[] }>>({})
  const [updating, setUpdating] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, SprintMessage[]>>({})
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/offertes')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setOffertes(data) })
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
    if (!expanded[id] && !messages[id]) {
      loadMessages(id)
    }
  }

  const toggleIntake = (offerteId: string, clientId?: string, clientEmail?: string) => {
    const opening = !expandedIntake[offerteId]
    setExpandedIntake((prev) => ({ ...prev, [offerteId]: opening }))

    // Always refresh intake data when opening so recent client answers are visible immediately.
    if (opening) {
      loadIntake(offerteId, clientId, clientEmail)
    }
  }

  const loadIntake = async (offerteId: string, clientId?: string, clientEmail?: string) => {
    setIntakeData((prev) => ({ ...prev, [offerteId]: { loading: true, questions: [] } }))
    const params = new URLSearchParams({ offerte_id: offerteId })
    if (clientId) params.set('client_id', clientId)
    if (clientEmail) params.set('client_email', clientEmail)
    params.set('_t', String(Date.now()))

    const res = await fetch(`/api/admin/onboarding?${params.toString()}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    })
    const data = await res.json()
    setIntakeData((prev) => ({
      ...prev,
      [offerteId]: { loading: false, questions: Array.isArray(data) ? data : [] },
    }))
  }

  const loadMessages = async (sprintId: string) => {
    const res = await fetch(`/api/admin/sprint-messages?sprint_id=${sprintId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(prev => ({ ...prev, [sprintId]: data }))
    }
  }

  const sendReply = async (sprintId: string) => {
    const text = replyText[sprintId]?.trim()
    if (!text) return
    setSendingReply(sprintId)

    const res = await fetch('/api/admin/sprint-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprint_id: sprintId, message: text }),
    })

    if (res.ok) {
      const msg = await res.json()
      setMessages(prev => ({
        ...prev,
        [sprintId]: [...(prev[sprintId] || []), msg]
      }))
      setReplyText(prev => ({ ...prev, [sprintId]: '' }))

      // Reset local client_approved state to null (admin replied)
      setOffertes(prev => prev.map(o => ({
        ...o,
        sprints: o.sprints?.map((s: any) =>
          s.id === sprintId ? { ...s, client_approved: null, client_feedback: null } : s
        ),
      })))
    }
    setSendingReply(null)
  }

  const updateSprintStatus = async (sprintId: string, status: SprintStatus) => {
    setUpdating(sprintId)
    const res = await fetch('/api/admin/sprints', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sprintId,
        status,
        ...(status === 'actief' ? { start_date: new Date().toISOString().split('T')[0] } : {}),
        ...(status === 'afgerond' ? { end_date: new Date().toISOString().split('T')[0] } : {}),
      }),
    })

    if (res.ok) {
      setOffertes(prev => prev.map(o => ({
        ...o,
        sprints: o.sprints?.map((s: any) =>
          s.id === sprintId ? { ...s, status } : s
        ),
      })))
    }
    setUpdating(null)
  }

  const updateDeliverableStatus = async (deliverableId: string, sprintId: string, status: DeliverableStatus) => {
    setUpdating(deliverableId)
    const res = await fetch('/api/admin/deliverables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deliverableId, status }),
    })

    if (res.ok) {
      setOffertes(prev => prev.map(o => ({
        ...o,
        sprints: o.sprints?.map((s: any) => ({
          ...s,
          deliverables: s.deliverables?.map((d: any) =>
            d.id === deliverableId ? { ...d, status } : d
          ),
        })),
      })))
    }
    setUpdating(null)
  }

  const getProgress = (sprint: any) => {
    if (!sprint.deliverables?.length) return 0
    const done = sprint.deliverables.filter((d: any) => d.status === 'done').length
    return Math.round((done / sprint.deliverables.length) * 100)
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Offertes & Sprints</h1>
        <p className="text-white/50 mt-1">Beheer offertes, update sprintstatus en deliverables.</p>
      </div>

      {offertes.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Nog geen offertes.</p>
          <p className="text-white/30 text-sm mt-2">
            Voer <code className="bg-white/10 px-2 py-0.5 rounded">supabase/seed.sql</code> uit in de SQL Editor.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {offertes.map((offerte) => (
            <div key={offerte.id} className="glass-card overflow-hidden">
              {/* Offerte header */}
              <div className="p-6 border-b border-white/5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-semibold text-white">{offerte.title}</h2>
                      <StatusBadge status={offerte.status} />
                    </div>
                    <p className="text-white/40 text-sm">
                      {offerte.clients?.company || offerte.clients?.name}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-gold-gradient">
                    €{offerte.total_amount?.toLocaleString('nl-NL')}
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => toggleIntake(offerte.id, offerte.client_id, offerte.clients?.email)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 transition-all"
                  >
                    Intake antwoorden
                  </button>
                </div>
              </div>

              {expandedIntake[offerte.id] && (
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                  {intakeData[offerte.id]?.loading ? (
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Intake wordt geladen...
                    </div>
                  ) : intakeData[offerte.id]?.questions?.length ? (
                    <div className="space-y-3">
                      <p className="text-sm text-white/50">
                        {intakeData[offerte.id].questions.filter((q: any) =>
                          (typeof q.answer === 'string' && q.answer.trim().length > 0) ||
                          (q.answers || []).some((a: any) => typeof a.answer === 'string' && a.answer.trim().length > 0)
                        ).length} van {intakeData[offerte.id].questions.length} ingevuld
                      </p>
                      {intakeData[offerte.id].questions.map((q: any) => (
                        <div key={q.id} className="rounded-lg bg-white/5 p-3">
                          <p className="text-xs text-white/40 mb-1">{q.question}</p>
                          <p className="text-sm text-white">
                            {(typeof q.answer === 'string' && q.answer.trim().length > 0)
                              ? q.answer
                              : (() => {
                                const latestNonEmpty = (q.answers || []).find(
                                  (a: any) => typeof a.answer === 'string' && a.answer.trim().length > 0
                                )
                                return latestNonEmpty?.answer?.trim() || <span className="text-white/30 italic">Nog niet beantwoord</span>
                              })()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">Er zijn nog geen intakevragen voor deze offerte.</p>
                  )}
                </div>
              )}

              {/* Sprints */}
              {offerte.sprints?.map((sprint: any) => (
                <div key={sprint.id} className="border-b border-white/5 last:border-0">
                  {/* Sprint header */}
                  <button
                    onClick={() => toggleExpand(sprint.id)}
                    className="w-full flex items-center gap-3 p-4 px-6 hover:bg-white/5 transition-all text-left"
                  >
                    {expanded[sprint.id]
                      ? <ChevronDown className="w-4 h-4 text-white/40" />
                      : <ChevronRight className="w-4 h-4 text-white/40" />
                    }
                    <span className="w-8 h-8 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold text-sm flex-shrink-0">
                      {sprint.number}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{sprint.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-gold rounded-full transition-all"
                            style={{ width: `${getProgress(sprint)}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/40">{getProgress(sprint)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white/50">€{sprint.amount?.toLocaleString('nl-NL')}</span>
                      {/* Client approval indicator */}
                      {sprint.client_approved === true && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full" title="Goedgekeurd door klant">
                          <ThumbsUp className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs text-emerald-400">OK</span>
                        </span>
                      )}
                      {sprint.client_approved === false && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded-full" title="Klant heeft feedback gegeven">
                          <MessageSquare className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-400">Feedback</span>
                        </span>
                      )}
                      {/* Sprint status dropdown */}
                      <select
                        value={sprint.status}
                        onChange={(e) => {
                          e.stopPropagation()
                          updateSprintStatus(sprint.id, e.target.value as SprintStatus)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={updating === sprint.id}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-gold/50"
                      >
                        {sprintStatuses.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </button>

                  {/* Deliverables (expanded) */}
                  {expanded[sprint.id] && (
                    <div className="px-6 pb-4 space-y-2 ml-16">
                      {/* Message thread */}
                      {(messages[sprint.id]?.length > 0 || (sprint.client_approved === false && sprint.client_feedback)) && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 mb-3">
                          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Gesprek</p>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {/* Legacy: show client_feedback if no messages yet */}
                            {(!messages[sprint.id] || messages[sprint.id].length === 0) && sprint.client_feedback && (
                              <div className="flex justify-start">
                                <div className="max-w-[80%] p-3 rounded-xl rounded-bl-sm bg-blue-500/10 border border-blue-500/20">
                                  <p className="text-blue-300 text-xs font-medium mb-1">Klant</p>
                                  <p className="text-white/80 text-sm">{sprint.client_feedback}</p>
                                  {sprint.client_approved_at && (
                                    <p className="text-white/30 text-xs mt-1">
                                      {new Date(sprint.client_approved_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            {messages[sprint.id]?.map((msg) => (
                              <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                                  msg.sender_role === 'admin'
                                    ? 'rounded-br-sm bg-brand-gold/10 border border-brand-gold/20'
                                    : 'rounded-bl-sm bg-blue-500/10 border border-blue-500/20'
                                }`}>
                                  <p className={`text-xs font-medium mb-1 ${
                                    msg.sender_role === 'admin' ? 'text-brand-gold' : 'text-blue-300'
                                  }`}>
                                    {msg.sender_role === 'admin' ? 'Jij' : 'Klant'}
                                  </p>
                                  <p className="text-white/80">{msg.message}</p>
                                  <p className="text-white/30 text-xs mt-1">
                                    {new Date(msg.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Reply input */}
                          <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                            <input
                              type="text"
                              value={replyText[sprint.id] || ''}
                              onChange={(e) => setReplyText(prev => ({ ...prev, [sprint.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendReply(sprint.id) } }}
                              placeholder="Typ je reactie..."
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-brand-gold/50 focus:outline-none placeholder:text-white/30"
                            />
                            <button
                              onClick={() => sendReply(sprint.id)}
                              disabled={sendingReply === sprint.id || !replyText[sprint.id]?.trim()}
                              className="px-3 py-2 rounded-lg bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 transition-all disabled:opacity-30"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Start conversation (no messages yet and no feedback) */}
                      {(!messages[sprint.id] || messages[sprint.id].length === 0) && sprint.client_approved !== false && (
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={replyText[sprint.id] || ''}
                            onChange={(e) => setReplyText(prev => ({ ...prev, [sprint.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendReply(sprint.id) } }}
                            placeholder="Stuur een bericht naar de klant..."
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-brand-gold/50 focus:outline-none placeholder:text-white/30"
                          />
                          <button
                            onClick={() => sendReply(sprint.id)}
                            disabled={sendingReply === sprint.id || !replyText[sprint.id]?.trim()}
                            className="px-3 py-2 rounded-lg bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 transition-all disabled:opacity-30"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Approval status banner */}
                      {sprint.client_approved === true && (
                        <div className="p-3 rounded-lg border mb-3 bg-emerald-500/5 border-emerald-500/20">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-400">Goedgekeurd door klant</span>
                            {sprint.client_approved_at && (
                              <span className="text-white/30 text-xs ml-auto">
                                {new Date(sprint.client_approved_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {sprint.deliverables?.map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            d.status === 'done' ? 'bg-emerald-400' :
                            d.status === 'in_progress' ? 'bg-brand-gold animate-pulse' :
                            d.status === 'review' ? 'bg-purple-400' :
                            'bg-white/20'
                          }`} />
                          <span className={`flex-1 text-sm ${
                            d.status === 'done' ? 'text-white/40 line-through' : 'text-white/70'
                          }`}>
                            {d.title}
                          </span>
                          <select
                            value={d.status}
                            onChange={(e) => updateDeliverableStatus(d.id, sprint.id, e.target.value as DeliverableStatus)}
                            disabled={updating === d.id}
                            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand-gold/50"
                          >
                            {deliverableStatuses.map(s => (
                              <option key={s} value={s}>
                                {s === 'todo' ? 'To do' : s === 'in_progress' ? 'Bezig' : s === 'review' ? 'Review' : 'Klaar'}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
