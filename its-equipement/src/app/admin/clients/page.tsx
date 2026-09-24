'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/admin/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { adminFetch, formatDate } from '@/lib/admin-api'
import Link from 'next/link'

interface Client {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  address: string
  city: string
  zipCode: string
  country: string
  notes: string
  createdAt: string
  updatedAt: string
  _count: {
    quoteRequests: number
  }
}

export default function ClientsPage() {
  const router = useRouter()
  const [data, setData] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
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
      const res = await adminFetch<Client[]>(`/api/admin/clients?${params}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
          setTotal(res.meta?.total ?? 0)
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page, limit, search])

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

  const handleRowClick = useCallback((item: Client) => {
    router.push(`/admin/clients/${item.id}`)
  }, [router])

  const columns = [
    {
      key: 'companyName',
      header: 'Entreprise',
      render: (item: Client) => (
        <Link href={`/admin/clients/${item.id}`} className="font-medium text-primary hover:underline">
          {item.companyName}
        </Link>
      ),
    },
    {
      key: 'contactName',
      header: 'Contact',
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'phone',
      header: 'Telephone',
    },
    {
      key: 'quoteRequests',
      header: 'Demandes',
      render: (item: Client) => <span>{item._count.quoteRequests}</span>,
    },
    {
      key: 'city',
      header: 'Ville',
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (item: Client) => formatDate(item.createdAt),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Gestion des clients."
      />
      <DataTable<Client>
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
        emptyTitle="Aucun client"
        emptyDescription="Aucun client a afficher."
      />
    </div>
  )
}
