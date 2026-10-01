'use client'

import Link from 'next/link'
import { Home, LayoutGrid, FileText, ShoppingCart, Phone } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { openQuickCart } from '@/components/layout/quick-cart'

/**
 * Barre d'onglets fixe en bas d'écran — navigation principale mobile
 * (hidden au-delà de md). Onglet « Devis » au centre.
 *
 * Le carré lime (indicateur actif) GLISSE de l'onglet cliqué à l'autre.
 * Sur la page d'accueil, l'onglet actif suit la SECTION visible
 * (Accueil → Produits → Devis → Contact) comme sur la maquette v5.
 * L'onglet « Panier » ouvre la feuille du panier rapide (v5) au lieu
 * de naviguer : la page /panier reste accessible depuis la feuille.
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
    label: 'Produits',
    icon: LayoutGrid,
    isActive: (p: string) => p.startsWith('/produits') || p.startsWith('/categories'),
  },
  {
    href: '/demande-devis',
    label: 'Devis',
    icon: FileText,
    isActive: (p: string) =>
      p.startsWith('/demande-devis') || p.startsWith('/devis'),
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

/** Sections de l'accueil → index de l'onglet correspondant (ordre du défilement). */
const HOME_SECTION_TABS: { id: string; tab: number }[] = [
  { id: 'epi', tab: 1 },
  { id: 'vetements', tab: 1 },
  { id: 'univers', tab: 1 },
  { id: 'personnalisation', tab: 1 },
  { id: 'devis', tab: 2 },
  { id: 'contact', tab: 4 },
]

export function PublicTabs() {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const pathname = usePathname()
  // Sur l'accueil : index d'onglet selon la section visible (sinon null → pathname)
  const [homeTab, setHomeTab] = useState<{ path: string; tab: number } | null>(null)

  useEffect(() => {
    if (pathname !== '/') return
    let lastY: number | null = null
    // Traitement direct (listener passive) : calcul minime, et on évite tout
    // blocage si requestAnimationFrame est suspendu (onglet en arrière-plan).
    const measure = () => {
      const y = window.scrollY
      if (lastY !== null && Math.abs(y - lastY) < 4) return
      lastY = y
      const line = y + window.innerHeight * 0.35
      let current = 0
      for (const { id, tab } of HOME_SECTION_TABS) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= line) current = tab
      }
      setHomeTab({ path: pathname, tab: current })
    }
    const onScroll = () => measure()
    // Première mesure en macro-tâche (ni synchrone dans l'effet, ni dépendante
    // des frames de rendu)
    const t = setTimeout(measure, 0)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', onScroll)
    }
  }, [pathname])

  const sectionTab = homeTab?.path === pathname ? homeTab.tab : null
  const pathnameIndex = TABS.findIndex((t) => t.isActive(pathname))
  const activeIndex = sectionTab ?? pathnameIndex

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
          const isCart = tab.label === 'Panier'

          // L'onglet Panier ouvre la feuille du panier rapide (maquette v5)
          if (isCart) {
            return (
              <button
                key={tab.href}
                type="button"
                onClick={openQuickCart}
                aria-label={`Panier${itemCount > 0 ? ` (${itemCount} articles)` : ''} — ouvrir le panier rapide`}
                aria-current={active ? 'page' : undefined}
                className={`relative z-10 flex min-h-[64px] flex-col items-center gap-0.5 pt-1.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-its-dark' : 'text-its-gray hover:text-its-dark'
                }`}
              >
                <span className="relative">
                  <Icon className="h-6 w-6" />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center bg-its-dark px-1 text-[10px] font-bold text-its-lime">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </button>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 flex min-h-[64px] flex-col items-center gap-0.5 pt-1.5 text-[11px] font-medium transition-colors ${
                active ? 'text-its-dark' : 'text-its-gray hover:text-its-dark'
              }`}
            >
              <span className="relative">
                <Icon className="h-6 w-6" />
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
