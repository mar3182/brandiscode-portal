'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, BarChart3, CheckCircle2, Clock } from 'lucide-react'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import type { Offerte, Sprint } from '@/lib/types'
import Link from 'next/link'

export default function DashboardPage() {
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [clientName, setClientName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: clientUser } = await supabase
        .from('client_users')
        .select('name')
        .eq('email', user.email)
        .single()

      if (clientUser) setClientName(clientUser.name)

      const { data: offerteData } = await supabase
        .from('offertes')
        .select('*')
        .order('created_at', { ascending: false })

      if (offerteData) setOffertes(offerteData)

      const { data: sprintData } = await supabase
        .from('sprints')
        .select('*')
        .order('number', { ascending: true })

      if (sprintData) setSprints(sprintData)
    }

    loadData()
  }, [supabase])

  const activeSprintCount = sprints.filter(s => s.status === 'actief').length
  const completedSprintCount = sprints.filter(s => s.status === 'afgerond').length
  const signedOffertes = offertes.filter(o => o.status === 'getekend').length

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welkom{clientName ? `, ${clientName}` : ''}
        </h1>
        <p className="text-white/50 mt-1">
          Hier vind je een overzicht van je projecten en offertes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Offertes"
          value={offertes.length}
          subtitle={`${signedOffertes} getekend`}
          icon={FileText}
          color="gold"
        />
        <StatCard
          title="Actieve sprints"
          value={activeSprintCount}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Afgerond"
          value={completedSprintCount}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Totaal sprints"
          value={sprints.length}
          icon={Clock}
          color="pink"
        />
      </div>

      {/* Recent offertes */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recente offertes</h2>
          <Link href="/dashboard/offertes" className="text-sm text-brand-gold hover:underline">
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
                href={`/dashboard/offertes/${offerte.id}`}
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
          <Link href="/dashboard/projecten" className="text-sm text-brand-gold hover:underline">
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
