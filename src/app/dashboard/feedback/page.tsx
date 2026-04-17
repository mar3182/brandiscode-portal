'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Feedback, Sprint } from '@/lib/types'
import { MessageSquare, Send, Star, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<(Feedback & { sprint?: Sprint })[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [selectedSprint, setSelectedSprint] = useState('')
  const [sending, setSending] = useState(false)
  const [clientId, setClientId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user.email)
        .single()

      if (client) setClientId(client.id)

      const { data: fb } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: sprintData } = await supabase
        .from('sprints')
        .select('*')
        .order('number', { ascending: true })

      if (sprintData) setSprints(sprintData)

      if (fb && sprintData) {
        setFeedbackList(fb.map(f => ({
          ...f,
          sprint: sprintData.find(s => s.id === f.sprint_id),
        })))
      }
    }
    load()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !clientId) return

    setSending(true)

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        client_id: clientId,
        sprint_id: selectedSprint || null,
        message: message.trim(),
        rating: rating || null,
      })
      .select()
      .single()

    if (!error && data) {
      const sprint = sprints.find(s => s.id === data.sprint_id)
      setFeedbackList(prev => [{ ...data, sprint }, ...prev])
      setMessage('')
      setRating(0)
      setSelectedSprint('')
    }

    setSending(false)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Feedback</h1>
        <p className="text-white/50 mt-1">Deel je ervaringen en opmerkingen over het project.</p>
      </div>

      {/* New feedback form */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Nieuwe feedback</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sprint selector */}
          {sprints.length > 0 && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Sprint (optioneel)</label>
              <select
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-gold/50 transition-all"
              >
                <option value="">Algemene feedback</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>
                    Sprint {s.number}: {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Beoordeling (optioneel)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHoveredRating(n)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      n <= (hoveredRating || rating)
                        ? 'text-brand-gold fill-brand-gold'
                        : 'text-white/20'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Bericht</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Deel je feedback, suggesties of opmerkingen..."
              required
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-dark font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Versturen
              </>
            )}
          </button>
        </form>
      </div>

      {/* Feedback history */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Eerdere feedback</h2>

        {feedbackList.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nog geen feedback geplaatst.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((fb) => (
              <div key={fb.id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {fb.sprint && (
                      <span className="text-xs text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">
                        Sprint {fb.sprint.number}: {fb.sprint.title}
                      </span>
                    )}
                    {fb.rating && (
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star
                            key={n}
                            className={`w-4 h-4 ${
                              n <= fb.rating! ? 'text-brand-gold fill-brand-gold' : 'text-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-white/30">
                    {format(new Date(fb.created_at), 'd MMM yyyy HH:mm', { locale: nl })}
                  </span>
                </div>
                <p className="text-white/70 text-sm">{fb.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
