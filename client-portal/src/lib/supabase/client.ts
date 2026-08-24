import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client
 * Use for client components and browser operations
 * Respects RLS policies
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}
