'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, Trash2, ArrowUp, ArrowDown, ImageIcon, Eye, EyeOff, Save } from 'lucide-react'
import { PageHeader } from '@/components/admin/page-header'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { adminFetch, adminDelete, adminPatch } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface HeroItem {
  id: string
  url: string
  altText: string | null
  title: string | null
  text: string | null
  ctaLabel: string | null
  href: string | null
  objectPosition: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

/** Champs modifiables d'une bannière (form d'ajout et édition par carte). */
const emptyTexts = { altText: '', title: '', text: '', ctaLabel: '', href: '', objectPosition: 'center' }
type Texts = typeof emptyTexts

export default function AdminHeroPage() {
  const [items, setItems] = useState<HeroItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HeroItem | null>(null)
  const [altText, setAltText] = useState('')
  const [texts, setTexts] = useState<Texts>(emptyTexts)
  // Édition des textes d'une carte existante (brouillon par carte)
  const [drafts, setDrafts] = useState<Record<string, Texts>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch<HeroItem[]>('/api/admin/hero')
    if (res.success && res.data) {
      setItems(res.data)
      // Pré-remplit les brouillons d'édition avec les valeurs actuelles
      setDrafts(
        Object.fromEntries(
          res.data.map((it) => [
            it.id,
            {
              altText: it.altText ?? '',
              title: it.title ?? '',
              text: it.text ?? '',
              ctaLabel: it.ctaLabel ?? '',
              href: it.href ?? '',
              objectPosition: it.objectPosition ?? 'center',
            },
          ])
        )
      )
    } else if (!res.success && res.error) toast.error(res.error)
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
      if (texts.title.trim()) fd.append('title', texts.title.trim())
      if (texts.text.trim()) fd.append('text', texts.text.trim())
      if (texts.ctaLabel.trim()) fd.append('ctaLabel', texts.ctaLabel.trim())
      if (texts.href.trim()) fd.append('href', texts.href.trim())
      fd.append('objectPosition', texts.objectPosition || 'center')
      const res = await fetch('/api/admin/hero', { method: 'POST', body: fd })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (json.success) {
        toast.success('Image ajoutée à la bannière d\'accueil.')
        setAltText('')
        setTexts(emptyTexts)
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

  const saveTexts = async (item: HeroItem) => {
    const d = drafts[item.id] ?? emptyTexts
    setBusyId(item.id)
    const res = await adminPatch<HeroItem>(`/api/admin/hero/${item.id}`, {
      altText: d.altText,
      title: d.title,
      text: d.text,
      ctaLabel: d.ctaLabel,
      href: d.href,
      objectPosition: d.objectPosition || 'center',
    })
    if (res.success) {
      toast.success('Textes de la bannière enregistrés.')
      await load()
    } else {
      toast.error(res.error ?? 'Échec de l\'enregistrement.')
    }
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

  const textField = (id: string, field: keyof Texts, label: string, placeholder: string, maxLength: number) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-${field}`}>{label}</Label>
      <Input
        id={`${id}-${field}`}
        placeholder={placeholder}
        value={drafts[id]?.[field] ?? ''}
        onChange={(e) =>
          setDrafts((prev) => ({ ...prev, [id]: { ...emptyTexts, ...prev[id], [field]: e.target.value } }))
        }
        maxLength={maxLength}
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bannières d'accueil"
        description="Les photos qui défilent en haut de la page d'accueil. Ajoutez une image, modifiez ses textes, réordonnez, masquez ou supprimez : tout est appliqué immédiatement sur l'accueil."
      />

      {/* Zone d'ajout */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="alt">Description de l&apos;image (optionnel)</Label>
                <Input
                  id="alt"
                  placeholder="Ex. : Équipe de chantier équipée ITS Équipement"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  maxLength={180}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-title">Titre sur la bannière (optionnel)</Label>
                <Input
                  id="new-title"
                  placeholder="Ex. : Équiper vos équipes, sans compromis."
                  value={texts.title}
                  onChange={(e) => setTexts((p) => ({ ...p, title: e.target.value }))}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-text">Sous-titre (optionnel)</Label>
                <Input
                  id="new-text"
                  placeholder="Ex. : Protection et tenues pour le BTP, l'industrie."
                  value={texts.text}
                  onChange={(e) => setTexts((p) => ({ ...p, text: e.target.value }))}
                  maxLength={220}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new-cta">Libellé du bouton</Label>
                  <Input
                    id="new-cta"
                    placeholder="Ex. : Recevoir un devis"
                    value={texts.ctaLabel}
                    onChange={(e) => setTexts((p) => ({ ...p, ctaLabel: e.target.value }))}
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-href">Lien du bouton</Label>
                  <Input
                    id="new-href"
                    placeholder="Ex. : /demande-devis"
                    value={texts.href}
                    onChange={(e) => setTexts((p) => ({ ...p, href: e.target.value }))}
                    maxLength={300}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pos">Cadrage vertical de l&apos;image</Label>
                <Select
                  value={texts.objectPosition || 'center'}
                  onValueChange={(v) => setTexts((p) => ({ ...p, objectPosition: v }))}
                >
                  <SelectTrigger id="new-pos" className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Haut — le sujet est en haut de la photo</SelectItem>
                    <SelectItem value="center">Centre — cadrage équilibré (défaut)</SelectItem>
                    <SelectItem value="bottom">Bas — le sujet est en bas de la photo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Image recommandée : <b>1600 × 1000 px</b> (format paysage), JPG ou WEBP, <b>moins de 300 Ko</b>.
              L&apos;image est toujours affichée <b>pleine largeur et centrée</b> ; si votre sujet est coupé,
              changez le « cadrage vertical ». Les textes s&apos;affichent en bas sur un dégradé sombre, seulement
              s&apos;ils sont renseignés. Astuce : un lien <b>sans titre</b> rend toute l&apos;image cliquable.
            </p>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
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
                    <Upload className="h-4 w-4" /> Ajouter depuis la galerie
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
            Tant qu&apos;aucune image n&apos;est ajoutée ici, l&apos;accueil affiche automatiquement trois
            bannières colorées avec vos messages. Ajoutez votre première image pour personnaliser le carrousel.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const draftPos = drafts[item.id]?.objectPosition || item.objectPosition || 'center'
            const posCss =
              draftPos === 'top' ? 'center top' : draftPos === 'bottom' ? 'center bottom' : 'center center'
            return (
            <Card key={item.id} className={`overflow-hidden ${item.isActive ? '' : 'opacity-60'}`}>
              <div className="relative aspect-[16/10] w-full bg-muted">
                <img
                  src={item.url}
                  alt={item.altText ?? 'Image bannière'}
                  style={{ objectPosition: posCss }}
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute left-2 top-2 flex gap-1">
                  {index === 0 && item.isActive && <Badge>1re image affichée</Badge>}
                  {!item.isActive && <Badge variant="secondary">Masquée</Badge>}
                </div>
                {(item.title || item.text) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
                    {item.title && <p className="text-sm font-bold leading-tight text-white">{item.title}</p>}
                    {item.text && <p className="text-xs text-white/85">{item.text}</p>}
                  </div>
                )}
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

                {/* Édition complète de la bannière : description + textes affichés */}
                <details className="rounded-md border px-3 py-2">
                  <summary className="cursor-pointer list-none text-sm font-medium">
                    Modifier cette bannière
                    <span className="ml-2 text-xs text-muted-foreground">
                      {(item.title || item.text || item.ctaLabel) ? '— textes renseignés' : '— textes optionnels'}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {textField(item.id, 'altText', "Description de l'image", 'Ex. : Équipe de chantier équipée', 180)}
                    {textField(item.id, 'title', 'Titre', 'Ex. : Équiper vos équipes.', 120)}
                    {textField(item.id, 'text', 'Sous-titre', 'Ex. : BTP, industrie, logistique.', 220)}
                    <div className="grid grid-cols-2 gap-3">
                      {textField(item.id, 'ctaLabel', 'Bouton', 'Ex. : Recevoir un devis', 40)}
                      {textField(item.id, 'href', 'Lien', 'Ex. : /demande-devis', 300)}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`pos-${item.id}`}>Cadrage vertical (centrage du sujet)</Label>
                      <Select
                        value={draftPos}
                        onValueChange={(v) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: { ...emptyTexts, ...prev[item.id], objectPosition: v },
                          }))
                        }
                      >
                        <SelectTrigger id={`pos-${item.id}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Haut de la photo bien visible</SelectItem>
                          <SelectItem value="center">Centre (défaut)</SelectItem>
                          <SelectItem value="bottom">Bas de la photo bien visible</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        L&apos;aperçu ci-dessus applique immédiatement ce cadrage, comme sur l&apos;accueil.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={busyId === item.id}
                      onClick={() => saveTexts(item)}
                    >
                      {busyId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Enregistrer les modifications
                    </Button>
                  </div>
                </details>
              </CardContent>
            </Card>
            )
          })}
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
