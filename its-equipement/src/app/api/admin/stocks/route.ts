import { requireAdmin } from '@/lib/api-auth'
import { getAllVariantStocks, getLowStockVariants } from '@/lib/services/stock.service'
import { success, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const lowOnly = searchParams.get('low') === 'true'

    if (lowOnly) {
      const stocks = await getLowStockVariants()
      return success(stocks)
    }

    const stocks = await getAllVariantStocks()
    return success(stocks)
  } catch {
    return serverError()
  }
}
