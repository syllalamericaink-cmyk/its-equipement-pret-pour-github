'use client'

import Link from 'next/link'
import { ArrowRight, Menu, ShoppingCart } from 'lucide-react'
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
import { CONTACT_PHONE, CONTACT_EMAIL } from '@/constants'

const navLinks = [
  { href: '/#categories', label: 'Catégories' },
  { href: '/produits', label: 'Produits' },
  { href: '/#personnalisation', label: 'Personnalisation' },
  { href: '/a-propos', label: 'Notre méthode' },
  { href: '/contact', label: 'Contact' },
]

function CartIcon() {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  return (
    <Link
      href="/panier"
      className="relative flex h-11 w-11 items-center justify-center text-its-dark transition-colors hover:bg-its-light"
      aria-label={`Panier${itemCount > 0 ? ` (${itemCount} articles)` : ''}`}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-its-dark px-1 text-[10px] font-bold text-white">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}

function LogoMark({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const box = size === 'md' ? 'h-11 w-11 text-xl' : 'h-9 w-9 text-base'
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center bg-its-lime font-display font-bold tracking-tight text-its-dark`}
      aria-hidden="true"
    >
      ITS
    </span>
  )
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full" role="banner">
      {/* Barre supérieure noire */}
      <div className="bg-its-dark text-white">
        <div className="container mx-auto flex h-9 items-center justify-between gap-4 px-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/85 truncate">
            Équipement professionnel <span className="mx-1 text-its-lime">•</span> Abidjan &amp; Côte d’Ivoire
          </p>
          <div className="flex items-center gap-5 text-[12px] font-semibold text-white/85">
            <a
              href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
              className="hidden transition-colors hover:text-its-lime sm:block"
            >
              {CONTACT_PHONE}
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="hidden transition-colors hover:text-its-lime md:block"
            >
              {CONTACT_EMAIL}
            </a>
            <a
              href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
              className="text-its-lime sm:hidden"
              aria-label={`Appeler ${CONTACT_PHONE}`}
            >
              Appeler
            </a>
          </div>
        </div>
      </div>

      {/* Barre principale */}
      <div className="border-b border-its-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:h-[72px]">
          <Link href="/" className="flex items-center gap-3" aria-label="ITS Équipement — Accueil">
            <LogoMark />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight text-its-dark sm:text-xl">
                ITS ÉQUIPEMENT
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-its-gray">
                Protection • Travail • Marquage
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" role="navigation" aria-label="Navigation principale">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-[44px] items-center px-3 text-sm font-medium text-its-dark transition-colors hover:text-its-gray"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <CartIcon />
            <Button
              asChild
              className="h-11 bg-its-lime px-5 text-sm font-semibold text-its-dark shadow-none transition-colors hover:bg-its-lime-dark"
            >
              <Link href="/demande-devis">
                Demander un devis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <CartIcon />
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] text-its-dark hover:bg-its-light"
                  aria-label="Ouvrir le menu de navigation"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[360px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    <LogoMark size="sm" />
                    <span className="font-display text-base font-bold tracking-tight">ITS ÉQUIPEMENT</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col px-4" role="navigation" aria-label="Navigation mobile">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className="flex min-h-[44px] items-center px-3 text-sm font-medium text-its-dark transition-colors hover:bg-its-light"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      href="/panier"
                      className="flex min-h-[44px] items-center gap-2.5 px-3 text-sm font-medium text-its-dark transition-colors hover:bg-its-light"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Panier
                    </Link>
                  </SheetClose>
                  <div className="pt-4">
                    <SheetClose asChild>
                      <Button asChild className="h-12 w-full bg-its-lime text-sm font-semibold text-its-dark hover:bg-its-lime-dark">
                        <Link href="/demande-devis">
                          Demander un devis
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </SheetClose>
                  </div>
                  <div className="mt-6 space-y-1 border-t border-its-border pt-4 text-[13px] text-its-gray">
                    <p>{CONTACT_PHONE}</p>
                    <p>{CONTACT_EMAIL}</p>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
