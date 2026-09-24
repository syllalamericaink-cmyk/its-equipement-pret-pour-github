'use client'

import { useState, useEffect, useCallback } from 'react'
import { DataTable } from '@/components/admin/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { adminFetch, adminPost, formatDateTime } from '@/lib/admin-api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotateCw } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  type: string
  channel: string
  to: string
  status: string
  sentAt: string
  createdAt: string
  response: Record<string, unknown>
  order: {
    id: string
    orderNumber: string
  } | null
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tous' },
  { value: 'SENT', label: 'Envoyee' },
  { value: 'FAILED', label: 'Echouee' },
  { value: 'PENDING', label: 'En attente' },
]

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'Tous' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
]

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (statusFilter) params.set('status', statusFilter)
      if (channelFilter) params.set('channel', channelFilter)

      const res = await adminFetch<NotificationItem[]>(`/api/admin/notifications?${params}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
          setTotal(res.meta?.total ?? 0)
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page, limit, statusFilter, channelFilter])

  const handleRetry = useCallback(async (id: string) => {
    setRetryingId(id)
    try {
      const res = await adminPost(`/api/admin/notifications/${id}/retry`, {})
      if (res.success) {
        toast.success('Notification renvoyee avec succes')
        setData(prev => prev.map(n => n.id === id ? { ...n, status: 'SENT' } : n))
      } else {
        toast.error(res.error ?? 'Erreur lors du renvoi')
      }
    } catch {
      toast.error('Erreur lors du renvoi')
    } finally {
      setRetryingId(null)
    }
  }, [])

  const handlePageChange = useCallback((p: number) => {
    setPage(p)
  }, [])

  const handleLimitChange = useCallback((l: number) => {
    setLimit(l)
    setPage(1)
  }, [])

  const typeLabels: Record<string, string> = {
    ORDER_CREATED: 'Commande creee',
    QUOTE_CREATED: 'Devis cree',
    PAYMENT_RECEIVED: 'Paiement recu',
    DELIVERY_UPDATED: 'Livraison mise a jour',
  }

  const channelLabels: Record<string, string> = {
    WHATSAPP: 'WhatsApp',
    EMAIL: 'Email',
    SMS: 'SMS',
  }

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (item: NotificationItem) => (
        <span className="text-sm">{formatDateTime(item.createdAt)}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: NotificationItem) => (
        <span>{typeLabels[item.type] ?? item.type}</span>
      ),
    },
    {
      key: 'channel',
      header: 'Canal',
      render: (item: NotificationItem) => (
        <span>{channelLabels[item.channel] ?? item.channel}</span>
      ),
    },
    {
      key: 'to',
      header: 'Destinataire',
      render: (item: NotificationItem) => (
        <span className="text-sm">{item.to}</span>
      ),
    },
    {
      key: 'order',
      header: 'Commande',
      render: (item: NotificationItem) => (
        <span className="text-sm font-medium">{item.order?.orderNumber ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (item: NotificationItem) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: NotificationItem) => (
        <div>
          {item.status === 'FAILED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleRetry(item.id)
              }}
              disabled={retryingId === item.id}
            >
              <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${retryingId === item.id ? 'animate-spin' : ''}`} />
              Renvoyer
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Historique et gestion des notifications."
      />

      <DataTable<NotificationItem>
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSearchChange={() => {}}
        loading={loading}
        getRowKey={(item) => item.id}
        emptyTitle="Aucune notification"
        emptyDescription="Aucune notification a afficher."
        filters={
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter || 'ALL'}
              onValueChange={(v) => {
                setStatusFilter(v === 'ALL' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={channelFilter || 'ALL'}
              onValueChange={(v) => {
                setChannelFilter(v === 'ALL' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  )
}
