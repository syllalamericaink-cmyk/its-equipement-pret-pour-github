/**
 * Liste publique des images de la bannière d'accueil (hero).
 * Renverra uniquement les images actives, triées.
 * Si aucune image n'a été ajoutée depuis l'admin, le front garde son
 * fallback actuel (visuel produit).
 */

import { db } from '@/lib/db'
import { success, serverError } from '@/lib/api-response'
import { checkApiRateLimit } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  if (!checkApiRateLimit(request)) {
    return new Response('Trop de requêtes. Réessayez dans une minute.', { status: 429 })
  }

  try {
    const heroes = await db.heroImage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, uploadId: true, altText: true },
    })

    return success(
      heroes.map((h) => ({
        id: h.id,
        url: `/api/public/uploads/${h.uploadId}`,
        altText: h.altText ?? 'Équipements ITS Équipement',
      }))
    )
  } catch {
    return serverError()
  }
}
