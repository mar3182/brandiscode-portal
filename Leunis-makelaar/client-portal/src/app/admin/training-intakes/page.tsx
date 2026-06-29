import { redirect } from 'next/navigation'

export default function AdminTrainingIntakesRedirectPage({
  searchParams,
}: {
  searchParams?: { client?: string }
}) {
  const clientId = searchParams?.client

  if (clientId) {
    redirect(`/admin/clients/${encodeURIComponent(clientId)}?tab=training`)
  }

  redirect('/admin/clients?tab=training')
}
