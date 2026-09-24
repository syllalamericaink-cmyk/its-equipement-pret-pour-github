import { requireAdmin } from '@/lib/api-auth'
import { getCategories, createCategory } from '@/lib/services/category.service'
import { categorySchema } from '@/lib/validation'
import { success, error, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { page, limit, skip } = getPaginationParams(request)
    const includeInactive = new URL(request.url).searchParams.get('includeInactive') === 'true'
    const { items, total } = await getCategories({ includeInactive })

    return success(items, buildMeta(page, limit, total))
  } catch {
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const body = await request.json()
    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await createCategory(parsed.data)
    await logAction({
      adminId: session!.user.id,
      action: 'CREATE',
      entityType: 'CATEGORY',
      entityId: result.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}
