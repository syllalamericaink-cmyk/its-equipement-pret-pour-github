import { requireAdmin } from '@/lib/api-auth'
import { getUploadContent } from '@/lib/services/upload.service'
import { notFound, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

/**
 * GET /api/admin/uploads/[id]
 * Télécharge le contenu binaire du fichier (protégé admin).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const content = await getUploadContent(id)
    if (!content) return notFound('Fichier introuvable')

    return new Response(new Uint8Array(content.buffer), {
      headers: {
        'Content-Type': content.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(content.filename)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return serverError()
  }
}
