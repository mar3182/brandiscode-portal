'use client'

import { useEffect, useState } from 'react'
import { Users, FileText, CheckCircle2, MessageSquare, Clock } from 'lucide-react'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'

interface SprintFeedback {
  sprintTitle: string
  sprintNumber: number
  offerteName: string
  clientName: string
  feedback: string
  approved: boolean | null
  date: string | null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ clients: 0, offertes: 0, signed: 0, feedback: 0 })
  const [recentOffertes, setRecentOffertes] = useState<any[]>([])
  const [sprintFeedbacks, setSprintFeedbacks] = useState<SprintFeedback[]>([])

  useEffect(() => {
    async function load() {
      const [clientsRes, offertesRes] = await Promise.all([
        fetch('/api/admin/clients'),
        fetch('/api/admin/offertes'),
      ])

      const clients = await clientsRes.json()
      const offertes = await offertesRes.json()

      if (Array.isArray(clients) && Array.isArray(offertes)) {
        // Collect all sprint feedbacks
        const feedbacks: SprintFeedback[] = []
        offertes.forEach((o: any) => {
          o.sprints?.forEach((s: any) => {
            if (s.client_feedback) {
              feedbacks.push({
                sprintTitle: s.title,
                sprintNumber: s.number,
                offerteName: o.title,
                clientName: o.clients?.company || o.clients?.name || 'Onbekend',
                feedback: s.client_feedback || '',
                approved: s.client_approved,
                date: s.client_approved_at,
              })
            }
          })
        })
        // Sort by date, newest first
        feedbacks.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

        setStats({
          clients: clients.length,
          offertes: offertes.length,
          signed: offertes.filter((o: any) => o.status === 'getekend').length,
          feedback: feedbacks.length,
        })
        setRecentOffertes(offertes.slice(0, 5))
        setSprintFeedbacks(feedbacks)
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-white/50 mt-1">Beheer je klanten, offertes en projecten.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Klanten" value={stats.clients} icon={Users} color="blue" />
        <StatCard title="Offertes" value={stats.offertes} icon={FileText} color="gold" />
        <StatCard title="Getekend" value={stats.signed} icon={CheckCircle2} color="green" />
        <StatCard title="Feedback" value={stats.feedback} icon={MessageSquare} color="pink" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link href="/admin/clients" className="glass-card p-6 hover:border-brand-blue/30 transition-all group">
          <Users className="w-8 h-8 text-brand-blue mb-3" />
          <h3 className="text-white font-semibold">Nieuwe klant toevoegen</h3>
          <p className="text-white/40 text-sm mt-1">Maak een klantprofiel aan voor de portal.</p>
        </Link>
        <Link href="/admin/offertes" className="glass-card p-6 hover:border-brand-gold/30 transition-all group">
          <FileText className="w-8 h-8 text-brand-gold mb-3" />
          <h3 className="text-white font-semibold">Offerte aanmaken</h3>
          <p className="text-white/40 text-sm mt-1">Nieuwe offerte met sprints en deliverables.</p>
        </Link>
      </div>

      {/* Recent offertes */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Recente offertes</h2>
        {recentOffertes.length === 0 ? (
          <p className="text-white/40 text-sm py-4">Nog geen offertes. Voer eerst de seed-data uit in Supabase.</p>
        ) : (
          <div className="space-y-3">
            {recentOffertes.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div>
                  <p className="text-white font-medium">{o.title}</p>
                  <p className="text-white/40 text-sm">{o.clients?.company || o.clients?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/60">€{o.total_amount?.toLocaleString('nl-NL')}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sprint feedback */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Klant feedback op sprints</h2>
          {sprintFeedbacks.length > 0 && (
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {sprintFeedbacks.length} {sprintFeedbacks.length === 1 ? 'bericht' : 'berichten'}
            </span>
          )}
        </div>
        {sprintFeedbacks.length === 0 ? (
          <p className="text-white/40 text-sm py-4">Nog geen feedback van klanten ontvangen.</p>
        ) : (
          <div className="space-y-3">
            {sprintFeedbacks.map((fb, i) => (
              <div key={i} className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium text-sm">
                      Sprint {fb.sprintNumber}: {fb.sprintTitle}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    Feedback
                  </span>
                </div>
                <p className="text-white/40 text-xs mb-1">{fb.clientName} — {fb.offerteName}</p>
                {fb.feedback && (
                  <p className="text-white/70 text-sm mt-2 pl-6 border-l-2 border-blue-500/20">
                    &ldquo;{fb.feedback}&rdquo;
                  </p>
                )}
                {fb.date && (
                  <p className="text-white/30 text-xs mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(fb.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
