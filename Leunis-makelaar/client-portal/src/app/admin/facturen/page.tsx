import { redirect } from 'next/navigation'

export default function AdminFacturenRedirectPage({
  searchParams,
}: {
  searchParams?: { client?: string }
}) {
  const clientId = searchParams?.client

  if (clientId) {
    redirect(`/admin/clients/${encodeURIComponent(clientId)}?tab=facturen`)
  }

  redirect('/admin/clients?tab=facturen')
}
