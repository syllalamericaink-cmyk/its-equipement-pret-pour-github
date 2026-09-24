import { requireAdmin } from '@/lib/api-auth'
import { getDeliveryById, createDelivery, updateDelivery, changeDeliveryStatus } from '@/lib/services/delivery.service'
import { deliveryCreateSchema, deliveryUpdateSchema, deliveryStatusSchema } from '@/lib/validation'
import { success, notFound, error, serverError } from '@/lib/api-response'
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
    const result = await getDeliveryById(id)
    if (!result) return notFound('Livraison introuvable')
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
    const parsed = deliveryCreateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Donnees invalides', 422)
    }

    const result = await createDelivery({
      orderId: id,
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      deliveryPerson: parsed.data.deliveryPerson,
      shippingAddress: parsed.data.shippingAddress,
      shippingFees: parsed.data.shippingFees,
      estimatedDelivery: parsed.data.estimatedDelivery,
      notes: parsed.data.notes,
    })

    await logAction({
      adminId: session!.user.id,
      action: 'CREATE',
      entityType: 'DELIVERY',
      entityId: result.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

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

    if (body.status && !body.trackingNumber && !body.carrier && !body.shippingAddress && !body.deliveryPerson && !body.shippingFees && !body.estimatedDelivery && !body.notes) {
      const parsed = deliveryStatusSchema.safeParse(body)
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]
        return error(firstError?.message ?? 'Donnees invalides', 422)
      }

      const result = await changeDeliveryStatus(id, parsed.data.status, session!.user.id)

      await logAction({
        adminId: session!.user.id,
        action: 'STATUS_CHANGE',
        entityType: 'DELIVERY',
        entityId: id,
        details: { toStatus: parsed.data.status },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })

      return success(result)
    }

    const parsed = deliveryUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Donnees invalides', 422)
    }

    const result = await updateDelivery(id, {
      status: parsed.data.status,
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      deliveryPerson: parsed.data.deliveryPerson,
      shippingAddress: parsed.data.shippingAddress as Record<string, unknown> | undefined,
      shippingFees: parsed.data.shippingFees,
      estimatedDelivery: parsed.data.estimatedDelivery,
      notes: parsed.data.notes,
      adminId: session!.user.id,
    })

    await logAction({
      adminId: session!.user.id,
      action: 'UPDATE',
      entityType: 'DELIVERY',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}