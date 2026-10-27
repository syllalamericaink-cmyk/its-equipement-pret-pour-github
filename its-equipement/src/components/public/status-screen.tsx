import Link from 'next/link'
import { HardHat, Phone, RotateCcw, Search } from 'lucide-react'
import { CONTACT_PHONE } from '@/constants'

/**
 * Écran plein (404 / erreur) aux couleurs ITS : casque qui « tombe », code en
 * grand, et toujours une porte de sortie (réessayer, catalogue, téléphone).
 */
export function StatusScreen({
  code,
  title,
  message,
  onRetry,
}: {
  code: string
  title: string
  message: string
  onRetry?: () => void
}) {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-its-cream px-4 py-16">
      {/* Bandes de chantier en fond */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3 opacity-80"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #151A1D 0 18px, #D8F24A 18px 36px)' }}
      />
      <div className="relative w-full max-w-xl text-center">
        <div className="its-drop mx-auto grid h-24 w-24 place-items-center bg-its-dark shadow-xl">
          <HardHat className="h-12 w-12 text-its-lime" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className="mt-6 font-display text-6xl font-bold leading-none tracking-tight text-its-dark sm:text-7xl">{code}</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-its-dark sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-its-gray">{message}</p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 bg-its-lime px-6 font-semibold text-its-dark transition-colors hover:bg-its-lime-dark"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Réessayer
            </button>
          )}
          <Link
            href="/produits"
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 px-6 font-semibold transition-colors ${
              onRetry
                ? 'border-[1.5px] border-its-dark text-its-dark hover:bg-white'
                : 'bg-its-lime text-its-dark hover:bg-its-lime-dark'
            }`}
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Voir le catalogue
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center justify-center px-6 font-semibold text-its-dark underline decoration-its-lime decoration-[3px] underline-offset-4"
          >
            Retour à l’accueil
          </Link>
        </div>

        <a
          href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
          className="mt-8 inline-flex items-center gap-2 text-sm text-its-gray transition-colors hover:text-its-dark"
        >
          <Phone className="its-wiggle h-4 w-4" aria-hidden="true" />
          Besoin d’aide ? Appelez le {CONTACT_PHONE}
        </a>
      </div>
    </section>
  )
}
