import { requireAdmin } from '@/lib/api-auth'
import { getPaymentById, createPayment, updatePayment, confirmPayment, failPayment, cancelPayment, refundPayment } from '@/lib/services/payment.service'
import { paymentCreateSchema, paymentUpdateSchema } from '@/lib/validation'
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
    const result = await getPaymentById(id)
    if (!result) return notFound('Paiement introuvable')
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
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'confirm') {
      const body = await request.json()
      const result = await confirmPayment(id, {
        transactionRef: body.transactionRef,
        method: body.method,
        providerRef: body.providerRef,
        adminId: session!.user.id,
      })

      await logAction({
        adminId: session!.user.id,
        action: 'STATUS_CHANGE',
        entityType: 'PAYMENT',
        entityId: id,
        details: { toStatus: 'PAYE' },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })

      return success(result)
    }

    if (action === 'fail') {
      const body = await request.json()
      const result = await failPayment(id, {
        reason: body.reason ?? '',
        adminId: session!.user.id,
      })

      await logAction({
        adminId: session!.user.id,
        action: 'STATUS_CHANGE',
        entityType: 'PAYMENT',
        entityId: id,
        details: { toStatus: 'ECHEC', reason: body.reason },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })

      return success(result)
    }

    if (action === 'cancel') {
      const result = await cancelPayment(id, session!.user.id)

      await logAction({
        adminId: session!.user.id,
        action: 'STATUS_CHANGE',
        entityType: 'PAYMENT',
        entityId: id,
        details: { toStatus: 'ANNULE' },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })

      return success(result)
    }

    if (action === 'refund') {
      const result = await refundPayment(id, session!.user.id)

      await logAction({
        adminId: session!.user.id,
        action: 'STATUS_CHANGE',
        entityType: 'PAYMENT',
        entityId: id,
        details: { toStatus: 'REMBOURSE' },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })

      return success(result)
    }

    const body = await request.json()
    const parsed = paymentCreateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Donnees invalides', 422)
    }

    const result = await createPayment({
      orderId: id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      method: parsed.data.method,
      transactionRef: parsed.data.transactionRef,
      dueDate: parsed.data.dueDate,
      notes: parsed.data.notes,
      adminId: session!.user.id,
    })

    await logAction({
      adminId: session!.user.id,
      action: 'CREATE',
      entityType: 'PAYMENT',
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
    const parsed = paymentUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Donnees invalides', 422)
    }

    const result = await updatePayment(id, {
      status: parsed.data.status,
      amount: parsed.data.amount,
      method: parsed.data.method,
      provider: parsed.data.provider,
      providerRef: parsed.data.providerRef,
      transactionRef: parsed.data.transactionRef,
      dueDate: parsed.data.dueDate,
      paidAt: parsed.data.paidAt,
      receiptUrl: parsed.data.receiptUrl,
      notes: parsed.data.notes,
      adminId: session!.user.id,
    })

    await logAction({
      adminId: session!.user.id,
      action: 'UPDATE',
      entityType: 'PAYMENT',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}