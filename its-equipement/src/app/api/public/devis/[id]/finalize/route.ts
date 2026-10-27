import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { success, error, serverError } from '@/lib/api-response'
import { sendOrderNotification } from '@/lib/services/public-order.service'
import { sendOrderTelegramNotification } from '@/lib/services/telegram.service'
import { syncOrderToSheets } from '@/lib/services/google-sheets.service'
import { checkApiRateLimit } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { after, type NextRequest } from 'next/server'

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
    // Limite partagée entre toutes les instances (stockée en base)
    if (!(await rateLimit(`finalize:${getClientIp(request.headers)}`, 10, 600))) {
      return NextResponse.json({ success: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 })
    }
    if (!checkApiRateLimit(request)) {
      return error('Trop de requêtes. Réessayez dans une minute.', 429)
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

    if (devis.status === 'ANNULEE') {
      return error('Ce devis a ete annule et ne peut plus etre finalise')
    }

    // Processus : le client accepte le devis (DEVIS_ENVOYE → DEVIS_ACCEPTE).
    // Le commercial confirme ensuite la commande depuis l'admin.
    if (devis.status !== 'DEVIS_ENVOYE') {
      return error('Ce devis ne peut plus etre confirme en ligne. Contactez-nous sur WhatsApp.')
    }

    const orderNumber = await generateOrderNumber()

    await db.publicOrder.update({
      where: { id },
      data: {
        orderNumber,
        status: 'DEVIS_ACCEPTE',
      },
    })

    await db.publicOrderStatusHistory.create({
      data: {
        publicOrderId: id,
        fromStatus: devis.status,
        toStatus: 'DEVIS_ACCEPTE',
        changedBy: 'client',
      },
    })

    // Notifications non bloquantes (commande déjà enregistrée) — after() garantit
    // l'exécution après la réponse.
    after(async () => {
      await Promise.allSettled([
        sendOrderNotification(id),
        sendOrderTelegramNotification(id),
        syncOrderToSheets(id),
      ])
    })

    return success({ orderNumber })
  } catch (err) {
    console.error('[api /public/devis/[id]/finalize] Erreur:', err)
    return serverError()
  }
}
