import { requireAdmin } from '@/lib/api-auth'
import { createStockMovement, getVariantStock, getStockMovements } from '@/lib/services/stock.service'
import { stockMovementSchema } from '@/lib/validation'
import { success, notFound, error, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const { searchParams } = new URL(request.url)

    if (searchParams.get('movements') === 'true') {
      const pagination = getPaginationParams(request)
      const result = await getStockMovements({
        productVariantId: id,
        type: searchParams.get('type') ?? undefined,
        page: pagination.page,
        limit: pagination.limit,
      })
      return success(result.items, buildMeta(pagination.page, pagination.limit, result.total))
    }

    const result = await getVariantStock(id)
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
    const body = await request.json()
    const parsed = stockMovementSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Donnees invalides', 422)
    }

    if (parsed.data.productVariantId !== id) {
      return error('Variante ne correspond pas', 422)
    }

    const result = await createStockMovement({
      productVariantId: id,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
    })

    await logAction({
      adminId: session!.user.id,
      action: 'UPDATE',
      entityType: 'STOCK',
      entityId: id,
      details: { type: parsed.data.type, quantity: parsed.data.quantity },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}