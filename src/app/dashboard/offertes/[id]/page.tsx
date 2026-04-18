'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import SignatureCanvas from '@/components/SignatureCanvas'
import type { OfferteWithSprints, SprintWithDeliverables } from '@/lib/types'
import { downloadOffertePdf } from '@/lib/generateOffertePdf'
import { ArrowLeft, Download, CheckCircle2, Calendar, Euro, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function OfferteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [offerte, setOfferte] = useState<OfferteWithSprints | null>(null)
  const [signingSprintId, setSigningSprintId] = useState<string | null>(null)
  const [feedbackSprintId, setFeedbackSprintId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null)
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

  const handleSendFeedback = async (sprintId: string) => {
    if (!feedbackText.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('sprints')
      .update({
        client_approved: false,
        client_approved_at: new Date().toISOString(),
        client_feedback: feedbackText.trim(),
      })
      .eq('id', sprintId)

    if (!error && offerte) {
      const updatedSprints = offerte.sprints.map((s) =>
        s.id === sprintId
          ? { ...s, client_approved: false, client_approved_at: new Date().toISOString(), client_feedback: feedbackText.trim() }
          : s
      )
      setOfferte({ ...offerte, sprints: updatedSprints })
      setFeedbackSprintId(null)
      setFeedbackText('')
    }
    setSaving(false)
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

                    {/* Feedback display */}
                    {hasFeedback && sprint.client_feedback && (
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-blue-300 text-sm font-medium">Jouw feedback</p>
                            <p className="text-white/60 text-sm">{sprint.client_feedback}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approve / Reject buttons */}
                    {canApprove && isPending && signingSprintId !== sprint.id && feedbackSprintId !== sprint.id && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setSigningSprintId(sprint.id); setFeedbackSprintId(null) }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:opacity-90 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Akkoord &amp; tekenen
                        </button>
                        <button
                          onClick={() => { setFeedbackSprintId(sprint.id); setSigningSprintId(null) }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:border-blue-500/30 hover:text-blue-400 transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Feedback geven
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

                    {/* Feedback form */}
                    {feedbackSprintId === sprint.id && (
                      <div className="mt-2">
                        <p className="text-white/50 text-sm mb-2">
                          Deel je opmerkingen over sprint {sprint.number}:
                        </p>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Deel je gedachten, vragen of suggesties..."
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500/50 focus:outline-none resize-none"
                          rows={3}
                        />
                        <div className="flex gap-3 mt-3">
                          <button
                            onClick={() => handleSendFeedback(sprint.id)}
                            disabled={saving || !feedbackText.trim()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 font-semibold text-sm hover:bg-blue-500/30 transition-all disabled:opacity-50"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Verstuur feedback
                          </button>
                          <button
                            onClick={() => { setFeedbackSprintId(null); setFeedbackText('') }}
                            className="text-xs text-white/40 hover:text-white/60 transition-colors"
                          >
                            Annuleren
                          </button>
                        </div>
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
