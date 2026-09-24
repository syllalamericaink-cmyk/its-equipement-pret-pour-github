'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/admin/page-header'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { adminFetch, adminPost, adminPut, adminDelete, formatDateTime } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: { products: number }
}

interface FormData {
  name: string
  slug: string
  description: string
  imageUrl: string
  sortOrder: number
  isActive: boolean
}

const emptyForm: FormData = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch<Category[]>('/api/admin/categories?includeInactive=true')
      if (res.success) {
        setCategories(res.data ?? [])
      } else {
        toast.error('Erreur lors du chargement des categories')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase().trim()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, search])

  const openCreateDialog = () => {
    setEditing(null)
    setForm(emptyForm)
    setSlugManuallyEdited(false)
    setDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditing(category)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    })
    setSlugManuallyEdited(true)
    setDialogOpen(true)
  }

  const handleNameChange = (name: string) => {
    setForm((prev) => {
      const updated = { ...prev, name }
      if (!slugManuallyEdited) {
        updated.slug = generateSlug(name)
      }
      return updated
    })
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    if (!form.slug.trim()) {
      toast.error('Le slug est requis')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      }

      if (editing) {
        const res = await adminPut<Category>(`/api/admin/categories/${editing.id}`, body)
        if (res.success) {
          toast.success('Categorie mise a jour avec succes')
          setDialogOpen(false)
          fetchCategories()
        } else {
          toast.error('Erreur lors de la mise a jour')
        }
      } else {
        const res = await adminPost<Category>('/api/admin/categories', body)
        if (res.success) {
          toast.success('Categorie creee avec succes')
          setDialogOpen(false)
          fetchCategories()
        } else {
          toast.error('Erreur lors de la creation')
        }
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await adminDelete(`/api/admin/categories/${deleteTarget.id}`)
      if (res.success) {
        toast.success('Categorie supprimee avec succes')
        setDeleteTarget(null)
        fetchCategories()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <PageHeader title="Categories" description="Gestion des categories de produits." />
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle categorie
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="hidden md:table-cell">Slug</TableHead>
              <TableHead>Produits</TableHead>
              <TableHead className="hidden sm:table-cell">Ordre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {search ? 'Aucune categorie trouvee.' : 'Aucune categorie.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{category.slug}</TableCell>
                  <TableCell>{category._count.products}</TableCell>
                  <TableCell className="hidden sm:table-cell">{category.sortOrder}</TableCell>
                  <TableCell>
                    {category.isActive ? (
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDateTime(category.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(category)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la categorie' : 'Nouvelle categorie'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modifiez les informations de la categorie.' : 'Remplissez les informations pour creer une nouvelle categorie.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nom de la categorie"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true)
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }}
                placeholder="nom-de-la-categorie"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la categorie"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">URL de l'image</Label>
              <Input
                id="imageUrl"
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Ordre d'affichage</Label>
              <Input
                id="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Categorie active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Enregistrer' : 'Creer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Supprimer la categorie"
        description={deleteTarget ? `Voulez-vous vraiment supprimer la categorie \u00ab ${deleteTarget.name} \u00bb ? Cette action est irreversible.${deleteTarget._count.products > 0 ? ` ${deleteTarget._count.products} produit(s) associe(s).` : ''}` : ''}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        variant="destructive"
        loading={deleting}
      />
    </div>
  )
}
