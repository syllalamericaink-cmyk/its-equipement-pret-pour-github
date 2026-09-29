import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Truck,
  ClipboardCheck,
  Cog,
  PackageCheck,
  MapPin,
  FileText,
  ArrowRight,
  CheckCircle,
  Clock,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Livraison | ITS Équipement',
  description: "Informations sur les conditions de livraison ITS Équipement en Côte d'Ivoire : délais, zones couvertes et suivi de commande.",
  alternates: { canonical: '/livraison' },
  openGraph: {
    title: 'Livraison | ITS Équipement',
    description: "Informations sur les conditions de livraison ITS Équipement en Côte d'Ivoire : délais, zones couvertes et suivi de commande.",
    url: '/livraison',
  },
}

export default function LivraisonPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-br from-muted/80 via-background to-muted/40">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/5" />
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Livraison
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Tout savoir sur nos conditions de livraison
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl space-y-6 text-muted-foreground leading-relaxed">
          <p>
            Chez ITS Équipement, nous mettons tout en œuvre pour garantir une livraison rapide
            et sécurisée de l&apos;ensemble de vos commandes. Notre logistique est adaptée aux
            volumes B2B et nous travaillons avec des transporteurs professionnels
            fiables pour assurer la qualité du service jusqu&apos;a votre adresse.
          </p>
          <p>
            Chaque commande est préparée avec soin dans nos ateliers, puis emballée de manière
            protectrice pour supporter les contraintes du transport. Vous recevez un numéro de
            suivi dès l&apos;expédition afin de suivre l'avancée de votre livraison.
          </p>
          <p>
            Nous livrons à Abidjan et dans les principales villes de Cote d&apos;Ivoire
            (Bouaké, Daloa, San Pedro, Yamoussoukro, Korhogo, Gagnoa, etc.).
            Pour toute demande de livraison dans une zone non couverte,
            n'hésitez pas à nous contacter afin que nous étudiions les possibilités et les tarifs associés.
          </p>
        </div>
      </section>

      <section className="bg-muted/40 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  Informations de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    icon: MapPin,
                    label: 'Zone de livraison',
                    value: "Abidjan et principales villes de Côte d'Ivoire",
                  },
                  {
                    icon: Clock,
                    label: 'Délai moyen',
                    value: '5 à 10 jours ouvrables après validation du devis',
                  },
                  {
                    icon: CheckCircle,
                    label: 'Livraison à Abidjan',
                    value: 'Gratuite selon volume et destination',
                  },
                  {
                    icon: Truck,
                    label: 'Transporteur',
                    value: 'Partenaires locaux fiables',
                  },
                  {
                    icon: CheckCircle,
                    label: 'Suivi de commande',
                    value: "Disponible dès l'expédition",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-12">
            Parcours de votre commande
          </h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border md:left-1/2 md:-translate-x-0.5" />
            <div className="space-y-8">
              {[
                {
                  step: 1,
                  icon: FileText,
                  title: 'Validation du devis',
                  description:
                    'Vous recevez et validez le devis détaillé correspondant à votre commande.',
                },
                {
                  step: 2,
                  icon: ClipboardCheck,
                  title: 'Confirmation de commande',
                  description:
                    'Après validation, votre commande est officiellement enregistrée dans notre système.',
                },
                {
                  step: 3,
                  icon: Cog,
                  title: 'Mise en production',
                  description:
                    'Vos articles sont préparés, personnalisés si nécessaire, et contrôlés qualité.',
                },
                {
                  step: 4,
                  icon: PackageCheck,
                  title: 'Expédition',
                  description:
                    'Votre commande est emballée et confiée à notre transporteur partenaire.',
                },
                {
                  step: 5,
                  icon: Truck,
                  title: 'Livraison',
                  description:
                    "Réception de votre commande à l'adresse indiquée avec suivi en temps réel.",
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className={`relative flex items-start gap-6 md:gap-0 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className="absolute left-6 -translate-x-1/2 md:left-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-md">
                    {item.step}
                  </div>
                  <div className={`flex-1 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                    <Card className="inline-block w-full text-left">
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <item.icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="hidden md:block flex-1 md:w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-gradient-to-br from-primary/5 via-muted/50 to-primary/5 py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl mb-3">
              Prêt à commander ?
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Demandez votre devis personnalisé et recevez une réponse sous 24 à 48
              heures ouvrables.
            </p>
            <Button asChild size="lg" className="px-10">
              <Link href="/demande-devis">
                Demander un devis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}