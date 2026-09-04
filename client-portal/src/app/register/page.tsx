'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Maak auth user (direct geactiveerd)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            company,
          },
        },
      })

      if (authError) throw authError

      // 2. Maak client entry (als company is opgegeven)
      if (company) {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            email,
            name,
            company,
            slug: company.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          })

        if (clientError) throw clientError
      }

      // 3. Log direct in
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // 4. Ga naar dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden bij het registreren.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="glass-card p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Registreren</h1>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-1">
              Naam
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              placeholder="Jan Jansen"
              required
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-white/70 mb-1">
              Bedrijfsnaam (optioneel)
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              placeholder="Voorbeeld Bedrijf"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              placeholder="jan@voorbeeld.nl"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              placeholder="••••••••"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-gold/20 border border-brand-gold/30 text-brand-gold font-medium hover:bg-brand-gold/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Registreren...' : 'Registreren'}
          </button>
        </form>

        <p className="text-white/50 text-sm mt-6 text-center">
          Heb je al een account?{' '}
          <a href="/login" className="text-brand-gold hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  )
}
