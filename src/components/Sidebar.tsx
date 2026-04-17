'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, PenTool, BarChart3, MessageSquare, LogOut, ShieldCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Offertes', href: '/dashboard/offertes', icon: FileText },
  { name: 'Projectstatus', href: '/dashboard/projecten', icon: BarChart3 },
  { name: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Wachtwoord', href: '/dashboard/wachtwoord-wijzigen', icon: ShieldCheck },
]

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-card rounded-none border-r border-white/10 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Image
          src="/logo.png"
          alt="Brand is Code"
          width={160}
          height={113}
          className="w-40 h-auto"
          priority
        />
        <p className="text-xs text-white/50 mt-2">Client Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
