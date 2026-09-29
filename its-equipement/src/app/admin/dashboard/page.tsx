'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  ShoppingCart,
  Banknote,
  Package,
  CalendarClock,
  Inbox,
  Send,
  RefreshCw,
  Table2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
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
import { Badge } from '@/components/ui/badge'
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

interface IntegrationsStatus {
  telegram: {
    configured: boolean
    botUsername: string | null
    chatId: string | null
    chatCandidates: { id: string; type: string; name: string }[]
    testMessage?: { success: boolean; detail: string }
    hint: string
  }
  sheets: {
    configured: boolean
    sheetId: string | null
    tab: string
    access: { success: boolean; detail: string }
    hint: string
  }
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
    {
      label: 'Commandes ancien flux',
      value: data.totals.totalOrders,
      icon: <Package className="h-5 w-5" />,
      accent: 'text-slate-600',
      iconBg: 'bg-slate-100',
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

function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)

  const load = useCallback((sendTest = false) => {
    adminFetch<IntegrationsStatus>(
      `/api/admin/integrations/status${sendTest ? '?sendTest=1' : ''}`
    ).then((res) => {
      if (res.success && res.data) setStatus(res.data)
      setLoading(false)
      setTesting(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  const telegram = status?.telegram
  const sheets = status?.sheets

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Intégrations automatiques</CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => load()}>
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Telegram */}
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Send className="h-4 w-4 text-sky-600" />
            <p className="text-sm font-semibold">Bot Telegram</p>
            {telegram?.configured ? (
              <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3" /> Connecté
                {telegram.botUsername ? ` (@${telegram.botUsername})` : ''}
              </Badge>
            ) : telegram?.botUsername ? (
              <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3" /> Bot détecté — chat à confirmer
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" /> Non connecté
              </Badge>
            )}
            {telegram?.configured && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto gap-1.5"
                disabled={testing}
                onClick={() => {
                  setTesting(true)
                  load(true)
                }}
              >
                {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Recevoir un message de test
              </Button>
            )}
          </div>
          {telegram?.testMessage && (
            <p className={`mt-2 text-xs ${telegram.testMessage.success ? 'text-green-700' : 'text-red-600'}`}>
              {telegram.testMessage.success ? '✓ ' : '✗ '}
              {telegram.testMessage.detail}
            </p>
          )}
          {telegram && !telegram.configured && (
            <p className="mt-2 text-xs text-muted-foreground">{telegram.hint}</p>
          )}
          {telegram?.chatCandidates && telegram.chatCandidates.length > 0 && !telegram.configured && (
            <div className="mt-2 rounded-md bg-muted p-2">
              <p className="text-xs font-medium">Chats détectés — copiez le « id » dans TELEGRAM_CHAT_ID (Vercel) :</p>
              <ul className="mt-1 space-y-0.5">
                {telegram.chatCandidates.map((chat) => (
                  <li key={chat.id} className="font-mono text-xs text-muted-foreground">
                    {chat.id} — {chat.name} ({chat.type})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Google Sheets */}
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Table2 className="h-4 w-4 text-green-700" />
            <p className="text-sm font-semibold">Google Sheets</p>
            {sheets?.configured && sheets.access.success ? (
              <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3" /> Connecté — onglet « {sheets.tab} »
              </Badge>
            ) : sheets?.configured ? (
              <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3" /> Accès à corriger
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" /> Non connecté
              </Badge>
            )}
            {sheets?.sheetId && sheets.access.success && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheets.sheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ouvrir le classeur <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {sheets && !(sheets.configured && sheets.access.success) && (
            <p className="mt-2 text-xs text-muted-foreground">{sheets.hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
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

      <IntegrationsPanel />
    </div>
  )
}
