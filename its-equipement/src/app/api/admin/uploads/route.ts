import { requireAdmin } from '@/lib/api-auth'
import { getUploadsByIds } from '@/lib/services/upload.service'
import { success, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

/**
 * GET /api/admin/uploads?ids=id1,id2,id3
 * Renvoie les métadonnées des fichiers uploadés (sans le contenu binaire).
 */
export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('ids') ?? ''
    const ids = raw.split(',').map((id) => id.trim()).filter(Boolean)

    if (ids.length === 0) {
      return success([])
    }

    const uploads = await getUploadsByIds(ids)
    return success(uploads)
  } catch {
    return serverError()
  }
}
