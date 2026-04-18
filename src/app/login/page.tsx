'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Onjuist e-mailadres of wachtwoord.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient accents */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#E84393]/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#D4A843]/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo-small.png"
            alt="Brand is Code"
            width={120}
            height={120}
            priority
            className="mb-4"
          />
          <p className="text-white/40 text-sm tracking-widest uppercase">Client Portal</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-white mb-2">Welkom terug</h2>
          <p className="text-white/50 text-sm mb-6">
            Log in met je e-mailadres en wachtwoord.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
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
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-white/60 mb-2">
                Wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-[#E84393] to-[#D4A843] text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Inloggen
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          © {new Date().getFullYear()} Brand is Code — KvK 91166667
        </p>
      </div>
    </div>
  )
}
