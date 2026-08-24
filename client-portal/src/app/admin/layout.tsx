import AdminSidebar from '@/components/AdminSidebar'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 pt-16 md:pt-8 md:p-8">
        {children}
      </main>
    </div>
  )
}
