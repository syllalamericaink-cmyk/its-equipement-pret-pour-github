import { db } from '../db'
import { deductStockOnShipment } from './stock.service'
import type { Prisma } from '@prisma/client'

export async function createDelivery(data: {
  orderId: string
  trackingNumber?: string
  carrier?: string
  deliveryPerson?: string
  shippingAddress?: Record<string, unknown>
  shippingFees?: number
  estimatedDelivery?: string
  notes?: string
}) {
  const order = await db.order.findUnique({ where: { id: data.orderId } })
  if (!order) throw new Error('Commande introuvable')

  const existingDelivery = await db.delivery.findUnique({ where: { orderId: data.orderId } })
  if (existingDelivery) throw new Error('Une livraison existe deja pour cette commande')

  return db.delivery.create({
    data: {
      orderId: data.orderId,
      trackingNumber: data.trackingNumber,
      carrier: data.carrier,
      deliveryPerson: data.deliveryPerson,
      shippingAddress: data.shippingAddress ? JSON.stringify(data.shippingAddress) : undefined,
      shippingFees: data.shippingFees ?? 0,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : null,
      notes: data.notes,
    },
    include: { order: true },
  })
}

export async function getDeliveries(params: {
  page: number
  limit: number
  skip: number
  status?: string
}) {
  const where: Record<string, unknown> = {}
  if (params.status) where.status = params.status

  const [total, items] = await Promise.all([
    db.delivery.count({ where }),
    db.delivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        order: {
          include: {
            quote: { include: { quoteRequest: { include: { client: true } } } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    }),
  ])

  return { items, total }
}

export async function getDeliveryById(id: string) {
  return db.delivery.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          quote: { include: { quoteRequest: { include: { client: true } } } },
          items: { include: { productVariant: true } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

const VALID_DELIVERY_TRANSITIONS: Record<string, string[]> = {
  A_PREPARER: ['PRETE', 'A_PREPARER'],
  PRETE: ['EN_LIVRAISON', 'A_PREPARER'],
  EN_LIVRAISON: ['LIVREE'],
  LIVREE: [],
}

export async function updateDelivery(id: string, data: {
  status?: string
  trackingNumber?: string
  carrier?: string
  deliveryPerson?: string
  shippingAddress?: Record<string, unknown>
  shippingFees?: number
  estimatedDelivery?: string
  notes?: string
  adminId: string
}) {
  const delivery = await db.delivery.findUnique({
    where: { id },
    include: { order: { include: { items: { include: { productVariant: true } }, payments: true } } },
  })
  if (!delivery) throw new Error('Livraison introuvable')

  const updateData: Record<string, unknown> = {}
  if (data.trackingNumber !== undefined) updateData.trackingNumber = data.trackingNumber
  if (data.carrier !== undefined) updateData.carrier = data.carrier
  if (data.deliveryPerson !== undefined) updateData.deliveryPerson = data.deliveryPerson
  if (data.shippingAddress !== undefined) updateData.shippingAddress = JSON.stringify(data.shippingAddress)
  if (data.shippingFees !== undefined) updateData.shippingFees = data.shippingFees
  if (data.estimatedDelivery !== undefined) updateData.estimatedDelivery = new Date(data.estimatedDelivery)
  if (data.notes !== undefined) updateData.notes = data.notes

  if (data.status && data.status !== delivery.status) {
    const allowed = VALID_DELIVERY_TRANSITIONS[delivery.status] ?? []
    if (!allowed.includes(data.status)) {
      throw new Error(`Transition invalide: ${delivery.status} -> ${data.status}`)
    }

    await db.deliveryStatusHistory.create({
      data: {
        deliveryId: id,
        fromStatus: delivery.status,
        toStatus: data.status,
        changedBy: data.adminId,
      },
    })
    updateData.status = data.status

    if (data.status === 'PRETE') {
      if (delivery.order.status === 'PAIEMENT_A_LIVRAISON' || delivery.order.status === 'CONFIRMED') {
        await db.orderStatusHistory.create({
          data: { orderId: delivery.orderId, fromStatus: delivery.order.status, toStatus: 'READY', changedBy: data.adminId },
        })
        await db.order.update({ where: { id: delivery.orderId }, data: { status: 'READY' } })
      }
    }

    if (data.status === 'EN_LIVRAISON') {
      const hasOutMovements = await db.stockMovement.findFirst({
        where: { orderItemId: { in: delivery.order.items.map(i => i.id) }, type: 'OUT' },
      })
      if (!hasOutMovements) {
        await deductStockOnShipment(delivery.order.items.map(item => ({
          productVariantId: item.productVariantId,
          id: item.id,
          quantity: item.quantity,
        })))
      }

      const order = delivery.order
      if (order.status === 'READY' || order.status === 'PAIEMENT_A_LIVRAISON') {
        await db.orderStatusHistory.create({
          data: { orderId: delivery.orderId, fromStatus: order.status, toStatus: 'SHIPPED', changedBy: data.adminId },
        })
        await db.order.update({ where: { id: delivery.orderId }, data: { status: 'SHIPPED' } })
      }
    }

    if (data.status === 'LIVREE') {
      updateData.deliveredAt = new Date()

      await db.orderStatusHistory.create({
        data: { orderId: delivery.orderId, fromStatus: delivery.order.status, toStatus: 'DELIVERED', changedBy: data.adminId },
      })
      await db.order.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED' } })

      const order = delivery.order
      const hasPaidDeposit = order.payments.some(p => p.type === 'DEPOSIT' && p.status === 'PAYE')
      const hasPaidBalance = order.payments.some(p => (p.type === 'BALANCE' || p.type === 'FULL') && p.status === 'PAYE')

      if (order.hasPersonalization && hasPaidDeposit && !hasPaidBalance) {
        await db.payment.create({
          data: {
            orderId: delivery.orderId,
            type: 'BALANCE',
            amount: Number(order.balanceAmount),
            currency: 'XOF',
            status: 'EN_ATTENTE',
            statusHistory: { create: { toStatus: 'EN_ATTENTE', changedBy: data.adminId } },
          },
        })
      }

      if (!order.hasPersonalization && !hasPaidBalance) {
        await db.payment.create({
          data: {
            orderId: delivery.orderId,
            type: 'FULL',
            amount: Number(order.totalAmountTTC),
            currency: 'XOF',
            status: 'EN_ATTENTE',
            statusHistory: { create: { toStatus: 'EN_ATTENTE', changedBy: data.adminId } },
          },
        })
      }
    }
  }

  return db.delivery.update({
    where: { id },
    data: updateData,
    include: {
      order: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function changeDeliveryStatus(id: string, toStatus: string, adminId: string) {
  const delivery = await db.delivery.findUnique({
    where: { id },
    include: { order: { include: { items: { include: { productVariant: true } }, payments: true } } },
  })
  if (!delivery) throw new Error('Livraison introuvable')

  const allowed = VALID_DELIVERY_TRANSITIONS[delivery.status] ?? []
  if (!allowed.includes(toStatus)) {
    throw new Error(`Transition invalide: ${delivery.status} -> ${toStatus}`)
  }

  await db.deliveryStatusHistory.create({
    data: {
      deliveryId: id,
      fromStatus: delivery.status,
      toStatus,
      changedBy: adminId,
    },
  })

  const updateData: Record<string, unknown> = { status: toStatus }

  if (toStatus === 'PRETE') {
    const order = delivery.order
    if (order.status === 'PAIEMENT_A_LIVRAISON' || order.status === 'CONFIRMED') {
      await db.orderStatusHistory.create({
        data: { orderId: delivery.orderId, fromStatus: order.status, toStatus: 'READY', changedBy: adminId },
      })
      await db.order.update({ where: { id: delivery.orderId }, data: { status: 'READY' } })
    }
  }

  if (toStatus === 'EN_LIVRAISON') {
    const hasOutMovements = await db.stockMovement.findFirst({
      where: { orderItemId: { in: delivery.order.items.map(i => i.id) }, type: 'OUT' },
    })
    if (!hasOutMovements) {
      await deductStockOnShipment(delivery.order.items.map(item => ({
        productVariantId: item.productVariantId,
        id: item.id,
        quantity: item.quantity,
      })))
    }

    const order = delivery.order
    if (order.status === 'READY' || order.status === 'PAIEMENT_A_LIVRAISON') {
      await db.orderStatusHistory.create({
        data: { orderId: delivery.orderId, fromStatus: order.status, toStatus: 'SHIPPED', changedBy: adminId },
      })
      await db.order.update({ where: { id: delivery.orderId }, data: { status: 'SHIPPED' } })
    }
  }

  if (toStatus === 'LIVREE') {
    updateData.deliveredAt = new Date()

    await db.orderStatusHistory.create({
      data: { orderId: delivery.orderId, fromStatus: delivery.order.status, toStatus: 'DELIVERED', changedBy: adminId },
    })
    await db.order.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED' } })

    const order = delivery.order
    const hasPaidDeposit = order.payments.some(p => p.type === 'DEPOSIT' && p.status === 'PAYE')
    const hasPaidBalance = order.payments.some(p => (p.type === 'BALANCE' || p.type === 'FULL') && p.status === 'PAYE')

    if (order.hasPersonalization && hasPaidDeposit && !hasPaidBalance) {
      await db.payment.create({
        data: {
          orderId: delivery.orderId,
          type: 'BALANCE',
          amount: Number(order.balanceAmount),
          currency: 'XOF',
          status: 'EN_ATTENTE',
          statusHistory: { create: { toStatus: 'EN_ATTENTE', changedBy: adminId } },
        },
      })
    }

    if (!order.hasPersonalization && !hasPaidBalance) {
      await db.payment.create({
        data: {
          orderId: delivery.orderId,
          type: 'FULL',
          amount: Number(order.totalAmountTTC),
          currency: 'XOF',
          status: 'EN_ATTENTE',
          statusHistory: { create: { toStatus: 'EN_ATTENTE', changedBy: adminId } },
        },
      })
    }
  }

  return db.delivery.update({
    where: { id },
    data: updateData,
    include: {
      order: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}