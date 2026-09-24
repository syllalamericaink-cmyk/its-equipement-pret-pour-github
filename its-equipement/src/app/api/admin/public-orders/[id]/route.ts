import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError } from '@/lib/api-response'
import { getPublicOrderById, changePublicOrderStatus } from '@/lib/services/public-order.service'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const order = await getPublicOrderById(id)
    if (!order) return error('Commande introuvable', 404)

    return success(order)
  } catch {
    return serverError()
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = await request.json()

    if (body.status) {
      const order = await changePublicOrderStatus(id, body.status, session!.user.id)
      return success(order)
    }

    return error('Aucune donnee a mettre a jour')
  } catch {
    return serverError()
  }
}
