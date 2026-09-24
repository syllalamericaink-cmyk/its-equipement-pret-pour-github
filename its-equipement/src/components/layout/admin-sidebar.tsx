'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  HardHat,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Produits', icon: Package },
  { href: '/admin/categories', label: 'Catégories', icon: FolderTree },
  { href: '/admin/quote-requests', label: 'Demandes de devis', icon: ClipboardList },
  { href: '/admin/commandes', label: 'Commandes', icon: Inbox },
  { href: '/admin/quotes', label: 'Devis', icon: FileText },
  { href: '/admin/orders', label: 'Commandes', icon: ShoppingCart },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/payments', label: 'Paiements', icon: CreditCard },
  { href: '/admin/deliveries', label: 'Livraisons', icon: Truck },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/stocks', label: 'Stocks', icon: Warehouse },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/auth/login')
  }

  return (
    <div className="flex h-full flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <HardHat className="h-6 w-6 text-sidebar-primary" />
        <span className="font-bold text-sidebar-foreground">ITS Équipement</span>
        <span className="ml-auto text-xs text-sidebar-muted-foreground">Admin</span>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            const Icon = link.icon

            return (
              <Tooltip key={link.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden">
                  {link.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
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
