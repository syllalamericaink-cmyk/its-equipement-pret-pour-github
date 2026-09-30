import { requireAdmin } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { success, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const [
      totalOrders,
      totalQuoteRequests,
      totalQuotes,
      totalClients,
      ordersByStatus,
      quoteRequestsByStatus,
      quotesByStatus,
      recentOrders,
      recentQuoteRequests,
      paidPayments,
      pendingPayments,
      ordersWithPersonalization,
      ordersWithoutPersonalization,
      activeDeliveries,
      publicOrdersByStatus,
      publicOrdersTotal,
      publicOrdersToday,
      recentPublicOrders,
    ] = await Promise.all([
      db.order.count(),
      db.quoteRequest.count(),
      db.quote.count(),
      db.client.count(),
      db.order.groupBy({ by: ['status'], _count: true }),
      db.quoteRequest.groupBy({ by: ['status'], _count: true }),
      db.quote.groupBy({ by: ['status'], _count: true }),
      db.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          quote: { include: { quoteRequest: { include: { client: true } } } },
        },
      }),
      db.quoteRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: true },
      }),
      // Chiffre d'affaires = somme des paiements réellement encaissés
      db.payment.aggregate({ where: { status: 'PAYE' }, _sum: { amount: true } }),
      db.payment.count({ where: { status: 'EN_ATTENTE' } }),
      db.order.count({ where: { hasPersonalization: true } }),
      db.order.count({ where: { hasPersonalization: false } }),
      db.delivery.count({ where: { status: { in: ['A_PREPARER', 'PRETE', 'EN_LIVRAISON'] } } }),
      // Commandes web (nouveau parcours client)
      db.publicOrder.groupBy({ by: ['status'], _count: true }),
      db.publicOrder.count(),
      db.publicOrder.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      db.publicOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          devisNumber: true,
          status: true,
          clientName: true,
          clientPhone: true,
          total: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
    ])

    return success({
      totals: { totalOrders, totalQuoteRequests, totalQuotes, totalClients },
      ordersByStatus: Object.fromEntries(ordersByStatus.map(s => [s.status, s._count])),
      quoteRequestsByStatus: Object.fromEntries(quoteRequestsByStatus.map(s => [s.status, s._count])),
      quotesByStatus: Object.fromEntries(quotesByStatus.map(s => [s.status, s._count])),
      recentOrders,
      recentQuoteRequests,
      revenue: paidPayments._sum.amount ?? 0,
      pendingPayments,
      ordersWithPersonalization,
      ordersWithoutPersonalization,
      activeDeliveries,
      // Commandes web (nouveau parcours)
      publicOrdersTotal,
      publicOrdersToday,
      publicOrdersByStatus: Object.fromEntries(publicOrdersByStatus.map(s => [s.status, s._count])),
      recentPublicOrders,
    })
  } catch (err) {
    console.error('[api /admin/dashboard] Erreur:', err)
    return serverError()
  }
}
