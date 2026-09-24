import { db } from '../db'
import type { Prisma } from '@prisma/client'

const VALID_TYPES = ['IN', 'OUT', 'RESERVATION', 'RELEASE', 'ADJUSTMENT'] as const

async function getAllowNegativeStock(): Promise<boolean> {
  try {
    const setting = await db.setting.findUnique({ where: { key: 'ALLOW_NEGATIVE_STOCK' } })
    return setting?.value === 'true'
  } catch {
    return false
  }
}

function getStockChange(type: string, quantity: number): { stockDelta: number; reservedDelta: number } {
  switch (type) {
    case 'IN':
      return { stockDelta: quantity, reservedDelta: 0 }
    case 'OUT':
      return { stockDelta: -quantity, reservedDelta: 0 }
    case 'RESERVATION':
      return { stockDelta: 0, reservedDelta: quantity }
    case 'RELEASE':
      return { stockDelta: 0, reservedDelta: -quantity }
    case 'ADJUSTMENT':
      return { stockDelta: quantity, reservedDelta: 0 }
    default:
      return { stockDelta: 0, reservedDelta: 0 }
  }
}

export async function checkStockAvailability(items: { productVariantId: string | null; quantity: number }[]): Promise<void> {
  for (const item of items) {
    if (!item.productVariantId) continue
    const variant = await db.productVariant.findUnique({ where: { id: item.productVariantId } })
    if (!variant) throw new Error(`Variante introuvable: ${item.productVariantId}`)
    const available = variant.stock - variant.reservedStock
    if (available < item.quantity) {
      throw new Error(`Stock insuffisant pour ${variant.name}. Disponible: ${available}, Reserve: ${variant.reservedStock}, Demande: ${item.quantity}`)
    }
  }
}

export async function reserveStockForOrder(orderItems: { productVariantId: string | null; quantity: number; id: string }[]): Promise<void> {
  for (const item of orderItems) {
    if (!item.productVariantId) continue
    const variant = await db.productVariant.findUnique({ where: { id: item.productVariantId } })
    if (!variant) continue

    const allowNegative = await getAllowNegativeStock()
    const newReserved = variant.reservedStock + item.quantity
    const available = variant.stock - newReserved
    if (!allowNegative && available < 0) {
      throw new Error(`Stock insuffisant pour la reservation de ${variant.name}. Disponible: ${variant.stock - variant.reservedStock}, Demande: ${item.quantity}`)
    }

    await db.$transaction([
      db.stockMovement.create({
        data: {
          orderItemId: item.id,
          productVariantId: item.productVariantId,
          type: 'RESERVATION',
          quantity: item.quantity,
          reason: `Reservation commande ${item.id}`,
        },
      }),
      db.productVariant.update({
        where: { id: item.productVariantId },
        data: { reservedStock: { increment: item.quantity } },
      }),
    ])
  }
}

export async function releaseStockForOrder(orderItems: { productVariantId: string | null; id: string }[]): Promise<void> {
  for (const item of orderItems) {
    if (!item.productVariantId) continue
    const variant = await db.productVariant.findUnique({ where: { id: item.productVariantId } })
    if (!variant || variant.reservedStock <= 0) continue

    const movement = await db.stockMovement.findFirst({
      where: {
        orderItemId: item.id,
        productVariantId: item.productVariantId,
        type: 'RESERVATION',
      },
      orderBy: { createdAt: 'desc' },
    })

    const qty = movement ? Math.min(movement.quantity, variant.reservedStock) : 0
    if (qty <= 0) continue

    await db.$transaction([
      db.stockMovement.create({
        data: {
          orderItemId: item.id,
          productVariantId: item.productVariantId,
          type: 'RELEASE',
          quantity: qty,
          reason: `Liberation reservation commande ${item.id}`,
        },
      }),
      db.productVariant.update({
        where: { id: item.productVariantId },
        data: { reservedStock: { decrement: qty } },
      }),
    ])
  }
}

export async function deductStockOnShipment(orderItems: { productVariantId: string | null; quantity: number; id: string }[]): Promise<void> {
  for (const item of orderItems) {
    if (!item.productVariantId) continue
    const variant = await db.productVariant.findUnique({ where: { id: item.productVariantId } })
    if (!variant) continue

    const allowNegative = await getAllowNegativeStock()
    if (!allowNegative && variant.stock < item.quantity) {
      throw new Error(`Stock physique insuffisant pour ${variant.name}. Stock: ${variant.stock}, Demande: ${item.quantity}`)
    }

    await db.$transaction([
      db.stockMovement.create({
        data: {
          orderItemId: item.id,
          productVariantId: item.productVariantId,
          type: 'OUT',
          quantity: item.quantity,
          reason: `Expedition commande`,
        },
      }),
      db.productVariant.update({
        where: { id: item.productVariantId },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { decrement: Math.min(item.quantity, variant.reservedStock) },
        },
      }),
    ])
  }
}

export async function returnStockOnCancel(orderItems: { productVariantId: string | null; quantity: number; id: string }[]): Promise<void> {
  for (const item of orderItems) {
    if (!item.productVariantId) continue

    const outMovements = await db.stockMovement.aggregate({
      where: { orderItemId: item.id, productVariantId: item.productVariantId, type: 'OUT' },
      _sum: { quantity: true },
    })
    const outQty = outMovements._sum.quantity ?? 0

    if (outQty > 0) {
      await db.$transaction([
        db.stockMovement.create({
          data: {
            orderItemId: item.id,
            productVariantId: item.productVariantId,
            type: 'IN',
            quantity: outQty,
            reason: `Retour annulation commande`,
          },
        }),
        db.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { increment: outQty } },
        }),
      ])
    }

    await releaseStockForOrder([item])
  }
}

export async function createStockMovement(data: {
  orderItemId?: string
  productVariantId: string
  type: string
  quantity: number
  reason?: string
}) {
  if (!VALID_TYPES.includes(data.type as typeof VALID_TYPES[number])) {
    throw new Error(`Type de mouvement invalide: ${data.type}`)
  }

  const variant = await db.productVariant.findUnique({ where: { id: data.productVariantId } })
  if (!variant) throw new Error('Variante introuvable')

  const { stockDelta, reservedDelta } = getStockChange(data.type, data.quantity)
  const allowNegative = await getAllowNegativeStock()

  if (stockDelta < 0 && !allowNegative && variant.stock + stockDelta < 0) {
    throw new Error(`Stock insuffisant. Disponible: ${variant.stock}, Demande: ${Math.abs(stockDelta)}`)
  }
  if (reservedDelta > 0 && !allowNegative && variant.stock - (variant.reservedStock + reservedDelta) < 0) {
    throw new Error(`Stock disponible insuffisant pour la reservation. Disponible: ${variant.stock - variant.reservedStock}, Demande: ${reservedDelta}`)
  }
  if (reservedDelta < 0 && variant.reservedStock + reservedDelta < 0) {
    throw new Error(`Stock reserve insuffisant a liberer. Reserve: ${variant.reservedStock}, Demande: ${Math.abs(reservedDelta)}`)
  }

  const movement = await db.stockMovement.create({
    data: {
      orderItemId: data.orderItemId ?? null,
      productVariantId: data.productVariantId,
      type: data.type,
      quantity: data.quantity,
      reason: data.reason,
    },
    include: {
      productVariant: true,
      orderItem: { include: { order: { select: { orderNumber: true } } } },
    },
  })

  const updateData: Prisma.ProductVariantUpdateInput = {}
  if (stockDelta !== 0) updateData.stock = { increment: stockDelta }
  if (reservedDelta !== 0) updateData.reservedStock = { increment: reservedDelta }

  if (Object.keys(updateData).length > 0) {
    await db.productVariant.update({
      where: { id: data.productVariantId },
      data: updateData,
    })
  }

  return movement
}

export async function getStockMovements(params?: {
  productVariantId?: string
  type?: string
  orderItemId?: string
  page?: number
  limit?: number
}) {
  const where: Prisma.StockMovementWhereInput = {}
  if (params?.productVariantId) where.productVariantId = params.productVariantId
  if (params?.type) where.type = params.type
  if (params?.orderItemId) where.orderItemId = params.orderItemId

  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 50, 100)
 const skip = (page - 1) * limit

  const [total, items] = await Promise.all([
    db.stockMovement.count({ where }),
    db.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        productVariant: { include: { product: { select: { name: true, sku: true } } } },
        orderItem: { include: { order: { select: { orderNumber: true } } } },
      },
    }),
  ])

  return { items, total }
}

export async function getVariantStock(productVariantId: string) {
  const variant = await db.productVariant.findUnique({ where: { id: productVariantId } })
  if (!variant) throw new Error('Variante introuvable')

  const movements = await db.stockMovement.findMany({
    where: { productVariantId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      orderItem: { include: { order: { select: { orderNumber: true } } } },
    },
  })

  return {
    variantId: productVariantId,
    currentStock: variant.stock,
    reservedStock: variant.reservedStock,
    availableStock: variant.stock - variant.reservedStock,
    alertThreshold: variant.alertThreshold,
    onAlert: variant.stock - variant.reservedStock <= variant.alertThreshold,
    recentMovements: movements,
  }
}

export async function getAllVariantStocks() {
  return db.productVariant.findMany({
    where: { isActive: true },
    include: {
      product: { select: { name: true, sku: true, isActive: true } },
    },
    orderBy: { stock: 'asc' },
  })
}

export async function getLowStockVariants() {
  const variants = await db.productVariant.findMany({
    where: { isActive: true },
    include: {
      product: { select: { name: true, sku: true, isActive: true } },
    },
  })

  return variants.filter(v => v.stock - v.reservedStock <= v.alertThreshold)
}
