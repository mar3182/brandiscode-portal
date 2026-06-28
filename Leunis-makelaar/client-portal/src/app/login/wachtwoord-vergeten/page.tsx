'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('resetCooldownUntil')
    if (!saved) return

    const parsed = Number(saved)
    if (!Number.isNaN(parsed) && parsed > Date.now()) {
      setCooldownUntil(parsed)
    } else {
      window.localStorage.removeItem('resetCooldownUntil')
    }
  }, [])

  const remainingSeconds = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email) {
      setError('Vul je e-mailadres in.')
      return
    }

    if (remainingSeconds > 0) {
      setError(`Wacht nog ${remainingSeconds}s voordat je opnieuw probeert.`)
      return
    }

    setLoading(true)

    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard/wachtwoord-wijzigen`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (resetError) {
      if ((resetError as any).status === 429 || resetError.message.toLowerCase().includes('rate')) {
        const cooldownMs = 15 * 60_000
        const until = Date.now() + cooldownMs
        setCooldownUntil(until)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('resetCooldownUntil', String(until))
        }
        setError('Supabase blokkeert tijdelijk reset-e-mails (429). Wacht 15 minuten en probeer daarna opnieuw.')
      } else {
        setError('Reset-link versturen is mislukt. Controleer je e-mail en probeer opnieuw.')
      }
      setLoading(false)
      return
    }

    setSuccess('Reset-link verstuurd. Check je e-mail om je wachtwoord te wijzigen.')
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('resetCooldownUntil')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#E84393]/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#D4A843]/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card p-8">
          <h1 className="text-xl font-semibold text-white mb-2">Wachtwoord vergeten</h1>
          <p className="text-white/50 text-sm mb-6">
            Vul je e-mailadres in. Je ontvangt direct een reset-link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-white/60 mb-2">
                E-mailadres
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jouw@email.nl"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-all"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-emerald-400 text-sm">{success}</p>}

            <button
              type="submit"
              disabled={loading || remainingSeconds > 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-[#E84393] to-[#D4A843] text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (remainingSeconds > 0 ? `Probeer opnieuw over ${remainingSeconds}s` : 'Stuur reset-link')}
            </button>
          </form>

          <Link href="/login" className="mt-4 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Terug naar inloggen
          </Link>
        </div>
      </div>
    </div>
  )
}
