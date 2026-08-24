'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [user, setUser] = useState<any>(null)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user?.email) {
          // Check server-side what admin email is
          const res = await fetch('/api/debug/admin-email')
          const data = await res.json()
          setAdminEmail(data.adminEmail)
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        console.error('Debug check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  if (loading) return <div className="p-4 text-white">Lädt...</div>

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🔍 Debug Info</h1>

        <div className="space-y-4">
          {/* Current User */}
          <div className="bg-white/10 border border-white/20 rounded-lg p-4">
            <h2 className="text-xl font-bold text-white mb-2">📌 Current User</h2>
            <pre className="bg-black/50 p-3 rounded text-green-400 text-sm overflow-auto">
              {user ? JSON.stringify(user, null, 2) : 'Not authenticated'}
            </pre>
          </div>

          {/* Email Comparison */}
          {user?.email && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-4">
              <h2 className="text-xl font-bold text-white mb-2">📧 Email Check</h2>
              <div className="space-y-2 text-white">
                <div>
                  <span className="text-white/60">Your email:</span>
                  <span className="ml-2 font-mono text-blue-300">
                    {user.email}
                  </span>
                </div>
                <div>
                  <span className="text-white/60">Admin email (from .env):</span>
                  <span className="ml-2 font-mono text-yellow-300">
                    {adminEmail || 'NOT SET'}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <span className="text-white/60">Is Admin?</span>
                  <span
                    className={`ml-2 px-3 py-1 rounded text-sm font-bold ${
                      isAdmin
                        ? 'bg-green-500/30 text-green-300'
                        : 'bg-red-500/30 text-red-300'
                    }`}
                  >
                    {isAdmin ? '✅ YES' : '❌ NO'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white/10 border border-white/20 rounded-lg p-4">
            <h2 className="text-xl font-bold text-white mb-4">🎯 Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => window.location.href = '/api/auth/redirect'}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Test /api/auth/redirect
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Go to Root Page
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4">
            <h3 className="font-bold text-amber-300 mb-2">📝 Debugging:</h3>
            <ol className="text-white/80 text-sm space-y-1 list-decimal list-inside">
              <li>Check if "Your email" matches "Admin email"</li>
              <li>If not matching but should be: check Vercel env vars</li>
              <li>Copy email exactly (check for spaces, case)</li>
              <li>If admin=NO but should be YES: redeploy Vercel</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
