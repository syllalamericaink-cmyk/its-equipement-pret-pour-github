import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminProviders } from '@/components/layout/admin-providers'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <AdminProviders session={session}>
      {children}
    </AdminProviders>
  )
}
