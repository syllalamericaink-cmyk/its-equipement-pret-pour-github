import { requireAdmin } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { success, notFound, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

/**
 * PUT /api/admin/contact-messages/[id] — marquer comme lu / non lu
 * DELETE — supprimer le message
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const existing = await db.contactMessage.findUnique({ where: { id } })
    if (!existing) return notFound('Message introuvable')

    const message = await db.contactMessage.update({
      where: { id },
      data: { isRead: typeof body.isRead === 'boolean' ? body.isRead : true },
    })

    return success(message)
  } catch {
    return serverError()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const existing = await db.contactMessage.findUnique({ where: { id } })
    if (!existing) return notFound('Message introuvable')

    await db.contactMessage.delete({ where: { id } })

    return success({ deleted: true })
  } catch {
    return serverError()
  }
}
