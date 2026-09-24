'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { adminFetch, formatDateTime } from '@/lib/admin-api'
import { useSession } from 'next-auth/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

const STATUSES = [
  'NOUVELLE_COMMANDE',
  'CLIENT_CONTACTE',
  'DEVIS_EN_PREPARATION',
  'DEVIS_ENVOYE',
  'DEVIS_ACCEPTE',
  'COMMANDE_CONFIRMEE',
  'EN_PREPARATION',
  'LIVREE',
  'DEVIS_REFUSE',
  'ANNULEE',
] as const

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' FCFA'

interface PublicOrder {
  id: string
  orderNumber: string
  status: string
  clientName: string
  clientPhone: string
  clientEmail: string
  city: string
  subtotal: number
  deliveryFee: number
  totalAmount: number
  itemsCount: number
  createdAt: string
}

export default function CommandesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<PublicOrder[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
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
        limit: '20',
      })
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await adminFetch<PublicOrder[]>(`/api/admin/public-orders?${params}`)
      if (!cancelled) {
        if (res.success && res.data) {
          setData(res.data)
          setTotal(res.meta?.total ?? 0)
          setTotalPages(res.meta?.totalPages ?? 1)
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page, statusFilter, search])

  const handleSearchChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  if (!session) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PageHeader title="Commandes" description="Gestion des commandes publiques." />
          <Badge variant="secondary" className="text-sm">
            {loading ? '-' : total}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, telephone..."
            className="pl-9"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter || 'ALL'}
          onValueChange={(v) => {
            setStatusFilter(v === 'ALL' ? '' : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium">Aucune commande</p>
          <p className="text-sm text-muted-foreground">Aucune commande a afficher.</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Telephone</TableHead>
                  <TableHead className="hidden lg:table-cell">Ville</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Produits</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/commandes/${order.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.clientName}</p>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          {order.clientEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {order.clientPhone || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {order.city || '-'}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {order.itemsCount}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/commandes/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} sur {totalPages} ({total} commande{total > 1 ? 's' : ''})
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Precedent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}