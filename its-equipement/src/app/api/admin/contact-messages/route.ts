import { requireAdmin } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { success, serverError, buildMeta, getPaginationParams } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

/**
 * GET /api/admin/contact-messages — liste des messages de contact
 * Params : page, limit, read=all|unread|read, search
 */
export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(request)
    const read = searchParams.get('read') ?? 'all'
    const search = searchParams.get('search')?.trim() ?? ''

    const where: Record<string, unknown> = {}
    if (read === 'unread') where.isRead = false
    if (read === 'read') where.isRead = true
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, messages, unreadCount] = await Promise.all([
      db.contactMessage.count({ where }),
      db.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contactMessage.count({ where: { isRead: false } }),
    ])

    return success(messages, { ...buildMeta(page, limit, total), unreadCount })
  } catch (err) {
    console.error('[api /admin/contact-messages] Erreur:', err)
    return serverError()
  }
}
