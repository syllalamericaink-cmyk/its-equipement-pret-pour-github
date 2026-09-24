'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { DataTable } from '@/components/admin/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { adminFetch, formatDate } from '@/lib/admin-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClipboardList, Package, Truck, CheckCircle2 } from 'lucide-react'

const STATUSES = ['A_PREPARER', 'PRETE', 'EN_LIVRAISON', 'LIVREE'] as const

interface Delivery {
  id: string
  orderId: string
  status: string
  trackingNumber: string
  carrier: string
  deliveryPerson: string
  shippingFees: number
  estimatedDelivery: string
  deliveredAt: string
  notes: string
  createdAt: string
  order: {
    id: string
    orderNumber: string
    totalAmountTTC: number
    hasPersonalization: boolean
    paymentMethod: string
    quote: {
      quoteRequest: {
        client: {
          companyName: string
          contactName: string
          email: string
          phone: string
        }
      }
    }
  }
}

interface Summary {
  a_preparer: number
  prete: number
  en_livraison: number
  livree: number
}

export default function LivraisonsPage() {
  const [data, setData] = useState<Delivery[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary>({ a_preparer: 0, prete: 0, en_livraison: 0, livree: 0 })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await adminFetch<Delivery[]>(`/api/admin/deliveries?limit=9999`)
      if (!cancelled && res.success && res.data) {
        const s: Summary = { a_preparer: 0, prete: 0, en_livraison: 0, livree: 0 }
        for (const d of res.data) {
          if (d.status === 'A_PREPARER') s.a_preparer++
          else if (d.status === 'PRETE') s.prete++
          else if (d.status === 'EN_LIVRAISON') s.en_livraison++
          else if (d.status === 'LIVREE') s.livree++
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
      if (statusFilter) params.set('status', statusFilter)
      const res = await adminFetch<Delivery[]>(`/api/admin/deliveries?${params}`)
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

  const handlePageChange = useCallback((p: number) => setPage(p), [])
  const handleLimitChange = useCallback((l: number) => { setLimit(l); setPage(1) }, [])

  const columns = [
    {
      key: 'orderNumber',
      header: 'Commande',
      render: (item: Delivery) => (
        <Link href={`/admin/orders/${item.order.id}`} className="font-medium text-primary hover:underline">
          {item.order.orderNumber}
        </Link>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (item: Delivery) => (
        <div>
          <p className="font-medium">{item.order.quote.quoteRequest.client.companyName}</p>
          <p className="text-sm text-muted-foreground">{item.order.quote.quoteRequest.client.contactName}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (item: Delivery) => <StatusBadge status={item.status} />,
    },
    {
      key: 'carrier',
      header: 'Transporteur',
      render: (item: Delivery) => <span>{item.carrier || '—'}</span>,
    },
    {
      key: 'deliveryPerson',
      header: 'Livreur',
      render: (item: Delivery) => <span>{item.deliveryPerson || '—'}</span>,
    },
    {
      key: 'estimatedDelivery',
      header: 'Date estimee',
      render: (item: Delivery) => <span>{item.estimatedDelivery ? formatDate(item.estimatedDelivery) : '—'}</span>,
    },
    {
      key: 'deliveredAt',
      header: 'Livre le',
      render: (item: Delivery) => <span>{item.deliveredAt ? formatDate(item.deliveredAt) : '—'}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Livraisons" description="Gestion des livraisons." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">A preparer</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{summary.a_preparer}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pretes</CardTitle>
            <Package className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cyan-600">{summary.prete}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En livraison</CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{summary.en_livraison}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Livrees</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{summary.livree}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable<Delivery>
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
        emptyTitle="Aucune livraison"
        emptyDescription="Aucune livraison a afficher."
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
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  )
}
