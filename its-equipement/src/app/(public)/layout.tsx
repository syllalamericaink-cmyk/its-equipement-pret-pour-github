import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import { PublicTabs } from '@/components/layout/public-tabs'
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
      <PublicHeader />
      <main className="flex-1 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>
      <PublicFooter />
      <PublicTabs />
    </div>
  )
}
