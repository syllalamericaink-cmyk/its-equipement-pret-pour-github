'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/admin/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { adminFetch, formatCurrency, formatDate } from '@/lib/admin-api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const STATUSES = ['CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

interface Order {
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
      }
    }
  }
  _count: {
    items: number
    payments: number
  }
  delivery: {
    id: string
    status: string
  }
}

export default function CommandesPage() {
  const router = useRouter()
  const [data, setData] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
      const res = await adminFetch<Order[]>(`/api/admin/orders?${params}`)
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

  const handleRowClick = useCallback((item: Order) => {
    router.push(`/admin/orders/${item.id}`)
  }, [router])

  const columns = [
    {
      key: 'orderNumber',
      header: 'Commande',
      render: (item: Order) => (
        <Link href={`/admin/orders/${item.id}`} className="font-medium text-primary hover:underline">
          {item.orderNumber}
        </Link>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (item: Order) => (
        <div>
          <p className="font-medium">{item.quote.quoteRequest.client.companyName}</p>
          <p className="text-sm text-muted-foreground">{item.quote.quoteRequest.client.contactName}</p>
        </div>
      ),
    },
    {
      key: 'totalAmountTTC',
      header: 'Montant TTC',
      className: 'text-right',
      render: (item: Order) => (
        <span className="font-medium">{formatCurrency(item.totalAmountTTC)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Paiement',
      render: (item: Order) => <StatusBadge status={item.paymentMethod} />,
    },
    {
      key: 'hasPersonalization',
      header: 'Impression',
      render: (item: Order) => (
        <Badge variant={item.hasPersonalization ? 'default' : 'outline'}>
          {item.hasPersonalization ? 'Oui' : 'Non'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (item: Order) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (item: Order) => formatDate(item.createdAt),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commandes"
        description="Gestion des commandes."
      />
      <DataTable<Order>
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
        onRowClick={handleRowClick}
        emptyTitle="Aucune commande"
        emptyDescription="Aucune commande a afficher."
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
    </div>
  )
}