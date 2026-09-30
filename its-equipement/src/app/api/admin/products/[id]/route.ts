import { requireAdmin } from '@/lib/api-auth'
import { getProductById, updateProduct, deleteProduct } from '@/lib/services/product.service'
import { productSchema } from '@/lib/validation'
import { success, notFound, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const result = await getProductById(id, true)
    if (!result) return notFound('Produit introuvable')
    return success(result)
  } catch (err) {
    console.error('[api /admin/products/[id]] Erreur:', err)
    return serverError()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await updateProduct(id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      sku: parsed.data.sku,
      basePrice: parsed.data.basePrice,
      isPersonalizable: parsed.data.isPersonalizable,
      showOnHome: parsed.data.showOnHome ?? false,
      minQuantity: parsed.data.minQuantity,
      isActive: parsed.data.isActive,
      category: { connect: { id: parsed.data.categoryId } },
    })

    // Réductions par palier de quantité : remplacement complet (simple et prévisible)
    if (parsed.data.quantityDiscounts !== undefined) {
      await db.quantityDiscount.deleteMany({ where: { productId: id } })
      if (parsed.data.quantityDiscounts.length > 0) {
        await db.quantityDiscount.createMany({
          data: parsed.data.quantityDiscounts.map((d) => ({
            productId: id,
            minQuantity: d.minQuantity,
            discountPercent: d.discountPercent,
          })),
        })
      }
    }

    await logAction({
      adminId: session!.user.id,
      action: 'UPDATE',
      entityType: 'PRODUCT',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch (err) {
    console.error('[api /admin/products/[id]] Erreur:', err)
    return serverError()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const result = await deleteProduct(id)

    await logAction({
      adminId: session!.user.id,
      action: 'DELETE',
      entityType: 'PRODUCT',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch (err) {
    console.error('[api /admin/products/[id]] Erreur:', err)
    return serverError()
  }
}