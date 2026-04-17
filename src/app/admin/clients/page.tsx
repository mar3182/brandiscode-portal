'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Loader2 } from 'lucide-react'
import type { Client } from '@/lib/types'

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '' })

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setClients(data) })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      const newClient = await res.json()
      setClients(prev => [newClient, ...prev])
      setForm({ name: '', email: '', company: '', phone: '' })
      setShowForm(false)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Klanten</h1>
          <p className="text-white/50 mt-1">Beheer je klantprofielen.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white font-medium rounded-xl hover:opacity-90 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Nieuwe klant
        </button>
      </div>

      {/* New client form */}
      {showForm && (
        <div className="glass-card p-6 mb-6 border-brand-blue/20">
          <h2 className="text-lg font-semibold text-white mb-4">Nieuwe klant toevoegen</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Naam *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
                placeholder="Volledige naam"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">E-mail *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
                placeholder="klant@email.nl"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Bedrijf</label>
              <input
                type="text"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
                placeholder="Bedrijfsnaam"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Telefoon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all"
                placeholder="+31 6..."
              />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white font-medium rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Toevoegen
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 transition-all text-sm"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Nog geen klanten. Voeg er een toe of voer de seed-data uit.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="glass-card p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{client.name}</p>
                <div className="flex items-center gap-3 text-sm text-white/40 mt-1">
                  <span>{client.email}</span>
                  {client.company && <span>• {client.company}</span>}
                  {client.phone && <span>• {client.phone}</span>}
                </div>
              </div>
              <span className="text-xs text-white/30">
                {new Date(client.created_at).toLocaleDateString('nl-NL')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
