'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { StatusBadge } from '@/components/admin/status-badge'
import { adminFetch, adminPost, adminPatch, formatDateTime } from '@/lib/admin-api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Package,
  AlertTriangle,
  RefreshCw,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' FCFA'

const VALID_TRANSITIONS: Record<string, string[]> = {
  NOUVELLE_COMMANDE: ['CLIENT_CONTACTE', 'ANNULEE'],
  CLIENT_CONTACTE: ['DEVIS_EN_PREPARATION', 'ANNULEE'],
  DEVIS_EN_PREPARATION: ['DEVIS_ENVOYE', 'ANNULEE'],
  DEVIS_ENVOYE: ['DEVIS_ACCEPTE', 'DEVIS_REFUSE'],
  DEVIS_ACCEPTE: ['COMMANDE_CONFIRMEE', 'ANNULEE'],
  DEVIS_REFUSE: ['ANNULEE'],
  COMMANDE_CONFIRMEE: ['EN_PREPARATION', 'ANNULEE'],
  EN_PREPARATION: ['LIVREE'],
  LIVREE: [],
  ANNULEE: [],
}

interface PersonalizationDetail {
  impression: boolean
  logo: boolean
  texte: string | null
  emplacement: string | null
  taille: string | null
  couleur: string | null
}

interface OrderItem {
  id: string
  productName: string
  variantName: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  personalization: PersonalizationDetail | null
}

interface StatusHistoryEntry {
  id: string
  status: string
  createdAt: string
}

interface LinkedQuote {
  id: string
  quoteNumber: string
  status: string
}

interface PublicOrderDetail {
  id: string
  orderNumber: string
  status: string
  clientName: string
  clientPhone: string
  clientEmail: string
  clientType: string
  city: string
  commune: string
  address: string
  subtotal: number
  deliveryFee: number
  totalAmount: number
  deliveryComment: string | null
  notificationStatus: string | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  statusHistory: StatusHistoryEntry[]
  quote: LinkedQuote | null
}

function PersonalizationSection({ p }: { p: PersonalizationDetail }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-l-2 border-muted pl-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Personnalisation
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Impression : </span>
            <span className="font-medium">{p.impression ? 'Oui' : 'Non'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Logo : </span>
            <span className="font-medium">{p.logo ? 'Oui' : 'Non'}</span>
          </div>
          {p.texte && (
            <div>
              <span className="text-muted-foreground">Texte : </span>
              <span className="font-medium">{p.texte}</span>
            </div>
          )}
          {p.emplacement && (
            <div>
              <span className="text-muted-foreground">Emplacement : </span>
              <span className="font-medium">{p.emplacement}</span>
            </div>
          )}
          {p.taille && (
            <div>
              <span className="text-muted-foreground">Taille : </span>
              <span className="font-medium">{p.taille}</span>
            </div>
          )}
          {p.couleur && (
            <div>
              <span className="text-muted-foreground">Couleur : </span>
              <span className="font-medium">{p.couleur}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CommandeDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [data, setData] = useState<PublicOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [devisLoading, setDevisLoading] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await adminFetch<PublicOrderDetail>(`/api/admin/public-orders/${id}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, refreshKey])

  const allowedTransitions = data ? (VALID_TRANSITIONS[data.status] ?? []) : []

  const handleStatusChange = useCallback(async () => {
    if (!newStatus) return
    setStatusLoading(true)
    const res = await adminPatch(`/api/admin/public-orders/${id}`, { status: newStatus })
    setStatusLoading(false)
    if (res.success) {
      toast.success('Statut mis a jour avec succes')
      setNewStatus('')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error ?? 'Erreur lors de la mise a jour du statut')
    }
  }, [newStatus, id])

  const handleCreateDevis = useCallback(async () => {
    setDevisLoading(true)
    const res = await adminPost<{ quoteId: string }>(`/api/admin/public-orders/${id}/create-devis`, {})
    setDevisLoading(false)
    if (res.success) {
      toast.success('Devis cree avec succes')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error ?? 'Erreur lors de la creation du devis')
    }
  }, [id])

  const handleRetryNotification = useCallback(async () => {
    setRetryLoading(true)
    const res = await adminPost(`/api/admin/public-orders/${id}/retry-notification`, {})
    setRetryLoading(false)
    if (res.success) {
      toast.success('Notification envoyee avec succes')
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(res.error ?? 'Erreur lors du renvoi de la notification')
    }
  }, [id])

  if (!session) return null

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
        <Button variant="ghost" onClick={() => router.push('/admin/commandes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <p className="text-muted-foreground">Commande introuvable.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/commandes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{data.orderNumber}</h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(data.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nom</span>
              <span className="font-medium">{data.clientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Telephone</span>
              <span className="font-medium">{data.clientPhone || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="font-medium">{data.clientEmail || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge variant="outline">{data.clientType || '-'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ville</span>
              <span className="font-medium">{data.city || '-'}</span>
            </div>
            {data.commune && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Commune</span>
                <span className="font-medium">{data.commune}</span>
              </div>
            )}
            {data.address && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-muted-foreground shrink-0">Adresse</span>
                <span className="font-medium text-right">{data.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
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
                      <TableHead className="hidden sm:table-cell">Variante</TableHead>
                      <TableHead className="text-right">Qte</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Prix unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <>
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {item.variantName || '-'}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.lineTotal)}
                          </TableCell>
                        </TableRow>
                        {item.personalization && (
                          <TableRow key={`${item.id}-perso`}>
                            <TableCell colSpan={5} className="p-2">
                              <div className="px-2 py-1">
                                <PersonalizationSection p={item.personalization} />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right">
                        Sous-total
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell" />
                      <TableCell className="text-right">
                        {formatCurrency(data.subtotal)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right">
                        Livraison
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell" />
                      <TableCell className="text-right">
                        {formatCurrency(data.deliveryFee)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">
                        Total
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell" />
                      <TableCell className="text-right font-bold">
                        {formatCurrency(data.totalAmount)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  Montants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{formatCurrency(data.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Livraison</span>
                  <span className="font-medium">{formatCurrency(data.deliveryFee)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-lg">{formatCurrency(data.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.deliveryComment && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-5 w-5" />
                    Commentaire de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{data.deliveryComment}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {data.quote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Devis associe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">{data.quote.quoteNumber}</span>
                <StatusBadge status={data.quote.status} />
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/quotes/${data.quote.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir le devis
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique des statuts</CardTitle>
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
                    <StatusBadge status={entry.status} />
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

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {allowedTransitions.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium">Changer le statut</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTransitions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStatusChange}
                disabled={!newStatus || statusLoading}
              >
                {statusLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Changer le statut
              </Button>
            </div>
          )}

          {!data.quote && (
            <Button
              variant="outline"
              onClick={handleCreateDevis}
              disabled={devisLoading}
            >
              {devisLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileText className="mr-2 h-4 w-4" />
              Creer un devis
            </Button>
          )}

          {data.notificationStatus === 'FAILED' && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Notification non envoyee</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryNotification}
                disabled={retryLoading}
              >
                {retryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-2 h-4 w-4" />
                Reessayer l'envoi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}