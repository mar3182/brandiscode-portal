'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react'

export default function DashboardWachtwoordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.user_metadata?.password_changed) {
        setIsFirstLogin(true)
      }
    })
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten.')
      return
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    setLoading(true)

    // Stap 1: Wachtwoord wijzigen
    const { error: pwError } = await supabase.auth.updateUser({ password })

    if (pwError) {
      setError('Er ging iets mis bij het wijzigen van het wachtwoord. Probeer het opnieuw.')
      setLoading(false)
      return
    }

    // Stap 2: Metadata updaten (password_changed flag)
    const { error: metaError } = await supabase.auth.updateUser({
      data: { password_changed: true },
    })

    if (metaError) {
      // Wachtwoord is wel gewijzigd, maar flag niet gezet — opnieuw inloggen lost het op
      console.warn('Metadata update failed, forcing re-login')
    }

    setPassword('')
    setConfirmPassword('')
    setLoading(false)
    setSuccess(true)
    setIsFirstLogin(false)

    // Redirect na 2 seconden naar dashboard
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2000)
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-6 h-6 text-brand-gold" />
        <h1 className="text-2xl font-bold text-white">Wachtwoord wijzigen</h1>
      </div>

      <div className="glass-card p-6">
        {isFirstLogin && !success && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-brand-gold/10 border border-brand-gold/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-brand-gold flex-shrink-0" />
            <p className="text-brand-gold text-sm">Kies een persoonlijk wachtwoord om verder te gaan.</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400 text-sm">Wachtwoord succesvol gewijzigd!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm text-white/60 mb-2">
              Nieuw wachtwoord
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimaal 8 tekens"
                required
                minLength={8}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm text-white/60 mb-2">
              Bevestig wachtwoord
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Herhaal wachtwoord"
                required
                minLength={8}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-brand-gold to-brand-gold/80 text-brand-dark font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Wachtwoord opslaan'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
