import Link from 'next/link'
import { CONTACT_PHONE, CONTACT_EMAIL, CONTACT_ADDRESS } from '@/constants'

const offreLinks = [
  { href: '/produits', label: 'EPI' },
  { href: '/produits', label: 'EPC' },
  { href: '/produits', label: 'Vêtements de travail' },
  { href: '/produits', label: 'Chaussures' },
  { href: '/#personnalisation', label: 'Personnalisation' },
]

const entrepriseLinks = [
  { href: '/a-propos', label: 'Notre méthode' },
  { href: '/livraison', label: 'Zones de livraison' },
  { href: '/demande-devis', label: 'Demande de devis' },
  { href: '/contact', label: 'Contact' },
]

function FooterLegal() {
  return (
    <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
      <p>© {new Date().getFullYear()} ITS Équipement. Tous droits réservés.</p>
      <div className="flex items-center gap-6">
        <Link href="/legal" className="transition-colors hover:text-white">
          Mentions légales
        </Link>
        <Link href="/conditions" className="transition-colors hover:text-white">
          Politique de confidentialité
        </Link>
      </div>
    </div>
  )
}

/** Version mobile : accordéons (maquette mobile v3) */
function FooterAccordions() {
  return (
    <div className="md:hidden">
      <details className="border-b border-white/10">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
          Offre
          <span aria-hidden="true" className="text-lg text-white/60">
            +
          </span>
        </summary>
        <ul className="pb-4">
          {offreLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="flex min-h-[40px] items-center text-sm text-white/75">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>

      <details className="border-b border-white/10">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
          Entreprise
          <span aria-hidden="true" className="text-lg text-white/60">
            +
          </span>
        </summary>
        <ul className="pb-4">
          {entrepriseLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="flex min-h-[40px] items-center text-sm text-white/75">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>

      <details className="border-b border-white/10" open>
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
          Nous joindre
          <span aria-hidden="true" className="text-lg text-white/60">
            +
          </span>
        </summary>
        <div className="space-y-2 pb-4">
          <p>
            <a
              href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
              className="font-display text-2xl font-bold tracking-tight text-white"
            >
              {CONTACT_PHONE}
            </a>
          </p>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-white/75">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="text-sm text-white/60">{CONTACT_ADDRESS}</p>
        </div>
      </details>
    </div>
  )
}

/** Version desktop : colonnes (design Figma conservé) */
function FooterColumns() {
  return (
    <div className="hidden grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-10 md:grid">
      {/* Identité */}
      <div>
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center bg-its-lime font-display text-xl font-bold tracking-tight text-its-dark"
            aria-hidden="true"
          >
            ITS
          </span>
          <span className="font-display text-xl font-bold tracking-tight">ITS ÉQUIPEMENT</span>
        </div>
        <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
          Équipements de protection individuelle et collective, vêtements de travail et
          personnalisation pour les professionnels en Côte d’Ivoire.
        </p>
      </div>

      {/* Offre */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-its-lime">Offre</h3>
        <ul className="mt-4 space-y-2.5">
          {offreLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="flex min-h-[32px] items-center text-sm text-white/80 transition-colors hover:text-its-lime"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Entreprise */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-its-lime">Entreprise</h3>
        <ul className="mt-4 space-y-2.5">
          {entrepriseLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="flex min-h-[32px] items-center text-sm text-white/80 transition-colors hover:text-its-lime"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Contact direct */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-its-lime">Contact direct</h3>
        <p className="mt-4">
          <a
            href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
            className="font-display text-2xl font-bold tracking-tight text-white transition-colors hover:text-its-lime"
          >
            {CONTACT_PHONE}
          </a>
        </p>
        <p className="mt-2">
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-white/80 transition-colors hover:text-its-lime">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-2 text-sm text-white/60">{CONTACT_ADDRESS}</p>
      </div>
    </div>
  )
}

export function PublicFooter() {
  return (
    <footer className="bg-its-dark text-white" role="contentinfo">
      <div className="container mx-auto px-4 pb-8 pt-10 sm:pt-14">
        {/* Mobile : identité compacte + accordéons */}
        <div className="mb-6 flex items-center gap-3 md:hidden">
          <span
            className="flex h-9 w-9 items-center justify-center bg-its-lime font-display text-base font-bold tracking-tight text-its-dark"
            aria-hidden="true"
          >
            ITS
          </span>
          <span className="font-display text-base font-bold tracking-tight">ITS ÉQUIPEMENT</span>
        </div>
        <FooterAccordions />
        <FooterColumns />
        <FooterLegal />
      </div>
    </footer>
  )
}
