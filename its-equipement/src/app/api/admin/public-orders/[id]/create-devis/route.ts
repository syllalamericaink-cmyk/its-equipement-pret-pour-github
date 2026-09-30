import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError } from '@/lib/api-response'
import { getPublicOrderById } from '@/lib/services/public-order.service'
import { generateQuoteNumber } from '@/lib/services/quote.service'
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

    // Client : e-mail réel si fourni, sinon on cherche par téléphone
    // (on ne met plus le numéro de téléphone dans la colonne e-mail).
    const realEmail = publicOrder.clientEmail?.trim().toLowerCase() || null
    const phone = publicOrder.clientPhone.trim()

    let client = realEmail
      ? await db.client.findFirst({ where: { OR: [{ email: realEmail }, { phone }] } })
      : await db.client.findFirst({ where: { phone } })

    if (!client) {
      client = await db.client.create({
        data: {
          companyName: publicOrder.companyName || publicOrder.clientName,
          contactName: publicOrder.clientName,
          email: realEmail ?? `sans-email-${phone.replace(/[^0-9]/g, '')}@clients.its-equipement`,
          phone,
          address: publicOrder.address ?? undefined,
          city: publicOrder.city,
        },
      })
    }

    const tvaRate = await getTvaRate()
    const validityDays = await getQuoteValidityDays()
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validityDays)

    // Les lignes copient la remise quantité déjà appliquée côté client :
    // unitPrice devient le prix net (prix catalogue - remise) pour que
    // PU x Qté = Total de ligne, comme ce que le client a vu sur le site.
    let subtotalHT = 0
    const quoteItems = publicOrder.items.map(item => {
      const remise = Number(item.discountPercent ?? 0)
      const unitPriceNet = Number(item.unitPrice) * (1 - remise / 100)
      const lineTotal = Number(item.lineTotal) > 0 ? Number(item.lineTotal) : unitPriceNet * item.quantity
      subtotalHT += lineTotal
      return {
        productId: item.productId,
        productVariantId: item.variantId,
        productName: item.productName,
        unitPrice: Math.round(unitPriceNet * 100) / 100,
        quantity: item.quantity,
        lineTotal: Math.round(lineTotal * 100) / 100,
        hasPersonalization: item.hasPersonalization,
      }
    })

    const totalAmountHT = subtotalHT
    const totalAmountTTC = totalAmountHT * (1 + tvaRate)

    const quoteNumber = await generateQuoteNumber()

    // Conditions : référence commande web + personnalisation (résumé + logo)
    const conditionsParts: string[] = [
      `Commande web #${publicOrder.orderNumber ?? publicOrder.id}`,
    ]
    if (publicOrder.personalizationSummary) {
      conditionsParts.push(`Personnalisation : ${publicOrder.personalizationSummary}`)
    }
    if (publicOrder.personalizationLogoUploadId) {
      conditionsParts.push(`Logo client : voir upload ${publicOrder.personalizationLogoUploadId}`)
    }

    // Transaction : la demande de devis est créée AVANT le devis (FK requise),
    // puis le devis est relié à la commande web.
    const { quote, quoteRequest } = await db.$transaction(async (tx) => {
      const quoteRequest = await tx.quoteRequest.create({
        data: {
          reference: `QR-${publicOrder.orderNumber ?? publicOrder.id}`,
          clientId: client.id,
          status: 'QUOTED',
          notes: publicOrder.deliveryComment ?? undefined,
        },
      })

      const quote = await tx.quote.create({
        data: {
          quoteRequestId: quoteRequest.id,
          quoteNumber,
          validUntil,
          status: 'DRAFT',
          subtotalHT,
          discountAmount: 0,
          totalAmountHT,
          tvaRate,
          totalAmountTTC,
          conditions: conditionsParts.join('\n'),
          items: {
            create: quoteItems.map(qi => ({
              productId: qi.productId,
              productVariant: qi.productVariantId ? { connect: { id: qi.productVariantId } } : undefined,
              productName: qi.productName,
              unitPrice: qi.unitPrice,
              quantity: qi.quantity,
              lineTotal: qi.lineTotal,
              hasPersonalization: qi.hasPersonalization,
            })),
          },
          statusHistory: { create: { toStatus: 'DRAFT', changedBy: session!.user.id } },
        },
      })

      await tx.publicOrder.update({
        where: { id },
        data: { quoteId: quote.id },
      })

      return { quote, quoteRequest }
    })

    return success({ quoteId: quote.id, quoteNumber, quoteRequestReference: quoteRequest.reference })
  } catch (err) {
    console.error('[create-devis] Erreur création devis depuis commande web:', err)
    return serverError()
  }
}
