/**
 * Remise à zéro des données commerciales — ADMIN UNIQUEMENT (rôle ADMIN).
 *
 *   POST /api/admin/reset-data
 *
 * Supprime : commandes web (et devis associés), demandes de devis, devis,
 * commandes de l'ancien flux, paiements, livraisons, mouvements de stock,
 * clients et messages de contact, ainsi que les notifications et fichiers
 * joints liés à ces commandes (logos clients…).
 *
 * CONSERVE : produits, catégories, bannières d'accueil, paramètres,
 * comptes administrateurs et images produit/bannière (Uploads).
 */

import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError } from '@/lib/api-response'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError
    if (session!.user.role !== 'ADMIN') {
      return error('Seul un administrateur peut réinitialiser les données.', 403)
    }

    const body = (await request.json().catch(() => ({}))) as { confirm?: string }
    if (body.confirm !== 'REINITIALISER') {
      return error('Confirmation manquante : tapez REINITIALISER pour confirmer.')
    }

    // Uploads liés aux commandes (logos clients, pièces jointes) — on garde
    // les images de bannières ('hero-image') et de produits ('product-image').
    const keptUploads = await db.upload.findMany({
      where: { entityType: { in: ['hero-image', 'product-image'] } },
      select: { id: true },
    })
    const keptIds = keptUploads.map((u) => u.id)

    const result = await db.$transaction(async (tx) => {
      const notifications = await tx.notification.deleteMany({})
      const paymentHistory = await tx.paymentStatusHistory.deleteMany({})
      const payments = await tx.payment.deleteMany({})
      const deliveryHistory = await tx.deliveryStatusHistory.deleteMany({})
      const deliveries = await tx.delivery.deleteMany({})
      const stockMovements = await tx.stockMovement.deleteMany({})
      const publicOrderHistory = await tx.publicOrderStatusHistory.deleteMany({})
      const publicOrderItems = await tx.publicOrderItem.deleteMany({})
      const publicOrders = await tx.publicOrder.deleteMany({})
      const quoteHistory = await tx.quoteStatusHistory.deleteMany({})
      const quoteItems = await tx.quoteItem.deleteMany({})
      const quotes = await tx.quote.deleteMany({})
      const orderHistory = await tx.orderStatusHistory.deleteMany({})
      const orderItems = await tx.orderItem.deleteMany({})
      const orders = await tx.order.deleteMany({})
      const quoteRequestItems = await tx.quoteRequestItem.deleteMany({})
      const quoteRequests = await tx.quoteRequest.deleteMany({})
      const clients = await tx.client.deleteMany({})
      const contactMessages = await tx.contactMessage.deleteMany({})
      const uploads = keptIds.length > 0
        ? await tx.upload.deleteMany({ where: { id: { notIn: keptIds } } })
        : await tx.upload.deleteMany({})

      return {
        notifications, paymentHistory, payments, deliveryHistory, deliveries,
        stockMovements, publicOrderHistory, publicOrderItems, publicOrders,
        quoteHistory, quoteItems, quotes, orderHistory, orderItems, orders,
        quoteRequestItems, quoteRequests, clients, contactMessages, uploads,
      }
    })

    const total =
      Object.values(result).reduce((sum, r) => sum + (r?.count ?? 0), 0)

    return success({
      deletedRecords: total,
      detail: Object.fromEntries(
        Object.entries(result).map(([k, v]) => [k, (v as { count: number }).count])
      ),
    })
  } catch (err) {
    console.error('[api /admin/reset-data] Erreur:', err)
    return serverError()
  }
}
