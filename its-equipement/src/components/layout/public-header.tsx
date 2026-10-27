'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createElement, useEffect, useRef, useState } from 'react'
import { ArrowRight, FileText, LayoutGrid, Menu, Palette, Phone, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { useCartStore } from '@/stores/cart-store'
import { openQuickCart } from '@/components/layout/quick-cart'
import { SearchBox } from '@/components/layout/search-box'
import { iconFor } from '@/components/public/product-image'
import { publicFetch } from '@/lib/public-api'
import { CONTACT_PHONE } from '@/constants'

interface NavCategory {
  id: string
  name: string
  slug: string
  _count?: { products: number }
}

const TEL_HREF = `tel:${CONTACT_PHONE.replace(/\s/g, '')}`

function useCartCount() {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
}

/** Panier : ouvre le panier rapide, d'où l'on commande ou demande un devis. */
function CartButton({ withLabel = false }: { withLabel?: boolean }) {
  const itemCount = useCartCount()
  return (
    <button
      type="button"
      onClick={openQuickCart}
      className="relative flex h-11 items-center gap-2 px-2.5 text-its-dark transition-colors hover:bg-its-light"
      aria-label={`Panier${itemCount > 0 ? ` (${itemCount} articles)` : ''} — commander`}
    >
      <span className="relative">
        <ShoppingCart className="h-6 w-6" aria-hidden="true" />
        {itemCount > 0 && (
          <span
            key={itemCount}
            className="its-drop absolute -right-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-its-lime px-1 text-[10px] font-bold text-its-dark ring-2 ring-white"
          >
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </span>
      {withLabel && <span className="text-sm font-semibold">Panier</span>}
    </button>
  )
}

function LogoMark({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const box = size === 'md' ? 'h-11 w-11' : 'h-9 w-9'
  return (
    <img
      src="/logo-its-equipement.jpg"
      alt=""
      className={`${box} shrink-0 rounded-md object-cover`}
      aria-hidden="true"
    />
  )
}

export function PublicHeader() {
  const pathname = usePathname()
  const [categories, setCategories] = useState<NavCategory[]>([])

  useEffect(() => {
    let alive = true
    publicFetch<NavCategory[]>('/api/public/categories').then((res) => {
      if (alive && res.success && res.data) {
        setCategories(res.data.filter((c) => (c._count?.products ?? 0) > 0).slice(0, 7))
      }
    })
    return () => {
      alive = false
    }
  }, [])

  /* ---------- Recherche mobile : se replie en descendant, revient en remontant ---------- */
  const [searchHidden, setSearchHidden] = useState(false)
  const hiddenRef = useRef(false)

  useEffect(() => {
    let lastY = window.scrollY
    let acc = 0
    let hiddenAtY = Infinity
    let expandFloor = -Infinity
    let lockedUntil = 0
    const onScroll = () => {
      const y = window.scrollY
      const dy = y - lastY
      lastY = y
      if (Date.now() < lockedUntil) return
      acc = dy > 0 ? acc + dy : 0
      if (hiddenRef.current) {
        if (y <= 140 || y < hiddenAtY - 100) {
          hiddenRef.current = false
          setSearchHidden(false)
          expandFloor = y
          lockedUntil = Date.now() + 200
        }
      } else if (y > 140 && acc > 40 && y > expandFloor + 120) {
        hiddenRef.current = true
        setSearchHidden(true)
        hiddenAtY = y
        acc = 0
        lockedUntil = Date.now() + 200
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-50 w-full shadow-sm" role="banner" onFocusCapture={() => setSearchHidden(false)}>
      {/* Barre supérieure */}
      <div className="bg-its-dark text-white">
        <div className="mx-auto flex h-8 max-w-[1320px] items-center justify-between gap-4 px-4">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-white/85">
            Livraison partout en Côte d’Ivoire <span className="mx-1 text-its-lime">•</span> Paiement à la livraison
          </p>
          <a
            href={TEL_HREF}
            className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-its-lime transition-colors hover:text-white"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Devis rapide :</span> {CONTACT_PHONE}
          </a>
        </div>
      </div>

      {/* Barre principale : logo | grande recherche | panier + devis */}
      <div className="border-b border-its-border bg-white">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 lg:h-[76px] lg:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="ITS Équipement — Accueil">
            <LogoMark />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight text-its-dark sm:text-xl">
                ITS ÉQUIPEMENT
              </span>
              <span className="mt-1 hidden text-[9px] font-bold uppercase tracking-[0.22em] text-its-gray sm:block">
                Protection • Travail • Marquage
              </span>
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 md:block">
            <SearchBox variant="desktop" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0 lg:gap-2">
            <a
              href={TEL_HREF}
              className="hidden h-11 items-center gap-2 px-2.5 text-its-dark transition-colors hover:bg-its-light xl:flex"
            >
              <Phone className="h-5 w-5" aria-hidden="true" />
              <span className="flex flex-col text-left leading-tight">
                <span className="text-[11px] text-its-gray">Besoin d’aide ?</span>
                <span className="text-sm font-semibold">Appeler</span>
              </span>
            </a>
            <div className="hidden md:block">
              <CartButton withLabel />
            </div>
            <div className="md:hidden">
              <CartButton />
            </div>
            <Button
              asChild
              className="hidden h-11 bg-its-lime px-5 text-sm font-semibold text-its-dark shadow-none transition-colors hover:bg-its-lime-dark lg:inline-flex"
            >
              <Link href="/demande-devis">
                Demander un devis
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>

            {/* Menu mobile */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] text-its-dark hover:bg-its-light lg:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] overflow-y-auto sm:w-[360px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    <LogoMark size="sm" />
                    <span className="font-display text-base font-bold tracking-tight">ITS ÉQUIPEMENT</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col px-4" aria-label="Navigation mobile">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-its-gray">Catégories</p>
                  {categories.map((c) => (
                    <SheetClose asChild key={c.id}>
                      <Link
                        href={`/categories/${c.slug}`}
                        className="flex min-h-[44px] items-center gap-3 px-3 text-sm font-medium text-its-dark transition-colors hover:bg-its-light"
                      >
                        {createElement(iconFor([c.name]), { className: 'h-4 w-4 text-its-gray', 'aria-hidden': true })}
                        {c.name}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      href="/produits?personalizable=1"
                      className="flex min-h-[44px] items-center gap-3 px-3 text-sm font-medium text-its-dark transition-colors hover:bg-its-light"
                    >
                      <Palette className="h-4 w-4 text-its-gray" aria-hidden="true" />
                      Personnalisables
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/produits"
                      className="flex min-h-[44px] items-center gap-3 px-3 text-sm font-semibold text-its-dark transition-colors hover:bg-its-light"
                    >
                      <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                      Tout le catalogue
                    </Link>
                  </SheetClose>
                  <div className="mt-4 grid gap-2 border-t border-its-border pt-4">
                    <SheetClose asChild>
                      <Button asChild className="h-12 w-full bg-its-dark text-sm font-semibold text-white hover:bg-its-panel">
                        <Link href="/panier">
                          <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                          Mon panier et commande
                        </Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="h-12 w-full bg-its-lime text-sm font-semibold text-its-dark hover:bg-its-lime-dark">
                        <Link href="/demande-devis">
                          <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                          Demander un devis
                        </Link>
                      </Button>
                    </SheetClose>
                    <a
                      href={TEL_HREF}
                      className="flex h-12 items-center justify-center gap-2 border-[1.5px] border-its-dark text-sm font-semibold text-its-dark"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" /> Appeler {CONTACT_PHONE}
                    </a>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Barre des catégories (ordinateur) */}
      <nav
        aria-label="Catégories principales"
        className="hidden border-b border-its-border bg-white lg:block"
      >
        <ul className="mx-auto flex h-11 max-w-[1320px] items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li>
            <Link
              href="/produits"
              className={`flex h-11 items-center gap-2 whitespace-nowrap px-3 text-sm font-semibold transition-colors hover:bg-its-cream ${
                isActive('/produits') ? 'text-its-dark underline decoration-its-lime decoration-[3px] underline-offset-[13px]' : 'text-its-dark'
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Tous les produits
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/categories/${c.slug}`}
                className={`flex h-11 items-center whitespace-nowrap px-3 text-sm transition-colors hover:bg-its-cream ${
                  isActive(`/categories/${c.slug}`)
                    ? 'font-semibold text-its-dark underline decoration-its-lime decoration-[3px] underline-offset-[13px]'
                    : 'text-its-dark'
                }`}
              >
                {c.name}
              </Link>
            </li>
          ))}
          <li className="ml-auto">
            <Link
              href="/produits?personalizable=1"
              className="flex h-11 items-center gap-2 whitespace-nowrap px-3 text-sm font-semibold text-its-dark transition-colors hover:bg-its-cream"
            >
              <Palette className="h-4 w-4" aria-hidden="true" />
              Personnalisables
            </Link>
          </li>
        </ul>
      </nav>

      {/* Recherche mobile : se replie au défilement vers le bas */}
      <div
        className={`overflow-visible border-its-border bg-its-dark transition-all duration-300 md:hidden ${
          searchHidden ? 'pointer-events-none max-h-0 overflow-hidden border-b-0' : 'max-h-[72px] border-b'
        }`}
        aria-hidden={searchHidden}
      >
        <div className="p-2">
          <SearchBox variant="mobile" tabIndex={searchHidden ? -1 : undefined} />
        </div>
      </div>
    </header>
  )
}
