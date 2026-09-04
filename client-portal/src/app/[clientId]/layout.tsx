import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Client } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ClientDashboardLayout({
  params,
  children,
}: {
  params: Promise<{ clientId: string }>
  children: React.ReactNode
}) {
  const { clientId } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Haal client data op via slug
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', clientId)
    .maybeSingle()

  if (!client) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar client={client as Client} />
      <main className="flex-1 ml-0 md:ml-64 p-4 pt-16 md:pt-8 md:p-8">
        {children}
      </main>
    </div>
  )
}
