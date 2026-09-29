/**
 * Modification / réordonnancement / suppression d'une image hero — ADMIN UNIQUEMENT.
 *
 *   PATCH  /api/admin/hero/[id]   → { altText?, isActive?, move?: 'up' | 'down' }
 *   DELETE /api/admin/hero/[id]   → supprime l'image hero + l'upload associé
 */

import { requireAdmin } from '@/lib/api-auth'
import { success, serverError, badRequest, notFound } from '@/lib/api-response'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

async function swapSortOrder(idA: string, idB: string) {
  const [a, b] = await Promise.all([
    db.heroImage.findUnique({ where: { id: idA } }),
    db.heroImage.findUnique({ where: { id: idB } }),
  ])
  if (!a || !b) return
  await db.$transaction([
    db.heroImage.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    db.heroImage.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ])
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as {
      altText?: string
      isActive?: boolean
      move?: 'up' | 'down'
    }

    const hero = await db.heroImage.findUnique({ where: { id } })
    if (!hero) return notFound('Image introuvable')

    if (body.move === 'up' || body.move === 'down') {
      const siblings = await db.heroImage.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      })
      const index = siblings.findIndex((h) => h.id === id)
      const targetIndex = body.move === 'up' ? index - 1 : index + 1
      if (targetIndex >= 0 && targetIndex < siblings.length) {
        await swapSortOrder(id, siblings[targetIndex].id)
      }
      return success({ moved: true })
    }

    const updated = await db.heroImage.update({
      where: { id },
      data: {
        ...(body.altText !== undefined ? { altText: body.altText.trim().slice(0, 180) || null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    })

    return success({
      id: updated.id,
      url: `/api/public/uploads/${updated.uploadId}`,
      altText: updated.altText,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
    })
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

    const hero = await db.heroImage.findUnique({ where: { id } })
    if (!hero) return notFound('Image introuvable')

    await db.$transaction([db.heroImage.delete({ where: { id } })])

    // L'upload associé est supprimé dans un second temps (ignoré s'il est déjà parti)
    try {
      await db.upload.delete({ where: { id: hero.uploadId } })
    } catch {
      /* upload déjà supprimé ou référencé ailleurs */
    }

    return success({ deleted: true })
  } catch {
    return serverError()
  }
}
