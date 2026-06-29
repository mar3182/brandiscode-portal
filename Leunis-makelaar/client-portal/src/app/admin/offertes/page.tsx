import { redirect } from 'next/navigation'

export default function AdminOffertesRedirectPage({
  searchParams,
}: {
  searchParams?: { client?: string }
}) {
  const clientId = searchParams?.client

  if (clientId) {
    redirect(`/admin/clients/${encodeURIComponent(clientId)}?tab=offertes`)
  }

  redirect('/admin/clients?tab=offertes')
}
