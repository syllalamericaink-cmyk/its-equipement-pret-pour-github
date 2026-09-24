'use client'

import { useSession } from 'next-auth/react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export function AdminHeader() {
  const { data: session } = useSession()

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden sm:inline text-muted-foreground">{session?.user?.name}</span>
      </div>
    </header>
  )
}