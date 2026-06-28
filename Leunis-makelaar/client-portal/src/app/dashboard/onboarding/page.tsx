'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { OnboardingQuestion } from '@/lib/types'
import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({})
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const saveTimers = useRef<Record<string, number>>({})
  const hideSavedTimers = useRef<Record<string, number>>({})

  useEffect(() => {
    async function loadQuestions() {
      const res = await fetch('/api/onboarding')
      const data = await res.json()
      if (Array.isArray(data)) setQuestions(data)
      setLoading(false)
    }

    loadQuestions()

    return () => {
      Object.values(saveTimers.current).forEach((timerId) => window.clearTimeout(timerId))
      Object.values(hideSavedTimers.current).forEach((timerId) => window.clearTimeout(timerId))
    }
  }, [])

  const persistAnswer = useCallback(async (questionId: string, answer: string) => {
    setSavingMap((prev) => ({ ...prev, [questionId]: true }))

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, answer }),
    })

    setSavingMap((prev) => ({ ...prev, [questionId]: false }))

    if (!res.ok) return

    setSavedMap((prev) => ({ ...prev, [questionId]: true }))
    if (hideSavedTimers.current[questionId]) {
      window.clearTimeout(hideSavedTimers.current[questionId])
    }
    hideSavedTimers.current[questionId] = window.setTimeout(() => {
      setSavedMap((prev) => ({ ...prev, [questionId]: false }))
    }, 2000)
  }, [])

  const queueSave = useCallback((questionId: string, answer: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, answer } : q)))

    if (saveTimers.current[questionId]) {
      window.clearTimeout(saveTimers.current[questionId])
    }

    saveTimers.current[questionId] = window.setTimeout(() => {
      persistAnswer(questionId, answer)
    }, 500)
  }, [persistAnswer])

  const requiredCount = questions.filter((q) => q.is_required).length
  const answeredRequiredCount = questions.filter((q) => q.is_required && q.answer?.trim()).length
  const answeredCount = questions.filter((q) => q.answer?.trim()).length
  const progressPercentage = requiredCount > 0 ? Math.round((answeredRequiredCount / requiredCount) * 100) : 0
  const allRequiredAnswered = requiredCount > 0 && answeredRequiredCount === requiredCount

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Informatie doorgeven</h1>
        <p className="text-white/50 mt-1">Beantwoord de onderstaande vragen zodat we direct aan de slag kunnen.</p>
      </div>

      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-white/70">{answeredCount} van {questions.length} vragen beantwoord</p>
          <p className="text-sm text-white/40">{progressPercentage}%</p>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-gold to-brand-gold/70 transition-all" style={{ width: `${progressPercentage}%` }} />
        </div>
      </div>

      {allRequiredAnswered && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          Alles ingevuld - we gaan aan de slag! ✓
        </div>
      )}

      {questions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Er zijn nog geen vragen ingesteld voor dit project.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const isSaved = savedMap[question.id]
            const isSaving = savingMap[question.id]
            const currentAnswer = question.answer || ''

            return (
              <div key={question.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm text-white/40 mb-1">Vraag {index + 1}</p>
                    <h2 className="text-white font-medium">{question.question}</h2>
                    {question.hint && <p className="text-white/40 text-sm mt-1">{question.hint}</p>}
                  </div>
                  <div className="h-6 w-6 flex items-center justify-center">
                    {isSaving && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
                    {!isSaving && isSaved && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                </div>

                {question.answer_type === 'text' && (
                  <textarea
                    rows={3}
                    value={currentAnswer}
                    onChange={(e) => queueSave(question.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50"
                    placeholder="Typ je antwoord..."
                  />
                )}

                {question.answer_type === 'choice' && (
                  <div className="flex flex-wrap gap-2">
                    {(question.options || []).map((option) => {
                      const active = currentAnswer === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => queueSave(question.id, option)}
                          className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                            active
                              ? 'bg-brand-gold/20 border-brand-gold/40 text-brand-gold'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                )}

                {question.answer_type === 'yesno' && (
                  <div className="flex gap-2">
                    {['Ja', 'Nee'].map((option) => {
                      const active = currentAnswer === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => queueSave(question.id, option)}
                          className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                            active
                              ? 'bg-brand-gold/20 border-brand-gold/40 text-brand-gold'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
