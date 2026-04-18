'use client'

import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import type { SprintStatus, DeliverableStatus } from '@/lib/types'
import { FileText, ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2, Clock, ThumbsUp, ThumbsDown, MessageSquare, AlertCircle } from 'lucide-react'

const sprintStatuses: SprintStatus[] = ['gepland', 'actief', 'review', 'afgerond']
const deliverableStatuses: DeliverableStatus[] = ['todo', 'in_progress', 'review', 'done']

export default function AdminOffertesPage() {
  const [offertes, setOffertes] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/offertes')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setOffertes(data) })
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
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
              </div>

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
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full animate-pulse" title="Afgewezen door klant — klik voor feedback">
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400">Feedback</span>
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
                      {/* Client feedback banner */}
                      {sprint.client_approved !== null && (
                        <div className={`p-3 rounded-lg border mb-3 ${
                          sprint.client_approved
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-red-500/5 border-red-500/20'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {sprint.client_approved ? (
                              <ThumbsUp className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <ThumbsDown className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`text-sm font-medium ${
                              sprint.client_approved ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {sprint.client_approved ? 'Goedgekeurd door klant' : 'Afgewezen door klant'}
                            </span>
                            {sprint.client_approved_at && (
                              <span className="text-white/30 text-xs ml-auto">
                                {new Date(sprint.client_approved_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          {sprint.client_feedback && (
                            <p className="text-white/70 text-sm pl-6 border-l-2 border-white/10 mt-2">
                              &ldquo;{sprint.client_feedback}&rdquo;
                            </p>
                          )}
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
