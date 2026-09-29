'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DataTable } from '@/components/admin/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { adminFetch, adminPut, adminDelete, formatDateTime } from '@/lib/admin-api'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { Mail, MailOpen, Trash2, Loader2 } from 'lucide-react'

interface ContactMessage {
  id: string
  name: string
  email: string | null
  phone: string | null
  subject: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function MessagesPage() {
  const [data, setData] = useState<ContactMessage[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [readFilter, setReadFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [detail, setDetail] = useState<ContactMessage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        read: readFilter,
      })
      const res = await adminFetch<ContactMessage[]>(`/api/admin/contact-messages?${params}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
          setTotal(res.meta?.total ?? 0)
          setUnreadCount(Number(res.meta?.unreadCount ?? 0))
        } else {
          toast.error(res.error || 'Erreur lors du chargement des messages')
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page, limit, search, readFilter, refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const handleSearchChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  const openDetail = async (message: ContactMessage) => {
    setDetail(message)
    if (!message.isRead) {
      const res = await adminPut(`/api/admin/contact-messages/${message.id}`, { isRead: true })
      if (res.success) {
        refresh()
      }
    }
  }

  const toggleRead = async (message: ContactMessage) => {
    const res = await adminPut(`/api/admin/contact-messages/${message.id}`, { isRead: !message.isRead })
    if (res.success) {
      toast.success(message.isRead ? 'Marqué comme non lu' : 'Marqué comme lu')
      refresh()
    } else {
      toast.error(res.error || 'Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    const res = await adminDelete(`/api/admin/contact-messages/${deleteTarget.id}`)
    setActionLoading(false)
    setDeleteTarget(null)
    if (res.success) {
      toast.success('Message supprimé')
      refresh()
    } else {
      toast.error(res.error || 'Erreur lors de la suppression')
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Expéditeur',
      render: (item: ContactMessage) => (
        <div className="flex items-center gap-2">
          {item.isRead ? (
            <MailOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <Mail className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground truncate">{item.email || item.phone || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Sujet',
      render: (item: ContactMessage) => (
        <span className="font-medium">{item.subject}</span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (item: ContactMessage) => (
        <span className="line-clamp-1 max-w-[300px] text-muted-foreground">{item.message}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (item: ContactMessage) =>
        item.isRead ? (
          <Badge variant="outline">Lu</Badge>
        ) : (
          <Badge className="bg-primary text-primary-foreground">Non lu</Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'Reçu le',
      render: (item: ContactMessage) => <span>{formatDateTime(item.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (item: ContactMessage) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={item.isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
            onClick={(e) => { e.stopPropagation(); toggleRead(item) }}
          >
            {item.isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Supprimer"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages contact"
        description={unreadCount > 0 ? `${unreadCount} message(s) non lu(s).` : 'Messages envoyés via le formulaire de contact.'}
      />

      <DataTable<ContactMessage>
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={limit}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => { setLimit(l); setPage(1) }}
        onSearchChange={handleSearchChange}
        search={search}
        loading={loading}
        getRowKey={(item) => item.id}
        onRowClick={openDetail}
        emptyTitle="Aucun message"
        emptyDescription="Aucun message de contact à afficher."
        filters={
          <Select
            value={readFilter}
            onValueChange={(v) => { setReadFilter(v); setPage(1) }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les messages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="unread">Non lus</SelectItem>
              <SelectItem value="read">Lus</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.subject}</DialogTitle>
            <DialogDescription>
              {detail?.name}
              {detail?.email ? ` — ${detail.email}` : ''}
              {detail?.phone ? ` — ${detail.phone}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
            {detail?.message}
          </div>
          <p className="text-xs text-muted-foreground">
            Reçu le {detail ? formatDateTime(detail.createdAt) : ''}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Fermer</Button>
            {detail?.email && (
              <Button asChild>
                <a href={`mailto:${detail.email}?subject=Re: ${encodeURIComponent(detail.subject)}`}>
                  Répondre par email
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Supprimer le message"
        description={`Voulez-vous vraiment supprimer le message de « ${deleteTarget?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        variant="destructive"
        loading={actionLoading}
      />
    </div>
  )
}
