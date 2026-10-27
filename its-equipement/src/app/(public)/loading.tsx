import { HardHat } from 'lucide-react'

// Affiché pendant le chargement d'une page : barre de progression animée,
// casque ITS et squelette de grille produits (la mise en page ne « saute » pas).
export default function PublicLoading() {
  return (
    <div className="bg-its-cream" role="status" aria-live="polite">
      <div className="fixed inset-x-0 top-0 z-[70] h-1 overflow-hidden bg-its-dark/10" aria-hidden="true">
        <div className="its-progress h-full w-full bg-its-lime" />
      </div>
      <span className="sr-only">Chargement de la page…</span>

      <div className="mx-auto max-w-[1320px] px-3 py-6 lg:px-4">
        <div className="mb-6 flex items-center gap-3">
          <span className="its-pulse-soft grid h-11 w-11 place-items-center bg-its-dark">
            <HardHat className="h-6 w-6 text-its-lime" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse bg-its-border" />
            <div className="h-3 w-32 animate-pulse bg-its-border" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="border border-its-border bg-white p-2" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="aspect-square animate-pulse bg-its-light" />
              <div className="mt-2 h-3 w-4/5 animate-pulse bg-its-light" />
              <div className="mt-1.5 h-4 w-1/2 animate-pulse bg-its-light" />
              <div className="mt-2 h-9 animate-pulse bg-its-light" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
