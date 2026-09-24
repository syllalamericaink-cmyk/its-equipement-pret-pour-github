'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/admin/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { adminFetch, formatDate } from '@/lib/admin-api'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUSES = ['PENDING', 'REVIEWED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const

interface QuoteRequest {
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
  }
  _count: {
    quotes: number
    items: number
  }
}

export default function DemandesDevisPage() {
  const router = useRouter()
  const [data, setData] = useState<QuoteRequest[]>([])
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
      const res = await adminFetch<QuoteRequest[]>(`/api/admin/quote-requests?${params}`)
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

  const handleRowClick = useCallback((item: QuoteRequest) => {
    router.push(`/admin/quote-requests/${item.id}`)
  }, [router])

  const columns = [
    {
      key: 'reference',
      header: 'Reference',
      render: (item: QuoteRequest) => (
        <span className="font-medium text-primary hover:underline">{item.reference}</span>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (item: QuoteRequest) => (
        <div>
          <p className="font-medium">{item.client.companyName}</p>
          <p className="text-sm text-muted-foreground">{item.client.contactName}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Produits',
      render: (item: QuoteRequest) => <span>{item._count.items}</span>,
    },
    {
      key: 'personalization',
      header: 'Personnalisation',
      render: (_item: QuoteRequest) => (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (item: QuoteRequest) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (item: QuoteRequest) => formatDate(item.createdAt),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demandes de devis"
        description="Gestion des demandes de devis clients."
      />
      <DataTable<QuoteRequest>
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
        emptyTitle="Aucune demande de devis"
        emptyDescription="Aucune demande de devis a afficher."
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
