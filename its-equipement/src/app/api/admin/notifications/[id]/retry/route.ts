import { requireAdmin } from '@/lib/api-auth'
import { retryFailedNotification } from '@/lib/services/notification.service'
import { success, notFound, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params

    await retryFailedNotification(id)

    await logAction({
      adminId: session!.user.id,
      action: 'RETRY_NOTIFICATION',
      entityType: 'NOTIFICATION',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success({ retried: true })
  } catch {
    return serverError()
  }
}
