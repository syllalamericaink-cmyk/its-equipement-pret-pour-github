import { error, serverError, success } from '@/lib/api-response'
import { createPublicOrder, sendOrderNotification } from '@/lib/services/public-order.service'
import { checkApiRateLimit } from '@/lib/api-auth'
import { publicOrderSchema } from '@/lib/validation/public-order'
import type { NextRequest } from 'next/server'

/** Public order creation. The request is validated here; totals are recalculated in the service. */
export async function POST(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request)) return error('Trop de requêtes. Réessayez dans une minute.', 429)

    const raw = await request.json()
    const parsed = publicOrderSchema.safeParse(raw)
    if (!parsed.success) {
      return error('Les informations de commande sont invalides.', 400)
    }

    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim()
    if (idempotencyKey && (idempotencyKey.length < 16 || idempotencyKey.length > 100)) {
      return error('Clé de requête invalide.', 400)
    }

    const order = await createPublicOrder({
      ...parsed.data,
      clientEmail: parsed.data.clientEmail || undefined,
      items: parsed.data.items,
      idempotencyKey,
    })

    // WhatsApp is deliberately decoupled from order creation: a provider outage must not
    // make a valid order disappear. The admin retry action remains the source of recovery.
    sendOrderNotification(order.id).catch(() => undefined)

    return success({ orderNumber: order.orderNumber, devisNumber: order.devisNumber, id: order.id, requestType: order.requestType })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : ''
    if (message.includes('indisponible') || message.includes('introuvable') || message.includes('Variante')) {
      return error(message, 409)
    }
    // Keep provider/database details out of the public response. Log correlation can be
    // added by the hosting platform without exposing secrets to customers.
    return serverError()
  }
}
