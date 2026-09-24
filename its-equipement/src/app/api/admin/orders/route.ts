import { requireAdmin } from '@/lib/api-auth'
import { getOrders } from '@/lib/services/order.service'
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

    const { items, total } = await getOrders({ page, limit, skip, status, search })

    return success(items, buildMeta(page, limit, total))
  } catch {
    return serverError()
  }
}