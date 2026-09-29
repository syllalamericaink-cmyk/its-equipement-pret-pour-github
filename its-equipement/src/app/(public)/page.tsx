'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Check, Package } from 'lucide-react'
import { publicFetch } from '@/lib/public-api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CONTACT_PHONE, CONTACT_EMAIL, CONTACT_ADDRESS } from '@/constants'

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
}

/* ---------- données statiques du design ---------- */

const SECTEURS = ['BTP', 'Industrie', 'Logistique', 'Agroalimentaire', 'Maintenance', 'Collectivités']

const MARQUAGES = [
  { num: '01', nom: 'Broderie', desc: 'Rendu durable pour polos, vestes, chemises et casquettes.' },
  { num: '02', nom: 'Sérigraphie', desc: 'Adaptée aux séries et aux marquages simples à fort impact.' },
  { num: '03', nom: 'Transfert', desc: 'Pour logos détaillés, petites séries et textiles techniques.' },
]

const CONTROLES = [
  { texte: 'Usage et environnement de travail identifiés', lime: false },
  { texte: 'Tailles, quantités et variantes regroupées', lime: false },
  { texte: 'Contraintes de marquage vérifiées avant production', lime: false },
  { texte: 'Adresse, accès et interlocuteur de livraison confirmés', lime: true },
]

const STATS = [
  { valeur: '24–48 h', desc: 'Délai annoncé pour le retour sur votre demande de devis.' },
  { valeur: 'B2B', desc: 'Approche pensée pour les achats professionnels et les volumes d’équipe.' },
  { valeur: 'ABJ + CI', desc: 'Livraison à Abidjan et partout en Côte d’Ivoire.' },
  { valeur: '1 BAT', desc: 'Validation du rendu avant lancement d’un marquage textile.' },
]

const ETAPES = [
  { num: '01', titre: 'Vous décrivez le besoin', desc: 'Produits, usages, quantités, tailles, normes et date souhaitée.' },
  { num: '02', titre: 'Nous cadrons la demande', desc: 'Nous vérifions les informations et proposons les références adaptées.' },
  { num: '03', titre: 'Vous validez le devis', desc: 'Prix, délais, livraison et bon à tirer sont confirmés avant exécution.' },
  { num: '04', titre: 'Nous préparons la livraison', desc: 'Votre commande est organisée pour Abidjan ou une destination nationale.' },
]

/* ---------- helpers ---------- */

function tagCategorie(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('individuel')) return 'EPI'
  if (n.includes('collectif')) return 'EPC'
  if (n.includes('vêtement') || n.includes('vetement') || n.includes('textile')) return 'TEXTILE'
  if (n.includes('chaussure')) return 'PIEDS'
  if (n.includes('signalisation') || n.includes('chantier')) return 'SITE'
  return 'GAMME'
}

function Eyebrow({ num, label, className = '' }: { num: string; label: string; className?: string }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] ${className}`}>
      <span>{num}</span>
      <span aria-hidden="true" className="h-px w-10 bg-current opacity-60" />
      <span>{label}</span>
    </p>
  )
}

function TitreSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-display text-4xl font-bold leading-[0.98] tracking-tight sm:text-5xl lg:text-[48px] ${className}`}>
      {children}
    </h2>
  )
}

/* ---------- page ---------- */

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      publicFetch<Category[]>('/api/public/categories'),
      publicFetch<Product[]>('/api/public/products?page=1&limit=8'),
    ]).then(([cats, prods]) => {
      if (!alive) return
      if (cats.success && cats.data) setCategories(cats.data)
      if (prods.success && prods.data) setProducts(prods.data)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const produitsCarte = products.slice(0, 4)
  const heroImage = products.find((p) => p.images?.[0])?.images?.[0]
  const atelierImage = products.find((p) => p.isPersonalizable && p.images?.[0])?.images?.[0]

  return (
    <div className="flex flex-col">
      {/* ================= HERO ================= */}
      <section className="bg-its-cream">
        <div className="container mx-auto grid grid-cols-1 gap-12 px-4 py-14 sm:py-18 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-its-dark">
              Fourniture B2B <span className="mx-1">•</span> EPI <span className="mx-1">•</span> EPC{' '}
              <span className="mx-1">•</span> Vêtements de travail
            </p>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[0.95] tracking-tight text-its-dark sm:text-6xl lg:text-[76px]">
              Équiper vos équipes, sans compromis sur le terrain.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-its-gray sm:text-lg">
              Des équipements de protection et tenues professionnelles adaptés à vos métiers,
              disponibles en volume et personnalisables à votre identité.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 bg-its-lime px-6 text-sm font-semibold text-its-dark shadow-none transition-colors hover:bg-its-lime-dark"
              >
                <Link href="/demande-devis">
                  Recevoir un devis sous 24–48 h
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 border-its-border bg-white px-6 text-sm font-semibold text-its-dark shadow-none transition-colors hover:bg-white hover:text-its-gray"
              >
                <Link href="/#categories">
                  Voir les catégories
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 border-t border-its-border pt-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-its-dark">Réponse cadrée</p>
                <p className="mt-1 text-[13px] leading-relaxed text-its-gray">
                  Quantités, normes et délais clarifiés dès le devis.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-its-dark">Livraison nationale</p>
                <p className="mt-1 text-[13px] leading-relaxed text-its-gray">
                  Abidjan et partout en Côte d’Ivoire.
                </p>
              </div>
            </div>
          </div>

          <div>
            {/* Visuel principal — bannière gérée depuis le dashboard */}
            <div className="relative aspect-[5/4] w-full overflow-hidden bg-its-panel">
              {heroImage ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${heroImage.url})` }}
                  role="img"
                  aria-label={heroImage.altText || 'Équipements ITS Équipement'}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/80">
                  <span className="flex h-16 w-16 items-center justify-center bg-its-lime font-display text-2xl font-bold text-its-dark">
                    ITS
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">
                    Protection • Travail • Marquage
                  </p>
                </div>
              )}
            </div>

            {/* Bandeau citron « besoin précis » */}
            <Link
              href="/demande-devis"
              className="group mt-0 flex items-center justify-between gap-4 bg-its-lime px-5 py-5 transition-colors hover:bg-its-lime-dark sm:px-6"
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-dark/80">
                  Un besoin précis ?
                </p>
                <p className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight text-its-dark">
                  Parlez-nous du métier, du risque et des quantités.
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-its-dark text-white transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= SECTEURS ================= */}
      <section className="border-y border-its-border bg-its-light">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-gray">
            Secteurs accompagnés
          </p>
          {SECTEURS.map((s) => (
            <p key={s} className="font-display text-lg font-semibold tracking-tight text-its-dark">
              {s}
            </p>
          ))}
        </div>
      </section>

      {/* ================= 01 CATÉGORIES ================= */}
      <section id="categories" className="scroll-mt-24 bg-white">
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow num="01" label="Choisir par besoin" className="text-its-dark" />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-gray">
              Familles disponibles
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-dark">
              {loading ? '—' : String(categories.length).padStart(2, '0')} catégories
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
            <div className="flex flex-col">
              <TitreSection className="text-its-dark">
                La bonne protection commence par le bon usage.
              </TitreSection>
              <p className="mt-6 max-w-md text-base leading-relaxed text-its-gray">
                Nous orientons chaque demande selon l’environnement, les risques, la fréquence
                d’usage et les exigences de vos équipes.
              </p>
              <div className="mt-8 bg-its-lime px-5 py-5 lg:mt-auto">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-dark/80">
                  À préciser dans votre demande
                </p>
                <p className="mt-2 text-sm leading-relaxed text-its-dark">
                  Métier concerné, taille de l’équipe, fréquence d’utilisation, tailles et
                  contraintes de livraison.
                </p>
              </div>
            </div>

            <div>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full bg-its-light" />
                  ))}
                </div>
              ) : categories.length > 0 ? (
                <ul>
                  {categories.slice(0, 6).map((cat, idx) => (
                    <li key={cat.id} className="border-t border-its-border last:border-b">
                      <Link
                        href={`/categories/${cat.slug}`}
                        className="group flex items-center gap-4 py-5 transition-colors sm:gap-6"
                      >
                        <span className="w-8 shrink-0 text-sm font-semibold text-its-gray">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-its-dark transition-colors group-hover:text-its-gray sm:text-[28px]">
                            {cat.name}
                          </h3>
                          <p className="mt-1 text-sm text-its-gray">
                            {cat._count.products} référence{cat._count.products > 1 ? 's' : ''}{' '}
                            disponible{cat._count.products > 1 ? 's' : ''} — sur devis
                          </p>
                        </div>
                        <span className="hidden shrink-0 bg-its-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-its-dark sm:block">
                          {tagCategorie(cat.name)}
                        </span>
                        <ArrowRight
                          className="h-5 w-5 shrink-0 text-its-dark transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="border border-its-border bg-its-cream px-6 py-12 text-center">
                  <Package className="mx-auto mb-3 h-10 w-10 text-its-gray/50" aria-hidden="true" />
                  <p className="text-sm text-its-gray">Catégories à venir.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 02 PRODUITS ================= */}
      <section className="bg-its-cream">
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <Eyebrow num="02" label="Sélection terrain" className="text-its-dark" />
              <TitreSection className="mt-5 text-its-dark">
                Des références concrètes pour les besoins quotidiens.
              </TitreSection>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="max-w-xs text-[13px] leading-relaxed text-its-gray sm:text-right">
                La disponibilité, les équivalences techniques et les tarifs sont confirmés lors du
                devis.
              </p>
              <Button
                asChild
                variant="outline"
                className="h-11 border-its-border bg-white px-5 text-sm font-semibold text-its-dark shadow-none hover:bg-white hover:text-its-gray"
              >
                <Link href="/produits">
                  Consulter toutes les références
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border border-its-border bg-white">
                    <Skeleton className="aspect-[4/3] w-full bg-its-light" />
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-3 w-24 bg-its-light" />
                      <Skeleton className="h-5 w-3/4 bg-its-light" />
                      <Skeleton className="h-3 w-full bg-its-light" />
                    </div>
                  </div>
                ))
              : produitsCarte.map((product) => {
                  const mainImage = product.images?.[0]
                  return (
                    <Link
                      key={product.id}
                      href={`/produits/${product.slug}`}
                      className="group flex flex-col border border-its-border bg-white transition-shadow hover:shadow-[0_6px_24px_rgba(21,26,29,0.10)]"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-its-light">
                        {mainImage ? (
                          <div
                            className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                            style={{ backgroundImage: `url(${mainImage.url})` }}
                            role="img"
                            aria-label={mainImage.altText || product.name}
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-its-gray">
                            <Package className="h-8 w-8 opacity-50" aria-hidden="true" />
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
                              {product.category.name}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide">
                          <span className="text-its-gray">{product.sku}</span>
                          <span className="text-its-dark">Sur devis</span>
                        </div>
                        <h3 className="mt-2 font-display text-xl font-bold leading-tight tracking-tight text-its-dark">
                          {product.name}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-its-gray">
                          {product.description}
                        </p>
                        <span className="mt-4 flex items-center justify-between border-t border-its-border pt-3 text-[13px] font-semibold text-its-dark">
                          Ajouter à ma demande
                          <ArrowRight
                            className="h-4 w-4 transition-transform group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </Link>
                  )
                })}
          </div>

          {!loading && produitsCarte.length === 0 && (
            <div className="mt-8 border border-its-border bg-white px-6 py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-its-gray/50" aria-hidden="true" />
              <p className="text-sm text-its-gray">
                Références en cours de publication — décrivez votre besoin, nous répondons sous
                24–48 h.
              </p>
            </div>
          )}

          {/* Référence introuvable */}
          <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-its-border pt-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-bold text-its-dark">
                Vous ne trouvez pas la référence attendue ?
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-its-gray">
                Envoyez une fiche technique, une photo de référence ou les normes recherchées.
                Notre équipe étudie une solution équivalente.
              </p>
            </div>
            <Button
              asChild
              className="h-12 shrink-0 bg-its-dark px-6 text-sm font-semibold text-white shadow-none transition-colors hover:bg-its-panel"
            >
              <Link href="/demande-devis">
                Décrire mon besoin
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ================= 03 PERSONNALISATION (sombre) ================= */}
      <section id="personnalisation" className="scroll-mt-24 bg-its-dark text-white">
        <div className="container mx-auto grid grid-cols-1 gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-its-panel lg:aspect-auto lg:min-h-[520px]">
            {atelierImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${atelierImage.url})`, opacity: 0.85 }}
                role="img"
                aria-label="Atelier de marquage ITS Équipement"
              />
            ) : null}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/90">
                Atelier de marquage
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-lime">
                Logo • Texte • Fonctions
              </p>
            </div>
            {!atelierImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-[80px] font-bold leading-none text-white/10">
                  ITS
                </span>
              </div>
            )}
          </div>

          <div>
            <Eyebrow num="03" label="Votre identité sur le terrain" className="text-its-lime" />
            <TitreSection className="mt-5 text-white">
              Des tenues professionnelles qui portent votre image.
            </TitreSection>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70">
              Nous préparons le marquage de vos vêtements avec votre logo, les noms de service ou
              les fonctions. Un bon à tirer valide le positionnement avant production.
            </p>

            <ul className="mt-8">
              {MARQUAGES.map((m) => (
                <li key={m.num} className="grid grid-cols-[2rem_1fr] items-baseline gap-2 border-t border-white/15 py-4 sm:grid-cols-[3rem_10rem_1fr] sm:gap-4">
                  <span className="text-xs font-bold text-its-lime">{m.num}</span>
                  <span className="font-display text-lg font-bold tracking-tight text-white">
                    {m.nom}
                  </span>
                  <span className="col-span-2 mt-1 text-sm leading-relaxed text-white/60 sm:col-span-1 sm:mt-0">
                    {m.desc}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                className="h-12 bg-its-lime px-6 text-sm font-semibold text-its-dark shadow-none transition-colors hover:bg-its-lime-dark"
              >
                <Link href="/demande-devis">
                  Étudier mon projet textile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-white/50">Logo vectoriel recommandé : PDF, SVG ou AI.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 04 RIGUEUR + STATS ================= */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow num="04" label="Rigueur opérationnelle" className="text-its-dark" />
              <TitreSection className="mt-5 text-its-dark">
                Un devis utile se construit avec des détails de terrain.
              </TitreSection>
              <p className="mt-6 max-w-md text-base leading-relaxed text-its-gray">
                Notre rôle ne s’arrête pas à fournir un catalogue. Nous vérifions les informations
                qui influencent la référence, la quantité, le marquage et la livraison.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-its-dark">Avant validation d’une commande</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-gray">
                  Points de contrôle
                </p>
              </div>
              <ul className="mt-4">
                {CONTROLES.map((c) => (
                  <li
                    key={c.texte}
                    className="flex items-center gap-4 border-t border-its-border py-4 last:border-b"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center ${
                        c.lime ? 'bg-its-lime' : 'bg-its-light'
                      }`}
                    >
                      <Check className="h-4 w-4 text-its-dark" aria-hidden="true" />
                    </span>
                    <p className="text-sm text-its-dark">{c.texte}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 border-t border-its-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.valeur} className="border-t-2 border-its-dark pt-5">
                <p className="font-display text-4xl font-bold tracking-tight text-its-dark">
                  {s.valeur}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-its-gray">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 05 MÉTHODE ================= */}
      <section className="bg-its-cream">
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <Eyebrow num="05" label="Comment ça marche" className="text-its-dark" />
              <TitreSection className="mt-5 text-its-dark">
                Une démarche simple, du besoin à la livraison.
              </TitreSection>
            </div>
            <p className="max-w-xs text-[13px] leading-relaxed text-its-gray sm:text-right">
              Un interlocuteur suit les précisions utiles et vous tient informé des étapes de la
              commande.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 border border-its-border bg-white sm:grid-cols-2 lg:grid-cols-4">
            {ETAPES.map((etape, idx) => (
              <div
                key={etape.num}
                className={`border-its-border p-6 ${
                  [
                    'border-b sm:border-r lg:border-b-0 lg:border-r',
                    'border-b lg:border-b-0 lg:border-r',
                    'border-b sm:border-r lg:border-b-0 lg:border-r',
                    '',
                  ][idx]
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-its-gray">{etape.num}</span>
                  <span
                    className={`h-2.5 w-2.5 ${idx === 0 ? 'bg-its-lime' : 'bg-its-light'}`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-6 font-display text-xl font-bold leading-tight tracking-tight text-its-dark">
                  {etape.titre}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-its-gray">{etape.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 06 NOUS JOINDRE ================= */}
      <section className="bg-white">
        <div className="container mx-auto grid grid-cols-1 gap-12 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-gray">
              Zone de livraison
            </p>
            <div className="mt-4 aspect-[4/3] w-full border border-its-border bg-its-light">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=-4.10%2C5.28%2C-3.86%2C5.46&layer=mapnik&marker=5.3604%2C-4.0083"
                title="Zone de livraison ITS Équipement — Abidjan"
                className="h-full w-full grayscale"
                loading="lazy"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <Eyebrow num="06" label="Nous joindre" className="text-its-dark" />
            <TitreSection className="mt-5 text-its-dark">
              Abidjan comme point de départ, toute la Côte d’Ivoire comme zone de service.
            </TitreSection>

            <ul className="mt-8">
              <li className="grid grid-cols-[7rem_1fr] items-center gap-4 border-t border-its-border py-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-gray">
                  Téléphone
                </span>
                <a
                  href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                  className="text-sm font-semibold text-its-dark transition-colors hover:text-its-gray"
                >
                  {CONTACT_PHONE}
                </a>
              </li>
              <li className="grid grid-cols-[7rem_1fr] items-center gap-4 border-t border-its-border py-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-gray">
                  E-mail
                </span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm font-semibold text-its-dark transition-colors hover:text-its-gray"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="grid grid-cols-[7rem_1fr] items-center gap-4 border-y border-its-border py-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-its-gray">
                  Adresse
                </span>
                <span className="text-sm font-semibold text-its-dark">{CONTACT_ADDRESS}</span>
              </li>
            </ul>

            <div className="mt-8">
              <Button
                asChild
                className="h-12 bg-its-lime px-6 text-sm font-semibold text-its-dark shadow-none transition-colors hover:bg-its-lime-dark"
              >
                <Link href="/demande-devis">
                  Préparer ma demande de devis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BANDEAU CTA CITRON ================= */}
      <section className="bg-its-lime">
        <div className="container mx-auto flex flex-col items-start justify-between gap-8 px-4 py-14 sm:py-18 lg:flex-row lg:items-center lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-its-dark/80">
              Votre prochain approvisionnement
            </p>
            <h2 className="mt-4 font-display text-5xl font-bold leading-[0.95] tracking-tight text-its-dark sm:text-6xl lg:text-[56px]">
              Donnez-nous les contraintes. Nous préparons une réponse claire.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-its-dark/75">
              Produits, volumes, tailles, personnalisation et lieu de livraison : quelques
              informations suffisent pour démarrer.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Button
              asChild
              className="h-12 bg-its-dark px-6 text-sm font-semibold text-white shadow-none transition-colors hover:bg-its-panel"
            >
              <Link href="/demande-devis">
                Demander un devis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs font-bold text-its-dark">Retour sous 24–48 h</p>
          </div>
        </div>
      </section>
    </div>
  )
}
