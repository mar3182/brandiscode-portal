'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, BarChart3, CheckCircle2, Clock } from 'lucide-react'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import type { Offerte, Sprint } from '@/lib/types'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ClientDashboardPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [trainingReady, setTrainingReady] = useState(false)
  const [trainingEnabled, setTrainingEnabled] = useState(false)
  const [trainingMissing, setTrainingMissing] = useState<string[]>([])
  const [trainingStatus, setTrainingStatus] = useState<'draft' | 'submitted' | 'reviewed' | 'planned' | null>(null)
  const [trainingPlannedAt, setTrainingPlannedAt] = useState<string | null>(null)
  const supabase = createClient()

  const trainingStatusLabel: Record<'draft' | 'submitted' | 'reviewed' | 'planned', string> = {
    draft: 'Concept',
    submitted: 'Ingediend',
    reviewed: 'Beoordeeld',
    planned: 'Gepland',
  }

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Haal client data op via slug
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('slug', clientId)
        .maybeSingle()

      if (client) {
        setClientCompany(client.company || '')
        
        // Haal gebruikersnaam op van client_users
        const { data: clientUser } = await supabase
          .from('client_users')
          .select('name')
          .eq('email', user.email)
          .maybeSingle()

        if (clientUser) setClientName(clientUser.name)
      }

      // Haal offertes op (RLS zorgt voor isolatie)
      const { data: offerteData } = await supabase
        .from('offertes')
        .select('*')
        .order('created_at', { ascending: false })

      if (offerteData) setOffertes(offerteData)

      // Haal sprints op (RLS zorgt voor isolatie)
      const { data: sprintData } = await supabase
        .from('sprints')
        .select('*')
        .order('number', { ascending: true })

      if (sprintData) setSprints(sprintData)

      // Haal training data op
      const trainingRes = await fetch(`/api/training-intake`)
      if (trainingRes.ok) {
        const trainingData = await trainingRes.json()
        const enabled = trainingData?.enabled === true
        setTrainingEnabled(enabled)

        if (!enabled) {
          setTrainingReady(false)
          setTrainingMissing([])
          setTrainingStatus(null)
          setTrainingPlannedAt(null)
          return
        }

        setTrainingReady(Boolean(trainingData?.completeness?.readyForTraining))
        setTrainingMissing(Array.isArray(trainingData?.completeness?.missingRequiredFields) ? trainingData.completeness.missingRequiredFields : [])
        setTrainingStatus(trainingData?.intake?.status ?? null)

        const sessionDate = Array.isArray(trainingData?.sessions) && trainingData.sessions.length > 0
          ? trainingData.sessions.find((session: any) => Boolean(session?.session_start))?.session_start ?? null
          : null
        setTrainingPlannedAt(sessionDate)
      }
    }

    if (clientId) {
      loadData()
    }
  }, [supabase, clientId])

  const activeSprintCount = sprints.filter(s => s.status === 'actief').length
  const completedSprintCount = sprints.filter(s => s.status === 'afgerond').length
  const signedOffertes = offertes.filter(o => o.status === 'getekend').length

  // Genereer klant-specifieke URLs
  const clientPrefix = clientId ? `/${clientId}` : ''

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welkom{clientName ? `, ${clientName}` : ''}
        </h1>
        <p className="text-white/50 mt-1">
          {clientCompany ? `${clientCompany} — ` : ''}Hier vind je een overzicht van je projecten en offertes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Offertes"
          value={offertes.length}
          subtitle={`${signedOffertes} getekend`}
          icon={FileText}
          variant="accent"
        />
        <StatCard
          title="Actieve sprints"
          value={activeSprintCount}
          icon={BarChart3}
          variant="neutral"
        />
        <StatCard
          title="Afgerond"
          value={completedSprintCount}
          icon={CheckCircle2}
          variant="neutral"
        />
        <StatCard
          title="Totaal sprints"
          value={sprints.length}
          icon={Clock}
          variant="neutral"
        />
      </div>

      {trainingEnabled ? (
        <div className={`glass-card p-6 mb-6 border ${trainingReady ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Training Intake</h2>
              {trainingStatus ? (
                <p className="text-sm mt-1 text-white/70">
                  Status: <span className="text-white font-medium">{trainingStatusLabel[trainingStatus]}</span>
                </p>
              ) : null}
              <p className={`text-sm mt-1 ${trainingReady ? 'text-green-300' : 'text-yellow-200'}`}>
                {trainingReady ? 'Ready for training' : 'Nog niet compleet'}
              </p>
              {trainingStatus === 'planned' && trainingPlannedAt ? (
                <p className="text-xs text-green-200 mt-1">
                  Gepland op {new Date(trainingPlannedAt).toLocaleString('nl-NL', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : null}
              {!trainingReady && trainingMissing.length > 0 ? (
                <p className="text-xs text-white/60 mt-1">Ontbrekende velden: {trainingMissing.join(', ')}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Link href={`${clientPrefix}/dashboard/onboarding`} className="text-sm text-brand-gold hover:underline">
                Intake openen →
              </Link>
              {trainingStatus === 'planned' ? (
                <Link href={`${clientPrefix}/dashboard/training-bevestiging`} className="text-xs text-green-300 hover:underline">
                  Sessie bevestigen →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent offertes */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recente offertes</h2>
          <Link href={`${clientPrefix}/dashboard/offertes`} className="text-sm text-brand-gold hover:underline">
            Alles bekijken →
          </Link>
        </div>

        {offertes.length === 0 ? (
          <p className="text-white/40 text-sm py-4">Nog geen offertes.</p>
        ) : (
          <div className="space-y-3">
            {offertes.slice(0, 3).map((offerte) => (
              <Link
                key={offerte.id}
                href={`${clientPrefix}/dashboard/offertes/${offerte.id}`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <div>
                  <p className="text-white font-medium">{offerte.title}</p>
                  <p className="text-white/40 text-sm mt-0.5">
                    €{offerte.total_amount.toLocaleString('nl-NL')}
                  </p>
                </div>
                <StatusBadge status={offerte.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Active sprints */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Actieve sprints</h2>
          <Link href={`${clientPrefix}/dashboard/projecten`} className="text-sm text-brand-gold hover:underline">
            Projectstatus →
          </Link>
        </div>

        {sprints.filter(s => s.status === 'actief').length === 0 ? (
          <p className="text-white/40 text-sm py-4">Geen actieve sprints op dit moment.</p>
        ) : (
          <div className="space-y-3">
            {sprints.filter(s => s.status === 'actief').map((sprint) => (
              <div
                key={sprint.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5"
              >
                <div>
                  <p className="text-white font-medium">Sprint {sprint.number}: {sprint.title}</p>
                  <p className="text-white/40 text-sm mt-0.5">{sprint.description}</p>
                </div>
                <StatusBadge status={sprint.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
