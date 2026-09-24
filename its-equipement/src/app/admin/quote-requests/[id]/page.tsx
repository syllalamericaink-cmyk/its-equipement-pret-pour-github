'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { adminFetch, adminPatch, formatCurrency, formatDate, formatDateTime } from '@/lib/admin-api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
  Save,
  ExternalLink,
  FileText,
} from 'lucide-react'

const STATUSES = ['PENDING', 'REVIEWED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const

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

interface QuoteRequestItem {
  id: string
  productName: string
  productBasePrice: number
  unitPrice: number
  quantity: number
  hasPersonalization: boolean
  lineTotal: number
  productVariant: ProductVariant | null
  personalizations: Personalization[]
}

interface Quote {
  id: string
  quoteNumber: string
  status: string
  totalAmountTTC: number
  createdAt: string
}

interface QuoteRequestDetail {
  id: string
  reference: string
  status: string
  notes: string
  adminNotes: string
  createdAt: string
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
  items: QuoteRequestItem[]
  quotes: Quote[]
}

export default function DemandeDevisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [data, setData] = useState<QuoteRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminNotes, setAdminNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [uploads, setUploads] = useState<Record<string, { id: string; filename: string; originalName: string; url: string; mimeType: string; size: number }>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await adminFetch<QuoteRequestDetail>(`/api/admin/quote-requests/${id}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
          setAdminNotes(res.data.adminNotes ?? '')
          setNewStatus(res.data.status)
          const fileIds: string[] = []
          res.data.items.forEach((item) => {
            item.personalizations?.forEach((p) => {
              if (typeof p.value === 'object' && p.value !== null && 'logoFileId' in p.value) {
                fileIds.push(String((p.value as Record<string, unknown>).logoFileId))
              }
            })
          })
          if (fileIds.length > 0) {
            const uploadsRes = await adminFetch(`/api/admin/uploads?${fileIds.map(fid => `entityId=${fid}`).join('&')}`)
            if (uploadsRes.success && uploadsRes.data) {
              const map: Record<string, Record<string, unknown>> = {}
              const uItems = uploadsRes.data as unknown as Record<string, unknown>[]
              uItems.forEach((u) => { map[u.id as string] = u })
              setUploads(map as typeof uploads)
            }
          }
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, refreshKey])

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    const res = await adminPatch(`/api/admin/quote-requests/${id}`, { adminNotes })
    setSavingNotes(false)
    if (res.success) {
      toast.success('Notes enregistrees avec succes')
    } else {
      toast.error('Erreur lors de l\'enregistrement des notes')
    }
  }

  const handleStatusChange = (value: string) => {
    setNewStatus(value)
  }

  const handleOpenConfirm = () => {
    if (newStatus && newStatus !== data?.status) {
      setConfirmOpen(true)
    }
  }

  const handleConfirmStatus = async () => {
    setConfirmLoading(true)
    const res = await adminPatch(`/api/admin/quote-requests/${id}`, { status: newStatus })
    setConfirmLoading(false)
    setConfirmOpen(false)
    if (res.success) {
      toast.success('Statut mis a jour avec succes')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error('Erreur lors de la mise a jour du statut')
      setNewStatus(data?.status ?? '')
    }
  }

  const itemsTotal = data?.items.reduce((sum, item) => sum + item.lineTotal, 0) ?? 0

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
        <Button variant="ghost" onClick={() => router.push('/admin/quote-requests')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <p className="text-muted-foreground">Demande de devis introuvable.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/quote-requests')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{data.reference}</h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(data.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              <p className="font-medium">{data.client.companyName}</p>
              <p className="text-sm text-muted-foreground">{data.client.contactName}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{data.client.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{data.client.phone}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span>
                {data.client.address}
                {data.client.city && `, ${data.client.city}`}
                {data.client.zipCode && ` ${data.client.zipCode}`}
                {data.client.country && `, ${data.client.country}`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.notes && (
              <div>
                <p className="mb-1 text-sm font-medium">Notes du client</p>
                <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-sm font-medium">Notes administrateur</p>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ajouter des notes internes..."
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes || adminNotes === (data.adminNotes ?? '')}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {savingNotes ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles ({data.items.length})</CardTitle>
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
                  <TableHead>Personnalisation</TableHead>
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
                        <div className="flex flex-col gap-1">
                          {item.personalizations.map((p) => {
                            const raw = p.value
                            const val = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : null
                            const textVal = val && 'text' in val && val.text ? String(val.text) : ''
                            const locVal = val && 'location' in val && val.location ? String(val.location) : ''
                            const logoId = val && 'logoFileId' in val && val.logoFileId ? String(val.logoFileId) : ''
                            return (
                              <div key={p.id} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1">
                                <span className="font-medium text-muted-foreground">{p.personalizationOption.label}</span>
                                {textVal && <span className="ml-1">{textVal}</span>}
                                {locVal && <Badge variant="outline" className="ml-1">{locVal}</Badge>}
                                {logoId && uploads[logoId] && (
                                  <a
                                    href={String(uploads[logoId].url)}
                                    download={String(uploads[logoId].originalName)}
                                    className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {String(uploads[logoId].originalName)}
                                  </a>
                                )}
                              </div>
                            )
                          })}
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
                  <TableCell colSpan={4} className="text-right font-bold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(itemsTotal)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {data.quotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Devis associes ({data.quotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={quote.status} />
                    <span className="font-medium">{quote.quoteNumber}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(quote.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(quote.totalAmountTTC)}</span>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/admin/quotes/${quote.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir
                      </a>
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
