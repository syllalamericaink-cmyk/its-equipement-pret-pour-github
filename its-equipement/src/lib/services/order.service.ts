import { db } from '../db'
import { getTvaRate, getDepositPercentage, getBalancePercentage } from './settings.service'
import { checkStockAvailability, reserveStockForOrder, releaseStockForOrder, deductStockOnShipment, returnStockOnCancel } from './stock.service'
import type { Prisma } from '@prisma/client'

async function generateOrderNumber(): Promise<string> {
  const count = await db.order.count()
  const num = (count + 1).toString().padStart(4, '0')
  return `CMD-${num}`
}

export async function createOrderFromQuote(quoteId: string, adminId: string) {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: {
      quoteRequest: { include: { client: true } },
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
      },
    },
  })
  if (!quote) throw new Error('Devis introuvable')
  if (quote.status !== 'ACCEPTED') throw new Error('Le devis doit etre accepte pour creer une commande')

  const existingOrder = await db.order.findUnique({ where: { quoteId } })
  if (existingOrder) throw new Error('Une commande existe deja pour ce devis')

  const hasPersonalization = quote.items.some(item => item.hasPersonalization)
  const depositPct = await getDepositPercentage()
  const balancePct = await getBalancePercentage()
  const tvaRate = Number(quote.tvaRate)

  const totalAmountTTC = Number(quote.totalAmountTTC)
  const totalAmountHT = Number(quote.totalAmountHT)

  let depositAmount = 0
  let depositPercentage = 0
  let balanceAmount = totalAmountTTC
  let balancePercentage = 100
  let paymentMethod = 'ON_DELIVERY'
  let initialStatus = 'PAIEMENT_A_LIVRAISON'
  let initialPaymentType: string | null = null
  let initialPaymentAmount = 0

  if (hasPersonalization) {
    depositAmount = Math.round(totalAmountTTC * (depositPct / 100) * 100) / 100
    depositPercentage = depositPct
    balanceAmount = Math.round((totalAmountTTC - depositAmount) * 100) / 100
    balancePercentage = balancePct
    paymentMethod = 'DEPOSIT_PLUS_BALANCE'
    initialStatus = 'CONFIRMED'
    initialPaymentType = 'DEPOSIT'
    initialPaymentAmount = depositAmount
  }

  const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = []
  const stockCheckItems: { productVariantId: string | null; quantity: number }[] = []

  for (const quoteItem of quote.items) {
    const product = await db.product.findUnique({ where: { id: quoteItem.productId } })
    if (!product) throw new Error(`Produit ${quoteItem.productId} introuvable`)

    let verifiedPrice: number = Number(product.basePrice)
    if (quoteItem.productVariantId) {
      const variant = await db.productVariant.findUnique({ where: { id: quoteItem.productVariantId } })
      if (variant) verifiedPrice = Number(product.basePrice) + Number(variant.priceModifier)
    }

    const unitPrice = verifiedPrice
    const lineTotal = unitPrice * quoteItem.quantity

    orderItems.push({
      quoteItem: { connect: { id: quoteItem.id } },
      productId: quoteItem.productId,
      productVariant: quoteItem.productVariantId ? { connect: { id: quoteItem.productVariantId } } : undefined,
      productName: quoteItem.productName,
      unitPrice,
      quantity: quoteItem.quantity,
      lineTotal,
      hasPersonalization: quoteItem.hasPersonalization,
      personalizations: {
        create: quoteItem.personalizations.map(p => ({
          personalizationOptionId: p.personalizationOptionId,
          value: p.value as Prisma.InputJsonValue,
        })),
      },
    })

    stockCheckItems.push({
      productVariantId: quoteItem.productVariantId,
      quantity: quoteItem.quantity,
    })
  }

  await checkStockAvailability(stockCheckItems)

  const orderNumber = await generateOrderNumber()

  const order = await db.order.create({
    data: {
      quoteId,
      orderNumber,
      status: initialStatus,
      hasPersonalization,
      paymentMethod,
      subtotalHT: quote.subtotalHT,
      totalAmountHT,
      tvaRate,
      totalAmountTTC,
      depositAmount,
      depositPercentage,
      balanceAmount,
      balancePercentage,
      items: { create: orderItems },
      statusHistory: {
        create: { toStatus: initialStatus, changedBy: adminId },
      },
    },
    include: {
      quote: { include: { quoteRequest: { include: { client: true } } } },
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      payments: true,
      delivery: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  await reserveStockForOrder(order.items.map(item => ({
    productVariantId: item.productVariantId,
    quantity: item.quantity,
    id: item.id,
  })))

  if (initialPaymentType && initialPaymentAmount > 0) {
    await db.payment.create({
      data: {
        orderId: order.id,
        type: initialPaymentType,
        amount: initialPaymentAmount,
        currency: 'XOF',
        status: 'EN_ATTENTE',
        statusHistory: {
          create: { toStatus: 'EN_ATTENTE', changedBy: adminId },
        },
      },
    })
    order.payments = await db.payment.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    })
  }

  return order
}

export async function getOrders(params: {
  page: number
  limit: number
  skip: number
  status?: string
  search?: string
}) {
  const where: Prisma.OrderWhereInput = {}
  if (params.status) where.status = params.status
  if (params.search) {
    where.OR = [
      { orderNumber: { contains: params.search } },
      { quote: { quoteNumber: { contains: params.search } } },
      { quote: { quoteRequest: { client: { companyName: { contains: params.search } } } } },
    ]
  }

  const [total, items] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        quote: { include: { quoteRequest: { include: { client: true } } } },
        _count: { select: { items: true, payments: true } },
        delivery: true,
      },
    }),
  ])

  return { items, total }
}

export async function getOrderById(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      quote: { include: { quoteRequest: { include: { client: true } } } },
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      payments: { orderBy: { createdAt: 'asc' } },
      delivery: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function changeOrderStatus(id: string, toStatus: string, adminId: string, notes?: string) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      payments: true,
      items: { include: { productVariant: true } },
      delivery: true,
    },
  })
  if (!order) throw new Error('Commande introuvable')

  if (toStatus === 'CANCELLED') {
    if (['DELIVERED'].includes(order.status)) {
      throw new Error('Impossible d\'annuler une commande livree')
    }

    await returnStockOnCancel(order.items.map(item => ({
      productVariantId: item.productVariantId,
      id: item.id,
      quantity: item.quantity,
    })))

    if (order.delivery) {
      await db.deliveryStatusHistory.create({
        data: {
          deliveryId: order.delivery.id,
          fromStatus: order.delivery.status,
          toStatus: 'A_PREPARER',
          changedBy: adminId,
        },
      })
      await db.delivery.update({
        where: { id: order.delivery.id },
        data: { status: 'A_PREPARER' },
      })
    }

    const pendingPayments = order.payments.filter(p => p.status === 'EN_ATTENTE')
    for (const p of pendingPayments) {
      await db.paymentStatusHistory.create({
        data: { paymentId: p.id, fromStatus: 'EN_ATTENTE', toStatus: 'ANNULE', changedBy: adminId },
      })
      await db.payment.update({ where: { id: p.id }, data: { status: 'ANNULE' } })
    }
  }

  if (toStatus === 'DELIVERED' && order.status !== 'SHIPPED') {
    throw new Error('La commande doit etre expediee avant d\'etre livree')
  }
  if (toStatus === 'SHIPPED' && order.status !== 'READY') {
    throw new Error('La commande doit etre prete avant d\'etre expediee')
  }
  if (toStatus === 'READY' && order.status !== 'IN_PRODUCTION') {
    throw new Error('La commande doit etre en production avant d\'etre prete')
  }
  if (toStatus === 'ACOMPTE_RECU' && order.status !== 'CONFIRMED') {
    throw new Error('La commande doit etre confirmee pour passer en acompte recu')
  }
  if (toStatus === 'IN_PRODUCTION' && order.hasPersonalization) {
    const depositPaid = order.payments.some(
      p => p.type === 'DEPOSIT' && p.status === 'PAYE'
    )
    if (!depositPaid) {
      throw new Error('L\'acompte doit etre confirme avant le passage en production')
    }
  }

  if (toStatus === 'SHIPPED') {
    const hasOutMovements = await db.stockMovement.findFirst({
      where: { orderItemId: { in: order.items.map(i => i.id) }, type: 'OUT' },
    })
    if (!hasOutMovements) {
      await deductStockOnShipment(order.items.map(item => ({
        productVariantId: item.productVariantId,
        id: item.id,
        quantity: item.quantity,
      })))
    }
  }

  await db.orderStatusHistory.create({
    data: {
      orderId: id,
      fromStatus: order.status,
      toStatus,
      changedBy: adminId,
    },
  })

  const updateData: Prisma.OrderUpdateInput = { status: toStatus }
  if (notes) updateData.notes = notes

  return db.order.update({
    where: { id },
    data: updateData,
    include: {
      items: { include: { productVariant: true } },
      payments: true,
      delivery: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function getOrderStats() {
  const [total, byStatus, recent] = await Promise.all([
    db.order.count(),
    db.order.groupBy({ by: ['status'], _count: true }),
    db.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        quote: { include: { quoteRequest: { include: { client: true } } } },
      },
    }),
  ])

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
    recent,
  }
}
