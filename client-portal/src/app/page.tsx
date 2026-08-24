'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  
  console.log('🏠 Root page - User:', user?.email, 'Error:', error?.message)

  // No user or error = redirect to login
  if (!user || error) {
    console.log('❌ Not authenticated - redirecting to /login')
    return redirect('/login')
  }

  console.log('✅ Authenticated as:', user.email)

  // Check if user is admin by comparing email
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = user.email === adminEmail

  console.log('🔐 Admin check:', { userEmail: user.email, adminEmail, isAdmin })

  // Route based on admin status
  if (isAdmin) {
    console.log('👑 Admin user - redirecting to /admin')
    return redirect('/admin')
  } else {
    console.log('👤 Regular user - redirecting to /dashboard')
    return redirect('/dashboard')
  }
}
