'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  AdminSidebar,
  advancedLinks,
  isLinkActive,
  mainLinks,
  settingsLink,
} from '@/components/layout/admin-sidebar'

/** Barre du haut de l'admin : menu (mobile) et titre de la section en cours. */
export function AdminHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const current = [...mainLinks, ...advancedLinks, settingsLink].find((l) => isLinkActive(pathname, l.href))

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-its-border bg-white/90 px-4 backdrop-blur md:px-6 lg:px-8">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center text-its-dark transition-colors hover:bg-its-light lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] border-0 p-0 [&>button]:text-white">
          <SheetTitle className="sr-only">Menu de l’administration</SheetTitle>
          <AdminSidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-gray">Administration</p>
        <p className="truncate font-display text-lg font-bold leading-tight text-its-dark">
          {current?.label ?? 'ITS Équipement'}
        </p>
      </div>
    </header>
  )
}
