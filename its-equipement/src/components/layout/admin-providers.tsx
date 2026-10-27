'use client'

import { usePathname } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminHeader } from '@/components/layout/admin-header'
import { adminPath } from '@/lib/admin-path'

// La page de connexion peut être vue via le segment personnalisé (URL publique,
// conservée par usePathname) ou via le chemin interne /admin/login (réécriture).
const EXCLUDED_PATHS = [adminPath('/login'), '/admin/login']

export function AdminProviders({ children, session }: { children: React.ReactNode; session: unknown }) {
  const pathname = usePathname()
  const isLoginPage = EXCLUDED_PATHS.includes(pathname)

  if (isLoginPage) {
    return <SessionProvider session={session as never}>{children}</SessionProvider>
  }

  return (
    <SessionProvider session={session as never}>
      <div className="its-admin flex min-h-screen bg-[#f4f5f2]">
        {/* Barre latérale fixe (ordinateur) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
          <AdminSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
