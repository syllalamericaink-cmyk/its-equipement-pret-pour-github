'use client'

import Link from 'next/link'
import { Home, LayoutGrid, FileText, ShoppingCart, Phone } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { usePathname } from 'next/navigation'

/**
 * Barre d'onglets fixe en bas d'écran — navigation principale mobile
 * (hidden au-delà de md). Onglet « Devis » au centre.
 *
 * Le carré lime (indicateur actif) GLISSE de l'onglet cliqué à l'autre
 * au lieu de rester figé sur Devis : il se déplace en douceur vers
 * l'onglet correspondant à la page affichée.
 */

const TABS = [
  {
    href: '/',
    label: 'Accueil',
    icon: Home,
    isActive: (p: string) => p === '/',
  },
  {
    href: '/produits',
    label: 'Univers',
    icon: LayoutGrid,
    isActive: (p: string) => p.startsWith('/produits') || p.startsWith('/categories'),
  },
  {
    href: '/demande-devis',
    label: 'Devis',
    icon: FileText,
    isActive: (p: string) =>
      p.startsWith('/demande-devis') || p.startsWith('/devis') || p.startsWith('/quote'),
  },
  {
    href: '/panier',
    label: 'Panier',
    icon: ShoppingCart,
    isActive: (p: string) => p.startsWith('/panier') || p.startsWith('/commande'),
  },
  {
    href: '/contact',
    label: 'Contact',
    icon: Phone,
    isActive: (p: string) => p.startsWith('/contact'),
  },
]

export function PublicTabs() {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const pathname = usePathname()

  const activeIndex = TABS.findIndex((t) => t.isActive(pathname))

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-its-border bg-white md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative grid grid-cols-5">
        {/* Carré lime glissant — indicateur de l'onglet actif */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 z-0 h-14 w-14 -translate-y-4 rounded-[4px] bg-its-lime ring-4 ring-white transition-[left,opacity] duration-300 ease-out ${
            activeIndex >= 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ left: `calc(${activeIndex >= 0 ? activeIndex : 0} * 20% + 10% - 28px)` }}
        />

        {TABS.map((tab, index) => {
          const Icon = tab.icon
          const active = index === activeIndex
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              aria-label={`${tab.label}${tab.label === 'Panier' && itemCount > 0 ? ` (${itemCount} articles)` : ''}`}
              className={`relative z-10 flex min-h-[64px] flex-col items-center gap-0.5 pt-1.5 text-[11px] font-medium transition-colors ${
                active ? 'text-its-dark' : 'text-its-gray hover:text-its-dark'
              }`}
            >
              <span className="relative">
                <Icon className="h-6 w-6" />
                {tab.label === 'Panier' && itemCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center bg-its-dark px-1 text-[10px] font-bold text-its-lime">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
