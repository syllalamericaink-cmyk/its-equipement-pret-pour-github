import { success, error, serverError } from '@/lib/api-response'
import { uploadFile } from '@/lib/services/upload.service'
import { checkApiRateLimit } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request)) {
      return error('Trop de requêtes. Réessayez dans une minute.', 429)
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return error('Aucun fichier reçu')
    }

    const entityType = (formData.get('entityType') as string) || 'AUTRE'

    const upload = await uploadFile(file, entityType)

    return success(upload)
  } catch (e) {
    if (e instanceof Error && e.message.toLowerCase().includes('fichier')) {
      return error(e.message)
    }
    return serverError()
  }
}
