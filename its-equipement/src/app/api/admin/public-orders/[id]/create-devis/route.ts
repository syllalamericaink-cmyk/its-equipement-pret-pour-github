import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError } from '@/lib/api-response'
import { getPublicOrderById } from '@/lib/services/public-order.service'
import { db } from '@/lib/db'
import { getTvaRate, getQuoteValidityDays } from '@/lib/services/settings.service'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const publicOrder = await getPublicOrderById(id)
    if (!publicOrder) return error('Commande introuvable', 404)

    if (publicOrder.quoteId) return error('Un devis existe deja pour cette commande')

    const clientEmail = (publicOrder.clientEmail ?? publicOrder.clientPhone).toLowerCase()
    let client = await db.client.findFirst({
      where: { email: clientEmail },
    })

    if (!client) {
      client = await db.client.create({
        data: {
          companyName: publicOrder.clientName,
          contactName: publicOrder.clientName,
          email: clientEmail,
          phone: publicOrder.clientPhone,
          address: publicOrder.address ?? undefined,
          city: publicOrder.city,
        },
      })
    }

    const tvaRate = await getTvaRate()
    const validityDays = await getQuoteValidityDays()
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validityDays)

    let subtotalHT = 0
    const quoteItems = publicOrder.items.map(item => {
      const unitPrice = Number(item.unitPrice)
      const lineTotal = unitPrice * item.quantity
      subtotalHT += lineTotal
      return {
        productId: item.productId,
        productVariantId: item.variantId,
        productName: item.productName,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        hasPersonalization: item.hasPersonalization,
      }
    })

    const totalAmountHT = subtotalHT
    const totalAmountTTC = totalAmountHT * (1 + tvaRate)

    const year = new Date().getFullYear()
    const quoteCount = await db.quote.count({
      where: { createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    })
    const quoteNumber = `DEV-${year}-${(quoteCount + 1).toString().padStart(5, '0')}`

    const quote = await db.quote.create({
      data: {
        quoteRequestId: '',
        quoteNumber,
        validUntil,
        status: 'DRAFT',
        subtotalHT,
        discountAmount: 0,
        totalAmountHT,
        tvaRate,
        totalAmountTTC,
        conditions: `Commande #${publicOrder.orderNumber}`,
        items: { create: quoteItems.map(qi => ({
          productId: qi.productId,
          productVariant: qi.productVariantId ? { connect: { id: qi.productVariantId } } : undefined,
          productName: qi.productName,
          unitPrice: qi.unitPrice,
          quantity: qi.quantity,
          lineTotal: qi.lineTotal,
          hasPersonalization: qi.hasPersonalization,
        })) },
        statusHistory: { create: { toStatus: 'DRAFT', changedBy: session!.user.id } },
      },
    })

    await db.quoteRequest.create({
      data: {
        reference: `QR-${publicOrder.orderNumber}`,
        clientId: client.id,
        status: 'QUOTED',
        notes: publicOrder.deliveryComment ?? undefined,
        quotes: { connect: { id: quote.id } },
      },
    })

    await db.publicOrder.update({
      where: { id },
      data: { quoteId: quote.id },
    })

    return success({ quoteId: quote.id, quoteNumber })
  } catch {
    return serverError()
  }
}
