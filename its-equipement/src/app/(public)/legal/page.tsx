import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Mentions légales | ITS Équipement',
  description: "Mentions légales du site ITS Équipement : informations sur l'éditeur, l'hébergeur et les conditions d'utilisation du site.",
  alternates: { canonical: '/legal' },
  openGraph: {
    title: 'Mentions légales | ITS Équipement',
    description: "Mentions légales du site ITS Équipement : informations sur l'éditeur, l'hébergeur et les conditions d'utilisation du site.",
    url: '/legal',
  },
}

export default function MentionsLegalesPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-br from-muted/80 via-background to-muted/40">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Mentions légales
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Informations légales relatives au site ITS Équipement
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Éditeur du site</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Le site ITS Équipement est édité par ITSchool &amp; Dynamic Group,
                  société de droit ivoirien dont le siège social est situé au
                  Cocody 2 Plateaux, Cité Sanon — Abidjan, Côte d&apos;Ivoire.
                </p>
                <p>
                  Téléphone : +225 07 79 07 45 47
                  <br />
                  Email : contact@itschoolci.com
                </p>
                <p>
                  Directeur de la publication : le représentant légal de
                  ITSchool &amp; Dynamic Group.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Hébergement du site</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133,
                  Covina, CA 91723, États-Unis —{' '}
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    vercel.com
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Propriété intellectuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  L&apos;ensemble des éléments constituant le site (textes, images,
                  logos, marques, chartes graphiques) est la propriété exclusive de
                  ITSchool &amp; Dynamic Group ou de ses partenaires. Toute
                  reproduction, représentation ou exploitation, totale ou partielle,
                  sans autorisation écrite préalable est interdite et constituerait
                  une contrefaçon.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Données personnelles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  Les informations communiquées via les formulaires du site (demande
                  de devis, contact, commande) sont utilisées uniquement pour
                  traiter votre demande et établir la relation commerciale. Elles ne
                  sont jamais revendues à des tiers. Conformément à la loi
                  ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection
                  des données à caractère personnel, vous disposez d&apos;un droit
                  d&apos;accès, de rectification et d&apos;opposition sur vos
                  données. Pour l&apos;exercer, contactez-nous à
                  contact@itschoolci.com.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Conditions d&apos;utilisation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  L&apos;utilisation du site implique l&apos;acceptation des
                  conditions générales de vente, consultables à tout moment sur la
                  page dédiée. L&apos;éditeur s&apos;efforce d&apos;assurer
                  l&apos;exactitude des informations diffusées mais ne saurait être
                  tenu responsable des erreurs, omissions ou indisponibilités
                  temporaires du site.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
