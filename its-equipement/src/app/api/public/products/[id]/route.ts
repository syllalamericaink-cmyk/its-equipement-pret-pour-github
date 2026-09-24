import { getProductById, getProductBySlug } from '@/lib/services/product.service'
import { success, notFound, serverError } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await getProductById(id)
    if (!product) {
      const bySlug = await getProductBySlug(id)
      if (!bySlug) return notFound('Produit introuvable')
      return success(bySlug)
    }
    return success(product)
  } catch {
    return serverError()
  }
}
