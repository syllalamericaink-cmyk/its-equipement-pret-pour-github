'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { publicFetch, formatCurrency } from '@/lib/public-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight,
  Package,
  Search,
  Palette,
  FileText,
  CheckCircle,
  Layers,
  Truck,
  Zap,
  Users,
  ChevronRight,
  Phone,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  _count: { products: number }
}

interface ProductVariant {
  id: string
  name: string
  priceModifier: number
  stock: number
  isActive: boolean
}

interface ProductImage {
  id: string
  url: string
  altText: string
  sortOrder: number
}

interface PersonalizationOption {
  id: string
  type: string
  label: string
}

interface Product {
  id: string
  name: string
  slug: string
  description: string
  sku: string
  basePrice: number
  isPersonalizable: boolean
  minQuantity: number
  isActive: boolean
  category: { id: string; name: string; slug: string }
  variants: ProductVariant[]
  images: ProductImage[]
  personalizationOptions: PersonalizationOption[]
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

function CategoriesSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="min-w-[160px] sm:min-w-0 overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center text-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-1.5 w-full">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-3 w-1/2 mx-auto" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-36 sm:h-44 w-full" />
          <CardContent className="p-3 sm:p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-5 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    publicFetch<Category[]>('/api/public/categories').then((res) => {
      if (res.success && res.data) {
        setCategories(res.data)
      }
      setLoadingCategories(false)
    })

    publicFetch<Product[]>('/api/public/products?page=1&limit=8').then((res) => {
      if (res.success && res.data) {
        setProducts(res.data)
      }
      setLoadingProducts(false)
    })
  }, [])

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 pt-12 pb-10 sm:pt-20 sm:pb-16 lg:pt-28 lg:pb-20">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="secondary" className="mb-4 sm:mb-6 text-xs font-medium tracking-wide uppercase px-3 py-1">
                EPI & EPC — ITSchool & Dynamic Group
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] sm:leading-[1.15]"
            >
              Équipements de protection{' '}
              <span className="text-primary/80">professionnels</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-4 sm:mt-5 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed"
            >
              EPI, EPC et vêtements de travail personnalisés pour les entreprises en Côte d'Ivoire. Devis gratuit sous 24-48h.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button asChild size="lg" className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base px-8">
                <Link href="/produits">
                  Voir le catalogue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base px-8">
                <Link href="/demande-devis">
                  Demander un devis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-10 sm:py-14">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Nos catégories</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Parcourez notre gamme d'équipements
            </p>
          </motion.div>
          {loadingCategories ? (
            <CategoriesSkeleton />
          ) : categories.length > 0 ? (
            <motion.div variants={stagger}>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
                {categories.map((cat) => (
                  <motion.div key={cat.id} variants={fadeUp} className="min-w-[160px] sm:min-w-0">
                    <Link href={`/categories/${cat.slug}`} className="group block h-full">
                      <Card className="h-full transition-colors hover:border-primary/30">
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2.5">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            <Package className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {cat.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {cat._count.products}{' '}
                              {cat._count.products > 1 ? 'produits' : 'produit'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p className="text-sm">Catégories à venir</p>
            </div>
          )}
          <motion.div variants={fadeUp} className="mt-5">
            <Button asChild variant="ghost" className="text-primary min-h-[44px] text-sm">
              <Link href="/produits">
                Voir tout le catalogue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <Separator className="container mx-auto" />

      {/* PRODUCTS */}
      <section className="container mx-auto px-4 py-10 sm:py-14">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Produits mis en avant</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Une sélection de nos meilleurs équipements
            </p>
          </motion.div>
          {loadingProducts ? (
            <ProductsSkeleton />
          ) : products.length > 0 ? (
            <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((product) => {
                const mainImage = product.images?.[0]
                return (
                  <motion.div key={product.id} variants={fadeUp}>
                    <Link href={`/produits/${product.slug}`} className="group block h-full">
                      <Card className="h-full overflow-hidden transition-colors hover:border-primary/30">
                        <div className="relative h-36 sm:h-44 bg-muted overflow-hidden">
                          {mainImage ? (
                            <div
                              className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                              style={{ backgroundImage: `url(${mainImage.url})` }}
                              role="img"
                              aria-label={mainImage.altText || product.name}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
                            </div>
                          )}
                          {product.isPersonalizable && (
                            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
                              <Palette className="h-3 w-3 mr-0.5" />
                              Personnalisable
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-3 sm:p-4">
                          <p className="text-[11px] text-muted-foreground mb-1 truncate">
                            {product.category.name}
                          </p>
                          <h3 className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <p className="font-bold text-primary mt-1.5 text-sm">
                            {formatCurrency(product.basePrice)}
                          </p>

                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p className="text-sm">Produits à venir</p>
            </div>
          )}
          <motion.div variants={fadeUp} className="mt-6 text-center">
            <Button asChild size="lg" className="min-h-[44px] text-sm">
              <Link href="/produits">
                Voir tout le catalogue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* PERSONALIZATION */}
      <section className="bg-muted/40 py-10 sm:py-14">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center"
          >
            <motion.div variants={fadeUp}>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-3">
                Personnalisation professionnelle
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Faites imprimer le logo et le texte de votre entreprise sur vos équipements de travail. Vêtements de sécurité, polos, vestes ou casques — nous offrons des solutions de marquage de qualité professionnelle.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Notre équipe vous accompagne dans le choix des techniques d'impression les plus adaptées à vos besoins.
              </p>
              <Button asChild variant="outline" className="mt-5 min-h-[44px] text-sm">
                <Link href="/demande-devis">
                  Demander un devis personnalisé
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div variants={stagger} className="grid grid-cols-2 gap-3">
              {[
                { label: 'Logo entreprise' },
                { label: 'Texte personnalisé' },
                { label: "Zones d'impression multiples" },
                { label: 'Qualité professionnelle' },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  className="flex items-center gap-2.5 rounded-lg border bg-card p-3 sm:p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium leading-snug">{item.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* B2B ADVANTAGES */}
      <section className="container mx-auto px-4 py-10 sm:py-14">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">ITS Équipement, votre partenaire B2B</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Une solution complète pour équiper vos équipes
            </p>
          </motion.div>
          <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                icon: Layers,
                title: 'Grandes quantités',
                description: 'Des petites séries aux grands volumes, commandez selon vos besoins.',
              },
              {
                icon: Palette,
                title: 'Personnalisation',
                description: 'Logo, texte, couleurs : personnalisez chaque pièce.',
              },
              {
                icon: Zap,
                title: 'Devis rapide',
                description: 'Devis détaillé et compétitif en 24 à 48 heures.',
              },
              {
                icon: Truck,
                title: 'Livraison',
                description: "Livraison à l'adresse de votre choix sur tout le territoire.",
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp}>
                <Card className="h-full">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary mb-3">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1.5">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <Separator className="container mx-auto" />

      {/* HOW IT WORKS */}
      <section className="container mx-auto px-4 py-10 sm:py-14">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Comment ça marche ?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Trois étapes simples pour obtenir vos équipements
            </p>
          </motion.div>
          <div className="mx-auto max-w-3xl">
            <motion.div variants={stagger} className="relative space-y-0">
              {[
                {
                  step: 1,
                  title: 'Choisissez vos produits',
                  description: 'Parcourez notre catalogue et sélectionnez les articles dont votre équipe a besoin.',
                  icon: Search,
                },
                {
                  step: 2,
                  title: 'Personnalisez si besoin',
                  description: "Ajoutez votre logo, un texte et choisissez les zones d'impression.",
                  icon: Palette,
                },
                {
                  step: 3,
                  title: 'Recevez votre devis',
                  description: 'Notre équipe vous envoie un devis personnalisé adapté à vos quantités.',
                  icon: FileText,
                },
              ].map((item, idx) => (
                <motion.div key={item.step} variants={fadeUp}>
                  <div className={"flex gap-4 pb-8 " + (idx < 2 ? 'relative' : '')}>
                    {idx < 2 && (
                      <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                    )}
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold z-10">
                      {item.step}
                    </div>
                    <div className="flex-1 pt-1.5">
                      <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* CTA CONTACT */}
      <section className="border-t bg-muted/30 py-10 sm:py-14">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            className="mx-auto max-w-md"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Phone className="h-6 w-6" aria-hidden="true" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-lg sm:text-xl font-bold tracking-tight mb-2">
              Besoin d'aide ?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Notre équipe est à votre disposition pour répondre à toutes vos questions et vous accompagner dans votre commande.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="min-h-[44px] px-8 text-sm">
                <Link href="/contact">
                  <Users className="mr-2 h-4 w-4" />
                  Nous contacter
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-[44px] px-8 text-sm">
                <Link href="/produits">
                  Voir le catalogue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
