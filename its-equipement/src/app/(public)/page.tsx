'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, MessageCircle, Package, Plus } from 'lucide-react'
import { publicFetch } from '@/lib/public-api'
import { useCartStore } from '@/stores/cart-store'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { HeroCarousel, type HeroSlideData } from '@/components/home/hero-carousel'
import { HomeQuoteForm } from '@/components/home/home-quote-form'
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

/* ======================= données statiques (maquette) ======================= */

const MARQUAGES = [
  { nom: 'Broderie', desc: 'Durable : polos, vestes, chemises, casquettes.' },
  { nom: 'Sérigraphie', desc: 'Séries et marquages simples à fort impact.' },
  { nom: 'Transfert', desc: 'Logos détaillés, petites séries, textiles techniques.' },
]

const SERVICES = [
  { badge: '24–48 h', titre: 'Retour de devis', desc: 'Quantités, normes et délais clarifiés.' },
  { badge: 'ABJ + CI', titre: 'Livraison nationale', desc: 'Abidjan et toute la Côte d’Ivoire.' },
  { badge: '1 BAT', titre: 'Validation marquage', desc: 'Rendu approuvé avant lancement.' },
  { badge: 'B2B', titre: 'Volumes d’équipe', desc: 'Pensé pour les achats professionnels.' },
]

const ETAPES = [
  { titre: 'Vous décrivez le besoin', desc: 'Produits, usages, quantités, tailles, normes, date.' },
  { titre: 'Nous cadrons la demande', desc: 'Vérification et références adaptées.' },
  { titre: 'Vous validez le devis', desc: 'Prix, délais, livraison et BAT confirmés.' },
  { titre: 'Nous préparons la livraison', desc: 'Commande organisée pour votre destination.' },
]

const FAQ = [
  { q: 'Quel délai pour recevoir mon devis ?', a: 'Comptez 24 à 48 h après votre demande.' },
  { q: 'Livrez-vous en dehors d’Abidjan ?', a: 'Oui, partout en Côte d’Ivoire.' },
  { q: 'Quel format de logo fournir ?', a: 'Un fichier vectoriel : PDF, SVG ou AI.' },
  {
    q: 'Je ne trouve pas ma référence',
    a: 'Envoyez une fiche technique, une photo ou les normes recherchées : nous étudions une solution équivalente.',
  },
]

/** Pastilles « Secteurs accompagnés » (maquette v5) — défilement continu. */
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

/* ======================= petits composants ======================= */

function SectionHead({ titre, href }: { titre: string; href?: string }) {
  return (
    <div className="flex items-baseline justify-between px-4 pb-3">
      <h2 className="font-display text-[1.35rem] font-bold leading-tight tracking-tight text-its-dark">{titre}</h2>
      {href && (
        <Link
          href={href}
          className="text-[0.92rem] font-semibold text-its-dark underline decoration-its-lime decoration-[3px] underline-offset-4"
        >
          Voir plus
        </Link>
      )}
    </div>
  )
}

function ProductCard({ product, added, onAdd }: { product: Product; added: boolean; onAdd: (p: Product) => void }) {
  const image = product.images?.[0]?.url
  return (
    <article className="flex w-[150px] shrink-0 snap-start flex-col overflow-hidden border border-its-border bg-white md:w-[210px]">
      <Link href={`/produits/${product.slug}`} className="block" aria-label={product.name}>
        <div className="relative aspect-square bg-its-light">
          {image ? (

            <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-its-gray">
              <Package className="h-8 w-8" />
            </div>
          )}
          <span className="absolute left-2 top-2 bg-its-dark px-2 py-0.5 text-[0.7rem] font-semibold text-white">
            {tagCategorie(product.category?.name)}
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <Link href={`/produits/${product.slug}`} className="line-clamp-2 min-h-[2.6em] text-[0.92rem] font-medium leading-snug text-its-dark">
          {product.name}
        </Link>
        <small className="text-[0.78rem] text-its-gray">{product.category?.name}</small>
        <span className="mt-1 font-semibold text-its-dark">
          {product.basePrice > 0 ? fmtPrice(product.basePrice) : 'Sur devis'}
        </span>
        <button
          type="button"
          onClick={() => onAdd(product)}
          aria-label={`Ajouter ${product.name} à ma demande de devis`}
          className={`mt-2 flex min-h-[40px] items-center justify-center gap-1 border-[1.5px] text-[0.88rem] font-semibold transition-colors ${
            added
              ? 'border-its-lime bg-its-lime text-its-dark'
              : 'border-its-dark bg-white text-its-dark hover:bg-its-light'
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> Ajouté
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Devis
            </>
          )}
        </button>
      </div>
    </article>
  )
}

function ProductRail({ titre, href, products, addedIds, onAdd, loading }: {
  titre: string
  href?: string
  products: Product[]
  addedIds: Set<string>
  onAdd: (p: Product) => void
  loading: boolean
}) {
  return (
    <section id={titre.includes('Vêtements') ? 'vetements' : 'epi'} className="mt-2.5 bg-white py-4">
      <SectionHead titre={titre} href={href} />
      {loading ? (
        <div className="flex gap-2.5 px-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[260px] w-[150px] shrink-0 md:w-[210px]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="px-4 text-sm text-its-gray">
          Aucun produit dans cette sélection pour le moment.{' '}
          <Link href="/demande-devis" className="font-semibold text-its-dark underline decoration-its-lime decoration-[3px]">
            Décrivez votre besoin
          </Link>
        </p>
      ) : (
        <div className="flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} added={addedIds.has(p.id)} onAdd={onAdd} />
          ))}
        </div>
      )}
    </section>
  )
}

/* ============================= page ============================= */

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [heroSlides, setHeroSlides] = useState<HeroSlideData[]>([])
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const addItem = useCartStore((s) => s.addItem)

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

  /** Répartition par univers : EPI/EPC/Site d'un côté, textile/chaussures de l'autre.
   * Si l'admin a marqué des produits « Afficher sur l'accueil », seuls ceux-ci
   * alimentent les rails. La section de chaque produit est celle choisie dans
   * l'admin (« homeSection ») ; à défaut, répartition automatique par catégorie. */
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

  /** Tuiles « Nos univers » : catégories marquées « isFeatured » dans l'admin.
   * Repli : les 4 univers classiques trouvés par type de catégorie. */
  const universTiles = useMemo(() => {
    const featured = categories.filter((c) => c.isFeatured).slice(0, 8)
    if (featured.length > 0) {
      return featured.map((c) => ({
        titre: c.name,
        small: c.description?.trim() || 'Découvrir la gamme',
        href: `/categories/${c.slug}`,
      }))
    }
    const find = (tag: string) => categories.find((c) => tagCategorie(c.name) === tag)
    return [
      { titre: 'EPI', small: 'Protection individuelle', href: find('EPI') ? `/categories/${find('EPI')!.slug}` : '/produits' },
      { titre: 'EPC', small: 'Protection collective', href: find('EPC') ? `/categories/${find('EPC')!.slug}` : '/produits' },
      { titre: 'Vêtements', small: 'Tenues de travail', href: find('TEXTILE') ? `/categories/${find('TEXTILE')!.slug}` : '/produits' },
      { titre: 'Chaussures', small: 'Sécurité et confort', href: find('PIEDS') ? `/categories/${find('PIEDS')!.slug}` : '/produits' },
    ]
  }, [categories])

  const addToCart = (product: Product) => {
    addItem({
      id: `${product.id}-default-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productSku: product.sku || undefined,
      productImage: product.images?.[0]?.url ?? '',
      quantity: Math.max(1, Number(product.minQuantity) || 1),
      minQuantity: product.minQuantity,
      unitPrice: product.basePrice,
      // La personnalisation détaillée se règle sur la fiche produit ou dans le
      // panier : l'ajout rapide ne l'active pas (sinon le logo serait exigé).
      hasPersonalization: false,
      personalizationOptions: [],
      personalization: { impression: false, logo: false, texte: '', emplacement: '' },
    })
    setAddedIds((prev) => new Set(prev).add(product.id))
    toast.success(`${product.name} ajouté à votre demande`)
  }

  return (
    <div className="pb-6">
      {/* ========== bandeau info (maquette .strip) ========== */}
      <div className="flex items-center justify-between gap-2.5 border-b border-its-border bg-its-cream px-4 py-2 text-[0.85rem] text-its-dark">
        <span>Livraison à Abidjan et partout en Côte d’Ivoire</span>
        <Link
          href="#devis"
          className="whitespace-nowrap font-semibold underline decoration-its-lime decoration-[3px] underline-offset-4"
        >
          Devis 24–48 h
        </Link>
      </div>

      {/* ========== carrousel des bannières (5 s) — maquette v4/v6 ========== */}
      {/* Images gérées depuis /admin/hero ; bannières colorées en attendant */}
      <HeroCarousel slides={heroSlides} />

      {/* ========== rails produits (sélection gérée depuis /admin/produits) ========== */}
      <ProductRail
        titre="EPI, sélection terrain"
        href="/produits"
        products={railEpi}
        addedIds={addedIds}
        onAdd={addToCart}
        loading={loading}
      />
      <ProductRail
        titre="Vêtements et chaussures"
        href="/produits"
        products={railVet}
        addedIds={addedIds}
        onAdd={addToCart}
        loading={loading}
      />

      {/* ========== univers (grille) ========== */}
      <section id="univers" className="mt-2.5 bg-white py-4">
        <SectionHead titre="Nos univers" />
        <div className="grid grid-cols-2 gap-2.5 px-4 md:grid-cols-4">
          {universTiles.map((t) => (
            <Link
              key={t.titre}
              href={t.href}
              className="flex min-h-[96px] flex-col justify-between border-l-4 border-its-lime bg-its-cream p-3.5 transition-colors hover:bg-its-light"
            >
              <h3 className="font-display text-[1.15rem] font-bold text-its-dark">{t.titre}</h3>
              <small className="text-[0.82rem] leading-snug text-its-gray">{t.small}</small>
            </Link>
          ))}
        </div>

        {/* Pastilles « Secteurs accompagnés » défilantes (maquette v5) */}
        <div className="mt-4">
          <p className="px-4 pb-2 text-[0.92rem] font-semibold text-its-dark">Secteurs accompagnés</p>
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
        </div>
      </section>

      {/* ========== personnalisation (bloc sombre) ========== */}
      <section id="personnalisation" className="mt-2.5 bg-white py-4">
        <div className="mx-4 bg-its-dark p-5 text-white md:mx-auto md:max-w-3xl">
          <h2 className="font-display text-2xl font-bold leading-tight md:text-3xl">Votre identité sur le terrain</h2>
          <p className="mb-3.5 mt-1.5 text-[0.93rem] text-its-slate">
            Logo, nom de service ou fonction. Un bon à tirer valide le rendu avant production.
          </p>
          <div className="grid gap-2">
            {MARQUAGES.map((m) => (
              <div key={m.nom} className="bg-its-panel p-3 px-3.5">
                <b className="block font-display text-base font-bold">{m.nom}</b>
                <span className="text-[0.86rem] text-its-slate">{m.desc}</span>
              </div>
            ))}
          </div>
          <small className="mt-3 block text-its-slate">Logo vectoriel recommandé : PDF, SVG ou AI.</small>
          <Link
            href="/produits?personalizable=1"
            className="mt-3.5 flex min-h-[50px] items-center justify-center bg-its-lime font-semibold text-its-dark transition-colors hover:bg-its-lime-dark"
          >
            Voir les produits personnalisables
          </Link>
          <Link
            href="/demande-devis"
            className="mt-2 flex min-h-[50px] items-center justify-center border border-white/25 font-semibold text-white transition-colors hover:bg-white/10"
          >
            Étudier mon projet textile
          </Link>
        </div>
      </section>

      {/* ========== services (tuiles) ========== */}
      <section className="mt-2.5 bg-white py-4">
        <SectionHead titre="Des services de qualité" />
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {SERVICES.map((s) => (
            <div key={s.badge} className="border border-its-border p-3.5">
              <b className="inline-block bg-its-lime px-2 py-0.5 font-display text-[1.5rem] font-bold leading-tight text-its-dark">
                {s.badge}
              </b>
              <strong className="mt-1.5 block text-[0.95rem] font-semibold text-its-dark">{s.titre}</strong>
              <span className="mt-0.5 block text-[0.82rem] leading-snug text-its-gray">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ========== comment ça marche (étapes) ========== */}
      <section className="mt-2.5 bg-white py-4">
        <SectionHead titre="Comment ça marche" />
        <ol className="relative px-4 md:grid md:grid-cols-2 md:gap-x-8">
          {ETAPES.map((e, i) => (
            <li key={i} className="relative pb-4 pl-[52px] md:pl-[52px]">
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 grid h-10 w-10 place-items-center bg-its-dark font-display text-[1.1rem] font-bold text-white"
              >
                {i + 1}
              </span>
              <h3 className="font-display text-[1.1rem] font-bold text-its-dark">{e.titre}</h3>
              <p className="text-[0.92rem] text-its-gray">{e.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ========== bandeau devis (lime) + formulaire court — maquette v5/v6 ========== */}
      <section id="devis" className="mt-2.5 bg-its-lime py-8 md:py-12">
        <div className="md:mx-auto md:max-w-3xl">
          <div className="px-4">
            <h2 className="font-display text-[1.7rem] font-bold leading-[1.05] text-its-dark md:text-4xl">
              Donnez-nous les contraintes. Nous préparons une réponse claire.
            </h2>
            <p className="mb-4 mt-2 text-its-dark/80">
              Produits, volumes, tailles, personnalisation, lieu de livraison. Retour sous 24–48 h.
            </p>
          </div>
          <HomeQuoteForm />
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className="mt-2.5 bg-white py-4">
        <SectionHead titre="Questions fréquentes" />
        <div className="mx-4 md:mx-auto md:max-w-3xl">
          {FAQ.map((f, i) => (
            <details key={i} className={`${i > 0 ? 'border-t' : ''} border-its-border`}>
              <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 py-2 font-semibold text-its-dark [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="text-[1.5rem] leading-none text-its-dark">
                  +
                </span>
              </summary>
              <p className="pb-3.5 text-[0.95rem] text-its-gray">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ========== contact ========== */}
      <section id="contact" className="mt-2.5 bg-white py-4">
        <SectionHead titre="Nous joindre" />
        <div className="grid gap-2 px-4 sm:grid-cols-2 md:grid-cols-4">
          <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="block border border-its-border p-3 px-3.5">
            <small className="block text-[0.78rem] text-its-gray">Téléphone</small>
            <b className="font-semibold text-its-dark">{CONTACT_PHONE}</b>
          </a>
          <a
            href={CONTACT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-its-border p-3 px-3.5 transition-colors hover:bg-its-light"
          >
            <small className="block text-[0.78rem] text-its-gray">WhatsApp</small>
            <b className="flex min-h-[24px] items-center gap-1.5 font-semibold text-its-dark">
              <MessageCircle className="h-4 w-4 text-its-dark" aria-hidden="true" />
              Écrire sur WhatsApp
            </b>
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="block border border-its-border p-3 px-3.5">
            <small className="block text-[0.78rem] text-its-gray">E-mail</small>
            <b className="break-words font-semibold text-its-dark">{CONTACT_EMAIL}</b>
          </a>
          <div className="border border-its-border p-3 px-3.5">
            <small className="block text-[0.78rem] text-its-gray">Adresse</small>
            <b className="font-semibold text-its-dark">{CONTACT_ADDRESS}</b>
          </div>
        </div>
        <div className="mx-4 mt-3 h-[200px] overflow-hidden border border-its-border md:mx-auto md:max-w-3xl">
          <iframe
            loading="lazy"
            title="Zone de livraison Abidjan"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-4.10%2C5.28%2C-3.86%2C5.46&layer=mapnik&marker=5.3604%2C-4.0083"
            className="h-full w-full border-0"
          />
        </div>
      </section>
    </div>
  )
}
