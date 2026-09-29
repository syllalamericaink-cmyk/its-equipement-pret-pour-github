import { requireAdmin } from '@/lib/api-auth'
import { getDeliveries } from '@/lib/services/delivery.service'
import { db } from '@/lib/db'
import { success, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(request)
    const status = searchParams.get('status') ?? undefined
    const search = searchParams.get('search') ?? undefined

    const [{ items, total }, statusCountsRows] = await Promise.all([
      getDeliveries({ page, limit, skip, status, search }),
      db.delivery.groupBy({ by: ['status'], _count: true }),
    ])
    const statusCounts = Object.fromEntries(statusCountsRows.map(r => [r.status, r._count]))

    return success(items, { ...buildMeta(page, limit, total), statusCounts })
  } catch {
    return serverError()
  }
}
