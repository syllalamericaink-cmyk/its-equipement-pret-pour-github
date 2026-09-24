import { db } from '../db'
import { findOrCreateClient } from './client.service'
import type { Prisma } from '@prisma/client'

function generateReference(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = (now.getMonth() + 1).toString().padStart(2, '0')
  const d = now.getDate().toString().padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `QR-${y}${m}${d}-${rand}`
}

async function calculateItemPrice(
  productId: string,
  productVariantId: string | null | undefined,
  quantity: number
): Promise<{ unitPrice: number; productBasePrice: number; productName: string; variantName?: string }> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  })
  if (!product) throw new Error(`Produit ${productId} introuvable`)
  if (!product.isActive) throw new Error(`Produit ${product.name} non disponible`)

  let variantName: string | undefined
  let unitPrice = Number(product.basePrice)

  if (productVariantId) {
    const variant = product.variants.find(v => v.id === productVariantId)
    if (!variant) throw new Error(`Variante ${productVariantId} introuvable`)
    if (!variant.isActive) throw new Error(`Variante ${variant.name} non disponible`)
    variantName = variant.name
    unitPrice = unitPrice + Number(variant.priceModifier)
  }

  if (quantity < product.minQuantity) {
    throw new Error(`Quantite minimum pour ${product.name}: ${product.minQuantity}`)
  }

  return {
    unitPrice,
    productBasePrice: Number(product.basePrice),
    productName: product.name,
    variantName,
  }
}

export async function createQuoteRequest(data: {
  client: {
    companyName: string
    contactName: string
    email: string
    phone?: string | null
    address?: string | null
    city?: string | null
    zipCode?: string | null
    country?: string | null
    notes?: string | null
  }
  items: {
    productId: string
    productVariantId?: string | null
    quantity: number
    hasPersonalization: boolean
    personalizations?: {
      optionId: string
      value: Record<string, unknown>
    }[]
  }[]
  notes?: string | null
}) {
  const client = await findOrCreateClient(data.client)

  const itemsData: Prisma.QuoteRequestItemCreateWithoutQuoteRequestInput[] = []
  for (const item of data.items) {
    const priceInfo = await calculateItemPrice(item.productId, item.productVariantId, item.quantity)
    const lineTotal = priceInfo.unitPrice * item.quantity

    itemsData.push({
      productId: item.productId,
      productVariant: item.productVariantId ? { connect: { id: item.productVariantId } } : undefined,
      productName: priceInfo.productName,
      productBasePrice: priceInfo.unitPrice,
      quantity: item.quantity,
      hasPersonalization: item.hasPersonalization,
      unitPrice: priceInfo.unitPrice,
      lineTotal,
      personalizations: {
        create: item.personalizations?.map(p => ({
          personalizationOptionId: p.optionId,
          value: p.value as Prisma.InputJsonValue,
        })) ?? [],
      },
    })
  }

  return db.quoteRequest.create({
    data: {
      reference: generateReference(),
      clientId: client.id,
      notes: data.notes,
      items: { create: itemsData },
    },
    include: {
      client: true,
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
        },
      },
    },
  })
}

export async function getQuoteRequests(params: {
  page: number
  limit: number
  skip: number
  status?: string
  search?: string
}) {
  const where: Prisma.QuoteRequestWhereInput = {}
  if (params.status) {
    where.status = params.status
  }
  if (params.search) {
    where.OR = [
      { reference: { contains: params.search } },
      { client: { companyName: { contains: params.search } } },
      { client: { contactName: { contains: params.search } } },
      { client: { email: { contains: params.search } } },
    ]
  }

  const [total, items] = await Promise.all([
    db.quoteRequest.count({ where }),
    db.quoteRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        client: true,
        _count: { select: { quotes: true, items: true } },
      },
    }),
  ])

  return { items, total }
}

export async function getQuoteRequestById(id: string) {
  return db.quoteRequest.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      quotes: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function getQuoteRequestByReference(reference: string) {
  return db.quoteRequest.findUnique({
    where: { reference },
    include: {
      client: true,
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      quotes: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function updateQuoteRequest(id: string, data: Prisma.QuoteRequestUpdateInput) {
  return db.quoteRequest.update({
    where: { id },
    data,
    include: {
      client: true,
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
      },
    },
  })
}