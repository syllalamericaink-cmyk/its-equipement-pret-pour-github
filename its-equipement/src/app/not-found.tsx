import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HardHat } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <HardHat className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-primary">Erreur 404</p>
        <h1 className="text-3xl font-bold tracking-tight">Page introuvable</h1>
        <p className="max-w-md text-muted-foreground">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
          Retournez à l&apos;accueil ou consultez notre catalogue.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="min-h-[44px]">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/produits">Voir le catalogue</Link>
        </Button>
      </div>
    </main>
  )
}
