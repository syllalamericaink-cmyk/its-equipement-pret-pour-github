import { requireAdmin } from '@/lib/api-auth'
import { getDeliveries } from '@/lib/services/delivery.service'
import { success, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(request)
    const status = searchParams.get('status') ?? undefined

    const { items, total } = await getDeliveries({ page, limit, skip, status })

    return success(items, buildMeta(page, limit, total))
  } catch {
    return serverError()
  }
}
