'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  FileText,
  ShoppingCart,
  Euro,
  Printer,
  Package,
  CreditCard,
  Truck,
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
}

interface KpiCard {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
  iconBg: string
}

function getKpiCards(data: DashboardData): KpiCard[] {
  const pendingRequests = data.quoteRequestsByStatus?.PENDING ?? 0
  const draftQuotes = data.quotesByStatus?.DRAFT ?? 0
  const revenue = data.revenue ?? 0
  const withPerso = data.ordersWithPersonalization ?? 0
  const withoutPerso = data.ordersWithoutPersonalization ?? 0
  const pendingPayments = data.pendingPayments ?? 0
  const activeDeliveries = data.activeDeliveries ?? 0

  return [
    {
      label: 'Nouvelles demandes',
      value: pendingRequests,
      icon: <ClipboardList className="h-5 w-5" />,
      accent: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
    },
    {
      label: 'Devis en attente',
      value: draftQuotes,
      icon: <FileText className="h-5 w-5" />,
      accent: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Commandes',
      value: data.totals.totalOrders,
      icon: <ShoppingCart className="h-5 w-5" />,
      accent: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: "Chiffre d'affaires",
      value: formatCurrency(revenue),
      icon: <Euro className="h-5 w-5" />,
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Commandes avec impression',
      value: withPerso,
      icon: <Printer className="h-5 w-5" />,
      accent: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
    {
      label: 'Commandes sans impression',
      value: withoutPerso,
      icon: <Package className="h-5 w-5" />,
      accent: 'text-slate-600',
      iconBg: 'bg-slate-100',
    },
    {
      label: 'Paiements en attente',
      value: pendingPayments,
      icon: <CreditCard className="h-5 w-5" />,
      accent: 'text-red-600',
      iconBg: 'bg-red-100',
    },
    {
      label: 'Livraisons',
      value: activeDeliveries,
      icon: <Truck className="h-5 w-5" />,
      accent: 'text-purple-600',
      iconBg: 'bg-purple-100',
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
      {Array.from({ length: 8 }).map((_, i) => (
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
        <CardTitle className="text-base">Demandes recentes</CardTitle>
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
                  Aucune demande recente.
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

function RecentOrdersTable({ items }: { items: RecentOrder[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commandes recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commande</TableHead>
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
                  Aucune commande recente.
                </TableCell>
              </TableRow>
            ) : (
              items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{order.quote.quoteRequest.client.companyName}</TableCell>
                  <TableCell>{formatCurrency(order.totalAmountTTC)}</TableCell>
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

function OrdersTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="mt-2 text-muted-foreground">
          Vue d&apos;ensemble de l&apos;activite.
        </p>
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
            <OrdersTableSkeleton />
          </>
        ) : data ? (
          <>
            <RecentQuoteRequestsTable items={data.recentQuoteRequests.slice(0, 5)} />
            <RecentOrdersTable items={data.recentOrders.slice(0, 5)} />
          </>
        ) : null}
      </div>
    </div>
  )
}
