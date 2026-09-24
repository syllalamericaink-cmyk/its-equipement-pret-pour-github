import { createQuoteRequest } from '@/lib/services/quote-request.service'
import { quoteRequestSchema } from '@/lib/validation'
import { success, error, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

const qrRateMap = new Map<string, { count: number; resetAt: number }>()

function checkQuoteRequestRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = qrRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    qrRateMap.set(ip, { count: 1, resetAt: now + 300000 })
    return true
  }
  entry.count++
  return entry.count <= 5
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkQuoteRequestRateLimit(ip)) {
      return error('Trop de demandes de devis. Reessayez plus tard.', 429)
    }

    const body = await request.json()
    const parsed = quoteRequestSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Donnees invalides', 422)
    }

    const result = await createQuoteRequest(parsed.data)
    return success(result, undefined)
  } catch {
    return serverError()
  }
}
