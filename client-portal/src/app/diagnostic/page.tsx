'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DiagnosticPage() {
  const [status, setStatus] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      try {
        const supabase = createClient()
        
        // Check if we can get session
        const { data: { session } } = await supabase.auth.getSession()
        
        // Try to get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        // Check admin email from API
        const redirectRes = await fetch('/api/auth/redirect')
        const redirectData = await redirectRes.json()

        setStatus({
          supabaseConnected: !!supabase,
          sessionExists: !!session,
          userExists: !!user,
          userEmail: user?.email || 'N/A',
          userError: userError?.message,
          adminCheckWorking: redirectRes.ok,
          adminCheckResult: redirectData,
          timestamp: new Date().toISOString(),
        })
      } catch (err) {
        setStatus({
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        })
      } finally {
        setLoading(false)
      }
    }

    check()
  }, [])

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🔍 Diagnostic Page</h1>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          {loading ? (
            <p className="text-white/60">Checking Supabase connection...</p>
          ) : (
            <pre className="text-white/80 text-sm overflow-auto bg-black/50 p-4 rounded">
              {JSON.stringify(status, null, 2)}
            </pre>
          )}
        </div>

        <div className="mt-8 text-white/60 text-sm">
          <p>Open <strong>browser console (F12)</strong> to see detailed logs:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Connection errors</li>
            <li>Auth state</li>
            <li>User information</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
