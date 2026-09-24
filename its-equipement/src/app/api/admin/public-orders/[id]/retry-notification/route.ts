import { requireAdmin } from '@/lib/api-auth'
import { success, error as apiError, serverError } from '@/lib/api-response'
import { sendOrderNotification, getPublicOrderById } from '@/lib/services/public-order.service'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const order = await getPublicOrderById(id)
    if (!order) return apiError('Commande introuvable', 404)

    await sendOrderNotification(id)
    const updated = await getPublicOrderById(id)
    return success(updated)
  } catch {
    return serverError()
  }
}
