'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { adminFetch, adminPost, adminPut, formatCurrency, formatDate, formatDateTime } from '@/lib/admin-api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  CalendarClock,
  ArrowRight,
  FileText,
  Package,
  FileDown,
  RefreshCw,
  Send,
  Ban,
  ShoppingCart,
  MoreVertical,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const

/* ================== Édition du devis (réductions entreprises) ================== */

interface AdminProductVariantLite {
  id: string
  name: string
  sku: string
  priceModifier: number
  isActive: boolean
}

interface AdminProductLite {
  id: string
  name: string
  sku: string
  basePrice: number
  isActive: boolean
  variants: AdminProductVariantLite[]
}

interface EditRow {
  key: string
  productId: string
  productVariantId?: string | null
  productName: string
  variantName?: string | null
  unitPrice: number
  quantity: number
  hasPersonalization: boolean
  personalizations: { optionId: string; value: unknown }[]
}

/** Convertit une valeur de personnalisation stockée (Json) au format accepté par l'API. */
function normalizePersoValue(value: unknown): Record<string, string> | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim()
    return text ? { text } : null
  }
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    const out: Record<string, string> = {}
    const pick = (keys: string[], target: string) => {
      for (const k of keys) {
        const val = v[k]
        if (typeof val === 'string' && val.trim()) {
          out[target] = val.trim()
          return
        }
      }
    }
    pick(['text', 'texte', 'value'], 'text')
    pick(['location', 'emplacement'], 'location')
    pick(['logoFileId'], 'logoFileId')
    pick(['logoFileName'], 'logoFileName')
    pick(['additionalNotes', 'instructions', 'note'], 'additionalNotes')
    return Object.keys(out).length > 0 ? out : null
  }
  return null
}

interface PersonalizationOption {
  id: string
  type: string
  label: string
}

interface Personalization {
  id: string
  value: string
  personalizationOption: PersonalizationOption
}

interface ProductVariant {
  id: string
  name: string
}

interface QuoteItem {
  id: string
  productId: string
  productVariantId: string
  productName: string
  unitPrice: number
  quantity: number
  hasPersonalization: boolean
  lineTotal: number
  productVariant: ProductVariant
  personalizations: Personalization[]
}

interface QuoteOrder {
  id: string
  orderNumber: string
  status: string
  totalAmountTTC: number
  createdAt: string
}

interface StatusHistoryEntry {
  id: string
  fromStatus: string
  toStatus: string
  createdAt: string
}

interface QuoteDetail {
  id: string
  quoteNumber: string
  pdfUrl: string
  pdfPath: string
  validUntil: string
  status: string
  subtotalHT: number
  discountAmount: number
  totalAmountHT: number
  tvaRate: number
  totalAmountTTC: number
  conditions: string
  createdAt: string
  updatedAt: string
  quoteRequest: {
    id: string
    reference: string
    client: {
      id: string
      companyName: string
      contactName: string
      email: string
      phone: string
      address: string
      city: string
      zipCode: string
      country: string
    }
  }
  items: QuoteItem[]
  orders: QuoteOrder[]
  statusHistory: StatusHistoryEntry[]
}

export default function DevisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [data, setData] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [createOrderLoading, setCreateOrderLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await adminFetch<QuoteDetail>(`/api/admin/quotes/${id}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
          setNewStatus(res.data.status)
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, refreshKey])

  const handleStatusChange = useCallback((value: string) => {
    setNewStatus(value)
  }, [])

  const handleOpenConfirm = useCallback(() => {
    if (newStatus && newStatus !== data?.status) {
      setConfirmOpen(true)
    }
  }, [newStatus, data?.status])

  const handleConfirmStatus = useCallback(async () => {
    setConfirmLoading(true)
    const res = await adminPut(`/api/admin/quotes/${id}`, { status: newStatus })
    setConfirmLoading(false)
    setConfirmOpen(false)
    if (res.success) {
      toast.success('Statut mis à jour avec succès')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error || 'Erreur lors de la mise à jour du statut')
      setNewStatus(data?.status ?? '')
    }
  }, [newStatus, id, data?.status])

  const handleGeneratePdf = useCallback(async () => {
    setPdfLoading(true)
    const res = await adminPost(`/api/admin/quotes/${id}/pdf`, {})
    setPdfLoading(false)
    if (res.success) {
      toast.success('PDF généré avec succès')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error ?? 'Erreur lors de la generation du PDF')
    }
  }, [id])

  const handleDownloadPdf = useCallback(() => {
    window.open(`/api/admin/quotes/${id}/pdf`, '_blank')
  }, [id])

  const handleSendQuote = useCallback(async () => {
    setPdfLoading(true)
    const genRes = await adminPost(`/api/admin/quotes/${id}/pdf`, {})
    if (!genRes.success) {
      setPdfLoading(false)
      toast.error(genRes.error ?? 'Erreur lors de la génération du PDF')
      return
    }
    const statusRes = await adminPut(`/api/admin/quotes/${id}`, { status: 'SENT' })
    setPdfLoading(false)
    if (statusRes.success) {
      toast.success('Devis généré et envoyé')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(statusRes.error || 'Erreur lors de l\'envoi')
    }
  }, [id])

  const handleCancelQuote = useCallback(async () => {
    const res = await adminPut(`/api/admin/quotes/${id}`, { status: 'CANCELLED' })
    if (res.success) {
      toast.success('Devis annulé')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error ?? 'Erreur lors de l\'annulation')
    }
  }, [id])

  const handleCreateOrder = useCallback(async () => {
    setCreateOrderLoading(true)
    const res = await adminPost<{ id: string }>(`/api/admin/orders/${id}`, {})
    setCreateOrderLoading(false)
    if (res.success && res.data) {
      toast.success('Commande créée avec succès')
      router.push(`/admin/orders/${res.data.id}`)
    } else {
      toast.error(res.error || 'Erreur lors de la création de la commande')
    }
  }, [id, router])

  /* ================== Édition du devis ================== */

  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [editDiscount, setEditDiscount] = useState('0')
  const [editTva, setEditTva] = useState('20')
  const [editValidUntil, setEditValidUntil] = useState('')
  const [editConditions, setEditConditions] = useState('')
  const [products, setProducts] = useState<AdminProductLite[]>([])
  const [addProductId, setAddProductId] = useState('')

  const canEditQuote = data ? !['ACCEPTED', 'CANCELLED', 'REJECTED'].includes(data.status) : false

  const openEdit = useCallback(() => {
    if (!data) return
    setEditRows(
      data.items.map((item) => ({
        key: item.id,
        productId: item.productId,
        productVariantId: item.productVariant?.id ?? null,
        productName: item.productName,
        variantName: item.productVariant?.name ?? null,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        hasPersonalization: item.hasPersonalization,
        personalizations: item.personalizations.map((p) => ({
          optionId: p.personalizationOption.id,
          value: p.value,
        })),
      }))
    )
    setEditDiscount(String(Number(data.discountAmount) || 0))
    setEditTva(String(Math.round(Number(data.tvaRate) * 100)))
    setEditValidUntil(data.validUntil ? data.validUntil.slice(0, 10) : '')
    setEditConditions(data.conditions ?? '')
    setEditOpen(true)
    // Charge la liste des produits pour l'ajout de lignes
    void (async () => {
      const res = await adminFetch<AdminProductLite[]>('/api/admin/products?limit=100&includeInactive=false')
      if (res.success && res.data) setProducts(res.data)
    })()
  }, [data])

  const updateRow = useCallback((key: string, patch: Partial<EditRow>) => {
    setEditRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }, [])

  const removeRow = useCallback((key: string) => {
    setEditRows((rows) => rows.filter((r) => r.key !== key))
  }, [])

  const addProductRow = useCallback(() => {
    const product = products.find((p) => p.id === addProductId)
    if (!product) return
    const variants = product.variants.filter((v) => v.isActive)
    const variant = variants.length === 1 ? variants[0] : undefined
    setEditRows((rows) => [
      ...rows,
      {
        key: `new-${Date.now()}`,
        productId: product.id,
        productVariantId: variant?.id ?? null,
        productName: product.name,
        variantName: variant?.name ?? null,
        unitPrice: Number(product.basePrice) + Number(variant?.priceModifier ?? 0),
        quantity: 1,
        hasPersonalization: false,
        personalizations: [],
      },
    ])
    setAddProductId('')
  }, [products, addProductId])

  const editTotals = useMemo(() => {
    const subtotal = editRows.reduce((sum, r) => sum + Number(r.unitPrice) * Number(r.quantity), 0)
    const discount = Math.min(Number(editDiscount) || 0, subtotal)
    const totalHT = subtotal - discount
    const tva = (totalHT * (Number(editTva) || 0)) / 100
    return { subtotal, discount, totalHT, tva, totalTTC: totalHT + tva }
  }, [editRows, editDiscount, editTva])

  const handleSelectProductForNewRow = useCallback((variantId: string) => {
    // Le Select "Ajouter un produit" liste les produits ; si un produit a des
    // variantes, on liste "Produit — Variante".
    setAddProductId(variantId)
  }, [])

  const saveEdit = useCallback(async () => {
    if (editRows.length === 0) {
      toast.error('Le devis doit contenir au moins un article')
      return
    }
    setEditLoading(true)
    const res = await adminPut(`/api/admin/quotes/${id}`, {
      items: editRows.map((r) => ({
        productId: r.productId,
        productVariantId: r.productVariantId ?? undefined,
        productName: r.variantName ? `${r.productName} (${r.variantName})` : r.productName,
        unitPrice: Number(r.unitPrice),
        quantity: Number(r.quantity),
        hasPersonalization: r.hasPersonalization,
        personalizations: r.personalizations
          .map((p) => ({ optionId: p.optionId, value: normalizePersoValue(p.value) }))
          .filter((p): p is { optionId: string; value: Record<string, string> } => p.value !== null),
      })),
      discountAmount: Number(editDiscount) || 0,
      tvaRate: (Number(editTva) || 0) / 100,
      conditions: editConditions || undefined,
      validUntil: editValidUntil ? new Date(editValidUntil + 'T12:00:00').toISOString() : undefined,
    })
    setEditLoading(false)
    if (res.success) {
      toast.success('Devis modifié avec succès')
      setEditOpen(false)
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error || 'Erreur lors de la modification du devis')
    }
  }, [editRows, editDiscount, editTva, editConditions, editValidUntil, id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/admin/quotes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <p className="text-muted-foreground">Devis introuvable.</p>
      </div>
    )
  }

  const hasPdf = !!data.pdfPath
  const isCancelled = data.status === 'CANCELLED' || data.status === 'REJECTED'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/quotes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{data.quoteNumber}</h1>
              <StatusBadge status={data.status} />
              {hasPdf && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Créé le {formatDateTime(data.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEditQuote && (
            <Button variant="outline" size="sm" onClick={openEdit} disabled={pdfLoading}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={pdfLoading || isCancelled}>
                {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleGeneratePdf}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {hasPdf ? 'Régénérer le PDF' : 'Générer le PDF'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPdf} disabled={!hasPdf}>
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger le PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSendQuote} disabled={isCancelled}>
                <Send className="mr-2 h-4 w-4" />
                Générer et envoyer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCancelQuote} disabled={isCancelled} className="text-destructive">
                <Ban className="mr-2 h-4 w-4" />
                Annuler le devis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={newStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleOpenConfirm}
            disabled={newStatus === data.status}
          >
            Appliquer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{data.quoteRequest.client.companyName}</p>
              <p className="text-sm text-muted-foreground">{data.quoteRequest.client.contactName}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{data.quoteRequest.client.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{data.quoteRequest.client.phone || '-'}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span>
                {data.quoteRequest.client.address || '-'}
                {data.quoteRequest.client.city && `, ${data.quoteRequest.client.city}`}
                {data.quoteRequest.client.zipCode && ` ${data.quoteRequest.client.zipCode}`}
                {data.quoteRequest.client.country && `, ${data.quoteRequest.client.country}`}
              </span>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Demande de devis</p>
              <Link href={`/admin/quote-requests/${data.quoteRequest.id}`} className="text-sm font-medium text-primary hover:underline">
                {data.quoteRequest.reference}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-5 w-5" />
                  Validité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatDate(data.validUntil)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  Total TTC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatCurrency(data.totalAmountTTC)}</p>
              </CardContent>
            </Card>
          </div>

          {data.conditions && (
            <Card>
              <CardHeader>
                <CardTitle>Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{data.conditions}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Articles ({data.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Personn.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>
                      {item.productVariant?.name ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.lineTotal)}</TableCell>
                    <TableCell>
                      {item.hasPersonalization && item.personalizations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.personalizations.map((p) => (
                            <Badge key={p.id} variant="outline">
                              {p.personalizationOption.label}: {p.value}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-right">
                    Sous-total HT
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(data.subtotalHT)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                {data.discountAmount > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-right">
                      Remise
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      -{formatCurrency(data.discountAmount)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">
                    Total HT
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(data.totalAmountHT)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-right">
                    TVA ({(data.tvaRate * 100).toFixed(0)}%)
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(data.totalAmountTTC - data.totalAmountHT)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-bold">
                    Total TTC
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(data.totalAmountTTC)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Historique des statuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.statusHistory.length > 0 ? (
            <div className="relative space-y-0">
              {data.statusHistory.map((entry, index) => (
                <div key={entry.id} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    {index < data.statusHistory.length - 1 && (
                      <div className="flex-1 w-px bg-border" />
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.fromStatus} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <StatusBadge status={entry.toStatus} />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun historique de statut.</p>
          )}
        </CardContent>
      </Card>

      {data.orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commandes associées ({data.orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(order.totalAmountTTC)}</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/orders/${order.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.status === 'ACCEPTED' && data.orders.length === 0 && !isCancelled && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Devis accepté par le client</p>
              <p className="text-sm text-muted-foreground">
                Vous pouvez maintenant créer la commande correspondante.
              </p>
            </div>
            <Button onClick={handleCreateOrder} disabled={createOrderLoading}>
              {createOrderLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              Créer la commande
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ================== Dialog modification du devis ================== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le devis {data.quoteNumber}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Lignes du devis */}
            <div className="space-y-2">
              <Label>Articles</Label>
              {editRows.map((row) => (
                <div key={row.key} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{row.productName}</p>
                      {row.variantName && (
                        <p className="text-xs text-muted-foreground">Variante : {row.variantName}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeRow(row.key)}
                      aria-label="Retirer cette ligne"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantité</Label>
                      <Input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prix unitaire (FCFA)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={row.unitPrice}
                        onChange={(e) => updateRow(row.key, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Total ligne</Label>
                      <p className="flex h-10 items-center text-sm font-semibold">
                        {formatCurrency(Number(row.unitPrice) * Number(row.quantity))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {editRows.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun article — ajoutez-en un ci-dessous.</p>
              )}

              {/* Ajouter un produit */}
              <div className="flex gap-2 pt-1">
                <Select value={addProductId} onValueChange={handleSelectProductForNewRow}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Ajouter un produit…" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) =>
                      p.variants.filter((v) => v.isActive).length > 1 ? (
                        p.variants
                          .filter((v) => v.isActive)
                          .map((v) => (
                            <SelectItem key={v.id} value={p.id}>
                              {p.name} — {v.name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({formatCurrency(p.basePrice)})
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addProductRow} disabled={!addProductId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>

            {/* Remise + TVA + validité */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="edit-discount">Remise (FCFA)</Label>
                <Input
                  id="edit-discount"
                  type="number"
                  min={0}
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Réduction demandée par l&apos;entreprise.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tva">TVA (%)</Label>
                <Input
                  id="edit-tva"
                  type="number"
                  min={0}
                  max={100}
                  value={editTva}
                  onChange={(e) => setEditTva(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-valid">Valable jusqu&apos;au</Label>
                <Input
                  id="edit-valid"
                  type="date"
                  value={editValidUntil}
                  onChange={(e) => setEditValidUntil(e.target.value)}
                />
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-1">
              <Label htmlFor="edit-conditions">Conditions</Label>
              <Textarea
                id="edit-conditions"
                rows={3}
                value={editConditions}
                onChange={(e) => setEditConditions(e.target.value)}
                placeholder="Conditions particulières du devis…"
              />
            </div>

            {/* Totaux recalculés */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatCurrency(editTotals.subtotal)}</span>
              </div>
              {editTotals.discount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Remise</span>
                  <span>-{formatCurrency(editTotals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total HT</span>
                <span>{formatCurrency(editTotals.totalHT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA ({Number(editTva) || 0}%)</span>
                <span>{formatCurrency(editTotals.tva)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total TTC</span>
                <span>{formatCurrency(editTotals.totalTTC)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
              Annuler
            </Button>
            <Button onClick={saveEdit} disabled={editLoading}>
              {editLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Changer le statut"
        description={`Voulez-vous vraiment changer le statut de ${data.status} vers ${newStatus} ?`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        onConfirm={handleConfirmStatus}
        loading={confirmLoading}
      />
    </div>
  )
}