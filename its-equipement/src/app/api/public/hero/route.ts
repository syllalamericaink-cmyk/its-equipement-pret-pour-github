/**
 * Liste publique des images de la bannière d'accueil (hero).
 * Renvoie uniquement les images actives, triées, avec leurs textes optionnels
 * (title, text, ctaLabel, href) affichés en bas de la bannière par le carrousel.
 * Si aucune image n'a été ajoutée depuis l'admin, le front garde son
 * fallback actuel (bannières texte).
 */

import { db } from '@/lib/db'
import { success, serverError } from '@/lib/api-response'
import { checkApiRateLimit } from '@/lib/api-auth'
import { ensureHeroTextColumns } from '@/lib/hero-columns'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  if (!checkApiRateLimit(request)) {
    return new Response('Trop de requêtes. Réessayez dans une minute.', { status: 429 })
  }

  try {
    // Garantit la présence des colonnes de texte (déploiement avant db push)
    await ensureHeroTextColumns()

    const heroes = await db.heroImage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        uploadId: true,
        altText: true,
        title: true,
        text: true,
        ctaLabel: true,
        href: true,
        objectPosition: true,
      },
    })

    return success(
      heroes.map((h) => ({
        id: h.id,
        url: `/api/public/uploads/${h.uploadId}`,
        altText: h.altText ?? 'Équipements ITS Équipement',
        title: h.title ?? null,
        text: h.text ?? null,
        ctaLabel: h.ctaLabel ?? null,
        href: h.href ?? null,
        objectPosition: h.objectPosition ?? 'center',
      }))
    )
  } catch (err) {
    console.error('[api /public/hero] Erreur:', err)
    return serverError()
  }
}
