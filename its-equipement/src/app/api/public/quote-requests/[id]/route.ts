import { getQuoteRequestById, getQuoteRequestByReference } from '@/lib/services/quote-request.service'
import { success, notFound, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let result = await getQuoteRequestById(id)
    if (!result) result = await getQuoteRequestByReference(id)
    if (!result) return notFound('Demande de devis introuvable')
    return success(result)
  } catch {
    return serverError()
  }
}
