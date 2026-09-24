import { db } from '../db'
import { getTvaRate, getQuoteValidityDays } from './settings.service'
import type { Prisma } from '@prisma/client'

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await db.quote.count({
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    })
    const num = (count + 1 + attempt).toString().padStart(5, '0')
    const candidate = `DEV-${year}-${num}`
    const exists = await db.quote.findUnique({ where: { quoteNumber: candidate } })
    if (!exists) return candidate
  }
  const fallback = `DEV-${year}-${Date.now().toString().slice(-5)}`
  return fallback
}

export async function createQuote(data: {
  quoteRequestId: string
  items: {
    productId: string
    productVariantId?: string | null
    productName: string
    unitPrice: number
    quantity: number
    hasPersonalization?: boolean
    personalizations?: {
      optionId: string
      value: Record<string, unknown>
    }[]
  }[]
  discountAmount?: number
  tvaRate?: number
  conditions?: string
  adminId: string
}) {
  const quoteRequest = await db.quoteRequest.findUnique({
    where: { id: data.quoteRequestId },
    include: { client: true },
  })
  if (!quoteRequest) throw new Error('Demande de devis introuvable')

  const existingQuote = await db.quote.findUnique({ where: { quoteRequestId: data.quoteRequestId } })
  if (existingQuote) throw new Error('Un devis existe déjà pour cette demande')

  const tvaRate = data.tvaRate ?? await getTvaRate()
  const validityDays = await getQuoteValidityDays()
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + validityDays)
  const discountAmount = data.discountAmount ?? 0

  const quoteItems: Prisma.QuoteItemCreateWithoutQuoteInput[] = []
  let subtotalHT = 0

  for (const item of data.items) {
    const product = await db.product.findUnique({ where: { id: item.productId } })
    if (!product) throw new Error(`Produit ${item.productId} introuvable`)

    let verifiedPrice = Number(product.basePrice)
    if (item.productVariantId) {
      const variant = await db.productVariant.findUnique({ where: { id: item.productVariantId } })
      if (variant) verifiedPrice = verifiedPrice + Number(variant.priceModifier)
    }

    const unitPrice = verifiedPrice
    const lineTotal = unitPrice * item.quantity
    subtotalHT += lineTotal

    quoteItems.push({
      productId: item.productId,
      productVariant: item.productVariantId ? { connect: { id: item.productVariantId } } : undefined,
      productName: item.productName,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
      hasPersonalization: item.hasPersonalization ?? false,
      personalizations: {
        create: item.personalizations?.map(p => ({
          personalizationOptionId: p.optionId,
          value: p.value as Prisma.InputJsonValue,
        })) ?? [],
      },
    })
  }

  const totalAmountHT = subtotalHT - discountAmount
  const totalAmountTTC = totalAmountHT * (1 + tvaRate)

  const quoteNumber = await generateQuoteNumber()

  return db.quote.create({
    data: {
      quoteRequestId: data.quoteRequestId,
      quoteNumber,
      validUntil,
      status: 'DRAFT',
      subtotalHT,
      discountAmount,
      totalAmountHT,
      tvaRate,
      totalAmountTTC,
      conditions: data.conditions,
      items: { create: quoteItems },
      statusHistory: {
        create: {
          toStatus: 'DRAFT',
          changedBy: data.adminId,
        },
      },
    },
    include: {
      quoteRequest: { include: { client: true } },
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function getQuotes(params: {
  page: number
  limit: number
  skip: number
  status?: string
  search?: string
}) {
  const where: Prisma.QuoteWhereInput = {}
  if (params.status) where.status = params.status
  if (params.search) {
    where.OR = [
      { quoteNumber: { contains: params.search } },
      { quoteRequest: { reference: { contains: params.search } } },
      { quoteRequest: { client: { companyName: { contains: params.search } } } },
    ]
  }

  const [total, items] = await Promise.all([
    db.quote.count({ where }),
    db.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        quoteRequest: { include: { client: true } },
        _count: { select: { orders: true, items: true } },
      },
    }),
  ])

  return { items, total }
}

export async function getQuoteById(id: string) {
  return db.quote.findUnique({
    where: { id },
    include: {
      quoteRequest: { include: { client: true } },
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      orders: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function updateQuote(id: string, data: {
  items?: {
    productId: string
    productVariantId?: string | null
    productName: string
    unitPrice: number
    quantity: number
    hasPersonalization?: boolean
    personalizations?: {
      optionId: string
      value: Record<string, unknown>
    }[]
  }[]
  discountAmount?: number
  tvaRate?: number
  conditions?: string
  validUntil?: string
  adminId: string
}) {
  const quote = await db.quote.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!quote) throw new Error('Devis introuvable')
  if (quote.status === 'ACCEPTED') throw new Error('Impossible de modifier un devis accepté')

  const updateData: Prisma.QuoteUpdateInput = {}

  if (data.discountAmount !== undefined) updateData.discountAmount = data.discountAmount
  if (data.tvaRate !== undefined) updateData.tvaRate = data.tvaRate
  if (data.conditions !== undefined) updateData.conditions = data.conditions
  if (data.validUntil !== undefined) updateData.validUntil = new Date(data.validUntil)

  if (data.items) {
    await db.personalization.deleteMany({
      where: { quoteItem: { quoteId: id } },
    })
    await db.quoteItem.deleteMany({ where: { quoteId: id } })

    const quoteItems: Prisma.QuoteItemCreateWithoutQuoteInput[] = []
    let subtotalHT = 0

    for (const item of data.items) {
      const product = await db.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new Error(`Produit ${item.productId} introuvable`)

      let verifiedPrice = Number(product.basePrice)
      if (item.productVariantId) {
        const variant = await db.productVariant.findUnique({ where: { id: item.productVariantId } })
        if (variant) verifiedPrice = verifiedPrice + Number(variant.priceModifier)
      }

      const unitPrice = verifiedPrice
      const lineTotal = unitPrice * item.quantity
      subtotalHT += lineTotal

      quoteItems.push({
        productId: item.productId,
        productVariant: item.productVariantId ? { connect: { id: item.productVariantId } } : undefined,
        productName: item.productName,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        hasPersonalization: item.hasPersonalization ?? false,
        personalizations: {
          create: item.personalizations?.map(p => ({
            personalizationOptionId: p.optionId,
            value: p.value as Prisma.InputJsonValue,
          })) ?? [],
        },
      })
    }

    const discount = data.discountAmount ?? Number(quote.discountAmount)
    const tva = data.tvaRate ?? Number(quote.tvaRate)
    const totalHT = subtotalHT - discount
    updateData.subtotalHT = subtotalHT
    updateData.totalAmountHT = totalHT
    updateData.totalAmountTTC = totalHT * (1 + tva)
    updateData.items = { create: quoteItems }
  } else {
    const discount = data.discountAmount ?? Number(quote.discountAmount)
    const tva = data.tvaRate ?? Number(quote.tvaRate)
    const subtotal = Number(quote.subtotalHT)
    updateData.totalAmountHT = subtotal - discount
    updateData.totalAmountTTC = (subtotal - discount) * (1 + tva)
  }

  return db.quote.update({
    where: { id },
    data: updateData,
    include: {
      quoteRequest: { include: { client: true } },
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function changeQuoteStatus(id: string, toStatus: string, adminId: string) {
  const quote = await db.quote.findUnique({ where: { id } })
  if (!quote) throw new Error('Devis introuvable')

  await db.quoteStatusHistory.create({
    data: {
      quoteId: id,
      fromStatus: quote.status,
      toStatus,
      changedBy: adminId,
    },
  })

  return db.quote.update({
    where: { id },
    data: { status: toStatus },
  })
}