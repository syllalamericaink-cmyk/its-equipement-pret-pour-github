'use client'

import { usePathname } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminHeader } from '@/components/layout/admin-header'

const EXCLUDED_PATHS = ['/admin/login']

export function AdminProviders({ children, session }: { children: React.ReactNode; session: unknown }) {
  const pathname = usePathname()
  const isLoginPage = EXCLUDED_PATHS.includes(pathname)

  if (isLoginPage) {
    return (
      <SessionProvider session={session as never}>
        {children}
      </SessionProvider>
    )
  }

  return (
    <SessionProvider session={session as never}>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <AdminHeader />
          <div className="flex-1 p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  )
}
