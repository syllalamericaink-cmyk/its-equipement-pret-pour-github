import { requireAdmin } from '@/lib/api-auth'
import { getQuoteById, createQuote, updateQuote, changeQuoteStatus } from '@/lib/services/quote.service'
import { quoteCreateSchema, quoteUpdateSchema, quoteStatusSchema } from '@/lib/validation'
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
    const result = await getQuoteById(id)
    if (!result) return notFound('Devis introuvable')
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
    const parsed = quoteCreateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await createQuote({
      quoteRequestId: id,
      items: parsed.data.items,
      discountAmount: parsed.data.discountAmount,
      tvaRate: parsed.data.tvaRate,
      conditions: parsed.data.conditions,
      adminId: session!.user.id,
    })

    await logAction({
      adminId: session!.user.id,
      action: 'CREATE',
      entityType: 'QUOTE',
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

    if (body.status && !body.items && body.discountAmount === undefined) {
      const parsed = quoteStatusSchema.safeParse(body)
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]
        return error(firstError?.message ?? 'Données invalides', 422)
      }

      const result = await changeQuoteStatus(id, parsed.data.status, session!.user.id)

      await logAction({
        adminId: session!.user.id,
        action: 'STATUS_CHANGE',
        entityType: 'QUOTE',
        entityId: id,
        details: { from: body.fromStatus, to: parsed.data.status },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })

      return success(result)
    }

    const parsed = quoteUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await updateQuote(id, {
      items: parsed.data.items,
      discountAmount: parsed.data.discountAmount,
      tvaRate: parsed.data.tvaRate,
      conditions: parsed.data.conditions,
      validUntil: parsed.data.validUntil,
      adminId: session!.user.id,
    })

    await logAction({
      adminId: session!.user.id,
      action: 'UPDATE',
      entityType: 'QUOTE',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}