/**
 * Modification / suppression d'un compte administrateur — ADMIN UNIQUEMENT.
 *
 *   PATCH  /api/admin/users/[id]   → { isActive? }  (désactiver / réactiver)
 *   DELETE /api/admin/users/[id]   → supprime le compte
 *
 * Règles de sécurité :
 *   - seul un ADMIN gère les comptes ;
 *   - on ne peut pas se supprimer soi-même ni se désactiver soi-même ;
 *   - on ne peut pas supprimer ou désactiver le dernier compte ADMIN actif.
 */

import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError, notFound } from '@/lib/api-response'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

async function hasOtherActiveAdmin(excludeId: string): Promise<boolean> {
  const count = await db.admin.count({ where: { role: 'ADMIN', isActive: true, NOT: { id: excludeId } } })
  return count > 0
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError
    if (session!.user.role !== 'ADMIN') {
      return error('Seul un administrateur peut gérer les comptes.', 403)
    }

    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as { isActive?: boolean }

    const target = await db.admin.findUnique({ where: { id } })
    if (!target) return notFound('Compte introuvable')

    if (body.isActive === false) {
      if (target.id === session!.user.id) {
        return error('Vous ne pouvez pas désactiver votre propre compte.')
      }
      if (target.role === 'ADMIN' && target.isActive && !(await hasOtherActiveAdmin(target.id))) {
        return error('Impossible de désactiver le dernier administrateur actif.')
      }
    }

    const updated = await db.admin.update({
      where: { id },
      data: { isActive: body.isActive ?? target.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    })

    return success(updated)
  } catch (err) {
    console.error('[api /admin/users/[id]] Erreur:', err)
    return serverError()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError
    if (session!.user.role !== 'ADMIN') {
      return error('Seul un administrateur peut supprimer des comptes.', 403)
    }

    const { id } = await params
    const target = await db.admin.findUnique({ where: { id } })
    if (!target) return notFound('Compte introuvable')

    if (target.id === session!.user.id) {
      return error('Vous ne pouvez pas supprimer votre propre compte.')
    }
    if (target.role === 'ADMIN' && target.isActive && !(await hasOtherActiveAdmin(target.id))) {
      return error('Impossible de supprimer le dernier administrateur actif.')
    }

    await db.admin.delete({ where: { id } })

    return success({ deleted: true })
  } catch (err) {
    console.error('[api /admin/users/[id]] Erreur:', err)
    return serverError()
  }
}
