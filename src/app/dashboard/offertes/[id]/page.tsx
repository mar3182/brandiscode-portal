'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import SignatureCanvas from '@/components/SignatureCanvas'
import type { OfferteWithSprints } from '@/lib/types'
import { downloadOffertePdf } from '@/lib/generateOffertePdf'
import { ArrowLeft, Download, CheckCircle2, Calendar, Euro } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function OfferteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [offerte, setOfferte] = useState<OfferteWithSprints | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
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

      // Mark as bekeken
      if (offerteData.status === 'verstuurd') {
        await supabase
          .from('offertes')
          .update({ status: 'bekeken', updated_at: new Date().toISOString() })
          .eq('id', id)
      }
    }
    load()
  }, [id, supabase])

  const handleSign = async (signatureDataUrl: string) => {
    setSigning(true)
    const { error } = await supabase
      .from('offertes')
      .update({
        status: 'getekend',
        signature_data: signatureDataUrl,
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (!error) {
      const updatedOfferte = {
        ...offerte!,
        status: 'getekend' as const,
        signed_at: new Date().toISOString(),
        signature_data: signatureDataUrl,
      }
      setSigned(true)
      setOfferte(updatedOfferte)
      // Auto-download PDF
      downloadOffertePdf(updatedOfferte, signatureDataUrl)
    }
    setSigning(false)
  }

  const handleDownloadPdf = () => {
    if (offerte) {
      downloadOffertePdf(offerte)
    }
  }

  if (!offerte) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canSign = offerte.status === 'verstuurd' || offerte.status === 'bekeken'

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
              Getekend: {format(new Date(offerte.signed_at), 'd MMMM yyyy', { locale: nl })}
            </span>
          )}
        </div>
      </div>

      {/* Sprints breakdown */}
      {offerte.sprints.length > 0 && (
        <div className="glass-card p-8 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Sprint overzicht</h2>
          <div className="space-y-4">
            {offerte.sprints.map((sprint) => (
              <div key={sprint.id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold text-sm">
                      {sprint.number}
                    </span>
                    <div>
                      <p className="text-white font-medium">{sprint.title}</p>
                      {sprint.description && (
                        <p className="text-white/40 text-sm">{sprint.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/60 flex items-center gap-1">
                      <Euro className="w-3.5 h-3.5" />
                      {sprint.amount.toLocaleString('nl-NL')}
                    </span>
                    <StatusBadge status={sprint.status} />
                  </div>
                </div>

                {/* Deliverables */}
                {sprint.deliverables && sprint.deliverables.length > 0 && (
                  <div className="mt-3 ml-11 space-y-1.5">
                    {sprint.deliverables.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-sm">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          d.status === 'done' ? 'bg-emerald-400' :
                          d.status === 'in_progress' ? 'bg-brand-gold' :
                          'bg-white/20'
                        }`} />
                        <span className={d.status === 'done' ? 'text-white/60 line-through' : 'text-white/60'}>
                          {d.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Digital signature */}
      {canSign && !signed && (
        <div className="glass-card p-8 border-brand-gold/20">
          <h2 className="text-lg font-semibold text-white mb-2">Digitaal ondertekenen</h2>
          <p className="text-white/50 text-sm mb-4">
            Door te tekenen ga je akkoord met de voorwaarden in deze offerte.
          </p>
          <SignatureCanvas onSave={handleSign} disabled={signing} />
        </div>
      )}

      {/* Success message */}
      {(signed || offerte.status === 'getekend') && (
        <div className="glass-card p-8 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-emerald-300">Offerte getekend!</h2>
              <p className="text-white/50 text-sm">
                {offerte.signed_at
                  ? `Getekend op ${format(new Date(offerte.signed_at), 'd MMMM yyyy', { locale: nl })}`
                  : 'Bedankt voor je akkoord. Mary neemt snel contact met je op.'
                }
              </p>
            </div>
          </div>
          {offerte.signature_data && (
            <div className="mt-4 p-4 rounded-xl bg-black/20 inline-block">
              <img src={offerte.signature_data} alt="Handtekening" className="h-20" />
            </div>
          )}
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
