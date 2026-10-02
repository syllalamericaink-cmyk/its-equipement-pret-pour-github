'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/admin/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { adminFetch, adminDelete, adminPut, formatCurrency, formatDate } from '@/lib/admin-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminPath } from '@/lib/admin-path'

interface Variant {
  id: string
  name: string
  sku: string
  priceModifier: number
  stock: number
  isActive: boolean
}

interface Product {
  id: string
  name: string
  slug: string
  description: string
  sku: string
  basePrice: number
  isPersonalizable: boolean
  showOnHome: boolean
  homeSection: string | null
  minQuantity: number
  isActive: boolean
  createdAt: string
  category: { id: string; name: string; slug: string }
  variants: Variant[]
  images: { id: string; url: string; altText: string; sortOrder: number }[]
  personalizationOptions: unknown[]
}

interface Category {
  id: string
  name: string
  slug: string
  isActive: boolean
}

export default function ProduitsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [includeInactive, setIncludeInactive] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await adminFetch<Category[]>('/api/admin/categories')
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
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        categoryId,
        includeInactive: String(includeInactive),
      })
      const res = await adminFetch<Product[]>(`/api/admin/products?${params}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setProducts(res.data)
          setTotal(res.meta?.total ?? 0)
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page, limit, search, categoryId, includeInactive, refreshKey])

  const handleSearchChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  const handlePageChange = useCallback((p: number) => {
    setPage(p)
  }, [])

  const handleLimitChange = useCallback((l: number) => {
    setLimit(l)
    setPage(1)
  }, [])

  const handleCategoryChange = useCallback((value: string) => {
    setCategoryId(value === 'all' ? '' : value)
    setPage(1)
  }, [])

  const handleIncludeInactiveChange = useCallback((checked: boolean) => {
    setIncludeInactive(checked)
    setPage(1)
  }, [])

  const handleRowClick = useCallback((product: Product) => {
    router.push(adminPath(`/products/${product.id}`))
  }, [router])

  /** Bascule rapide « Afficher sur l'accueil » sans ouvrir la fiche produit. */
  const persistProduct = useCallback(async (product: Product, patch: Partial<Product>) => {
    const res = await adminPut(`/api/admin/products/${product.id}`, {
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      basePrice: product.basePrice,
      categoryId: product.category?.id,
      isPersonalizable: product.isPersonalizable,
      showOnHome: patch.showOnHome ?? product.showOnHome,
      homeSection: patch.homeSection !== undefined ? patch.homeSection : (product.homeSection ?? null),
      minQuantity: product.minQuantity,
      isActive: product.isActive,
    })
    return res
  }, [])

  const handleToggleHome = useCallback(async (product: Product, value: boolean) => {
    // Mise à jour optimiste : l'UI réagit immédiatement
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, showOnHome: value } : p))
    )
    const res = await persistProduct(product, { showOnHome: value })
    if (res.success) {
      toast.success(value ? `« ${product.name} » affiché sur l'accueil.` : `« ${product.name} » retiré de l'accueil.`)
    } else {
      // Annulation en cas d'échec
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, showOnHome: !value } : p))
      )
      toast.error(res.error ?? 'Erreur lors de la mise à jour.')
    }
  }, [persistProduct])

  /** Choisit la section d'accueil du produit : EPI terrain ou Vêtements & chaussures. */
  const handleSetSection = useCallback(async (product: Product, value: string) => {
    const homeSection = value === 'AUTO' ? null : value
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, homeSection } : p))
    )
    const res = await persistProduct(product, { homeSection })
    if (res.success) {
      toast.success(
        value === 'EPI'
          ? `« ${product.name} » ira dans « EPI, sélection terrain ».`
          : value === 'VETEMENTS'
            ? `« ${product.name} » ira dans « Vêtements et chaussures ».`
            : `« ${product.name} » : section automatique.`
      )
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, homeSection: product.homeSection } : p))
      )
      toast.error(res.error ?? 'Erreur lors de la mise à jour.')
    }
  }, [persistProduct])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const res = await adminDelete(`/api/admin/products/${deleteTarget.id}`)
    setDeleteLoading(false)
    if (res.success) {
      toast.success(`Produit « ${deleteTarget.name} » supprimé.`)
      setDeleteTarget(null)
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error ?? 'Erreur lors de la suppression.')
    }
  }, [deleteTarget])

  const columns = [
    {
      key: 'name',
      header: 'Produit',
      render: (p: Product) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{p.name}</span>
          <span className="text-xs text-muted-foreground">{p.sku}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categorie',
      render: (p: Product) => (
        <span>{p.category?.name ?? '\u2014'}</span>
      ),
    },
    {
      key: 'basePrice',
      header: 'Prix',
      render: (p: Product) => (
        <span className="font-medium">{formatCurrency(p.basePrice)}</span>
      ),
    },
    {
      key: 'isPersonalizable',
      header: 'Personnalisation',
      render: (p: Product) => (
        <Badge
          variant="outline"
          className={p.isPersonalizable
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'}
        >
          {p.isPersonalizable ? 'Oui' : 'Non'}
        </Badge>
      ),
    },
    {
      key: 'stock',
      header: 'Stock total',
      render: (p: Product) => {
        const totalStock = p.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
        return <span className={totalStock === 0 ? 'text-destructive font-medium' : ''}>{totalStock}</span>
      },
    },
    {
      key: 'showOnHome',
      header: 'Accueil',
      render: (p: Product) => (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center"
        >
          <Switch
            checked={p.showOnHome}
            onCheckedChange={(v) => handleToggleHome(p, v)}
            aria-label={`Afficher ${p.name} sur l'accueil`}
          />
        </div>
      ),
    },
    {
      key: 'homeSection',
      header: 'Section accueil',
      render: (p: Product) => (
        <div onClick={(e) => e.stopPropagation()} className="min-w-[150px]">
          <Select
            value={p.homeSection === 'EPI' || p.homeSection === 'VETEMENTS' ? p.homeSection : 'AUTO'}
            onValueChange={(v) => handleSetSection(p, v)}
            disabled={!p.showOnHome}
          >
            <SelectTrigger className="h-8 w-full text-xs" aria-label={`Section d'accueil de ${p.name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EPI">EPI, sélection terrain</SelectItem>
              <SelectItem value="VETEMENTS">Vêtements et chaussures</SelectItem>
              <SelectItem value="AUTO">Automatique (catégorie)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Statut',
      render: (p: Product) => (
        <StatusBadge status={p.isActive ? 'ACCEPTED' : 'REJECTED'} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (p: Product) => (
        <span className="text-muted-foreground whitespace-nowrap">{formatDate(p.createdAt)}</span>
      ),
      className: 'hidden lg:table-cell',
    },
    {
      key: 'actions',
      header: '',
      render: (p: Product) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteTarget(p)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
      className: 'w-10',
    },
  ]

  const filters = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <Select value={categoryId || 'all'} onValueChange={handleCategoryChange}>
        <SelectTrigger className="h-9 w-full sm:w-[180px]">
          <SelectValue placeholder="Toutes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Switch
          id="include-inactive"
          checked={includeInactive}
          onCheckedChange={handleIncludeInactiveChange}
        />
        <Label htmlFor="include-inactive" className="text-sm whitespace-nowrap cursor-pointer">
          Inactifs
        </Label>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits"
        description="Catalogue. Cochez « Accueil » pour exposer un produit sur la page d'accueil, puis choisissez sa section : EPI terrain ou Vêtements et chaussures."
        action={{ label: 'Nouveau produit', href: adminPath('/products/new') }}
      />
      <DataTable<Product>
        columns={columns}
        data={products}
        total={total}
        page={page}
        limit={limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSearchChange={handleSearchChange}
        search={search}
        loading={loading}
        filters={filters}
        emptyTitle="Aucun produit"
        emptyDescription="Aucun produit ne correspond a votre recherche."
        getRowKey={(p) => p.id}
        onRowClick={handleRowClick}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Supprimer le produit"
        description={deleteTarget ? `Voulez-vous vraiment supprimer le produit \u00ab ${deleteTarget.name} \u00bb ? Cette action est irreversible.` : ''}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        variant="destructive"
        loading={deleteLoading}
      />
    </div>
  )
}