import { success, error, serverError } from '@/lib/api-response'
import { createPublicOrder, sendOrderNotification } from '@/lib/services/public-order.service'
import { checkApiRateLimit } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request)) {
      return error('Trop de requêtes. Réessayez dans une minute.', 429)
    }

    const body = await request.json()

    if (!body.clientName?.trim()) return error('Le nom est requis')
    if (!body.clientPhone?.trim()) return error('Le telephone est requis')
    if (!body.city?.trim()) return error('La ville est requise')
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return error('La commande doit contenir entre 1 et 50 produits')

    const validTypes = ['PARTICULIER', 'ENTREPRISE']
    if (!validTypes.includes(body.clientType)) return error('Type de client invalide')

    if (body.clientType === 'ENTREPRISE' && !body.companyName?.trim()) {
      return error('Le nom de l\'entreprise est requis')
    }

    const validRequestTypes = ['COMMANDE_SIMPLE', 'DEVIS', 'BON_COMMANDE', 'FNE']
    const requestType = body.requestType ?? 'COMMANDE_SIMPLE'
    if (!validRequestTypes.includes(requestType)) {
      return error('Type de demande invalide')
    }

    // Pour devis, bon de commande ou FNE, les infos entreprise sont requises
    if (requestType !== 'COMMANDE_SIMPLE') {
      if (!body.companyName?.trim()) {
        return error('Le nom de l\'entreprise est requis pour ce type de demande')
      }
      if (!body.companyInfo?.trim()) {
        return error('Les informations de l\'entreprise sont requises pour ce type de demande')
      }
    }

    if (body.clientEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.clientEmail.trim())) return error('Email invalide')
    }

    const order = await createPublicOrder({
      clientName: body.clientName.trim(),
      clientFirstName: body.clientFirstName?.trim() || undefined,
      clientPhone: body.clientPhone.trim(),
      clientEmail: body.clientEmail?.trim()?.toLowerCase() || undefined,
      clientType: body.clientType,
      companyName: body.companyName?.trim() || undefined,
      companyInfo: body.companyInfo?.trim() || undefined,
      requestType,
      personalizationSummary: body.personalizationSummary?.trim() || undefined,
      city: body.city.trim(),
      commune: body.commune?.trim(),
      address: body.address?.trim(),
      deliveryComment: body.deliveryComment?.trim(),
      deliveryFee: 0,
      items: body.items.map((item: Record<string, unknown>) => ({
        productId: String(item.productId),
        productName: String(item.productName),
        productSlug: String(item.productSlug),
        productSku: item.productSku ? String(item.productSku) : undefined,
        variantId: item.variantId ? String(item.variantId) : undefined,
        variantName: item.variantName ? String(item.variantName) : undefined,
        quantity: Number.isInteger(item.quantity) ? Number(item.quantity) : 0,
        unitPrice: undefined,
        lineTotal: undefined,
        hasPersonalization: Boolean(item.hasPersonalization),
        personalizationData: item.personalizationData as Record<string, unknown> | undefined,
      })),
    })

    sendOrderNotification(order.id).catch(() => {})

    return success({ orderNumber: order.orderNumber, id: order.id, requestType })
  } catch {
    return serverError()
  }
}
