/**
 * Gestion des images de la bannière d'accueil (hero) — ADMIN UNIQUEMENT.
 *
 *   GET  /api/admin/hero   → liste complète (actives et inactives)
 *   POST /api/admin/hero   → ajoute une image (multipart/form-data : file, altText)
 *
 * Les fichiers sont stockés en base64 dans la table Upload (compatible Vercel)
 * et servis publiquement via /api/public/uploads/[id].
 */

import { requireAdmin } from '@/lib/api-auth'
import { success, serverError, badRequest } from '@/lib/api-response'
import { uploadFile } from '@/lib/services/upload.service'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

const ALLOWED_HERO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const heroes = await db.heroImage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return success(
      heroes.map((h) => ({
        id: h.id,
        url: `/api/public/uploads/${h.uploadId}`,
        altText: h.altText,
        sortOrder: h.sortOrder,
        isActive: h.isActive,
        createdAt: h.createdAt,
      }))
    )
  } catch {
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return badRequest('Aucun fichier reçu. Sélectionnez une image.')
    }
    if (!ALLOWED_HERO_TYPES.includes(file.type)) {
      return badRequest('Format non accepté. Utilisez une image JPG, PNG, WEBP ou AVIF.')
    }
    if (file.size > 4 * 1024 * 1024) {
      return badRequest('Image trop lourde (maximum 4 Mo).')
    }

    const altText = (formData.get('altText') as string | null)?.trim().slice(0, 180) || null

    const upload = await uploadFile(file, 'hero-image')

    const count = await db.heroImage.count()
    const hero = await db.heroImage.create({
      data: {
        uploadId: upload.id,
        altText,
        sortOrder: count,
        isActive: true,
      },
    })

    return success({
      id: hero.id,
      url: `/api/public/uploads/${hero.uploadId}`,
      altText: hero.altText,
      sortOrder: hero.sortOrder,
      isActive: hero.isActive,
      createdAt: hero.createdAt,
    })
  } catch {
    return serverError()
  }
}
