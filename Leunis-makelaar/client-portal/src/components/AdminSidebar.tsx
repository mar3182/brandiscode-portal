'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, LogOut, ArrowLeft, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminSidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [openFacturenCount, setOpenFacturenCount] = useState(0)

  useEffect(() => {
    async function loadOpenFacturen() {
      const res = await fetch('/api/admin/facturen')
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return

      const open = data.filter(
        (factuur: any) => factuur.status === 'verstuurd' || factuur.status === 'herinnering'
      ).length
      setOpenFacturenCount(open)
    }

    loadOpenFacturen()
  }, [])

  const adminNav = useMemo(() => [
    { name: 'Overzicht', href: '/admin', icon: LayoutDashboard },
    { name: 'Klanten', href: '/admin/clients', icon: Users },
    { name: 'Offertes & Sprints', href: '/admin/offertes', icon: FileText },
    { name: 'Facturen', href: '/admin/facturen', icon: Receipt, badge: openFacturenCount },
  ], [openFacturenCount])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-card rounded-none border-r border-white/10 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-gold-gradient">Brand is Code</h1>
        <p className="text-xs text-brand-orange mt-1 font-semibold">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {adminNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.name}</span>
              {item.badge ? (
                <span className="min-w-5 h-5 px-1 rounded-full bg-red-500/20 text-red-300 text-xs flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Client portal
          </Link>
        </div>
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
