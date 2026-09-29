'use client'

import Link from 'next/link'
import { Home, LayoutGrid, FileText, ShoppingCart, Phone } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { usePathname } from 'next/navigation'

/**
 * Barre d'onglets fixe en bas d'écran — navigation principale mobile,
 * conformément à la maquette mobile v3 (hidden au-delà de md).
 * Onglet « Devis » central surélevé en lime.
 */
export function PublicTabs() {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const pathname = usePathname()

  const isActive = (href: string) => {
    const base = href.replace(/#.*$/, '')
    if (base === '/') return pathname === '/'
    return pathname.startsWith(base)
  }

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-its-border bg-white md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5">
        <TabLink href="/" active={isActive('/')} label="Accueil">
          <Home className="h-6 w-6" />
        </TabLink>

        <TabLink href="/produits" active={isActive('/produits')} label="Univers">
          <LayoutGrid className="h-6 w-6" />
        </TabLink>

        {/* Onglet central surélevé — Devis */}
        <div className="relative flex justify-center">
          <Link
            href="/demande-devis"
            className="-mt-6 flex h-14 w-14 flex-col items-center justify-center bg-its-lime text-its-dark ring-4 ring-white transition-colors hover:bg-its-lime-dark"
            aria-label="Demander un devis"
          >
            <FileText className="h-6 w-6" />
          </Link>
          <span className="pointer-events-none absolute bottom-1.5 text-[11px] font-semibold text-its-dark">
            Devis
          </span>
        </div>

        <Link
          href="/panier"
          className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            isActive('/panier') ? 'text-its-dark' : 'text-its-gray hover:text-its-dark'
          }`}
          aria-label={`Panier${itemCount > 0 ? ` (${itemCount} articles)` : ''}`}
        >
          <span className="relative">
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center bg-its-lime px-1 text-[10px] font-bold text-its-dark">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </span>
          Panier
        </Link>

        <TabLink href="/contact" active={isActive('/contact')} label="Contact">
          <Phone className="h-6 w-6" />
        </TabLink>
      </div>
    </nav>
  )
}

function TabLink({
  href,
  active,
  label,
  children,
}: {
  href: string
  active: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
        active ? 'text-its-dark' : 'text-its-gray hover:text-its-dark'
      }`}
    >
      {children}
      {label}
    </Link>
  )
}
