import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Award,
  HeadphonesIcon,
  Palette,
  ShieldCheck,
  Phone,
  MapPin,
  Truck,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'À propos | ITS Équipement',
  description: "Découvrez ITS Équipement, votre partenaire de confiance en Côte d'Ivoire pour les équipements de protection individuelle (EPI) et les vêtements de travail personnalisés.",
  alternates: { canonical: '/a-propos' },
  openGraph: {
    title: 'À propos | ITS Équipement',
    description: "Découvrez ITS Équipement, votre partenaire de confiance en Côte d'Ivoire pour les équipements de protection individuelle (EPI) et les vêtements de travail personnalisés.",
    url: '/a-propos',
  },
}

export default function AProposPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-br from-muted/80 via-background to-muted/40">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/5" />
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            À propos d&apos;ITS Équipement
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Votre partenaire en Côte d&apos;Ivoire pour les équipements de protection individuelle et vêtements de travail personnalisés
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl space-y-6 text-muted-foreground leading-relaxed">
          <p>
            ITS Équipement est une filiale du groupe ITSchool &amp; Dynamic Group, basée à
            Abidjan, Côte d&apos;Ivoire. Nous sommes spécialisés dans la fourniture
            d&apos;équipements de protection individuelle (EPI), d&apos;équipements de
            protection collective (EPC) et de vêtements de travail professionnels,
            destinés aux entreprises ivoiriennes de tous secteurs d&apos;activité.
          </p>
          <p>
            Nous accompagnons les entreprises, les chantiers, les usines et les
            collectivités dans leur équipement de sécurité. Notre catalogue comprend
            des casques, gants, chaussures de sécurité, gilets haute visibilité,
            vêtements ignifuges, protections auditives et visuelles, ainsi que
            l&apos;ensemble des EPC nécessaires à la sécurité sur les lieux de travail.
          </p>
          <p>
            La personnalisation est au cœur de notre offre. Nous proposons des
            services d&apos;impression textile, de broderie et de marquage pour
            intégrer le logo, les couleurs et l&apos;identité visuelle de votre entreprise
            sur chaque équipement. Que ce soit pour uniformiser vos équipes ou
            respecter les obligations réglementaires, nous adaptons chaque commande
            à vos besoins spécifiques.
          </p>
          <p>
            La qualité et la conformité de nos produits sont nos priorités. Nous
            sélectionnons nos fournisseurs avec rigueur et vérifions chaque article
            avant expédition afin de garantir des équipements durables, conformes
            et confortables pour vos équipes, même dans les conditions de travail
            les plus exigeantes.
          </p>
        </div>
      </section>

      <Separator className="container mx-auto" />

      <section className="container mx-auto px-4 py-16 md:py-20">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-10">
          Nos valeurs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Award,
              title: 'Qualité',
              description:
                "Des produits sélectionnés pour leur durabilité et leur conformité aux normes de sécurité applicables en Côte d'Ivoire.",
            },
            {
              icon: HeadphonesIcon,
              title: 'Service',
              description:
                'Une équipe basée à Abidjan, à votre écoute pour vous conseiller et vous accompagner à chaque étape de votre commande.',
            },
            {
              icon: Palette,
              title: 'Personnalisation',
              description:
                'Impression, broderie, marquage : chaque équipement peut être personnalisé avec le logo et les couleurs de votre entreprise.',
            },
            {
              icon: ShieldCheck,
              title: 'Fiabilité',
              description:
                "Des délais respectés, des produits conformes et un suivi rigoureux de chaque commande, de Abidjan à l'intérieur du pays.",
            },
          ].map((value) => (
            <Card key={value.title} className="text-center h-full">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <value.icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-lg">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-10">
            Ce que nous proposons
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: ShieldCheck,
                title: 'EPI & EPC',
                description:
                  'Casques, gants, chaussures de sécurité, gilets haute visibilité, protections auditives et visuelles.',
              },
              {
                icon: Palette,
                title: 'Personnalisation',
                description:
                  'Impression textile, broderie, marquage logo sur vêtements de travail, casques et accessoires.',
              },
              {
                icon: Truck,
                title: 'Livraison',
                description:
                  "Livraison sur Abidjan et dans les principales villes de Côte d'Ivoire.",
              },
            ].map((item) => (
              <Card key={item.title} className="text-center h-full">
                <CardContent className="p-6 flex flex-col items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-8">
            Où nous trouver
          </h2>
          <div className="flex items-start gap-4 rounded-lg border p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-foreground">Adresse</p>
              <p className="text-sm mt-1">
                Cocody 2 Plateaux, Cité Sanon — Abidjan, Côte d&apos;Ivoire
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg border p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-foreground">Contact</p>
              <p className="text-sm mt-1">
                +225 07 79 07 45 47
              </p>
              <p className="text-sm mt-1">
                contact@itschoolci.com
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-gradient-to-br from-primary/5 via-muted/50 to-primary/5 py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Phone className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl mb-3">
              Envie de travailler avec nous ?
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Notre équipe commerciale est à votre disposition pour étudier vos
              besoins et vous proposer une solution sur mesure.
            </p>
            <Button asChild size="lg" className="px-10">
              <Link href="/contact">Contactez-nous</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
