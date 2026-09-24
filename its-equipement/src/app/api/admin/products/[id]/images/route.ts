import { requireAdmin } from '@/lib/api-auth'
import { getProductImages, addImage, deleteImage } from '@/lib/services/product.service'
import { productImageSchema } from '@/lib/validation'
import { success, error, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const images = await getProductImages(id)
    return success(images)
  } catch {
    return serverError()
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const parsed = productImageSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await addImage(id, {
      url: parsed.data.url,
      altText: parsed.data.altText,
      sortOrder: parsed.data.sortOrder ?? 0,
    })

    return success(result)
  } catch {
    return serverError()
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')
    if (!imageId) return error('imageId requis', 422)

    const result = await deleteImage(imageId)
    return success(result)
  } catch {
    return serverError()
  }
}