import { requireAdmin } from '@/lib/api-auth'
import { getAllSettings, bulkUpsertSettings, clearCache } from '@/lib/services/settings.service'
import { settingsBulkUpdateSchema } from '@/lib/validation'
import { success, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') ?? undefined

    const items = await getAllSettings(category)
    return success(items)
  } catch {
    return serverError()
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const body = await request.json()

    if (body.settings && Array.isArray(body.settings)) {
      const parsed = settingsBulkUpdateSchema.safeParse(body)
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]
        return error(firstError?.message ?? 'Données invalides', 422)
      }

      const results = await bulkUpsertSettings(parsed.data.settings)
      clearCache()

      await logAction({
        adminId: session!.user.id,
        action: 'UPDATE',
        entityType: 'SETTING',
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })

      return success(results)
    }

    return error('Format invalide. Envoyez { settings: [...] }', 422)
  } catch {
    return serverError()
  }
}
