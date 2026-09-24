import { requireAdmin } from '@/lib/api-auth'
import { success, serverError } from '@/lib/api-response'
import { getPublicOrders } from '@/lib/services/public-order.service'
import { getPaginationParams, buildMeta } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { page, limit, skip } = getPaginationParams(request)
    const search = request.nextUrl.searchParams.get('search') ?? undefined
    const status = request.nextUrl.searchParams.get('status') ?? undefined

    const result = await getPublicOrders({ page, limit, skip, search, status })
    return success(result.items, buildMeta(page, limit, result.total))
  } catch {
    return serverError()
  }
}
