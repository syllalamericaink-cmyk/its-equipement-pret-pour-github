'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  Users,
  Bell,
  Settings,
  LogOut,
  Inbox,
  Mail,
  Images,
  ChevronDown,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminPath } from '@/lib/admin-path'

/* ============================== Navigation ==============================
 * Les liens du quotidien en haut, le reste dans « Avancé » (replié).
 * ====================================================================== */

export interface AdminNavLink {
  href: string
  label: string
  icon: LucideIcon
}

export const mainLinks: AdminNavLink[] = [
  { href: adminPath('/dashboard'), label: 'Tableau de bord', icon: LayoutDashboard },
  { href: adminPath('/commandes'), label: 'Commandes', icon: Inbox },
  { href: adminPath('/quote-requests'), label: 'Demandes de devis', icon: ClipboardList },
  { href: adminPath('/messages'), label: 'Messages', icon: Mail },
  { href: adminPath('/products'), label: 'Produits', icon: Package },
  { href: adminPath('/categories'), label: 'Catégories', icon: FolderTree },
  { href: adminPath('/hero'), label: "Bannières d'accueil", icon: Images },
]

export const advancedLinks: AdminNavLink[] = [
  { href: adminPath('/clients'), label: 'Clients', icon: Users },
  { href: adminPath('/notifications'), label: 'Notifications', icon: Bell },
]

export const settingsLink: AdminNavLink = { href: adminPath('/settings'), label: 'Paramètres', icon: Settings }

export function isLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

function NavLink({
  link,
  isActive,
  onNavigate,
}: {
  link: AdminNavLink
  isActive: boolean
  onNavigate?: () => void
}) {
  const Icon = link.icon
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
        isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
      )}
    >
      {isActive && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-1 bg-its-lime" />}
      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-its-lime' : '')} aria-hidden="true" />
      <span className="truncate">{link.label}</span>
    </Link>
  )
}

/** Barre latérale sombre de l'administration (fixe sur ordinateur, panneau sur mobile). */
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const advancedActive = advancedLinks.some((l) => isLinkActive(pathname, l.href))
  const [advancedOpen, setAdvancedOpen] = useState(advancedActive)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push(adminPath('/login'))
  }

  const initials = (session?.user?.name || 'A')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex h-full flex-col bg-its-dark text-white">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <img src="/logo-its-equipement.jpg" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded object-cover" />
        <span className="flex flex-col leading-tight">
          <span className="font-display text-base font-bold tracking-tight">ITS ÉQUIPEMENT</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-its-lime">Administration</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3" aria-label="Administration">
        <p className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Au quotidien</p>
        <div className="flex flex-col">
          {mainLinks.map((link) => (
            <NavLink key={link.href} link={link} isActive={isLinkActive(pathname, link.href)} onNavigate={onNavigate} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="mt-4 flex w-full items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-white/70"
        >
          Avancé
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', advancedOpen ? '' : '-rotate-90')} aria-hidden="true" />
          {!advancedOpen && advancedActive && <span aria-hidden="true" className="ml-auto h-2 w-2 rounded-full bg-its-lime" />}
        </button>
        {advancedOpen && (
          <div className="flex flex-col">
            {advancedLinks.map((link) => (
              <NavLink key={link.href} link={link} isActive={isLinkActive(pathname, link.href)} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <NavLink link={settingsLink} isActive={isLinkActive(pathname, settingsLink.href)} onNavigate={onNavigate} />
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="h-[18px] w-[18px]" aria-hidden="true" />
          Voir le site
        </a>
        {session?.user && (
          <div className="mt-2 flex items-center gap-3 bg-white/5 p-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-its-lime text-sm font-bold text-its-dark">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{session.user.name}</span>
              <span className="block truncate text-xs text-white/50">{session.user.email}</span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="grid h-9 w-9 shrink-0 place-items-center text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
