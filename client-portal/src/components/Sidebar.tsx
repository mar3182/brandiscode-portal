'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useParams } from 'next/navigation'
import { LayoutDashboard, FileText, BarChart3, MessageSquare, LogOut, ShieldCheck, Users, ClipboardList, Receipt, Building2, Menu, X, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/lib/types'

interface SidebarProps {
  client?: Client
}

export default function Sidebar({ client }: SidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const clientId = params?.clientId as string
  const supabase = createClient()
  const [openOnboardingCount, setOpenOnboardingCount] = useState(0)
  const [trainingEnabled, setTrainingEnabled] = useState(false)
  const [openFacturenCount, setOpenFacturenCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Genereer klant-specifieke base path
  const clientBasePath = clientId ? `/${clientId}` : ''

  useEffect(() => {
    async function loadOnboardingCount() {
      const res = await fetch('/api/training-intake')
      if (!res.ok) return
      const data = await res.json()

      const enabled = data?.enabled === true
      setTrainingEnabled(enabled)
      if (!enabled) {
        setOpenOnboardingCount(0)
        return
      }

      if (data?.completeness?.readyForTraining === true) {
        setOpenOnboardingCount(0)
        return
      }

      const missingCount = Array.isArray(data?.completeness?.missingRequiredFields)
        ? data.completeness.missingRequiredFields.length
        : 1

      setOpenOnboardingCount(missingCount)
    }

    loadOnboardingCount()
  }, [])

  useEffect(() => {
    async function loadFacturenCount() {
      const res = await fetch('/api/facturen')
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return

      const open = data.filter(
        (factuur: any) => factuur.status === 'verstuurd' || factuur.status === 'herinnering'
      ).length

      setOpenFacturenCount(open)
    }

    loadFacturenCount()
  }, [])

  const navigation = useMemo(() => {
    const items = [
    { name: 'Dashboard', href: `${clientBasePath}/dashboard`, icon: LayoutDashboard },
    { name: 'Offertes', href: `${clientBasePath}/dashboard/offertes`, icon: FileText },
    { name: 'Projectstatus', href: `${clientBasePath}/dashboard/projecten`, icon: BarChart3 },
    { name: 'Bedrijfsgegevens', href: `${clientBasePath}/dashboard/bedrijfsgegevens`, icon: Building2 },
    { name: 'Facturen', href: `${clientBasePath}/dashboard/facturen`, icon: Receipt, badge: openFacturenCount, badgeClass: 'bg-red-500/20 text-red-300' },
    { name: 'Funda-teksten', href: `${clientBasePath}/dashboard/funda-tekst`, icon: Sparkles },
    { name: 'Feedback', href: `${clientBasePath}/dashboard/feedback`, icon: MessageSquare },
    { name: 'Team', href: `${clientBasePath}/dashboard/team`, icon: Users },
    { name: 'Wachtwoord', href: `${clientBasePath}/dashboard/wachtwoord-wijzigen`, icon: ShieldCheck },
    ] as Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }>; badge?: number; badgeClass?: string }>

    if (trainingEnabled) {
      items.splice(3, 0, { name: 'Training Intake', href: `${clientBasePath}/dashboard/onboarding`, icon: ClipboardList, badge: openOnboardingCount })
    }

    return items
  }, [openFacturenCount, openOnboardingCount, trainingEnabled, clientBasePath])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden glass-card p-2 rounded-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu openen"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Overlay backdrop — mobile only */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-64 glass-card rounded-none border-r border-white/10 flex flex-col z-50 transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
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
        {/* Close button — mobile only */}
        <button
          className="md:hidden text-white/40 hover:text-white"
          onClick={() => setMobileOpen(false)}
          aria-label="Menu sluiten"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.name}</span>
              {item.badge ? (
                <span className={`min-w-5 h-5 px-1 rounded-full text-xs flex items-center justify-center ${item.badgeClass || 'bg-amber-500/20 text-amber-300'}`}>
                  {item.badge}
                </span>
              ) : null}
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
    </>
  )
}
