'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Package, ArrowLeft, ArrowRight, SlidersHorizontal } from 'lucide-react'
import { publicFetch, formatCurrency } from '@/lib/public-api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination'

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

interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  _count: { products: number }
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
  personalizationOptions: { id: string; type: string; label: string }[]
}

const ITEMS_PER_PAGE = 12

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix decroissant' },
  { value: 'name-asc', label: 'Nom A-Z' },
  { value: 'name-desc', label: 'Nom Z-A' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

function sortProducts(products: Product[], sort: SortValue): Product[] {
  const sorted = [...products]
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.basePrice - b.basePrice)
    case 'price-desc':
      return sorted.sort((a, b) => b.basePrice - a.basePrice)
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name, 'fr'))
    default:
      return sorted
  }
}

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-44 sm:h-48 w-full" />
      <CardContent className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </CardContent>
    </Card>
  )
}

function ProduitsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const searchParam = searchParams.get('search') || ''
  const categoryIdParam = searchParams.get('categoryId') || ''
  const sortParam = (searchParams.get('sort') || 'relevance') as SortValue
  const pageParam = parseInt(searchParams.get('page') || '1', 10)

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParam)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await publicFetch<Category[]>('/api/public/categories')
      if (!cancelled && res.success && res.data) {
        setCategories(res.data)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100' })
      if (searchParam) params.set('search', searchParam)
      if (categoryIdParam) params.set('categoryId', categoryIdParam)
      const res = await publicFetch<Product[]>(`/api/public/products?${params.toString()}`)
      if (!cancelled) {
        setProducts(res.success && res.data ? res.data : [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [searchParam, categoryIdParam])

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      params.set('page', '1')
      router.push(`/produits?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value })
      }, 300)
    },
    [updateParams]
  )

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      updateParams({ categoryId })
    },
    [updateParams]
  )

  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('sort', value)
      params.set('page', '1')
      router.push(`/produits?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(page))
      router.push(`/produits?${params.toString()}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [router, searchParams]
  )

  const sortedProducts = useMemo(() => sortProducts(products, sortParam), [products, sortParam])

  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)
  const currentPage = Math.min(pageParam, totalPages || 1)
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }, [totalPages, currentPage])

  const activeCategoryName = useMemo(() => {
    if (!categoryIdParam) return null
    const cat = categories.find((c) => c.id === categoryIdParam)
    return cat?.name || null
  }, [categoryIdParam, categories])

  return (
    <section className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Catalogue</h1>
        {!loading && (
          <p className="mt-1 text-sm text-muted-foreground">
            {sortedProducts.length} produit{sortedProducts.length !== 1 ? 's' : ''}
            {activeCategoryName ? ` dans ${activeCategoryName}` : ''}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 min-h-[44px]"
            aria-label="Rechercher un produit"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Button
            variant={!categoryIdParam ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange('')}
            className="shrink-0 min-h-[44px]"
          >
            Toutes
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={categoryIdParam === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange(cat.id)}
              className="shrink-0 min-h-[44px]"
            >
              {cat.name}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground shrink-0" />
          <Select value={sortParam} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="size-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Aucun produit trouve</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Aucun produit ne correspond a vos criteres de recherche. Essayez de modifier vos filtres.
          </p>
          {searchParam && (
            <Button
              variant="outline"
              className="mt-4 min-h-[44px]"
              onClick={() => {
                setSearchInput('')
                updateParams({ search: '' })
              }}
            >
              Effacer la recherche
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {paginatedProducts.map((product) => (
              <Card
                key={product.id}
                className="group overflow-hidden transition-colors hover:border-primary/30 cursor-pointer"
                onClick={() => router.push(`/produits/${product.slug}`)}
              >
                <div className="relative h-44 sm:h-48 bg-muted overflow-hidden">
                  {product.images.length > 0 && product.images[0].url ? (
                    <div
                      className="h-full w-full bg-cover bg-center transition-transform group-hover:scale-105"
                      style={{ backgroundImage: `url(${product.images[0].url})` }}
                      role="img"
                      aria-label={product.images[0].altText || product.name}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="size-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {product.isPersonalizable && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
                      Personnalisable
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground mb-1 truncate">
                    {product.category.name}
                  </p>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="font-bold text-primary text-sm sm:text-base">
                    {formatCurrency(product.basePrice)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink
                    aria-label="Page precedente"
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer min-h-[44px]'}
                  >
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline ml-1">Precedent</span>
                  </PaginationLink>
                </PaginationItem>

                {pageNumbers.map((page, idx) =>
                  page === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={page === currentPage}
                        onClick={() => handlePageChange(page)}
                        className="cursor-pointer min-h-[44px] min-w-[44px]"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationLink
                    aria-label="Page suivante"
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer min-h-[44px]'}
                  >
                    <span className="hidden sm:inline mr-1">Suivant</span>
                    <ArrowRight className="size-4" />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </section>
  )
}

export default function ProduitsPageWrapper() {
  return (
    <Suspense>
      <ProduitsPage />
    </Suspense>
  )
}