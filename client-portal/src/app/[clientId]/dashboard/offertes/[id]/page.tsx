'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import SignatureCanvas from '@/components/SignatureCanvas'
import type { OfferteWithSprints, SprintWithDeliverables, SprintMessage } from '@/lib/types'
import { downloadOffertePdf } from '@/lib/generateOffertePdf'
import { ArrowLeft, Download, CheckCircle2, Calendar, Euro, ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function OfferteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [offerte, setOfferte] = useState<OfferteWithSprints | null>(null)
  const [signingSprintId, setSigningSprintId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, SprintMessage[]>>({})
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: offerteData } = await supabase
        .from('offertes')
        .select('*')
        .eq('id', id)
        .single()

      if (!offerteData) return

      const { data: sprintData } = await supabase
        .from('sprints')
        .select('*, deliverables(*)')
        .eq('offerte_id', id)
        .order('number', { ascending: true })

      setOfferte({
        ...offerteData,
        sprints: sprintData || [],
      })

      // Mark as bekeken when client views for the first time
      if (offerteData.status === 'verstuurd') {
        await supabase
          .from('offertes')
          .update({ status: 'bekeken', updated_at: new Date().toISOString() })
          .eq('id', id)
        offerteData.status = 'bekeken'
      }
    }
    load()
  }, [id, supabase])

  // Load messages when a sprint is expanded
  useEffect(() => {
    if (!expandedSprint) return
    const loadMessages = async () => {
      const { data } = await supabase
        .from('sprint_messages')
        .select('*')
        .eq('sprint_id', expandedSprint)
        .order('created_at', { ascending: true })
      if (data) {
        setMessages(prev => ({ ...prev, [expandedSprint]: data }))
      }
    }
    loadMessages()
  }, [expandedSprint, supabase])

  const handleApproveSprint = async (sprintId: string, signatureDataUrl: string) => {
    setSaving(true)
    const { error } = await supabase
      .from('sprints')
      .update({
        client_approved: true,
        client_approved_at: new Date().toISOString(),
        client_feedback: null,
      })
      .eq('id', sprintId)

    if (!error && offerte) {
      // Also store signature on offerte if not already set
      if (!offerte.signature_data) {
        await supabase
          .from('offertes')
          .update({
            signature_data: signatureDataUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
      }

      const updatedSprints = offerte.sprints.map((s) =>
        s.id === sprintId
          ? { ...s, client_approved: true, client_approved_at: new Date().toISOString(), client_feedback: null }
          : s
      )
      const updatedOfferte = { ...offerte, sprints: updatedSprints, signature_data: signatureDataUrl }

      // Check if all sprints are approved → mark offerte as getekend
      const allApproved = updatedSprints.every((s) => s.client_approved === true)
      if (allApproved) {
        await supabase
          .from('offertes')
          .update({
            status: 'getekend',
            signed_at: new Date().toISOString(),
            signature_data: signatureDataUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
        updatedOfferte.status = 'getekend'
        updatedOfferte.signed_at = new Date().toISOString()
      }

      setOfferte(updatedOfferte)
      setSigningSprintId(null)
    }
    setSaving(false)
  }

  const handleSendMessage = async (sprintId: string) => {
    if (!messageText.trim()) return
    setSendingMessage(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSendingMessage(false); return }

    // Insert message into sprint_messages
    const { data: msg, error } = await supabase
      .from('sprint_messages')
      .insert({
        sprint_id: sprintId,
        sender_email: user.email!,
        sender_role: 'client',
        message: messageText.trim(),
      })
      .select()
      .single()

    if (!error && msg) {
      setMessages(prev => ({
        ...prev,
        [sprintId]: [...(prev[sprintId] || []), msg]
      }))

      // Flag sprint as having feedback
      await supabase
        .from('sprints')
        .update({
          client_approved: false,
          client_approved_at: new Date().toISOString(),
          client_feedback: messageText.trim(),
        })
        .eq('id', sprintId)

      if (offerte) {
        const updatedSprints = offerte.sprints.map((s) =>
          s.id === sprintId
            ? { ...s, client_approved: false, client_approved_at: new Date().toISOString(), client_feedback: messageText.trim() }
            : s
        )
        setOfferte({ ...offerte, sprints: updatedSprints })
      }

      setMessageText('')
    }
    setSendingMessage(false)
  }

  const handleDownloadPdf = async () => {
    if (offerte) {
      await downloadOffertePdf(offerte)
    }
  }

  if (!offerte) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canApprove = offerte.status === 'verstuurd' || offerte.status === 'bekeken'
  const approvedCount = offerte.sprints.filter((s) => s.client_approved === true).length
  const totalSprints = offerte.sprints.length

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link href="/dashboard/offertes" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Terug naar offertes
      </Link>

      {/* Header */}
      <div className="glass-card p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{offerte.title}</h1>
              <StatusBadge status={offerte.status} />
            </div>
            {offerte.description && (
              <p className="text-white/50">{offerte.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gold-gradient">
              €{offerte.total_amount.toLocaleString('nl-NL')}
            </p>
            <p className="text-sm text-white/40">excl. BTW</p>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex gap-6 text-sm text-white/40">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Aangemaakt: {format(new Date(offerte.created_at), 'd MMMM yyyy', { locale: nl })}
          </span>
          {offerte.signed_at && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Volledig akkoord: {format(new Date(offerte.signed_at), 'd MMMM yyyy', { locale: nl })}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalSprints > 0 && canApprove && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
              <span>Voortgang goedkeuring</span>
              <span>{approvedCount} van {totalSprints} sprints goedgekeurd</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-brand-gold transition-all duration-500"
                style={{ width: `${(approvedCount / totalSprints) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sprints — per sprint akkoord */}
      {offerte.sprints.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-white">Sprints</h2>
          {offerte.sprints.map((sprint) => {
            const isExpanded = expandedSprint === sprint.id
            const isApproved = sprint.client_approved === true
            const hasFeedback = sprint.client_approved === false
            const isPending = sprint.client_approved === null

            return (
              <div
                key={sprint.id}
                className={`glass-card overflow-hidden transition-all ${
                  isApproved ? 'border-emerald-500/20' :
                  hasFeedback ? 'border-blue-500/20' :
                  ''
                }`}
              >
                {/* Sprint header */}
                <button
                  onClick={() => setExpandedSprint(isExpanded ? null : sprint.id)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isApproved ? 'bg-emerald-500/20 text-emerald-400' :
                      hasFeedback ? 'bg-blue-500/20 text-blue-400' :
                      'bg-brand-gold/20 text-brand-gold'
                    }`}>
                      {isApproved ? <CheckCircle2 className="w-4 h-4" /> :
                       hasFeedback ? <MessageSquare className="w-4 h-4" /> :
                       sprint.number}
                    </span>
                    <div>
                      <p className="text-white font-medium">{sprint.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-white/40 text-xs flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          {sprint.amount.toLocaleString('nl-NL')}
                        </span>
                        {isApproved && sprint.client_approved_at && (
                          <span className="text-emerald-400 text-xs">
                            Akkoord op {format(new Date(sprint.client_approved_at), 'd MMM yyyy', { locale: nl })}
                          </span>
                        )}
                        {hasFeedback && (
                          <span className="text-blue-400 text-xs">Feedback verstuurd</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sprint.status} />
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/5 pt-4">
                    {sprint.description && (
                      <p className="text-white/50 text-sm mb-4">{sprint.description}</p>
                    )}

                    {/* Deliverables */}
                    {sprint.deliverables && sprint.deliverables.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Deliverables</p>
                        <div className="space-y-1.5">
                          {sprint.deliverables.map((d) => (
                            <div key={d.id} className="flex items-center gap-2 text-sm">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                d.status === 'done' ? 'bg-emerald-400' :
                                d.status === 'in_progress' ? 'bg-brand-gold' :
                                d.status === 'review' ? 'bg-blue-400' :
                                'bg-white/20'
                              }`} />
                              <span className={d.status === 'done' ? 'text-white/60 line-through' : 'text-white/60'}>
                                {d.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message thread */}
                    {((messages[sprint.id] && messages[sprint.id].length > 0) || (hasFeedback && sprint.client_feedback && (!messages[sprint.id] || messages[sprint.id].length === 0))) && (
                      <div className="mb-4">
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Gesprek</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {/* Legacy feedback (if no messages yet) */}
                          {(!messages[sprint.id] || messages[sprint.id].length === 0) && hasFeedback && sprint.client_feedback && (
                            <div className="flex justify-end">
                              <div className="max-w-[80%] p-3 rounded-xl rounded-br-sm bg-blue-500/15 border border-blue-500/20">
                                <p className="text-white/80 text-sm">{sprint.client_feedback}</p>
                                {sprint.client_approved_at && (
                                  <p className="text-white/30 text-xs mt-1">
                                    {new Date(sprint.client_approved_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Messages */}
                          {messages[sprint.id]?.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender_role === 'client' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                                msg.sender_role === 'client'
                                  ? 'rounded-br-sm bg-blue-500/15 border border-blue-500/20'
                                  : 'rounded-bl-sm bg-brand-gold/10 border border-brand-gold/20'
                              }`}>
                                {msg.sender_role === 'admin' && (
                                  <p className="text-brand-gold text-xs font-medium mb-1">Mary — Brand is Code</p>
                                )}
                                <p className="text-white/80">{msg.message}</p>
                                <p className="text-white/30 text-xs mt-1">
                                  {new Date(msg.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message input + approve button */}
                    {canApprove && !isApproved && signingSprintId !== sprint.id && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(sprint.id) } }}
                            placeholder="Stel een vraag of deel feedback..."
                            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500/50 focus:outline-none placeholder:text-white/30"
                          />
                          <button
                            onClick={() => handleSendMessage(sprint.id)}
                            disabled={sendingMessage || !messageText.trim()}
                            className="px-3 py-2.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all disabled:opacity-30"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => setSigningSprintId(sprint.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:opacity-90 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Akkoord &amp; tekenen
                        </button>
                      </div>
                    )}

                    {/* Signature canvas for this sprint */}
                    {signingSprintId === sprint.id && (
                      <div className="mt-2">
                        <p className="text-white/50 text-sm mb-3">
                          Teken hieronder om akkoord te gaan met sprint {sprint.number}: {sprint.title}
                        </p>
                        <SignatureCanvas
                          onSave={(dataUrl) => handleApproveSprint(sprint.id, dataUrl)}
                          disabled={saving}
                        />
                        <button
                          onClick={() => setSigningSprintId(null)}
                          className="mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    )}

                    {/* Already approved */}
                    {isApproved && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Je hebt deze sprint goedgekeurd</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* All sprints approved */}
      {offerte.status === 'getekend' && (
        <div className="glass-card p-8 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-emerald-300">Alle sprints akkoord!</h2>
              <p className="text-white/50 text-sm">
                {offerte.signed_at
                  ? `Volledig akkoord op ${format(new Date(offerte.signed_at), 'd MMMM yyyy', { locale: nl })}`
                  : 'Bedankt voor je akkoord. Mary neemt snel contact met je op.'
                }
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:opacity-90 transition-all"
            >
              <Download className="w-4 h-4" />
              Download PDF voor je administratie
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
