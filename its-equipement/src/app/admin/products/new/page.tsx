'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminFetch, adminPost } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Category {
  id: string
  name: string
  slug: string
  isActive: boolean
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NouveauProduitPage() {
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [minQuantity, setMinQuantity] = useState('1')
  const [isPersonalizable, setIsPersonalizable] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await adminFetch<Category[]>('/api/admin/categories?includeInactive=true')
        if (res.success && res.data) {
          setCategories(res.data)
        }
      } catch {
        toast.error('Erreur lors du chargement des catégories')
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Le nom est requis'
    }
    if (!slug.trim()) {
      newErrors.slug = 'Le slug est requis'
    }
    if (!description.trim()) {
      newErrors.description = 'La description est requise'
    }
    if (!sku.trim()) {
      newErrors.sku = 'Le SKU est requis'
    }
    if (!categoryId) {
      newErrors.categoryId = 'La catégorie est requise'
    }
    const price = parseFloat(basePrice)
    if (basePrice === '' || isNaN(price) || price < 0) {
      newErrors.basePrice = 'Le prix doit être supérieur ou égal à 0'
    }
    const minQty = parseInt(minQuantity, 10)
    if (minQuantity !== '' && (!isNaN(minQty) && minQty < 1)) {
      newErrors.minQuantity = 'La quantité minimale doit être supérieure ou égale à 1'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    setSubmitting(true)
    try {
      const body = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        sku: sku.trim(),
        basePrice: parseFloat(basePrice),
        categoryId,
        isPersonalizable,
        minQuantity: parseInt(minQuantity, 10) || 1,
        isActive,
      }

      const res = await adminPost<{ id: string }>('/api/admin/products', body)

      if (res.success && res.data) {
        toast.success('Produit créé avec succès')
        router.push(`/admin/products/${res.data.id}`)
      } else {
        toast.error(res.error || 'Erreur lors de la création du produit')
      }
    } catch {
      toast.error('Erreur lors de la création du produit')
    } finally {
      setSubmitting(false)
    }
  }

  function handleNameBlur() {
    if (!slug.trim()) {
      setSlug(generateSlug(name))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/products')}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau produit</h1>
          <p className="text-muted-foreground">
            Ajouter un produit au catalogue.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du produit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Nom du produit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="slug"
                  placeholder="slug-du-produit"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  aria-invalid={!!errors.slug}
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Description du produit"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sku"
                  placeholder="EX-00001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  aria-invalid={!!errors.sku}
                />
                {errors.sku && (
                  <p className="text-sm text-destructive">{errors.sku}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Catégorie <span className="text-destructive">*</span>
                </Label>
                {loadingCategories ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="category" aria-invalid={!!errors.categoryId}>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.categoryId && (
                  <p className="text-sm text-destructive">{errors.categoryId}</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="basePrice">
                  Prix de base (€) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  aria-invalid={!!errors.basePrice}
                />
                {errors.basePrice && (
                  <p className="text-sm text-destructive">{errors.basePrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minQuantity">Quantité minimale</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  aria-invalid={!!errors.minQuantity}
                />
                {errors.minQuantity && (
                  <p className="text-sm text-destructive">{errors.minQuantity}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex items-center gap-3">
                <Switch
                  id="isPersonalizable"
                  checked={isPersonalizable}
                  onCheckedChange={setIsPersonalizable}
                />
                <Label htmlFor="isPersonalizable" className="cursor-pointer">
                  Produit personnalisable
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Actif
                </Label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le produit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}