import { requireAdmin } from '@/lib/api-auth'
import { getProductVariants, addVariant, updateVariant, deleteVariant } from '@/lib/services/product.service'
import { productVariantSchema } from '@/lib/validation'
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
    const variants = await getProductVariants(id)
    return success(variants)
  } catch {
    return serverError()
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const parsed = productVariantSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await addVariant(id, {
      name: parsed.data.name,
      sku: parsed.data.sku,
      priceModifier: parsed.data.priceModifier,
      stock: parsed.data.stock,
      isActive: parsed.data.isActive ?? true,
    })

    await logAction({
      adminId: session!.user.id,
      action: 'CREATE',
      entityType: 'PRODUCT_VARIANT',
      entityId: result.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}