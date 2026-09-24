'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, CheckCircle, AlertTriangle, XCircle, Info, ChevronLeft, ChevronRight, ShoppingCart, Minus, Plus, Clock, MessageCircle } from 'lucide-react'
import { publicFetch, formatCurrency } from '@/lib/public-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useCartStore } from '@/stores/cart-store'
import { toast } from 'sonner'
import { buildWhatsAppDirectBuyLink } from '@/lib/whatsapp-order'

interface ProductVariant {
  id: string
  name: string
  sku: string
  priceModifier: number
  stock: number
  isActive: boolean
  productId: string
}

interface ProductImage {
  id: string
  url: string
  altText: string
  sortOrder: number
}

interface PersonalizationOption {
  id: string
  productId: string
  type: string
  label: string
  isRequired: boolean
  config: unknown
  sortOrder: number
  isActive: boolean
}

interface FullProduct {
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

function getStockInfo(stock: number) {
  if (stock >= 10) return { label: 'En stock', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle }
  if (stock >= 1) return { label: 'Stock limite', color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle }
  return { label: 'Rupture de stock', color: 'text-red-700', bg: 'bg-red-50', icon: XCircle }
}

function LoadingSkeleton() {
  return (
    <section className="container mx-auto px-4 py-6 sm:py-8">
      <Button variant="ghost" size="sm" className="mb-4 min-h-[44px]" disabled>
        <ArrowLeft className="size-4 mr-2" />
        <Skeleton className="h-4 w-28" />
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        <Skeleton className="h-72 sm:h-80 lg:h-[480px] w-full rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <Separator className="my-4" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-56 mt-4" />
        </div>
      </div>
    </section>
  )
}

function NotFoundState() {
  return (
    <section className="container mx-auto px-4 py-6 sm:py-8">
      <Button variant="ghost" size="sm" className="mb-4 min-h-[44px]" asChild>
        <Link href="/produits">
          <ArrowLeft className="size-4 mr-2" />
          Retour aux produits
        </Link>
      </Button>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="size-12 text-muted-foreground/40 mb-4" />
        <h1 className="text-xl font-bold mb-2">Produit introuvable</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Le produit que vous recherchez n'existe pas ou a ete supprime.
        </p>
        <Button variant="outline" className="mt-6 min-h-[44px]" asChild>
          <Link href="/produits">Voir le catalogue</Link>
        </Button>
      </div>
    </section>
  )
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>()
  const [product, setProduct] = useState<FullProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setNotFound(false)
      setProduct(null)
      setSelectedVariantId(null)
      setQuantity(1)

      try {
        const res = await fetch(`/api/public/products/${params.slug}`)
        if (cancelled) return

        if (!res.ok) {
          setNotFound(true)
          return
        }

        const json = await res.json()

        if (json.success && json.data) {
          const p = json.data as FullProduct
          setProduct(p)
          setSelectedImageIndex(0)
          // Auto-select the only variant when there's exactly one active variant
          const activeVariants = (p.variants ?? []).filter((v) => v.isActive)
          if (activeVariants.length === 1) {
            setSelectedVariantId(activeVariants[0].id)
          }
        } else {
          setNotFound(true)
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [params.slug])

  if (loading) return <LoadingSkeleton />
  if (notFound) return <NotFoundState />
  if (!product) return <NotFoundState />

  const sortedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)
  const activeVariants = product.variants.filter((v) => v.isActive)
  const activePersonalizationOptions = product.personalizationOptions.filter((o) => o.isActive)

  const hasAnyStock = activeVariants.length > 0
    ? activeVariants.some((v) => v.stock > 0)
    : true
  const allOutOfStock = activeVariants.length > 0 && activeVariants.every((v) => v.stock === 0)

  const prices = activeVariants.length > 0
    ? activeVariants.map((v) => product.basePrice + v.priceModifier)
    : [product.basePrice]
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const hasPriceRange = activeVariants.length > 1 && minPrice !== maxPrice

  const selectedVariant = selectedVariantId
    ? activeVariants.find((v) => v.id === selectedVariantId) ?? null
    : null

  const displayPrice = selectedVariant
    ? product.basePrice + selectedVariant.priceModifier
    : activeVariants.length === 1
      ? minPrice
      : product.basePrice

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1))
  }

  const handleAddToCart = () => {
    if (activeVariants.length > 0 && !selectedVariantId) {
      toast.error('Veuillez selectionner une variante')
      return
    }

    if (allOutOfStock) {
      toast.error('Ce produit est en rupture de stock')
      return
    }

    const variant = selectedVariantId
      ? activeVariants.find((v) => v.id === selectedVariantId)
      : undefined

    const unitPrice = product.basePrice + (variant?.priceModifier ?? 0)

    addItem({
      id: `${product.id}-${variant?.id ?? 'default'}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productSku: product.sku,
      productImage: sortedImages.length > 0 ? sortedImages[0].url : '',
      variantId: variant?.id,
      variantName: variant?.name,
      quantity,
      unitPrice,
      hasPersonalization: product.isPersonalizable,
      personalizationOptions: activePersonalizationOptions.map((o) => ({ label: o.label, type: o.type })),
      personalization: {
        impression: product.isPersonalizable,
        logo: false,
        texte: '',
        emplacement: '',
      },
    })

    toast.success(`${product.name} ajoute au panier`)
  }

  return (
    <section className="container mx-auto px-4 py-6 sm:py-8">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2 min-h-[44px] text-muted-foreground hover:text-foreground" asChild>
        <Link href="/produits">
          <ArrowLeft className="size-4 mr-1" />
          Retour
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden bg-muted">
            {sortedImages.length > 0 ? (
              <>
                <div className="relative aspect-square w-full">
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${sortedImages[selectedImageIndex].url})` }}
                    role="img"
                    aria-label={sortedImages[selectedImageIndex].altText || product.name}
                  />
                </div>
                {sortedImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-background/90 hover:bg-background flex items-center justify-center shadow-md transition-colors min-h-[44px] min-w-[44px]"
                      aria-label="Image precedente"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-background/90 hover:bg-background flex items-center justify-center shadow-md transition-colors min-h-[44px] min-w-[44px]"
                      aria-label="Image suivante"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                      {sortedImages.map((_, idx) => (
                        <button
                          key={sortedImages[idx].id}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`size-2 rounded-full transition-colors min-h-[8px] min-w-[8px] ${
                            idx === selectedImageIndex
                              ? 'bg-primary'
                              : 'bg-background/60 hover:bg-background/80'
                          }`}
                          aria-label={`Aller a l'image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="h-72 sm:h-80 lg:h-[480px] flex flex-col items-center justify-center bg-muted rounded-lg">
                <Package className="size-12 text-muted-foreground/30 mb-2" />
                <span className="text-xs text-muted-foreground">Aucune image disponible</span>
              </div>
            )}
          </div>

          {sortedImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sortedImages.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden border-2 transition-colors min-h-[44px] min-w-[44px] ${
                    idx === selectedImageIndex
                      ? 'border-primary'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${img.url})` }}
                    role="img"
                    aria-label={img.altText || `${product.name} - vignette ${idx + 1}`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Link href={`/categories/${product.category.slug}`}>
              <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors cursor-pointer text-xs">
                {product.category.name}
              </Badge>
            </Link>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold leading-tight">{product.name}</h1>

          <p className="text-xs text-muted-foreground">Ref : {product.sku}</p>

          <Separator />

          <div>
            {activeVariants.length > 1 && !selectedVariant && hasPriceRange ? (
              <p className="text-xl sm:text-2xl font-bold">
                A partir de {formatCurrency(minPrice)}
              </p>
            ) : (
              <p className="text-xl sm:text-2xl font-bold">
                {formatCurrency(displayPrice)}
              </p>
            )}
            {activeVariants.length > 1 && !hasPriceRange && !selectedVariant && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Prix unique pour toutes les variantes
              </p>
            )}
          </div>

          {activeVariants.length > 0 && (
            <div className="flex items-center gap-2">
              {allOutOfStock ? (
                <Badge variant="destructive" className="gap-1.5 text-xs">
                  <XCircle className="size-3.5" />
                  Rupture de stock
                </Badge>
              ) : hasAnyStock ? (
                <Badge className={`gap-1.5 text-xs bg-background ${getStockInfo(activeVariants.find(v => v.stock > 0)?.stock || 0).color} border`}>
                  <CheckCircle className="size-3.5" />
                  En stock
                </Badge>
              ) : null}
            </div>
          )}

          {product.description && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </>
          )}

          {activeVariants.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-base font-semibold mb-3">Variantes disponibles</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activeVariants.map((variant) => {
                    const stockInfo = getStockInfo(variant.stock)
                    const StockIcon = stockInfo.icon
                    const variantPrice = product.basePrice + variant.priceModifier
                    const isSelected = selectedVariantId === variant.id

                    return (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors min-h-[44px] ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{variant.name}</p>
                          <p className="text-xs text-muted-foreground">Ref : {variant.sku}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">{formatCurrency(variantPrice)}</p>
                          <div className={`inline-flex items-center gap-1 text-[11px] font-medium ${stockInfo.color} ${stockInfo.bg} px-1.5 py-0.5 rounded-full mt-1`}>
                            <StockIcon className="size-3" />
                            {stockInfo.label}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {product.isPersonalizable && activePersonalizationOptions.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-base font-semibold mb-3">Personnalisation disponible</h2>
                <div className="space-y-2 mb-3">
                  {activePersonalizationOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge variant="outline" className="text-[11px] shrink-0">
                        {opt.type === 'logo' ? 'Logo' : opt.type === 'text' ? 'Texte' : opt.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{opt.label}</span>
                      {opt.isRequired && (
                        <Badge variant="secondary" className="text-[11px] shrink-0">
                          Obligatoire
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Personnalisations sous 24h.</span>{' '}
                    Ce produit peut être personnalisé avec votre logo ou texte.
                    Indiquez vos choix directement dans WhatsApp lors de la commande.
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <label className="text-sm font-medium mb-2 block">Quantite</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuer la quantite"
              >
                <Minus className="size-4" />
              </Button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 w-16 text-center rounded-md border bg-background text-sm font-medium"
                aria-label="Quantite"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Augmenter la quantite"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              className="flex-1 min-h-[48px] text-base"
              onClick={handleAddToCart}
              disabled={allOutOfStock}
            >
              <ShoppingCart className="size-4 mr-2" />
              Ajouter au panier
            </Button>
            <Button
              size="lg"
              variant="default"
              className="flex-1 min-h-[48px] text-base bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (allOutOfStock) {
                  toast.error('Ce produit est en rupture de stock')
                  return
                }
                if (activeVariants.length > 0 && !selectedVariantId) {
                  toast.error('Veuillez sélectionner une variante')
                  return
                }
                const url = buildWhatsAppDirectBuyLink(
                  product.name,
                  product.sku,
                  selectedVariant?.name,
                  quantity,
                  displayPrice,
                  product.isPersonalizable,
                )
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              disabled={allOutOfStock}
            >
              <MessageCircle className="size-4 mr-2" />
              Acheter maintenant
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Achat direct : votre commande est envoyée sur WhatsApp pour validation.
          </p>
        </div>
      </div>
    </section>
  )
}
