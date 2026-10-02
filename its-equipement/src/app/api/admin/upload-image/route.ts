/**
 * Téléversement d'une image de produit — ADMIN UNIQUEMENT.
 *
 *   POST /api/admin/upload-image   (multipart/form-data : file)
 *
 * Stocke le fichier en base64 (table Upload, compatible Vercel) et renvoie
 * l'URL publique /api/public/uploads/<id>, directement utilisable comme
 * image produit. accept="image/*" côté client ouvre la galerie du téléphone.
 */

import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError } from '@/lib/api-response'
import { uploadFile } from '@/lib/services/upload.service'
import type { NextRequest } from 'next/server'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return error('Aucun fichier reçu. Sélectionnez une image.')
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return error('Format non accepté. Utilisez une image JPG, PNG, WEBP ou AVIF.')
    }
    if (file.size > 4 * 1024 * 1024) {
      return error('Image trop lourde (maximum 4 Mo).')
    }

    const upload = await uploadFile(file, 'product-image')

    return success({
      id: upload.id,
      url: `/api/public/uploads/${upload.id}`,
      originalName: upload.originalName,
    })
  } catch (err) {
    console.error('[api /admin/upload-image] Erreur:', err)
    return serverError()
  }
}
