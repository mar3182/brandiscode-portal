'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, Trash2, Crown, Loader2, Copy, Check, AlertTriangle } from 'lucide-react'
import type { ClientUser } from '@/lib/types'

export default function TeamPage() {
  const [members, setMembers] = useState<ClientUser[]>([])
  const [callerRole, setCallerRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadTeam()
  }, [])

  async function loadTeam() {
    const res = await fetch('/api/team')
    if (res.ok) {
      const data = await res.json()
      setMembers(data.members)
      setCallerRole(data.callerRole)
    }
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAdding(true)

    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setAdding(false)
      return
    }

    setMembers(prev => [...prev, data.member])
    setTempPassword(data.tempPassword)
    setName('')
    setEmail('')
    setAdding(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/team?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== id))
    }
    setDeletingId(null)
  }

  function copyPassword() {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isOwner = callerRole === 'owner'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-white/50 mt-1">
          Beheer wie er toegang heeft tot het portaal voor jullie bedrijf.
        </p>
      </div>

      {/* Temp password notification */}
      {tempPassword && (
        <div className="glass-card p-6 mb-6 border-brand-gold/30 bg-brand-gold/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Tijdelijk wachtwoord</h3>
              <p className="text-white/60 text-sm mb-3">
                Deel dit wachtwoord met het nieuwe teamlid. Bij eerste inlog wordt gevraagd een eigen wachtwoord te kiezen.
              </p>
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 bg-black/30 rounded-lg text-brand-gold font-mono text-sm">
                  {tempPassword}
                </code>
                <button
                  onClick={copyPassword}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/60" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setTempPassword('')}
              className="text-white/30 hover:text-white/60 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Team members list */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Teamleden</h2>
          {isOwner && (
            <button
              onClick={() => { setShowForm(!showForm); setError(''); setTempPassword('') }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-dark font-semibold text-sm rounded-xl hover:opacity-90 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Teamlid toevoegen
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nog geen teamleden.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center">
                    {member.role === 'owner' ? (
                      <Crown className="w-5 h-5 text-brand-gold" />
                    ) : (
                      <Users className="w-5 h-5 text-white/40" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.name}</p>
                    <p className="text-white/40 text-sm">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    member.role === 'owner'
                      ? 'bg-brand-gold/20 text-brand-gold'
                      : 'bg-white/10 text-white/50'
                  }`}>
                    {member.role === 'owner' ? 'Eigenaar' : 'Teamlid'}
                  </span>
                  {isOwner && member.role !== 'owner' && (
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={deletingId === member.id}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                    >
                      {deletingId === member.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add member form */}
      {showForm && isOwner && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Nieuw teamlid toevoegen</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Naam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Volledige naam"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@bedrijf.nl"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={adding}
                className="flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-dark font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Toevoegen
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 text-white/50 hover:text-white transition-all"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info for non-owners */}
      {!isOwner && (
        <div className="glass-card p-6 bg-white/5">
          <p className="text-white/50 text-sm">
            Alleen de eigenaar van het account kan teamleden toevoegen of verwijderen.
          </p>
        </div>
      )}
    </div>
  )
}
