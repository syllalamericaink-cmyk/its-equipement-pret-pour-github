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
import Link from 'next/link'

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const

interface Quote {
  id: string
  quoteNumber: string
  status: string
  validUntil: string
  subtotalHT: number
  discountAmount: number
  totalAmountHT: number
  tvaRate: number
  totalAmountTTC: number
  conditions: string
  createdAt: string
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
  _count: {
    orders: number
    items: number
  }
}

export default function DevisPage() {
  const router = useRouter()
  const [data, setData] = useState<Quote[]>([])
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
      const res = await adminFetch<Quote[]>(`/api/admin/quotes?${params}`)
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

  const handleRowClick = useCallback((item: Quote) => {
    router.push(`/admin/quotes/${item.id}`)
  }, [router])

  const columns = [
    {
      key: 'quoteNumber',
      header: 'Devis',
      render: (item: Quote) => (
        <Link href={`/admin/quotes/${item.id}`} className="font-medium text-primary hover:underline">
          {item.quoteNumber}
        </Link>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (item: Quote) => (
        <div>
          <p className="font-medium">{item.quoteRequest.client.companyName}</p>
          <p className="text-sm text-muted-foreground">{item.quoteRequest.client.contactName}</p>
        </div>
      ),
    },
    {
      key: 'quoteRequest',
      header: 'Demande',
      render: (item: Quote) => (
        <Link href={`/admin/quote-requests/${item.quoteRequest.id}`} className="text-sm text-primary hover:underline">
          {item.quoteRequest.reference}
        </Link>
      ),
    },
    {
      key: 'totalAmountTTC',
      header: 'Montant TTC',
      className: 'text-right',
      render: (item: Quote) => (
        <span className="font-medium">{formatCurrency(item.totalAmountTTC)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (item: Quote) => <StatusBadge status={item.status} />,
    },
    {
      key: 'validUntil',
      header: 'Validite',
      render: (item: Quote) => formatDate(item.validUntil),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (item: Quote) => formatDate(item.createdAt),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis"
        description="Creation et gestion des devis."
      />
      <DataTable<Quote>
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
        emptyTitle="Aucun devis"
        emptyDescription="Aucun devis a afficher."
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