'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu, ShoppingCart } from 'lucide-react'
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

const navLinks = [
  { href: '/', label: 'Accueil' },
  { href: '/produits', label: 'Catalogue' },
  { href: '/demande-devis', label: 'Demander un devis' },
]

function CartIcon() {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  return (
    <Link
      href="/panier"
      className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-accent"
      aria-label={`Panier${itemCount > 0 ? ` (${itemCount} articles)` : ''}`}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:h-16">
        <Link href="/" className="flex items-center gap-2.5 min-h-[44px]">
          <Image
            src="/logo-its-equipement.jpg"
            alt="ITS Équipement"
            width={36}
            height={36}
            className="rounded-md object-contain"
          />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight sm:text-lg leading-tight">ITS Équipement</span>
            <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">EPI & EPC</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-accent min-h-[44px] flex items-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <CartIcon />
          <Button asChild size="default">
            <Link href="/demande-devis" className="min-h-[44px]">Demander un devis</Link>
          </Button>
        </div>

        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label="Ouvrir le menu de navigation">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[360px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <Image
                    src="/logo-its-equipement.jpg"
                    alt="ITS Équipement"
                    width={28}
                    height={28}
                    className="rounded-md object-contain"
                  />
                  ITS Équipement
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" role="navigation" aria-label="Navigation mobile">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-accent min-h-[44px]"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/panier"
                    className="flex items-center gap-2.5 px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-accent min-h-[44px]"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Panier
                  </Link>
                </SheetClose>
                <div className="pt-3">
                  <SheetClose asChild>
                    <Button asChild className="w-full min-h-[44px]">
                      <Link href="/demande-devis">Demander un devis</Link>
                    </Button>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
