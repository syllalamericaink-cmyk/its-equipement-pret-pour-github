'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { adminFetch, adminPut, adminPost, adminDelete, formatCurrency } from '@/lib/admin-api'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Plus, Trash2, ImageIcon, Package, Settings, Info, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface Variant {
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

interface Product {
  id: string
  name: string
  slug: string
  description: string
  sku: string
  basePrice: number
  categoryId: string
  isPersonalizable: boolean
  minQuantity: number
  isActive: boolean
  createdAt: string
  category: { id: string; name: string; slug: string }
  variants: Variant[]
  images: ProductImage[]
  personalizationOptions: PersonalizationOption[]
}

const emptyVariant = { name: '', sku: '', priceModifier: 0, stock: 0, isActive: true }
const emptyImage = { url: '', altText: '', sortOrder: 0 }
const emptyPerso = { type: 'logo', label: '', isRequired: false, sortOrder: 0, isActive: true }

export default function ProduitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [sku, setSku] = useState('')
  const [basePrice, setBasePrice] = useState(0)
  const [categoryId, setCategoryId] = useState('')
  const [isPersonalizable, setIsPersonalizable] = useState(false)
  const [minQuantity, setMinQuantity] = useState(1)
  const [isActive, setIsActive] = useState(true)

  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [variantForm, setVariantForm] = useState({ ...emptyVariant })
  const [variantSaving, setVariantSaving] = useState(false)
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null)
  const [deleteVariantLoading, setDeleteVariantLoading] = useState(false)

  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageForm, setImageForm] = useState({ ...emptyImage })
  const [imageSaving, setImageSaving] = useState(false)
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [deleteImageLoading, setDeleteImageLoading] = useState(false)

  const [persoDialogOpen, setPersoDialogOpen] = useState(false)
  const [persoForm, setPersoForm] = useState({ ...emptyPerso })
  const [persoSaving, setPersoSaving] = useState(false)
  const [deletePersoId, setDeletePersoId] = useState<string | null>(null)
  const [deletePersoLoading, setDeletePersoLoading] = useState(false)

  const [deleteProductOpen, setDeleteProductOpen] = useState(false)
  const [deleteProductLoading, setDeleteProductLoading] = useState(false)

  const loadProduct = useCallback(async () => {
    try {
      const res = await adminFetch<Product>(`/api/admin/products/${productId}?includeInactive=true`)
      if (res.success && res.data) {
        setProduct(res.data)
        setName(res.data.name)
        setSlug(res.data.slug)
        setDescription(res.data.description)
        setSku(res.data.sku)
        setBasePrice(res.data.basePrice)
        setCategoryId(res.data.categoryId)
        setIsPersonalizable(res.data.isPersonalizable)
        setMinQuantity(res.data.minQuantity)
        setIsActive(res.data.isActive)
      } else {
        toast.error(res.error ?? 'Erreur lors du chargement du produit')
      }
    } catch {
      toast.error('Erreur lors du chargement du produit')
    } finally {
      setLoading(false)
    }
  }, [productId])

  const loadCategories = useCallback(async () => {
    try {
      const res = await adminFetch<Category[]>('/api/admin/categories?includeInactive=true')
      if (res.success && res.data) {
        setCategories(res.data)
      }
    } catch {
      //
    }
  }, [])

  useEffect(() => {
    loadProduct()
    loadCategories()
  }, [loadProduct, loadCategories])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await adminPut(`/api/admin/products/${productId}`, {
        name,
        slug,
        description,
        sku,
        basePrice,
        categoryId,
        isPersonalizable,
        minQuantity,
        isActive,
      })
      if (res.success) {
        toast.success('Produit mis à jour avec succès')
        loadProduct()
      } else {
        toast.error(res.error ?? "Erreur lors de la mise à jour")
      }
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleAddVariant = async () => {
    if (!variantForm.name.trim()) {
      toast.error('Le nom de la variante est requis')
      return
    }
    setVariantSaving(true)
    try {
      const res = await adminPost<Variant>(`/api/admin/products/${productId}/variants`, {
        name: variantForm.name,
        sku: variantForm.sku || undefined,
        priceModifier: variantForm.priceModifier,
        stock: variantForm.stock,
        isActive: variantForm.isActive,
      })
      if (res.success) {
        toast.success('Variante ajoutée avec succès')
        setVariantDialogOpen(false)
        setVariantForm({ ...emptyVariant })
        loadProduct()
      } else {
        toast.error(res.error ?? "Erreur lors de l'ajout")
      }
    } catch {
      toast.error("Erreur lors de l'ajout de la variante")
    } finally {
      setVariantSaving(false)
    }
  }

  const handleDeleteVariant = async () => {
    if (!deleteVariantId) return
    setDeleteVariantLoading(true)
    try {
      const res = await adminDelete(`/api/admin/products/${productId}/variants/${deleteVariantId}`)
      if (res.success) {
        toast.success('Variante supprimée avec succès')
        setDeleteVariantId(null)
        loadProduct()
      } else {
        toast.error(res.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('La suppression des variantes individuelles n\'est pas supportée')
    } finally {
      setDeleteVariantLoading(false)
    }
  }

  const handleAddImage = async () => {
    if (!imageForm.url.trim()) {
      toast.error("L'URL de l'image est requise")
      return
    }
    setImageSaving(true)
    try {
      const res = await adminPost<ProductImage>(`/api/admin/products/${productId}/images`, imageForm)
      if (res.success) {
        toast.success('Image ajoutée avec succès')
        setImageDialogOpen(false)
        setImageForm({ ...emptyImage })
        loadProduct()
      } else {
        toast.error(res.error ?? "Erreur lors de l'ajout")
      }
    } catch {
      toast.error("Erreur lors de l'ajout de l'image")
    } finally {
      setImageSaving(false)
    }
  }

  const handleDeleteImage = async () => {
    if (!deleteImageId) return
    setDeleteImageLoading(true)
    try {
      const res = await adminDelete(`/api/admin/products/${productId}/images/${deleteImageId}`)
      if (res.success) {
        toast.success('Image supprimée avec succès')
        setDeleteImageId(null)
        loadProduct()
      } else {
        toast.error(res.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('La suppression individuelle des images n\'est pas supportée')
    } finally {
      setDeleteImageLoading(false)
    }
  }

  const handleAddPerso = async () => {
    if (!persoForm.label.trim()) {
      toast.error('Le libellé est requis')
      return
    }
    setPersoSaving(true)
    try {
      const res = await adminPost<PersonalizationOption>(`/api/admin/products/${productId}/personalization-options`, {
        type: persoForm.type,
        label: persoForm.label,
        isRequired: persoForm.isRequired,
        sortOrder: persoForm.sortOrder,
        isActive: persoForm.isActive,
      })
      if (res.success) {
        toast.success('Option de personnalisation ajoutée')
        setPersoDialogOpen(false)
        setPersoForm({ ...emptyPerso })
        loadProduct()
      } else {
        toast.error(res.error ?? "Erreur lors de l'ajout")
      }
    } catch {
      toast.error("Erreur lors de l'ajout de l'option")
    } finally {
      setPersoSaving(false)
    }
  }

  const handleDeletePerso = async () => {
    if (!deletePersoId) return
    setDeletePersoLoading(true)
    try {
      const res = await adminDelete(`/api/admin/products/${productId}/personalization-options/${deletePersoId}`)
      if (res.success) {
        toast.success('Option supprimée avec succès')
        setDeletePersoId(null)
        loadProduct()
      } else {
        toast.error(res.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('La suppression individuelle des options n\'est pas supportée')
    } finally {
      setDeletePersoLoading(false)
    }
  }

  const handleDeleteProduct = async () => {
    setDeleteProductLoading(true)
    try {
      const res = await adminDelete(`/api/admin/products/${productId}`)
      if (res.success) {
        toast.success('Produit supprimé avec succès')
        router.push('/admin/products')
      } else {
        toast.error(res.error ?? 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression du produit')
    } finally {
      setDeleteProductLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-muted-foreground">Produit introuvable</p>
        <Button variant="outline" onClick={() => router.push('/admin/products')}>
          <ArrowLeft className="mr-2 size-4" />
          Retour aux produits
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/admin/products')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            <Badge variant={product.isActive ? 'default' : 'secondary'}>
              {product.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">SKU : {product.sku} · {product.category?.name}</p>
        </div>
      </div>

      <Tabs defaultValue="informations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="informations" className="gap-1.5">
            <Info className="size-4" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="variantes" className="gap-1.5">
            <Package className="size-4" />
            Variantes
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5">
            <ImageIcon className="size-4" />
            Images
          </TabsTrigger>
          {isPersonalizable && (
            <TabsTrigger value="personnalisation" className="gap-1.5">
              <Settings className="size-4" />
              Personnalisation
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="informations">
          <Card>
            <CardHeader>
              <CardTitle>Informations du produit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Prix de base (€)</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-full">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minQuantity">Quantité minimum</Label>
                  <Input
                    id="minQuantity"
                    type="number"
                    min="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <Switch
                    id="isPersonalizable"
                    checked={isPersonalizable}
                    onCheckedChange={setIsPersonalizable}
                  />
                  <Label htmlFor="isPersonalizable">Personnalisable</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                  <Label htmlFor="isActive">Actif</Label>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  <Save className="mr-2 size-4" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variantes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Variantes ({product.variants.length})</CardTitle>
              <Button size="sm" onClick={() => { setVariantForm({ ...emptyVariant }); setVariantDialogOpen(true) }}>
                <Plus className="mr-2 size-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {product.variants.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune variante configurée</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Prix mod.</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Actif</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.variants.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.sku || '—'}</TableCell>
                          <TableCell>{formatCurrency(v.priceModifier)}</TableCell>
                          <TableCell>{v.stock}</TableCell>
                          <TableCell>
                            <Badge variant={v.isActive ? 'default' : 'secondary'}>
                              {v.isActive ? 'Oui' : 'Non'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteVariantId(v.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Images ({product.images.length})</CardTitle>
              <Button size="sm" onClick={() => { setImageForm({ ...emptyImage }); setImageDialogOpen(true) }}>
                <Plus className="mr-2 size-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {product.images.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune image ajoutée</p>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-h-96 overflow-y-auto">
                  {product.images
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((img) => (
                      <div key={img.id} className="group relative rounded-lg border overflow-hidden">
                        <div className="aspect-square bg-muted">
                          <img
                            src={img.url}
                            alt={img.altText}
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs truncate text-muted-foreground">{img.altText || 'Sans titre'}</p>
                          <p className="text-xs text-muted-foreground">Ordre : {img.sortOrder}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setDeleteImageId(img.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isPersonalizable && (
          <TabsContent value="personnalisation">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Options de personnalisation ({product.personalizationOptions.length})</CardTitle>
                <Button size="sm" onClick={() => { setPersoForm({ ...emptyPerso }); setPersoDialogOpen(true) }}>
                  <Plus className="mr-2 size-4" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent>
                {product.personalizationOptions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune option de personnalisation</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Requis</TableHead>
                          <TableHead>Ordre</TableHead>
                          <TableHead>Actif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {product.personalizationOptions.map((opt) => (
                          <TableRow key={opt.id}>
                            <TableCell>
                              <Badge variant="outline">{opt.type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{opt.label}</TableCell>
                            <TableCell>
                              <Badge variant={opt.isRequired ? 'default' : 'secondary'}>
                                {opt.isRequired ? 'Oui' : 'Non'}
                              </Badge>
                            </TableCell>
                            <TableCell>{opt.sortOrder}</TableCell>
                            <TableCell>
                              <Badge variant={opt.isActive ? 'default' : 'secondary'}>
                                {opt.isActive ? 'Oui' : 'Non'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletePersoId(opt.id)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Separator />

      <div className="flex justify-end">
        <Button variant="destructive" onClick={() => setDeleteProductOpen(true)}>
          <Trash2 className="mr-2 size-4" />
          Supprimer ce produit
        </Button>
      </div>

      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une variante</DialogTitle>
            <DialogDescription>Remplissez les informations de la nouvelle variante.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={variantForm.name}
                onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                placeholder="Ex : Taille M"
              />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={variantForm.sku}
                onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                placeholder="Ex : PROD-M"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modificateur de prix (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={variantForm.priceModifier}
                  onChange={(e) => setVariantForm({ ...variantForm, priceModifier: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={variantForm.stock}
                  onChange={(e) => setVariantForm({ ...variantForm, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={variantForm.isActive}
                onCheckedChange={(checked) => setVariantForm({ ...variantForm, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddVariant} disabled={variantSaving}>
              {variantSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteVariantId !== null}
        onOpenChange={(open) => { if (!open) setDeleteVariantId(null) }}
        title="Supprimer la variante"
        description="Êtes-vous sûr de vouloir supprimer cette variante ? Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleDeleteVariant}
        variant="destructive"
        loading={deleteVariantLoading}
      />

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une image</DialogTitle>
            <DialogDescription>Entrez l\'URL de l\'image à ajouter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL de l\'image *</Label>
              <Input
                value={imageForm.url}
                onChange={(e) => setImageForm({ ...imageForm, url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Texte alternatif</Label>
              <Input
                value={imageForm.altText}
                onChange={(e) => setImageForm({ ...imageForm, altText: e.target.value })}
                placeholder="Description de l\'image"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordre d\'affichage</Label>
              <Input
                type="number"
                min="0"
                value={imageForm.sortOrder}
                onChange={(e) => setImageForm({ ...imageForm, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddImage} disabled={imageSaving}>
              {imageSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteImageId !== null}
        onOpenChange={(open) => { if (!open) setDeleteImageId(null) }}
        title="Supprimer l\'image"
        description="Êtes-vous sûr de vouloir supprimer cette image ?"
        confirmLabel="Supprimer"
        onConfirm={handleDeleteImage}
        variant="destructive"
        loading={deleteImageLoading}
      />

      <Dialog open={persoDialogOpen} onOpenChange={setPersoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une option de personnalisation</DialogTitle>
            <DialogDescription>Configurez une nouvelle option de personnalisation pour ce produit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={persoForm.type}
                onValueChange={(val) => setPersoForm({ ...persoForm, type: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="text">Texte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Libellé *</Label>
              <Input
                value={persoForm.label}
                onChange={(e) => setPersoForm({ ...persoForm, label: e.target.value })}
                placeholder="Ex : Impression logo entreprise"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordre d\'affichage</Label>
              <Input
                type="number"
                min="0"
                value={persoForm.sortOrder}
                onChange={(e) => setPersoForm({ ...persoForm, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  checked={persoForm.isRequired}
                  onCheckedChange={(checked) => setPersoForm({ ...persoForm, isRequired: checked })}
                />
                <Label>Requis</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={persoForm.isActive}
                  onCheckedChange={(checked) => setPersoForm({ ...persoForm, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPersoDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddPerso} disabled={persoSaving}>
              {persoSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletePersoId !== null}
        onOpenChange={(open) => { if (!open) setDeletePersoId(null) }}
        title="Supprimer l\'option"
        description="Êtes-vous sûr de vouloir supprimer cette option de personnalisation ?"
        confirmLabel="Supprimer"
        onConfirm={handleDeletePerso}
        variant="destructive"
        loading={deletePersoLoading}
      />

      <ConfirmDialog
        open={deleteProductOpen}
        onOpenChange={setDeleteProductOpen}
        title="Supprimer le produit"
        description={`Êtes-vous sûr de vouloir supprimer le produit « ${product.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer définitivement"
        onConfirm={handleDeleteProduct}
        variant="destructive"
        loading={deleteProductLoading}
      />
    </div>
  )
}