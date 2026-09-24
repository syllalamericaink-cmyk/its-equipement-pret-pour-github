import { requireAdmin } from '@/lib/api-auth'
import { getOrderById, createOrderFromQuote, changeOrderStatus } from '@/lib/services/order.service'
import { orderStatusSchema } from '@/lib/validation'
import { success, notFound, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import { sendOrderNotification } from '@/lib/services/notification.service'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const result = await getOrderById(id)
    if (!result) return notFound('Commande introuvable')
    return success(result)
  } catch {
    return serverError()
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const result = await createOrderFromQuote(id, session!.user.id)

    await logAction({
      adminId: session!.user.id,
      action: 'CREATE',
      entityType: 'ORDER',
      entityId: result.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    sendOrderNotification(result.id).catch(() => {})

    return success(result)
  } catch {
    return serverError()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const parsed = orderStatusSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await changeOrderStatus(id, parsed.data.status, session!.user.id, parsed.data.notes)

    await logAction({
      adminId: session!.user.id,
      action: 'STATUS_CHANGE',
      entityType: 'ORDER',
      entityId: id,
      details: { toStatus: parsed.data.status },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}
