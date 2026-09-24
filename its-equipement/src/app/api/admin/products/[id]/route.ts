import { requireAdmin } from '@/lib/api-auth'
import { getProductById, updateProduct, deleteProduct } from '@/lib/services/product.service'
import { productSchema } from '@/lib/validation'
import { success, notFound, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
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
  } catch {
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
      minQuantity: parsed.data.minQuantity,
      isActive: parsed.data.isActive,
      category: { connect: { id: parsed.data.categoryId } },
    })

    await logAction({
      adminId: session!.user.id,
      action: 'UPDATE',
      entityType: 'PRODUCT',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
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
  } catch {
    return serverError()
  }
}