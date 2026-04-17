import { OfferteStatus, SprintStatus, DeliverableStatus } from '@/lib/types'

type StatusType = OfferteStatus | SprintStatus | DeliverableStatus

const statusLabels: Record<string, string> = {
  concept: 'Concept',
  verstuurd: 'Nieuw',
  bekeken: 'Bekeken',
  getekend: 'Akkoord ✓',
  afgewezen: 'Afgewezen',
  gepland: 'Gepland',
  actief: 'Actief',
  review: 'Review',
  afgerond: 'Afgerond ✓',
  todo: 'To do',
  in_progress: 'Bezig',
  done: 'Klaar ✓',
}

const statusClasses: Record<string, string> = {
  concept: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  verstuurd: 'bg-brand-gold/20 text-brand-gold border-brand-gold/30',
  bekeken: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  getekend: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  afgewezen: 'bg-red-500/20 text-red-300 border-red-500/30',
  gepland: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  actief: 'bg-brand-gold/20 text-brand-gold border-brand-gold/30',
  review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  afgerond: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  todo: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  in_progress: 'bg-brand-gold/20 text-brand-gold border-brand-gold/30',
  done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export default function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span className={`status-badge border ${statusClasses[status] || ''}`}>
      {statusLabels[status] || status}
    </span>
  )
}
