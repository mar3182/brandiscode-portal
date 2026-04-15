'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import type { Offerte } from '@/lib/types'
import Link from 'next/link'
import { FileText, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function OffertesPage() {
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('offertes')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setOffertes(data)
    }
    load()
  }, [supabase])

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Offertes</h1>
        <p className="text-white/50 mt-1">Bekijk, download en teken je offertes.</p>
      </div>

      {offertes.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Nog geen offertes beschikbaar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offertes.map((offerte) => (
            <Link
              key={offerte.id}
              href={`/dashboard/offertes/${offerte.id}`}
              className="glass-card p-6 block hover:border-brand-gold/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-white">{offerte.title}</h2>
                    <StatusBadge status={offerte.status} />
                  </div>
                  {offerte.description && (
                    <p className="text-white/50 text-sm mb-3">{offerte.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(offerte.created_at), 'd MMMM yyyy', { locale: nl })}
                    </span>
                    {offerte.signed_at && (
                      <span className="text-emerald-400">
                        Getekend op {format(new Date(offerte.signed_at), 'd MMM yyyy', { locale: nl })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-2xl font-bold text-white">
                    €{offerte.total_amount.toLocaleString('nl-NL')}
                  </p>
                  <p className="text-xs text-white/40">excl. BTW</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
