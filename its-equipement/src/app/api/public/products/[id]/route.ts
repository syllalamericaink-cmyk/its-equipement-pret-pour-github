import { getProductById, getProductBySlug } from '@/lib/services/product.service'
import { success, notFound, serverError } from '@/lib/api-response'
import { decodeSlug } from '@/lib/slug'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    // Les segments dynamiques peuvent arriver percent-encoded (slugs accentués)
    const id = decodeSlug(rawId)
    const product = await getProductById(id)
    if (!product) {
      const bySlug = await getProductBySlug(id)
      if (!bySlug) return notFound('Produit introuvable')
      return success(bySlug)
    }
    return success(product)
  } catch (err) {
    console.error('[api /public/products/[id]] Erreur:', err)
    return serverError()
  }
}
