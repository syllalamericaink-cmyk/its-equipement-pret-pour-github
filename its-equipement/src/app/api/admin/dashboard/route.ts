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
    ])

    return success({
      totals: { totalOrders, totalQuoteRequests, totalQuotes, totalClients },
      ordersByStatus: Object.fromEntries(ordersByStatus.map(s => [s.status, s._count])),
      quoteRequestsByStatus: Object.fromEntries(quoteRequestsByStatus.map(s => [s.status, s._count])),
      quotesByStatus: Object.fromEntries(quotesByStatus.map(s => [s.status, s._count])),
      recentOrders,
      recentQuoteRequests,
    })
  } catch {
    return serverError()
  }
}
