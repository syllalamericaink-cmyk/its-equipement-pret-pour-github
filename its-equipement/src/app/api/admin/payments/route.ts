import { requireAdmin } from '@/lib/api-auth'
import { getPayments, initiatePayment } from '@/lib/services/payment.service'
import { success, error, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(request)
    const status = searchParams.get('status') ?? undefined
    const orderId = searchParams.get('orderId') ?? undefined

    const { items, total } = await getPayments({ page, limit, skip, status, orderId })

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
    const { orderId, type, provider } = body as { orderId: string; type: string; provider?: string }

    if (!orderId || !type) {
      return error('orderId et type sont requis', 422)
    }

    const validTypes = ['DEPOSIT', 'BALANCE', 'FULL']
    if (!validTypes.includes(type)) {
      return error(`Type invalide. Valeurs autorisees: ${validTypes.join(', ')}`, 422)
    }

    const result = await initiatePayment(orderId, type, provider, session!.user.id)

    await logAction({
      adminId: session!.user.id,
      action: 'CREATE',
      entityType: 'PAYMENT',
      entityId: result.id,
      details: { type, provider, amount: result.amount, orderId },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}