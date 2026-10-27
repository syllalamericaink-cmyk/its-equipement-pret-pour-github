'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  ShoppingCart,
  Package,
  CalendarClock,
  Inbox,
  CheckCircle2,
  Images,
  Plus,
  Mail,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { adminFetch, formatCurrency, formatDate } from '@/lib/admin-api'
import { StatusBadge } from '@/components/admin/status-badge'
import { adminPath } from '@/lib/admin-path'

interface DashboardTotals {
  totalOrders: number
  totalQuoteRequests: number
  totalQuotes: number
  totalClients: number
}

interface RecentOrder {
  id: string
  orderNumber: string
  status: string
  totalAmountTTC: number
  createdAt: string
  quote: {
    quoteRequest: {
      client: {
        companyName: string
      }
    }
  }
}

interface RecentQuoteRequest {
  id: string
  reference: string
  status: string
  createdAt: string
  client: {
    companyName: string
  }
}

interface RecentPublicOrder {
  id: string
  orderNumber: string | null
  devisNumber: string | null
  status: string
  clientName: string
  clientPhone: string
  total: number
  createdAt: string
  _count: { items: number }
}

interface DashboardData {
  totals: DashboardTotals
  ordersByStatus: Record<string, number>
  quoteRequestsByStatus: Record<string, number>
  quotesByStatus: Record<string, number>
  recentOrders: RecentOrder[]
  recentQuoteRequests: RecentQuoteRequest[]
  revenue: number
  ordersWithPersonalization: number
  ordersWithoutPersonalization: number
  pendingPayments: number
  activeDeliveries: number
  // Commandes web (nouveau parcours client)
  publicOrdersTotal: number
  publicOrdersToday: number
  publicOrdersByStatus: Record<string, number>
  recentPublicOrders: RecentPublicOrder[]
}

interface KpiCard {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
  iconBg: string
}

function getKpiCards(data: DashboardData): KpiCard[] {
  const webNew = data.publicOrdersByStatus?.NOUVELLE_COMMANDE ?? 0
  const inProgressKeys = [
    'CLIENT_CONTACTE',
    'DEVIS_EN_PREPARATION',
    'DEVIS_ENVOYE',
    'DEVIS_ACCEPTE',
    'COMMANDE_CONFIRMEE',
    'EN_PREPARATION',
  ]
  const webInProgress = inProgressKeys.reduce(
    (sum, key) => sum + (data.publicOrdersByStatus?.[key] ?? 0),
    0
  )
  const webDelivered = data.publicOrdersByStatus?.LIVREE ?? 0
  const pendingRequests = data.quoteRequestsByStatus?.PENDING ?? 0

  return [
    {
      label: 'Nouvelles commandes',
      value: webNew,
      icon: <Inbox className="h-5 w-5" />,
      accent: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'En cours de traitement',
      value: webInProgress,
      icon: <Package className="h-5 w-5" />,
      accent: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
    {
      label: "Demandes de devis en attente",
      value: pendingRequests,
      icon: <ClipboardList className="h-5 w-5" />,
      accent: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
    },
    {
      label: "Reçues aujourd'hui",
      value: data.publicOrdersToday,
      icon: <CalendarClock className="h-5 w-5" />,
      accent: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Commandes livrées',
      value: webDelivered,
      icon: <CheckCircle2 className="h-5 w-5" />,
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Commandes web',
      value: data.publicOrdersTotal,
      icon: <ShoppingCart className="h-5 w-5" />,
      accent: 'text-green-600',
      iconBg: 'bg-green-100',
    },
  ]
}

function KpiGrid({ data }: { data: DashboardData }) {
  const cards = getKpiCards(data)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="flex flex-col justify-between gap-3 border border-its-border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[0.82rem] font-medium leading-snug text-its-gray">{card.label}</p>
            <span className={`grid h-9 w-9 shrink-0 place-items-center ${card.iconBg} ${card.accent}`}>{card.icon}</span>
          </div>
          <p className="font-display text-3xl font-bold leading-none text-its-dark">{card.value}</p>
        </div>
      ))}
    </div>
  )
}

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="gap-4 py-4">
          <CardContent className="flex items-center gap-4 p-0 px-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecentQuoteRequestsTable({ items }: { items: RecentQuoteRequest[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Demandes de devis récentes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Aucune demande récente.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={adminPath(`/quote-requests/${item.id}`)}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{item.client.companyName}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function RecentPublicOrdersTable({ items }: { items: RecentPublicOrder[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Commandes web récentes</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href={adminPath("/commandes")}>Voir toutes</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucune commande web pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={adminPath(`/commandes/${order.id}`)}
                      className="font-medium text-primary hover:underline"
                    >
                      {order.orderNumber ?? order.devisNumber ?? '—'}
                    </Link>
                    <p className="text-xs text-muted-foreground">{order._count.items} article(s)</p>
                  </TableCell>
                  <TableCell>
                    {order.clientName}
                    <p className="text-xs text-muted-foreground">{order.clientPhone}</p>
                  </TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    const res = await adminFetch<DashboardData>('/api/admin/dashboard')

    if (res.success && res.data) {
      setData(res.data)
    }

    if (silent) {
      setRefreshing(false)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      const res = await adminFetch<DashboardData>('/api/admin/dashboard')
      if (!cancelled && res.success && res.data) {
        setData(res.data)
        setLoading(false)
      }
    })()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadDashboard(true)
      }
    }, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [loadDashboard])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-its-dark sm:text-3xl">Bonjour</h1>
          <p className="mt-1 text-its-gray">Voici l’activité de votre boutique.</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {new Intl.DateTimeFormat('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(new Date())}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            title="Actualiser"
          >
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            <span className="sr-only">Actualiser</span>
          </Button>
        </div>
      </div>

      {data && (
        <div className="flex flex-col gap-3 bg-its-dark p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-bold">À traiter maintenant</p>
              <p className="text-sm text-white/70">
                Commencez par les demandes qui attendent une réponse.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {(data.publicOrdersByStatus?.NOUVELLE_COMMANDE ?? 0) > 0 && (
                <Button asChild size="sm" className="bg-its-lime text-its-dark hover:bg-its-lime-dark">
                  <Link href={adminPath("/commandes")}>
                    {data.publicOrdersByStatus.NOUVELLE_COMMANDE} nouvelle(s) commande(s)
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {(data.quoteRequestsByStatus?.PENDING ?? 0) > 0 && (
                <Button asChild size="sm" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link href={adminPath("/quote-requests")}>
                    {data.quoteRequestsByStatus.PENDING} demande(s) de devis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {(data.publicOrdersByStatus?.NOUVELLE_COMMANDE ?? 0) === 0 &&
                (data.quoteRequestsByStatus?.PENDING ?? 0) === 0 && (
                  <span className="text-sm font-medium text-its-lime">
                    Rien d’urgent pour le moment.
                  </span>
                )}
            </div>
        </div>
      )}

      {/* Raccourcis du quotidien : ce que l'admin fait le plus souvent */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { href: adminPath('/hero'), label: 'Modifier les bannières', icon: Images },
          { href: adminPath('/products/new'), label: 'Ajouter un produit', icon: Plus },
          { href: adminPath('/products'), label: 'Choisir les produits de l\u2019accueil', icon: Package },
          { href: adminPath('/quote-requests'), label: 'Demandes de devis', icon: ClipboardList },
          { href: adminPath('/messages'), label: 'Messages', icon: Mail },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex min-h-[72px] items-center gap-3 border border-its-border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-its-dark hover:shadow-md"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-its-cream text-its-dark transition-colors group-hover:bg-its-lime">
              <a.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>

      {loading ? (
        <KpiGridSkeleton />
      ) : data ? (
        <KpiGrid data={data} />
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[3fr_2fr]">
        {loading ? (
          <>
            <TableSkeleton />
            <TableSkeleton />
          </>
        ) : data ? (
          <>
            <RecentPublicOrdersTable items={data.recentPublicOrders ?? []} />
            <RecentQuoteRequestsTable items={data.recentQuoteRequests.slice(0, 5)} />
          </>
        ) : null}
      </div>
    </div>
  )
}
