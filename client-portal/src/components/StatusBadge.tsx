import { OfferteStatus, SprintStatus, DeliverableStatus, FactuurStatus } from '@/lib/types'

type StatusType = OfferteStatus | SprintStatus | DeliverableStatus | FactuurStatus

const statusLabels: Record<string, string> = {
  concept: 'Concept',
  verstuurd: 'Nieuw',
  bekeken: 'Bekeken',
  getekend: 'Akkoord ✓',
  afgewezen: 'Afgewezen',
  betaald: 'Betaald',
  herinnering: 'Herinnering',
  gepland: 'Gepland',
  actief: 'Actief',
  review: 'Review',
  afgerond: 'Afgerond ✓',
  todo: 'To do',
  in_progress: 'Bezig',
  done: 'Klaar ✓',
}

const statusTint: Record<string, 'neutral' | 'pending' | 'positive' | 'warning'> = {
  concept: 'neutral',
  gepland: 'neutral',
  todo: 'neutral',
  verstuurd: 'pending',
  bekeken: 'pending',
  in_progress: 'pending',
  review: 'pending',
  actief: 'pending',
  getekend: 'positive',
  betaald: 'positive',
  afgerond: 'positive',
  done: 'positive',
  afgewezen: 'warning',
  herinnering: 'warning',
}

export default function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span className={`status-badge status-${statusTint[status] || 'neutral'}`}>
      {statusLabels[status] || status}
    </span>
  )
}
