import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, MapPin } from 'lucide-react'
import { CONTACT_PHONE, CONTACT_EMAIL, CONTACT_ADDRESS, CONTACT_WHATSAPP } from '@/constants'

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t bg-background" role="contentinfo">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Image
                src="/logo-its-equipement.jpg"
                alt="ITS Équipement"
                width={32}
                height={32}
                className="rounded-md object-contain"
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm">ITS Équipement</span>
                <span className="text-[10px] text-muted-foreground">ITSchool & Dynamic Group</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Votre partenaire EPI & EPC en Côte d'Ivoire. Équipements de protection individuelle et collectifs, vêtements de travail personnalisés.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Navigation</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/produits" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/demande-devis" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                  Demander un devis
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Entreprise</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/a-propos" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                  À propos
                </Link>
              </li>
              <li>
                <Link href="/livraison" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                  Livraison
                </Link>
              </li>

            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h3 className="mb-3 text-sm font-semibold">Contacts</h3>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="hover:text-foreground transition-colors">
                  {CONTACT_PHONE}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground transition-colors">
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{CONTACT_ADDRESS}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ITSchool & Dynamic Group — ITS Équipement. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}
