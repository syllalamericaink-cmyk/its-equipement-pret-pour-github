import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { success, error, serverError } from '@/lib/api-response'
import { uploadFile } from '@/lib/services/upload.service'
import { checkApiRateLimit } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

// Seuls ces types sont acceptés depuis le site public. Un visiteur ne peut
// pas se faire passer pour une « photo produit » ou une « bannière ».
const PUBLIC_ENTITY_TYPES = new Set(['ORDER_LOGO', 'QUOTE_REQUEST'])

export async function POST(request: NextRequest) {
  try {
    // Limite partagée entre toutes les instances (stockée en base)
    if (!(await rateLimit(`upload:${getClientIp(request.headers)}`, 10, 600))) {
      return NextResponse.json({ success: false, error: 'Trop de fichiers envoyés. Réessayez dans quelques minutes.' }, { status: 429 })
    }
    // Plafond global par jour : protège l'espace de la base contre un remplissage volontaire
    if (!(await rateLimit('upload:global', 300, 86400))) {
      return NextResponse.json({ success: false, error: 'Envoi de fichiers momentanément indisponible. Contactez-nous sur WhatsApp.' }, { status: 429 })
    }
    if (!checkApiRateLimit(request)) {
      return error('Trop de requêtes. Réessayez dans une minute.', 429)
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return error('Aucun fichier reçu')
    }

    const requested = String(formData.get('entityType') ?? '')
    const entityType = PUBLIC_ENTITY_TYPES.has(requested) ? requested : 'AUTRE'

    const upload = await uploadFile(file, entityType)

    return success(upload)
  } catch (e) {
    if (e instanceof Error && e.message.toLowerCase().includes('fichier')) {
      return error(e.message)
    }
    return serverError()
  }
}
