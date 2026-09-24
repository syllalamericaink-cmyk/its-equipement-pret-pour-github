import { getCategories, getCategoryTree } from '@/lib/services/category.service'
import { success, getPaginationParams, buildMeta, serverError } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tree = searchParams.get('tree') === 'true'

    if (tree) {
      const items = await getCategoryTree()
      return success(items)
    }

    const { page, limit, skip } = getPaginationParams(request)
    const { items, total } = await getCategories()

    return success(items, buildMeta(page, limit, total))
  } catch {
    return serverError()
  }
}
