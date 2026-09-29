'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, Trash2, ArrowUp, ArrowDown, ImageIcon, Eye, EyeOff } from 'lucide-react'
import { PageHeader } from '@/components/admin/page-header'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { adminFetch, adminDelete, adminPatch } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface HeroItem {
  id: string
  url: string
  altText: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export default function AdminHeroPage() {
  const [items, setItems] = useState<HeroItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HeroItem | null>(null)
  const [altText, setAltText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch<HeroItem[]>('/api/admin/hero')
    if (res.success && res.data) setItems(res.data)
    else if (!res.success && res.error) toast.error(res.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (altText.trim()) fd.append('altText', altText.trim())
      const res = await fetch('/api/admin/hero', { method: 'POST', body: fd })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (json.success) {
        toast.success('Image ajoutée à la bannière d\'accueil.')
        setAltText('')
        if (fileRef.current) fileRef.current.value = ''
        await load()
      } else {
        toast.error(json.error ?? 'Échec de l\'ajout.')
      }
    } catch {
      toast.error('Erreur réseau pendant l\'envoi.')
    } finally {
      setUploading(false)
    }
  }

  const toggleActive = async (item: HeroItem) => {
    setBusyId(item.id)
    const res = await adminPatch<HeroItem>(`/api/admin/hero/${item.id}`, {
      isActive: !item.isActive,
    })
    if (res.success) await load()
    else toast.error(res.error ?? 'Échec de la modification.')
    setBusyId(null)
  }

  const move = async (item: HeroItem, direction: 'up' | 'down') => {
    setBusyId(item.id)
    const res = await adminPatch(`/api/admin/hero/${item.id}`, { move: direction })
    if (res.success) await load()
    else toast.error(res.error ?? 'Échec du déplacement.')
    setBusyId(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    const res = await adminDelete(`/api/admin/hero/${deleteTarget.id}`)
    if (res.success) {
      toast.success('Image supprimée.')
      await load()
    } else {
      toast.error(res.error ?? 'Échec de la suppression.')
    }
    setBusyId(null)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Images d'accueil"
        description="Ajoutez les photos de la grande bannière sur la page d'accueil du site. La première image active apparaît en premier."
      />

      {/* Zone d'ajout */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="alt">Description de l&apos;image (optionnel)</Label>
              <Input
                id="alt"
                placeholder="Ex. : Équipe de chantier équipée ITS Équipement"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                maxLength={180}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP ou AVIF — 4 Mo maximum. Idéal : image large (paysage), ~1600 × 1280 px.
              </p>
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                id="hero-file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                }}
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Ajouter une image
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Aucune image pour le moment</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Tant qu&apos;aucune image n&apos;est ajoutée ici, la bannière d&apos;accueil affiche
            automatiquement une photo de vos produits. Ajoutez votre première image pour
            personnaliser l&apos;accueil.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <Card key={item.id} className={`overflow-hidden ${item.isActive ? '' : 'opacity-60'}`}>
              <div className="relative aspect-[5/4] w-full bg-muted">
                <img
                  src={item.url}
                  alt={item.altText ?? 'Image bannière'}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-2 top-2 flex gap-1">
                  {index === 0 && item.isActive && <Badge>1re image affichée</Badge>}
                  {!item.isActive && <Badge variant="secondary">Masquée</Badge>}
                </div>
              </div>
              <CardContent className="space-y-2 p-3">
                <p className="truncate text-sm font-medium">
                  {item.altText || 'Sans description'}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 px-2"
                    disabled={busyId === item.id || index === 0}
                    onClick={() => move(item, 'up')}
                  >
                    <ArrowUp className="h-3.5 w-3.5" /> Monter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 px-2"
                    disabled={busyId === item.id || index === items.length - 1}
                    onClick={() => move(item, 'down')}
                  >
                    <ArrowDown className="h-3.5 w-3.5" /> Descendre
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 px-2"
                    disabled={busyId === item.id}
                    onClick={() => toggleActive(item)}
                  >
                    {item.isActive ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Masquer
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Afficher
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="ml-auto h-8 px-2"
                    disabled={busyId === item.id}
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cette image ?"
        description="Elle ne sera plus affichée sur la page d'accueil. Cette action est définitive."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
