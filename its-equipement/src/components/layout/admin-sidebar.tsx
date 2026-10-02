'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  FileText,
  ClipboardList,
  ShoppingCart,
  Users,
  CreditCard,
  Truck,
  Bell,
  Warehouse,
  Settings,
  LogOut,
  Inbox,
  Mail,
  Images,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { adminPath } from '@/lib/admin-path'

/* ============================== Navigation ==============================
 * Volontairement minimaliste : les 7 liens du quotidien en haut,
 * tout le reste regroupé dans « Avancé » (replié par défaut).
 * Toutes les pages restent accessibles, simplement rangées.
 * ====================================================================== */

const mainLinks = [
  { href: adminPath('/dashboard'), label: 'Tableau de bord', icon: LayoutDashboard },
  { href: adminPath('/hero'), label: "Bannières d'accueil", icon: Images },
  { href: adminPath('/products'), label: 'Produits', icon: Package },
  { href: adminPath('/categories'), label: 'Catégories', icon: FolderTree },
  { href: adminPath('/quote-requests'), label: 'Demandes de devis', icon: ClipboardList },
  { href: adminPath('/commandes'), label: 'Commandes', icon: Inbox },
  { href: adminPath('/messages'), label: 'Messages', icon: Mail },
]

const advancedLinks = [
  { href: adminPath('/quotes'), label: 'Devis (ancien flux)', icon: FileText },
  { href: adminPath('/orders'), label: 'Commandes (ancien flux)', icon: ShoppingCart },
  { href: adminPath('/clients'), label: 'Clients', icon: Users },
  { href: adminPath('/payments'), label: 'Paiements', icon: CreditCard },
  { href: adminPath('/deliveries'), label: 'Livraisons', icon: Truck },
  { href: adminPath('/stocks'), label: 'Stocks', icon: Warehouse },
  { href: adminPath('/notifications'), label: 'Notifications', icon: Bell },
]

function NavLink({ link, isActive }: { link: (typeof mainLinks)[number]; isActive: boolean }) {
  const Icon = link.icon
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={link.href}
          className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
            ${isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
        >
          {/* Barre lime : marque l'item actif (charte ITS) */}
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-its-lime"
            />
          )}
          <Icon className={`h-4 w-4 ${isActive ? 'text-its-dark' : ''}`} />
          <span className="truncate">{link.label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="lg:hidden">
        {link.label}
      </TooltipContent>
    </Tooltip>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const advancedActive = advancedLinks.some(
    (l) => pathname === l.href || pathname.startsWith(l.href + '/')
  )

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push(adminPath('/login'))
  }

  return (
    <div className="flex h-full flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        {/* Vrai logo ITS & DG */}
        <img
          src="/logo-its-equipement.jpg"
          alt=""
          aria-hidden="true"
          className="h-8 w-8 shrink-0 rounded object-cover"
        />
        <span className="font-bold text-sidebar-foreground">ITS Équipement</span>
        <span className="ml-auto text-xs text-sidebar-muted-foreground">Admin</span>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {mainLinks.map((link) => (
            <NavLink
              key={link.href}
              link={link}
              isActive={pathname === link.href || pathname.startsWith(link.href + '/')}
            />
          ))}

          {/* ---- Groupe Avancé (replié par défaut) ---- */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            className="mt-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-0' : '-rotate-90'}`}
            />
            Avancé
            {!advancedOpen && advancedActive && (
              <span aria-hidden="true" className="ml-auto h-2 w-2 rounded-full bg-its-lime" />
            )}
          </button>
          {advancedOpen && (
            <div className="ml-3 flex flex-col gap-0.5 border-l border-sidebar-accent pl-2">
              {advancedLinks.map((link) => (
                <NavLink
                  key={link.href}
                  link={link}
                  isActive={pathname === link.href || pathname.startsWith(link.href + '/')}
                />
              ))}
            </div>
          )}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-3">
        {session?.user && (
          <div className="mb-2 rounded-md bg-sidebar-accent/50 px-3 py-2">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-sidebar-muted-foreground truncate">
              {session.user.email}
            </p>
          </div>
        )}
        <Link
          href="/admin/settings"
          className={cn(
            'mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith(adminPath('/settings'))
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
        >
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  )
}
