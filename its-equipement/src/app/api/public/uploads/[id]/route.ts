/**
 * Service public des uploads IMAGES (logos de personnalisation).
 * Utilisé par les liens envoyés dans WhatsApp / Telegram : le commercial
 * clique et voit le logo du client.
 *
 * Sécurité :
 *   - Images uniquement (jamais de PDF ni de binaire arbitraire)
 *   - Rate-limité comme toutes les routes publiques
 *   - Cache immuable : le contenu d'un upload ne change jamais
 */

import { getUploadContent } from '@/lib/services/upload.service'
import { checkApiRateLimit } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkApiRateLimit(request)) {
    return new Response('Trop de requêtes. Réessayez dans une minute.', { status: 429 })
  }

  try {
    const { id } = await params
    const content = await getUploadContent(id)

    if (!content) {
      return new Response('Fichier introuvable', { status: 404 })
    }

    if (!content.mimeType.startsWith('image/')) {
      return new Response('Type de fichier non accessible publiquement', { status: 403 })
    }

    const safeName = content.filename.replace(/[^\w.\-() ]+/g, '_')

    return new Response(new Uint8Array(content.buffer), {
      headers: {
        'Content-Type': content.mimeType,
        'Content-Length': String(content.buffer.length),
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response('Erreur serveur', { status: 500 })
  }
}
