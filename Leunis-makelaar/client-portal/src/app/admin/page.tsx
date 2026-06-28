'use client'

import { useEffect, useState } from 'react'
import { Users, FileText, CheckCircle2, MessageSquare, Clock } from 'lucide-react'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'

interface RecentMessage {
  sprintTitle: string
  sprintNumber: number
  offerteName: string
  clientName: string
  message: string
  senderRole: 'admin' | 'client'
  date: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ clients: 0, offertes: 0, signed: 0, feedback: 0 })
  const [trainingStats, setTrainingStats] = useState({ total: 0, pending: 0, planned: 0 })
  const [recentOffertes, setRecentOffertes] = useState<any[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])

  useEffect(() => {
    async function load() {
      const [clientsRes, offertesRes] = await Promise.all([
        fetch('/api/admin/clients'),
        fetch('/api/admin/offertes'),
      ])

      const clients = await clientsRes.json()
      const offertes = await offertesRes.json()

      if (Array.isArray(clients) && Array.isArray(offertes)) {
        // Collect all messages from sprint_messages
        const allMessages: RecentMessage[] = []
        offertes.forEach((o: any) => {
          o.sprints?.forEach((s: any) => {
            s.sprint_messages?.forEach((m: any) => {
              allMessages.push({
                sprintTitle: s.title,
                sprintNumber: s.number,
                offerteName: o.title,
                clientName: o.clients?.company || o.clients?.name || 'Onbekend',
                message: m.message,
                senderRole: m.sender_role,
                date: m.created_at,
              })
            })
            // Legacy: if no sprint_messages but has client_feedback
            if ((!s.sprint_messages || s.sprint_messages.length === 0) && s.client_feedback) {
              allMessages.push({
                sprintTitle: s.title,
                sprintNumber: s.number,
                offerteName: o.title,
                clientName: o.clients?.company || o.clients?.name || 'Onbekend',
                message: s.client_feedback,
                senderRole: 'client',
                date: s.client_approved_at || s.created_at,
              })
            }
          })
        })
        // Sort by date, newest first
        allMessages.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

        setStats({
          clients: clients.length,
          offertes: offertes.length,
          signed: offertes.filter((o: any) => o.status === 'getekend').length,
          feedback: allMessages.filter(m => m.senderRole === 'client').length,
        })
        setRecentOffertes(offertes.slice(0, 5))
        setRecentMessages(allMessages.slice(0, 10))
      }

      const trainingRes = await fetch('/api/admin/training-intakes', { cache: 'no-store' })
      if (trainingRes.ok) {
        const training = await trainingRes.json()
        if (Array.isArray(training)) {
          setTrainingStats({
            total: training.length,
            pending: training.filter((item: any) => item.status !== 'planned').length,
            planned: training.filter((item: any) => item.status === 'planned').length,
          })
        }
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
        <Link href="/admin/training-intakes" className="glass-card p-6 hover:border-brand-orange/30 transition-all group">
          <MessageSquare className="w-8 h-8 text-brand-orange mb-3" />
          <h3 className="text-white font-semibold">Training intakes</h3>
          <p className="text-white/40 text-sm mt-1">{trainingStats.pending} openstaand, {trainingStats.planned} gepland.</p>
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

      {/* Recente berichten */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Recente gesprekken</h2>
          {recentMessages.length > 0 && (
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {recentMessages.length} {recentMessages.length === 1 ? 'bericht' : 'berichten'}
            </span>
          )}
        </div>
        {recentMessages.length === 0 ? (
          <p className="text-white/40 text-sm py-4">Nog geen berichten van klanten ontvangen.</p>
        ) : (
          <div className="space-y-3">
            {recentMessages.map((msg, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                msg.senderRole === 'client'
                  ? 'bg-blue-500/5 border-blue-500/20'
                  : 'bg-brand-gold/5 border-brand-gold/20'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`w-4 h-4 ${
                      msg.senderRole === 'client' ? 'text-blue-400' : 'text-brand-gold'
                    }`} />
                    <span className="text-white font-medium text-sm">
                      Sprint {msg.sprintNumber}: {msg.sprintTitle}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    msg.senderRole === 'client'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-brand-gold/20 text-brand-gold'
                  }`}>
                    {msg.senderRole === 'client' ? msg.clientName : 'Jij'}
                  </span>
                </div>
                <p className="text-white/40 text-xs mb-1">{msg.clientName} — {msg.offerteName}</p>
                <p className="text-white/70 text-sm mt-2 pl-6 border-l-2 border-white/10">
                  &ldquo;{msg.message}&rdquo;
                </p>
                {msg.date && (
                  <p className="text-white/30 text-xs mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {recentMessages.length > 0 && (
          <Link
            href="/admin/offertes"
            className="block text-center text-sm text-brand-gold hover:text-brand-gold/80 mt-4 transition-colors"
          >
            Bekijk alle gesprekken →
          </Link>
        )}
      </div>
    </div>
  )
}
