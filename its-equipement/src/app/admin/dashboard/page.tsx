'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  ShoppingCart,
  Banknote,
  Package,
  CalendarClock,
  Inbox,
  CheckCircle2,
  Images,
  Plus,
  Mail,
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
  const revenue = data.revenue ?? 0

  return [
    {
      label: 'Demandes de devis en attente',
      value: pendingRequests,
      icon: <ClipboardList className="h-5 w-5" />,
      accent: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
    },
    {
      label: 'Commandes web',
      value: data.publicOrdersTotal,
      icon: <ShoppingCart className="h-5 w-5" />,
      accent: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: 'Reçues aujourd\'hui',
      value: data.publicOrdersToday,
      icon: <CalendarClock className="h-5 w-5" />,
      accent: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
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
      label: 'Commandes livrées',
      value: webDelivered,
      icon: <CheckCircle2 className="h-5 w-5" />,
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Demandes de devis en attente',
      value: pendingRequests,
      icon: <ClipboardList className="h-5 w-5" />,
      accent: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
    },
    {
      label: 'Chiffre d\'affaires encaissé',
      value: formatCurrency(revenue),
      icon: <Banknote className="h-5 w-5" />,
      accent: 'text-teal-600',
      iconBg: 'bg-teal-100',
    },
  ]
}

function KpiGrid({ data }: { data: DashboardData }) {
  const cards = getKpiCards(data)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="gap-4 py-4">
          <CardContent className="flex items-center gap-4 p-0 px-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg} ${card.accent}`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{card.label}</p>
              <p className={`text-lg font-semibold ${card.accent}`}>{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 7 }).map((_, i) => (
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
                      href={`/admin/quote-requests/${item.id}`}
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
          <Link href="/admin/commandes">Voir toutes</Link>
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
                      href={`/admin/commandes/${order.id}`}
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

  useEffect(() => {
    adminFetch<DashboardData>('/api/admin/dashboard').then((res) => {
      if (res.success && res.data) {
        setData(res.data)
      }
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="mt-2 text-muted-foreground">
            Vue d&apos;ensemble des commandes web et de l&apos;activité du site.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date())}
        </p>
      </div>

      {/* Raccourcis du quotidien : ce que l'admin fait le plus souvent */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { href: '/admin/hero', label: 'Modifier les bannières', icon: Images },
          { href: '/admin/products/new', label: 'Ajouter un produit', icon: Plus },
          { href: '/admin/products', label: 'Choisir les produits de l\u2019accueil', icon: Package },
          { href: '/admin/quote-requests', label: 'Demandes de devis', icon: ClipboardList },
          { href: '/admin/messages', label: 'Messages', icon: Mail },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex min-h-[64px] flex-col justify-center gap-1 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/60"
          >
            <a.icon className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>

      {loading ? (
        <KpiGridSkeleton />
      ) : data ? (
        <KpiGrid data={data} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
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
