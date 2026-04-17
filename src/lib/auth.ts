import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Check if current user is admin
export async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/login')
  }

  return user
}
