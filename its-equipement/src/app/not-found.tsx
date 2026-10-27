import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import { StatusScreen } from '@/components/public/status-screen'
import { QuickCart } from '@/components/layout/quick-cart'
import { CartHydration } from '@/components/layout/cart-hydration'

export default function NotFound() {
  return (
    <div className="its-public flex min-h-screen flex-col bg-background text-foreground">
      <CartHydration />
      <PublicHeader />
      <main className="flex-1">
        <StatusScreen
          code="404"
          title="Page introuvable"
          message="Cette page n’existe pas ou a été déplacée. Cherchez un produit ou parcourez le catalogue."
        />
      </main>
      <PublicFooter />
      <QuickCart />
    </div>
  )
}
