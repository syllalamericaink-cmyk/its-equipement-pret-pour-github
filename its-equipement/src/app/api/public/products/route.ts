import { getProducts } from '@/lib/services/product.service'
import { success, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(request)
    const search = searchParams.get('search') ?? undefined
    const categoryId = searchParams.get('categoryId') ?? undefined

    const { items, total } = await getProducts({
      page,
      limit,
      skip,
      search,
      categoryId,
    })

    return success(items, buildMeta(page, limit, total))
  } catch {
    return serverError()
  }
}
