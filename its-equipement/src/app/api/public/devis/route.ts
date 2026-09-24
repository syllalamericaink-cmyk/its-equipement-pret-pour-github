import { success, error, serverError } from '@/lib/api-response'
import { createPublicOrder, sendOrderNotification } from '@/lib/services/public-order.service'
import { checkApiRateLimit } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request)) {
      return error('Trop de requetes. Reessayez dans une minute.', 429)
    }

    const body = await request.json()

    if (!body.clientName?.trim()) return error('Le nom est requis')
    if (!body.clientPhone?.trim()) return error('Le telephone est requis')
    if (!body.city?.trim()) return error('La ville est requise')
    if (!body.items?.length) return error('Le devis doit contenir au moins un produit')

    const validTypes = ['PARTICULIER', 'ENTREPRISE']
    if (!validTypes.includes(body.clientType)) return error('Type de client invalide')

    if (body.clientType === 'ENTREPRISE') {
      if (!body.companyName?.trim()) {
        return error('Le nom de l\'entreprise est requis')
      }
      if (!body.clientEmail?.trim()) {
        return error('L\'email est requis pour les entreprises')
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.clientEmail.trim())) return error('Email invalide')
    }

    if (body.clientType !== 'ENTREPRISE' && body.clientEmail?.trim()) {
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
      city: body.city.trim(),
      commune: body.commune?.trim(),
      address: body.address?.trim(),
      deliveryComment: body.deliveryComment?.trim(),
      deliveryFee: Number(body.deliveryFee) || 0,
      devisMode: true,
      items: body.items.map((item: Record<string, unknown>) => ({
        productId: String(item.productId),
        productName: String(item.productName),
        productSlug: String(item.productSlug),
        productSku: item.productSku ? String(item.productSku) : undefined,
        variantId: item.variantId ? String(item.variantId) : undefined,
        variantName: item.variantName ? String(item.variantName) : undefined,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        lineTotal: Number(item.lineTotal) || 0,
        hasPersonalization: Boolean(item.hasPersonalization),
        personalizationData: item.personalizationData as Record<string, unknown> | undefined,
      })),
    })

    sendOrderNotification(order.id).catch(() => {})

    return success({ devisNumber: order.devisNumber, id: order.id })
  } catch {
    return serverError()
  }
}
