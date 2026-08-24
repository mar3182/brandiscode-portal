'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Root page - redirects based on auth status
 */
export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to admin for now (production: check auth, then redirect to /dashboard or /login)
    router.push('/admin/offertes')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Brand is Code</h1>
        <p className="text-white/60">Portal wordt geladen...</p>
      </div>
    </div>
  )
}
