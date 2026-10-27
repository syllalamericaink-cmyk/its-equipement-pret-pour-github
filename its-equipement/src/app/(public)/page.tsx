'use client'

import { createElement, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BadgeCheck,
  Check,
  ChevronRight,
  Clock,
  LayoutGrid,
  MessageCircle,
  Palette,
  Phone,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { publicFetch } from '@/lib/public-api'
import { useCartStore } from '@/stores/cart-store'
import { Skeleton } from '@/components/ui/skeleton'
import { HeroCarousel, type HeroSlideData } from '@/components/home/hero-carousel'
import { ProductImage as ProductPhoto, isUsableImageUrl, iconFor } from '@/components/public/product-image'
import { openQuickCart } from '@/components/layout/quick-cart'
import { CONTACT_PHONE, CONTACT_EMAIL, CONTACT_ADDRESS, CONTACT_WHATSAPP } from '@/constants'

/* ============================= types API ============================= */

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  showOnHome: boolean
  isFeatured: boolean
  _count: { products: number }
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
  isActive: boolean
  homeSection?: string | null
  showOnHome?: boolean
  minQuantity?: number
  category: { id: string; name: string; slug: string }
  images: ProductImage[]
}

/* ============================= données ============================= */

const TEL_HREF = `tel:${CONTACT_PHONE.replace(/\s/g, '')}`

const TRUST = [
  { icon: Truck, titre: 'Livraison partout en CI', desc: 'Abidjan et intérieur du pays' },
  { icon: Clock, titre: 'Devis sous 24–48 h', desc: 'Prix et délais confirmés' },
  { icon: Wallet, titre: 'Paiement à la livraison', desc: 'Aucun paiement en ligne' },
  { icon: Palette, titre: 'Marquage de votre logo', desc: 'Bon à tirer validé avant production' },
]

const FAQ = [
  { q: 'Quel délai pour recevoir mon devis ?', a: 'Comptez 24 à 48 h après votre demande. Par téléphone, c’est encore plus rapide.' },
  { q: 'Livrez-vous en dehors d’Abidjan ?', a: 'Oui, partout en Côte d’Ivoire.' },
  { q: 'Comment se passe le paiement ?', a: 'Aucun paiement en ligne : un commercial confirme votre commande, puis vous payez selon les modalités convenues.' },
  { q: 'Quel format de logo fournir ?', a: 'Un fichier vectoriel : PDF, SVG ou AI. Une photo nette convient pour une première étude.' },
  {
    q: 'Je ne trouve pas ma référence',
    a: 'Appelez-nous ou envoyez une photo ou la fiche technique sur WhatsApp : nous trouvons un équivalent.',
  },
]

const SECTEURS_LIST = [
  'BTP',
  'Industrie',
  'Logistique',
  'Agroalimentaire',
  'Maintenance',
  'Collectivités',
  'Mines & Énergie',
  'Hôtellerie & Restauration',
]

/* ============================= helpers ============================= */

function tagCategorie(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.includes('individuel')) return 'EPI'
  if (n.includes('collectif')) return 'EPC'
  if (n.includes('vêtement') || n.includes('vetement') || n.includes('textile')) return 'TEXTILE'
  if (n.includes('chaussure')) return 'PIEDS'
  if (n.includes('signalisation') || n.includes('chantier')) return 'SITE'
  return 'GAMME'
}

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' FCFA'

/* ======================= composants ======================= */

/** Panneau blanc avec barre de titre, à la manière des marketplaces. */
function Panel({
  titre,
  href,
  accent = false,
  children,
  id,
}: {
  titre: string
  href?: string
  accent?: boolean
  children: React.ReactNode
  id?: string
}) {
  return (
    <section id={id} className="its-reveal overflow-hidden border border-its-border bg-white shadow-sm">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 ${
          accent ? 'bg-its-dark text-white' : 'border-b border-its-border'
        }`}
      >
        <h2 className={`font-display text-lg font-bold tracking-tight sm:text-xl ${accent ? 'text-white' : 'text-its-dark'}`}>
          {titre}
        </h2>
        {href && (
          <Link
            href={href}
            className={`inline-flex items-center gap-1 text-sm font-semibold transition-colors ${
              accent ? 'text-its-lime hover:text-white' : 'text-its-dark hover:text-its-gray'
            }`}
          >
            Voir tout <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function ProductCard({ product, added, onAdd }: { product: Product; added: boolean; onAdd: (p: Product) => void }) {
  const image = product.images?.find((img) => isUsableImageUrl(img.url))?.url
  return (
    <article className="group flex w-[156px] shrink-0 snap-start flex-col border-r border-its-border bg-white transition-shadow duration-200 hover:z-10 hover:shadow-[0_6px_24px_rgba(21,26,29,0.14)] sm:w-[190px] lg:w-auto">
      <Link href={`/produits/${product.slug}`} className="block p-2 pb-0" aria-label={product.name}>
        <div className="relative aspect-square overflow-hidden bg-its-light">
          <ProductPhoto
            src={image}
            alt={product.name}
            names={[product.category?.name, product.name]}
            className="transition-transform duration-300 group-hover:scale-105"
          />
          {product.isPersonalizable && (
            <span className="absolute left-1.5 top-1.5 bg-its-lime px-1.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-its-dark">
              Personnalisable
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-2.5 pt-2">
        <Link
          href={`/produits/${product.slug}`}
          className="line-clamp-2 min-h-[2.6em] text-[0.9rem] leading-snug text-its-dark hover:underline"
        >
          {product.name}
        </Link>
        <p className="font-display text-[1.1rem] font-bold text-its-dark">
          {product.basePrice > 0 ? fmtPrice(product.basePrice) : 'Prix sur devis'}
        </p>
        <button
          type="button"
          onClick={() => onAdd(product)}
          aria-label={added ? `${product.name} est dans le panier` : `Ajouter ${product.name} au panier`}
          className={`mt-auto flex min-h-[40px] items-center justify-center gap-1.5 text-[0.88rem] font-semibold transition-all ${
            added
              ? 'bg-its-dark text-white'
              : 'bg-its-lime text-its-dark hover:bg-its-lime-dark sm:opacity-90 sm:group-hover:opacity-100'
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> Dans le panier
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Ajouter au panier
            </>
          )}
        </button>
      </div>
    </article>
  )
}

function ProductRail({
  titre,
  href,
  products,
  addedIds,
  onAdd,
  loading,
  accent,
  id,
}: {
  titre: string
  href?: string
  products: Product[]
  addedIds: Set<string>
  onAdd: (p: Product) => void
  loading: boolean
  accent?: boolean
  id?: string
}) {
  return (
    <Panel titre={titre} href={href} accent={accent} id={id}>
      {loading ? (
        <div className="flex gap-2 p-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[300px] w-[156px] shrink-0 sm:w-[190px] lg:flex-1" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="p-4 text-sm text-its-gray">
          Aucun produit dans cette sélection pour le moment.{' '}
          <Link href="/produits" className="font-semibold text-its-dark underline decoration-its-lime decoration-[3px]">
            Voir tout le catalogue
          </Link>
        </p>
      ) : (
        <div className="flex snap-x overflow-x-auto bg-white [scrollbar-width:none] lg:grid lg:grid-cols-5 lg:overflow-visible xl:grid-cols-6 [&::-webkit-scrollbar]:hidden">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} added={addedIds.has(p.id)} onAdd={onAdd} />
          ))}
        </div>
      )}
    </Panel>
  )
}

/** Encart d'appel : le devis le plus rapide reste le téléphone. */
function CallCard({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={TEL_HREF}
      className={`group relative flex overflow-hidden bg-its-dark text-white ${
        compact ? 'flex-col justify-between p-4' : 'items-center gap-4 p-4 sm:p-5'
      }`}
      aria-label={`Appeler ${CONTACT_PHONE} pour un devis rapide`}
    >
      <span
        aria-hidden="true"
        className="its-ring pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border-[10px] border-its-lime/20"
      />
      <span className="grid h-12 w-12 shrink-0 place-items-center bg-its-lime text-its-dark">
        <Phone className="its-wiggle h-6 w-6" aria-hidden="true" />
      </span>
      <span className={compact ? 'mt-3' : 'min-w-0 flex-1'}>
        <span className="block text-[0.8rem] font-semibold uppercase tracking-wider text-its-lime">
          Devis express par téléphone
        </span>
        <span className="block font-display text-xl font-bold leading-tight sm:text-2xl">{CONTACT_PHONE}</span>
        {!compact && (
          <span className="block text-sm text-white/70">Un conseiller vous répond et chiffre votre besoin tout de suite.</span>
        )}
      </span>
      {!compact && (
        <span className="hidden shrink-0 bg-its-lime px-4 py-2.5 text-sm font-bold text-its-dark transition-colors group-hover:bg-white sm:block">
          Appeler
        </span>
      )}
    </a>
  )
}

/* ============================= page ============================= */

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [heroSlides, setHeroSlides] = useState<HeroSlideData[]>([])
  const [loading, setLoading] = useState(true)
  const cartItems = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const addedIds = useMemo(() => new Set(cartItems.map((i) => i.productId)), [cartItems])

  useEffect(() => {
    let alive = true
    Promise.all([
      publicFetch<Category[]>('/api/public/categories'),
      publicFetch<Product[]>('/api/public/products?page=1&limit=24'),
      publicFetch<(HeroSlideData & { title?: string | null; text?: string | null; ctaLabel?: string | null; href?: string | null })[]>('/api/public/hero'),
    ]).then(([cats, prods, slides]) => {
      if (!alive) return
      if (cats.success && cats.data) setCategories(cats.data)
      if (prods.success && prods.data) setProducts(prods.data)
      if (slides.success && slides.data) setHeroSlides(slides.data)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  /** Répartition par univers. Si l'admin a marqué des produits « Afficher sur
   * l'accueil », seuls ceux-ci alimentent les rails (section choisie dans
   * l'admin, sinon répartition automatique par catégorie). */
  const { railEpi, railVet } = useMemo(() => {
    const epiTags = ['EPI', 'EPC', 'SITE', 'GAMME']
    const vetTags = ['TEXTILE', 'PIEDS']
    const sectionOf = (p: Product): 'EPI' | 'VETEMENTS' | null => {
      if (p.homeSection === 'EPI' || p.homeSection === 'VETEMENTS') return p.homeSection
      if (epiTags.includes(tagCategorie(p.category?.name))) return 'EPI'
      if (vetTags.includes(tagCategorie(p.category?.name))) return 'VETEMENTS'
      return null
    }
    const flagged = products.filter((p) => p.showOnHome)
    if (flagged.length > 0) {
      return {
        railEpi: flagged.filter((p) => sectionOf(p) === 'EPI'),
        railVet: flagged.filter((p) => sectionOf(p) === 'VETEMENTS'),
      }
    }
    const epi = products.filter((p) => sectionOf(p) === 'EPI')
    const vet = products.filter((p) => sectionOf(p) === 'VETEMENTS')
    return {
      railEpi: epi.length > 0 ? epi : products.slice(0, 8),
      railVet: vet.length > 0 ? vet : products.slice(8, 16),
    }
  }, [products])

  /** Catégories pour la colonne de gauche et les pastilles mobiles. */
  const navCategories = useMemo(
    () => categories.filter((c) => c._count?.products > 0 || c.isFeatured).slice(0, 10),
    [categories],
  )

  /** Tuiles « Nos univers » : catégories marquées « isFeatured » dans l'admin. */
  const universTiles = useMemo(() => {
    const featured = categories.filter((c) => c.isFeatured).slice(0, 8)
    const list = featured.length > 0 ? featured : navCategories.slice(0, 4)
    return list.map((c) => ({
      titre: c.name,
      small: c.description?.trim() || `${c._count?.products ?? 0} produit${(c._count?.products ?? 0) > 1 ? 's' : ''}`,
      href: `/categories/${c.slug}`,
      imageUrl: c.imageUrl,
    }))
  }, [categories, navCategories])

  const addToCart = (product: Product) => {
    if (addedIds.has(product.id)) {
      openQuickCart()
      return
    }
    addItem({
      id: `${product.id}-default-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productSku: product.sku || undefined,
      productImage: product.images?.find((img) => isUsableImageUrl(img.url))?.url ?? '',
      quantity: Math.max(1, Number(product.minQuantity) || 1),
      minQuantity: product.minQuantity,
      unitPrice: product.basePrice,
      // La personnalisation se règle sur la fiche produit ou dans le panier.
      hasPersonalization: false,
      personalizationOptions: [],
      personalization: { impression: false, logo: false, texte: '', emplacement: '' },
    })
    toast.success(`${product.name} ajouté au panier`, {
      action: { label: 'Voir le panier', onClick: () => openQuickCart() },
    })
  }

  return (
    <div className="bg-its-cream pb-8">
      <div className="mx-auto max-w-[1320px] space-y-3 px-0 pt-0 sm:space-y-4 sm:px-3 sm:pt-3 lg:px-4 lg:pt-4">
        {/* ========== Rangée d'accueil : catégories | carrousel | encarts ========== */}
        <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)_250px] lg:gap-4">
          {/* Catégories (ordinateur) */}
          <nav
            aria-label="Catégories"
            className="hidden border border-its-border bg-white py-2 shadow-sm lg:block"
          >
            <ul>
              {(loading ? [] : navCategories).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/categories/${c.slug}`}
                    className="group flex items-center gap-3 px-4 py-2 text-[0.92rem] text-its-dark transition-colors hover:bg-its-cream"
                  >
                    {createElement(iconFor([c.name]), {
                      className: 'h-4 w-4 shrink-0 text-its-gray transition-colors group-hover:text-its-dark',
                      'aria-hidden': true,
                    })}
                    <span className="truncate">{c.name}</span>
                  </Link>
                </li>
              ))}
              {loading &&
                [0, 1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="px-4 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </li>
                ))}
              <li>
                <Link
                  href="/produits?personalizable=1"
                  className="group flex items-center gap-3 px-4 py-2 text-[0.92rem] text-its-dark transition-colors hover:bg-its-cream"
                >
                  <Palette className="h-4 w-4 shrink-0 text-its-gray group-hover:text-its-dark" aria-hidden="true" />
                  Personnalisables
                </Link>
              </li>
              <li className="mt-1 border-t border-its-border pt-1">
                <Link
                  href="/produits"
                  className="group flex items-center gap-3 px-4 py-2 text-[0.92rem] font-semibold text-its-dark transition-colors hover:bg-its-cream"
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Tout le catalogue
                </Link>
              </li>
            </ul>
          </nav>

          {/* Carrousel des bannières (géré dans l'admin) */}
          <div className="overflow-hidden shadow-sm">
            <HeroCarousel slides={heroSlides} />
          </div>

          {/* Encarts (ordinateur) */}
          <div className="hidden grid-rows-2 gap-4 lg:grid">
            <CallCard compact />
            <a
              href={CONTACT_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between bg-[#1f8f4e] p-4 text-white"
            >
              <span className="grid h-12 w-12 place-items-center bg-white/15">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="mt-3">
                <span className="block text-[0.8rem] font-semibold uppercase tracking-wider text-white/80">
                  Commande WhatsApp
                </span>
                <span className="block font-display text-xl font-bold leading-tight">Envoyez votre liste</span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">
                  Écrire maintenant <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </span>
            </a>
          </div>
        </div>

        {/* Pastilles de catégories (mobile et tablette) */}
        {navCategories.length > 0 && (
          <nav aria-label="Catégories" className="lg:hidden">
            <ul className="flex snap-x gap-2 overflow-x-auto px-3 py-1 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
              {navCategories.map((c) => (
                <li key={c.id} className="snap-start">
                  <Link
                    href={`/categories/${c.slug}`}
                    className="flex w-[84px] flex-col items-center gap-1.5 text-center"
                  >
                    <span className="grid h-14 w-14 place-items-center border border-its-border bg-white shadow-sm">
                      {createElement(iconFor([c.name]), { className: 'h-6 w-6 text-its-dark', 'aria-hidden': true })}
                    </span>
                    <span className="line-clamp-2 text-[0.75rem] font-medium leading-tight text-its-dark">{c.name}</span>
                  </Link>
                </li>
              ))}
              <li className="snap-start">
                <Link href="/produits" className="flex w-[84px] flex-col items-center gap-1.5 text-center">
                  <span className="grid h-14 w-14 place-items-center bg-its-dark text-its-lime shadow-sm">
                    <LayoutGrid className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="text-[0.75rem] font-semibold leading-tight text-its-dark">Tout voir</span>
                </Link>
              </li>
            </ul>
          </nav>
        )}

        {/* ========== Engagements ========== */}
        <ul className="its-reveal grid grid-cols-2 gap-px border-y border-its-border bg-its-border sm:border-x lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, titre, desc }) => (
            <li key={titre} className="flex items-center gap-3 bg-white p-3 sm:p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center bg-its-cream">
                <Icon className="h-5 w-5 text-its-dark" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.86rem] font-semibold leading-tight text-its-dark sm:text-[0.95rem]">{titre}</span>
                <span className="hidden text-[0.8rem] text-its-gray sm:block">{desc}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* ========== Produits ========== */}
        <ProductRail
          id="epi"
          titre="EPI, sélection terrain"
          href="/produits"
          products={railEpi}
          addedIds={addedIds}
          onAdd={addToCart}
          loading={loading}
          accent
        />

        {/* Devis express (mobile et tablette — sur ordinateur, l'encart est à droite du carrousel) */}
        <div className="its-reveal px-3 sm:px-0 lg:hidden">
          <CallCard />
        </div>

        <ProductRail
          id="vetements"
          titre="Vêtements et chaussures"
          href="/produits"
          products={railVet}
          addedIds={addedIds}
          onAdd={addToCart}
          loading={loading}
        />

        {/* ========== Univers ========== */}
        {universTiles.length > 0 && (
          <Panel titre="Nos univers" href="/produits" id="univers">
            <div className="grid grid-cols-2 gap-px bg-white md:grid-cols-4">
              {universTiles.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden bg-its-light"
                >
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                    <ProductPhoto src={t.imageUrl} alt="" names={[t.titre]} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-its-dark/85 via-its-dark/20 to-transparent" />
                  <div className="relative p-3 text-white sm:p-4">
                    <h3 className="font-display text-lg font-bold leading-tight sm:text-xl">{t.titre}</h3>
                    <p className="line-clamp-1 text-[0.8rem] text-white/80">{t.small}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        )}

        {/* ========== Secteurs ========== */}
        <section className="its-reveal border-y border-its-border bg-white py-3 sm:border-x">
          <p className="flex items-center gap-2 px-4 pb-2 text-[0.92rem] font-semibold text-its-dark">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Secteurs accompagnés
          </p>
          <div className="overflow-hidden">
            <div className="its-marquee flex w-max gap-2">
              {SECTEURS_LIST.map((s) => (
                <span
                  key={s}
                  className="whitespace-nowrap border border-its-border bg-its-cream px-3 py-1.5 text-[0.85rem] font-medium text-its-dark"
                >
                  {s}
                </span>
              ))}
              <div className="its-marquee-copy" aria-hidden="true">
                {SECTEURS_LIST.map((s) => (
                  <span
                    key={`copy-${s}`}
                    className="whitespace-nowrap border border-its-border bg-its-cream px-3 py-1.5 text-[0.85rem] font-medium text-its-dark"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========== FAQ + contact ========== */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <Panel titre="Questions fréquentes">
            <div className="px-4">
              {FAQ.map((f, i) => (
                <details key={i} className={`group ${i > 0 ? 'border-t' : ''} border-its-border`}>
                  <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-2 font-semibold text-its-dark [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden="true" className="text-[1.5rem] leading-none text-its-dark transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-3.5 text-[0.95rem] text-its-gray">{f.a}</p>
                </details>
              ))}
            </div>
          </Panel>

          <Panel titre="Nous joindre" id="contact">
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              <a href={TEL_HREF} className="block border border-its-border p-3 transition-colors hover:bg-its-cream">
                <small className="block text-[0.78rem] text-its-gray">Téléphone</small>
                <b className="font-semibold text-its-dark">{CONTACT_PHONE}</b>
              </a>
              <a
                href={CONTACT_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-its-border p-3 transition-colors hover:bg-its-cream"
              >
                <small className="block text-[0.78rem] text-its-gray">WhatsApp</small>
                <b className="flex items-center gap-1.5 font-semibold text-its-dark">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Écrire sur WhatsApp
                </b>
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="block border border-its-border p-3 transition-colors hover:bg-its-cream">
                <small className="block text-[0.78rem] text-its-gray">E-mail</small>
                <b className="break-words font-semibold text-its-dark">{CONTACT_EMAIL}</b>
              </a>
              <div className="border border-its-border p-3">
                <small className="block text-[0.78rem] text-its-gray">Adresse</small>
                <b className="font-semibold text-its-dark">{CONTACT_ADDRESS}</b>
              </div>
            </div>
            <div className="mx-3 mb-3 h-[180px] overflow-hidden border border-its-border">
              <iframe
                loading="lazy"
                title="Zone de livraison Abidjan"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-4.10%2C5.28%2C-3.86%2C5.46&layer=mapnik&marker=5.3604%2C-4.0083"
                className="h-full w-full border-0"
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
