'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import type { SprintWithDeliverables } from '@/lib/types'
import { CheckCircle2, Circle, Loader2, Clock } from 'lucide-react'

export default function ProjectenPage() {
  const [sprints, setSprints] = useState<SprintWithDeliverables[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('sprints')
        .select('*, deliverables(*)')
        .order('number', { ascending: true })

      if (data) setSprints(data)
    }
    load()
  }, [supabase])

  const getProgress = (sprint: SprintWithDeliverables) => {
    if (!sprint.deliverables || sprint.deliverables.length === 0) return 0
    const done = sprint.deliverables.filter(d => d.status === 'done').length
    return Math.round((done / sprint.deliverables.length) * 100)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'afgerond': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      case 'actief': return <Loader2 className="w-5 h-5 text-brand-gold animate-spin" />
      case 'review': return <Clock className="w-5 h-5 text-purple-400" />
      default: return <Circle className="w-5 h-5 text-white/20" />
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Projectstatus</h1>
        <p className="text-white/50 mt-1">Volg de voortgang van je sprints en deliverables.</p>
      </div>

      {sprints.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-white/40">Nog geen sprints gestart.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sprints.map((sprint) => {
            const progress = getProgress(sprint)
            return (
              <div key={sprint.id} className="glass-card p-6">
                {/* Sprint header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(sprint.status)}
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Sprint {sprint.number}: {sprint.title}
                      </h2>
                      {sprint.description && (
                        <p className="text-white/50 text-sm mt-1">{sprint.description}</p>
                      )}
                      {sprint.start_date && sprint.end_date && (
                        <p className="text-white/30 text-xs mt-2">
                          {sprint.start_date} → {sprint.end_date}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={sprint.status} />
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>Voortgang</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-gold to-brand-gold/60"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Deliverables */}
                {sprint.deliverables && sprint.deliverables.length > 0 && (
                  <div className="space-y-2">
                    {sprint.deliverables.map((d) => (
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
                        <StatusBadge status={d.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
