import { requireAdmin } from '@/lib/api-auth'
import { getProducts, createProduct } from '@/lib/services/product.service'
import { productSchema } from '@/lib/validation'
import { success, error, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(request)
    const search = searchParams.get('search') ?? undefined
    const categoryId = searchParams.get('categoryId') ?? undefined
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const { items, total } = await getProducts({
      page,
      limit,
      skip,
      search,
      categoryId,
      includeInactive,
    })

    return success(items, buildMeta(page, limit, total))
  } catch {
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const body = await request.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await createProduct({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      sku: parsed.data.sku,
      basePrice: parsed.data.basePrice,
      isPersonalizable: parsed.data.isPersonalizable,
      minQuantity: parsed.data.minQuantity ?? 1,
      isActive: parsed.data.isActive ?? true,
      category: { connect: { id: parsed.data.categoryId } },
    })

    await logAction({
      adminId: session!.user.id,
      action: 'CREATE',
      entityType: 'PRODUCT',
      entityId: result.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}
