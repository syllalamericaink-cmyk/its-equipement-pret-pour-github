'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { adminFetch, adminPatch, adminDelete, formatCurrency, formatDate, formatDateTime } from '@/lib/admin-api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  ArrowRight,
  Package,
  CreditCard,
  Truck,
  FileText,
  StickyNote,
  Receipt,
  Palette,
} from 'lucide-react'
import Link from 'next/link'

const STATUSES = ['CONFIRMED', 'ACOMPTE_RECU', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'PAIEMENT_A_LIVRAISON', 'CANCELLED'] as const

const VALID_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
  ACOMPTE_RECU: ['IN_PRODUCTION', 'CANCELLED'],
  PAIEMENT_A_LIVRAISON: ['CANCELLED'],
  IN_PRODUCTION: ['READY', 'CANCELLED'],
  READY: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

interface PersonalizationOption {
  id: string
  type: string
  label: string
}

interface Personalization {
  id: string
  value: unknown
  personalizationOption: PersonalizationOption
}

interface ProductVariant {
  id: string
  name: string
}

interface OrderItem {
  id: string
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
  hasPersonalization: boolean
  productVariant: ProductVariant
  personalizations: Personalization[]
}

interface Payment {
  id: string
  type: string
  amount: number
  method: string
  status: string
  transactionRef: string
  dueDate: string
  paidAt: string
  notes: string
  createdAt: string
}

interface Delivery {
  id: string
  status: string
  trackingNumber: string
  carrier: string
  estimatedDelivery: string
  deliveredAt: string
  notes: string
}

interface StatusHistoryEntry {
  id: string
  fromStatus: string
  toStatus: string
  createdAt: string
}

interface OrderDetail {
  id: string
  orderNumber: string
  status: string
  hasPersonalization: boolean
  paymentMethod: string
  subtotalHT: number
  totalAmountHT: number
  tvaRate: number
  totalAmountTTC: number
  depositAmount: number
  depositPercentage: number
  balanceAmount: number
  balancePercentage: number
  notes: string
  createdAt: string
  updatedAt: string
  quote: {
    id: string
    quoteNumber: string
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
  }
  items: OrderItem[]
  payments: Payment[]
  delivery: Delivery
  statusHistory: StatusHistoryEntry[]
}

export default function CommandeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [data, setData] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [uploads, setUploads] = useState<Record<string, { id: string; filename: string; originalName: string; url: string; mimeType: string; size: number }>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await adminFetch<OrderDetail>(`/api/admin/orders/${id}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
          setNewStatus(res.data.status)
          const fileIds: string[] = []
          res.data.items.forEach((item) => {
            item.personalizations.forEach((p) => {
              const val = p.value as Record<string, unknown> | null
              if (val && typeof val.logoFileId === 'string' && val.logoFileId) {
                fileIds.push(val.logoFileId)
              }
            })
          })
          if (fileIds.length > 0) {
            const uploadsRes = await adminFetch(`/api/admin/uploads?${fileIds.map(fid => `entityId=${fid}`).join('&')}`)
            if (uploadsRes.success && uploadsRes.data) {
              const map: Record<string, Record<string, unknown>> = {}
              const items = uploadsRes.data as unknown as Record<string, unknown>[]
              items.forEach((u) => { map[u.id as string] = u })
              setUploads(map as typeof uploads)
            }
          }
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, refreshKey])

  const allowedTransitions = data ? VALID_TRANSITIONS[data.status] ?? [] : []

  const handleStatusChange = useCallback((value: string) => {
    setNewStatus(value)
  }, [])

  const handleOpenConfirm = useCallback(() => {
    if (newStatus && newStatus !== data?.status) {
      if (!allowedTransitions.includes(newStatus)) {
        toast.error('Transition de statut non autorisee')
        setNewStatus(data?.status ?? '')
        return
      }
      setConfirmOpen(true)
    }
  }, [newStatus, data?.status, allowedTransitions])

  const handleConfirmStatus = useCallback(async () => {
    setConfirmLoading(true)
    const res = await adminPatch(`/api/admin/orders/${id}`, { status: newStatus })
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <p className="text-muted-foreground">Commande introuvable.</p>
      </div>
    )
  }

  const tvaAmount = data.totalAmountTTC - data.totalAmountHT

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{data.orderNumber}</h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Creee le {formatDateTime(data.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={newStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => {
                const isAllowed = allowedTransitions.includes(s) || s === data.status
                return (
                  <SelectItem key={s} value={s} disabled={!isAllowed}>
                    {s}
                  </SelectItem>
                )
              })}
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
              <p className="font-medium">{data.quote.quoteRequest.client.companyName}</p>
              <p className="text-sm text-muted-foreground">{data.quote.quoteRequest.client.contactName}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{data.quote.quoteRequest.client.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{data.quote.quoteRequest.client.phone}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span>
                {data.quote.quoteRequest.client.address}
                {data.quote.quoteRequest.client.city && `, ${data.quote.quoteRequest.client.city}`}
                {data.quote.quoteRequest.client.zipCode && ` ${data.quote.quoteRequest.client.zipCode}`}
                {data.quote.quoteRequest.client.country && `, ${data.quote.quoteRequest.client.country}`}
              </span>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Devis</p>
              <Link href={`/admin/quotes/${data.quote.id}`} className="text-sm font-medium text-primary hover:underline">
                {data.quote.quoteNumber}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Demande de devis</p>
              <Link href={`/admin/quote-requests/${data.quote.quoteRequest.id}`} className="text-sm font-medium text-primary hover:underline">
                {data.quote.quoteRequest.reference}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  Montant HT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatCurrency(data.totalAmountHT)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-5 w-5" />
                  TVA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatCurrency(tvaAmount)}</p>
                <p className="text-sm text-muted-foreground">{(data.tvaRate * 100).toFixed(0)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5" />
                  Montant TTC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatCurrency(data.totalAmountTTC)}</p>
              </CardContent>
            </Card>
            {data.hasPersonalization && (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-5 w-5" />
                      Acompte
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{formatCurrency(data.depositAmount)}</p>
                    <p className="text-sm text-muted-foreground">{data.depositPercentage}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-5 w-5" />
                      Solde
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{formatCurrency(data.balanceAmount)}</p>
                    <p className="text-sm text-muted-foreground">{data.balancePercentage}%</p>
                  </CardContent>
                </Card>
              </>
            )}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5" />
                  Mode de paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StatusBadge status={data.paymentMethod} />
              </CardContent>
            </Card>
          </div>
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
                      {item.hasPersonalization ? (
                        <Badge variant="default">Oui</Badge>
                      ) : (
                        <Badge variant="outline">Non</Badge>
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
                    {formatCurrency(tvaAmount)}
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

      {data.hasPersonalization && data.items.some((item) => item.hasPersonalization) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Personnalisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.items.filter((item) => item.hasPersonalization).map((item, idx) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{idx + 1}. {item.productName}</h4>
                    <Badge variant="outline">Personnalise</Badge>
                  </div>
                  {item.personalizations?.length ? (
                    <div className="space-y-3">
                      {item.personalizations.map((perso) => {
                        const raw = perso.value
                        const val = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : null
                        const textVal = val?.text ? String(val.text) : ''
                        const locVal = val?.location ? String(val.location) : ''
                        const logoId = val?.logoFileId ? String(val.logoFileId) : ''
                        const noteVal = val?.additionalNotes ? String(val.additionalNotes) : ''
                        const opt = perso.personalizationOption
                        return (
                          <div key={perso.id} className="flex flex-col gap-2 rounded-md bg-muted/50 p-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={opt.type === 'logo' ? 'default' : 'secondary'}>
                                {opt.type === 'logo' ? 'Logo' : 'Texte'}
                              </Badge>
                              <span className="text-sm font-medium">{opt.label}</span>
                            </div>
                            {textVal && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Texte :</span> {textVal}
                              </div>
                            )}
                            {locVal && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Emplacement :</span> {locVal}
                              </div>
                            )}
                            {logoId && uploads[logoId] && (
                              <div className="flex items-center gap-2 rounded-md border bg-background p-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{String(uploads[logoId].originalName)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(Number(uploads[logoId].size) / 1024).toFixed(1)} Ko - {String(uploads[logoId].mimeType)}
                                  </p>
                                </div>
                                <a
                                  href={String(uploads[logoId].url)}
                                  download={String(uploads[logoId].originalName)}
                                  className="flex-shrink-0 text-primary hover:underline text-sm"
                                >
                                  Telecharger
                                </a>
                              </div>
                            )}
                            {noteVal && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Note :</span> {noteVal}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun detail de personnalisation.</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Paiements ({data.payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Methode</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <StatusBadge status={payment.type} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.method || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.transactionRef || '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell>
                        {payment.paidAt
                          ? formatDateTime(payment.paidAt)
                          : payment.dueDate
                            ? formatDate(payment.dueDate)
                            : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {payment.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun paiement enregistre.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Livraison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.delivery ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Statut</p>
                <div className="mt-1"><StatusBadge status={data.delivery.status} /></div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transporteur</p>
                <p className="mt-1">{data.delivery.carrier || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Numero de suivi</p>
                <p className="mt-1 font-mono">{data.delivery.trackingNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date estimee</p>
                <p className="mt-1">{data.delivery.estimatedDelivery ? formatDate(data.delivery.estimatedDelivery) : '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date de livraison</p>
                <p className="mt-1">{data.delivery.deliveredAt ? formatDateTime(data.delivery.deliveredAt) : '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="mt-1">{data.delivery.notes || '-'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune information de livraison.</p>
          )}
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

      {data.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{data.notes}</p>
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