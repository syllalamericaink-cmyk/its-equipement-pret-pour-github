'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { adminFetch, adminPost, adminPatch, formatCurrency, formatDate, formatDateTime } from '@/lib/admin-api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  MoreVertical,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const

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
    const res = await adminPatch(`/api/admin/quotes/${id}`, { status: newStatus })
    setConfirmLoading(false)
    setConfirmOpen(false)
    if (res.success) {
      toast.success('Statut mis a jour avec succes')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error('Erreur lors de la mise a jour du statut')
      setNewStatus(data?.status ?? '')
    }
  }, [newStatus, id, data?.status])

  const handleGeneratePdf = useCallback(async () => {
    setPdfLoading(true)
    const res = await adminPost(`/api/admin/quotes/${id}/pdf`, {})
    setPdfLoading(false)
    if (res.success) {
      toast.success('PDF genere avec succes')
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
      toast.error(genRes.error ?? 'Erreur lors de la generation du PDF')
      return
    }
    const statusRes = await adminPatch(`/api/admin/quotes/${id}`, { status: 'SENT' })
    setPdfLoading(false)
    if (statusRes.success) {
      toast.success('Devis genere et envoye')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error('Erreur lors de l\'envoi')
    }
  }, [id])

  const handleCancelQuote = useCallback(async () => {
    const res = await adminPatch(`/api/admin/quotes/${id}`, { status: 'CANCELLED' })
    if (res.success) {
      toast.success('Devis annule')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error ?? 'Erreur lors de l\'annulation')
    }
  }, [id])

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
            <p className="mt-1 text-sm text-muted-foreground">Cree le {formatDateTime(data.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                {hasPdf ? 'Regenerer le PDF' : 'Generer le PDF'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPdf} disabled={!hasPdf}>
                <FileDown className="mr-2 h-4 w-4" />
                Telecharger le PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSendQuote} disabled={isCancelled}>
                <Send className="mr-2 h-4 w-4" />
                Generer et envoyer
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
                  Validite
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
                  <TableHead className="text-right">Quantite</TableHead>
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
            <CardTitle>Commandes associees ({data.orders.length})</CardTitle>
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