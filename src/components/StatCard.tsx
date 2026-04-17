import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'gold' | 'blue' | 'green' | 'pink'
}

const colorMap = {
  gold: 'from-brand-gold/20 to-brand-gold/5 border-brand-gold/30 text-brand-gold',
  blue: 'from-brand-blue/20 to-brand-blue/5 border-brand-blue/30 text-brand-blue',
  green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
  pink: 'from-brand-pink/20 to-brand-pink/5 border-brand-pink/30 text-brand-pink',
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'gold' }: StatCardProps) {
  return (
    <div className={`glass-card p-6 bg-gradient-to-br ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/50">{title}</p>
          <p className="text-3xl font-bold mt-1 text-white">{value}</p>
          {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-white/5`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
