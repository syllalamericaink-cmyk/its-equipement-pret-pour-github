import { requireAdmin } from '@/lib/api-auth'
import { getClients } from '@/lib/services/client.service'
import { success, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(request)
    const search = searchParams.get('search') ?? undefined

    const { items, total } = await getClients({ page, limit, skip, search })

    return success(items, buildMeta(page, limit, total))
  } catch {
    return serverError()
  }
}
