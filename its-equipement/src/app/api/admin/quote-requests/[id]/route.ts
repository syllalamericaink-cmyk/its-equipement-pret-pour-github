import { requireAdmin } from '@/lib/api-auth'
import { getQuoteRequestById, updateQuoteRequest } from '@/lib/services/quote-request.service'
import { quoteRequestUpdateSchema } from '@/lib/validation'
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
    const result = await getQuoteRequestById(id)
    if (!result) return notFound('Demande de devis introuvable')
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
    const parsed = quoteRequestUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.adminNotes !== undefined) updateData.adminNotes = parsed.data.adminNotes

    const result = await updateQuoteRequest(id, updateData)

    await logAction({
      adminId: session!.user.id,
      action: parsed.data.status ? 'STATUS_CHANGE' : 'UPDATE',
      entityType: 'QUOTE_REQUEST',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}