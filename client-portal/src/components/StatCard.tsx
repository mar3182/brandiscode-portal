import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  variant?: 'neutral' | 'accent'
}

export default function StatCard({ title, value, subtitle, icon: Icon, variant = 'neutral' }: StatCardProps) {
  return (
    <div className={`glass-card p-6 ${variant === 'accent' ? 'stat-card-accent' : 'stat-card-neutral'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/50">{title}</p>
          <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-white/5`}>
          <Icon className="w-6 h-6 text-brand-gold" />
        </div>
      </div>
    </div>
  )
}
