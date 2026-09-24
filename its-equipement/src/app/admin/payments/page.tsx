'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { DataTable } from '@/components/admin/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { adminFetch, adminPost, formatCurrency, formatDate, formatDateTime } from '@/lib/admin-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Clock, CheckCircle2, XCircle, RotateCcw, Ban, MoreHorizontal, ExternalLink } from 'lucide-react'

const STATUSES = ['EN_ATTENTE', 'PAYE', 'ECHEC', 'ANNULE', 'REMBOURSE'] as const

interface Payment {
  id: string
  orderId: string
  type: string
  amount: number
  currency: string
  method: string | null
  provider: string | null
  providerRef: string | null
  status: string
  transactionRef: string | null
  dueDate: string | null
  paidAt: string | null
  receiptUrl: string | null
  notes: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string
    totalAmountTTC: number
    quote: {
      quoteRequest: {
        client: {
          companyName: string
        }
      }
    }
  }
}

interface Summary {
  enAttente: number
  paye: number
  echec: number
}

export default function PaiementsPage() {
  const [data, setData] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary>({ enAttente: 0, paye: 0, echec: 0 })
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null)
  const [actionDialog, setActionDialog] = useState<{ type: 'fail' | 'cancel' | 'refund'; id: string } | null>(null)
  const [failReason, setFailReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await adminFetch<Payment[]>(`/api/admin/payments?limit=9999`)
      if (!cancelled && res.success && res.data) {
        const s: Summary = { enAttente: 0, paye: 0, echec: 0 }
        for (const p of res.data) {
          if (p.status === 'EN_ATTENTE') s.enAttente += p.amount
          else if (p.status === 'PAYE') s.paye += p.amount
          else if (p.status === 'ECHEC') s.echec += p.amount
        }
        setSummary(s)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      })
      if (statusFilter) {
        params.set('status', statusFilter)
      }
      const res = await adminFetch<Payment[]>(`/api/admin/payments?${params}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
          setTotal(res.meta?.total ?? 0)
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page, limit, search, statusFilter])

  const handleSearchChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  const handlePageChange = useCallback((p: number) => {
    setPage(p)
  }, [])

  const handleLimitChange = useCallback((l: number) => {
    setLimit(l)
    setPage(1)
  }, [])

  const refresh = useCallback(() => {
    setPage(p => p)
  }, [])

  const handleConfirm = async () => {
    if (!confirmDialogId) return
    setActionLoading(true)
    await adminPost(`/api/admin/payments/${confirmDialogId}?action=confirm`, {})
    setActionLoading(false)
    setConfirmDialogId(null)
    refresh()
  }

  const handleAction = async () => {
    if (!actionDialog) return
    setActionLoading(true)
    if (actionDialog.type === 'fail') {
      await adminPost(`/api/admin/payments/${actionDialog.id}?action=fail`, { reason: failReason })
    } else if (actionDialog.type === 'cancel') {
      await adminPost(`/api/admin/payments/${actionDialog.id}?action=cancel`, {})
    } else if (actionDialog.type === 'refund') {
      await adminPost(`/api/admin/payments/${actionDialog.id}?action=refund`, {})
    }
    setActionLoading(false)
    setActionDialog(null)
    setFailReason('')
    refresh()
  }

  const columns = [
    {
      key: 'orderNumber',
      header: 'Commande',
      render: (item: Payment) => (
        <Link href={`/admin/orders/${item.order.id}`} className="font-medium text-primary hover:underline">
          {item.order.orderNumber}
        </Link>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (item: Payment) => (
        <span className="font-medium">{item.order.quote.quoteRequest.client.companyName}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: Payment) => <StatusBadge status={item.type} />,
    },
    {
      key: 'amount',
      header: 'Montant',
      className: 'text-right',
      render: (item: Payment) => (
        <span className="font-medium">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'method',
      header: 'Methode',
      render: (item: Payment) => (
        <div className="flex flex-col gap-0.5">
          <span>{item.method || '—'}</span>
          {item.provider && (
            <span className="text-xs text-muted-foreground">{item.provider}{item.providerRef ? ` (${item.providerRef})` : ''}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (item: Payment) => <StatusBadge status={item.status} />,
    },
    {
      key: 'transactionRef',
      header: 'Ref transaction',
      render: (item: Payment) => <span className="text-xs">{item.transactionRef || '—'}</span>,
    },
    {
      key: 'dueDate',
      header: 'Date echeance',
      render: (item: Payment) => <span>{item.dueDate ? formatDate(item.dueDate) : '—'}</span>,
    },
    {
      key: 'paidAt',
      header: 'Date paiement',
      render: (item: Payment) => <span>{item.paidAt ? formatDateTime(item.paidAt) : '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (item: Payment) => {
        if (item.status !== 'EN_ATTENTE' && item.status !== 'PAYE') return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.status === 'EN_ATTENTE' && (
                <DropdownMenuItem onClick={() => setConfirmDialogId(item.id)}>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  Confirmer le paiement
                </DropdownMenuItem>
              )}
              {item.status === 'EN_ATTENTE' && (
                <DropdownMenuItem onClick={() => setActionDialog({ type: 'fail', id: item.id })}>
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  Marquer en echec
                </DropdownMenuItem>
              )}
              {item.status === 'EN_ATTENTE' && (
                <DropdownMenuItem onClick={() => setActionDialog({ type: 'cancel', id: item.id })}>
                  <Ban className="mr-2 h-4 w-4 text-gray-600" />
                  Annuler
                </DropdownMenuItem>
              )}
              {item.status === 'PAYE' && (
                <DropdownMenuItem onClick={() => setActionDialog({ type: 'refund', id: item.id })}>
                  <RotateCcw className="mr-2 h-4 w-4 text-blue-600" />
                  Rembourser
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Paiements" description="Gestion des paiements." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total en attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.enAttente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total paye</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.paye)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total en echec</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.echec)}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable<Payment>
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSearchChange={handleSearchChange}
        search={search}
        loading={loading}
        getRowKey={(item) => item.id}
        emptyTitle="Aucun paiement"
        emptyDescription="Aucun paiement a afficher."
        filters={
          <Select
            value={statusFilter || 'ALL'}
            onValueChange={(v) => {
              setStatusFilter(v === 'ALL' ? '' : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Dialog open={!!confirmDialogId} onOpenChange={() => setConfirmDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment confirmer ce paiement comme paye ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogId(null)}>Annuler</Button>
            <Button onClick={handleConfirm} disabled={actionLoading}>
              {actionLoading ? 'Confirmation...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setFailReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'fail' && 'Marquer en echec'}
              {actionDialog?.type === 'cancel' && 'Annuler le paiement'}
              {actionDialog?.type === 'refund' && 'Rembourser le paiement'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'fail' && 'Indiquez la raison de l\'echec.'}
              {actionDialog?.type === 'cancel' && 'Voulez-vous vraiment annuler ce paiement ?'}
              {actionDialog?.type === 'refund' && 'Voulez-vous vraiment rembourser ce paiement ? Le montant sera annule.'}
            </DialogDescription>
          </DialogHeader>
          {actionDialog?.type === 'fail' && (
            <div className="space-y-2">
              <Label htmlFor="fail-reason">Raison</Label>
              <Textarea
                id="fail-reason"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="Raison de l'echec..."
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setFailReason('') }}>Annuler</Button>
            <Button
              variant={actionDialog?.type === 'fail' || actionDialog?.type === 'cancel' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={actionLoading || (actionDialog?.type === 'fail' && !failReason.trim())}
            >
              {actionLoading ? 'Traitement...' : 'Valider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
