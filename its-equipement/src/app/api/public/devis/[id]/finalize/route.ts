import { success, error, serverError } from '@/lib/api-response'
import { sendOrderNotification } from '@/lib/services/public-order.service'
import { checkApiRateLimit } from '@/lib/api-auth'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await db.publicOrder.count({
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    })
    const num = (count + 1 + attempt).toString().padStart(5, '0')
    const candidate = `ITS-${year}-${num}`
    const exists = await db.publicOrder.findUnique({ where: { orderNumber: candidate } })
    if (!exists) return candidate
  }
  return `ITS-${year}-${Date.now().toString().slice(-5)}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!checkApiRateLimit(request)) {
      return error('Trop de requetes. Reessayez dans une minute.', 429)
    }

    const { id } = await params

    const devis = await db.publicOrder.findUnique({
      where: { id },
    })

    if (!devis) {
      return error('Devis introuvable', 404)
    }

    if (!devis.devisNumber) {
      return error('Ce document n\'est pas un devis')
    }

    if (devis.orderNumber) {
      return error('Ce devis a deja ete finalise en commande')
    }

    const orderNumber = await generateOrderNumber()

    await db.publicOrder.update({
      where: { id },
      data: {
        orderNumber,
        status: 'NOUVELLE_COMMANDE',
      },
    })

    await db.publicOrderStatusHistory.create({
      data: {
        publicOrderId: id,
        fromStatus: devis.status,
        toStatus: 'NOUVELLE_COMMANDE',
        changedBy: 'client',
      },
    })

    sendOrderNotification(id).catch(() => {})

    return success({ orderNumber })
  } catch {
    return serverError()
  }
}
