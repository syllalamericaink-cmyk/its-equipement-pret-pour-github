import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import { PublicTabs } from '@/components/layout/public-tabs'
import { QuickCart } from '@/components/layout/quick-cart'
import { CartHydration } from '@/components/layout/cart-hydration'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="its-public min-h-screen flex flex-col bg-background text-foreground">
      {/* Réhydratation du panier après montage (zéro mismatch SSR) */}
      <CartHydration />
      {/* Lien d'évitement (maquette v5) : première tabulation, saute au contenu */}
      <a
        href="#contenu-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:bg-its-dark focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu
      </a>
      <PublicHeader />
      <main id="contenu-principal" className="flex-1 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>
      <PublicFooter />
      <PublicTabs />
      {/* Feuille du panier rapide + mini-barre « N produits dans ma demande » */}
      <QuickCart />
    </div>
  )
}
