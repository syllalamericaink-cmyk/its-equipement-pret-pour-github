import { db } from '../db'
import type { Prisma } from '@prisma/client'

export async function getProducts(params: {
  page: number
  limit: number
  skip: number
  search?: string
  categoryId?: string
  activeOnly?: boolean
  includeInactive?: boolean
}) {
  const where: Prisma.ProductWhereInput = {}
  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { description: { contains: params.search } },
      { sku: { contains: params.search } },
    ]
  }
  if (params.categoryId) {
    where.categoryId = params.categoryId
  }
  if (!params.includeInactive) {
    where.isActive = true
  }

  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          where: params.includeInactive ? undefined : { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        personalizationOptions: {
          where: params.includeInactive ? undefined : { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
  ])

  return { items, total }
}

export async function getProductById(id: string, includeInactive = false) {
  return db.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { createdAt: 'asc' },
      },
      images: { orderBy: { sortOrder: 'asc' } },
      personalizationOptions: {
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
}

export async function getProductBySlug(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      images: { orderBy: { sortOrder: 'asc' } },
      personalizationOptions: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  })
}

export async function createProduct(data: Prisma.ProductCreateInput) {
  return db.product.create({ data, include: { category: true } })
}

export async function updateProduct(id: string, data: Prisma.ProductUpdateInput) {
  return db.product.update({ where: { id }, data, include: { category: true } })
}

export async function deleteProduct(id: string) {
  const hasQuoteItems = await db.quoteRequestItem.count({ where: { productId: id } })
  if (hasQuoteItems > 0) {
    throw new Error('Ce produit est utilisé dans des demandes de devis')
  }
  return db.product.delete({ where: { id } })
}

export async function getProductVariants(productId: string) {
  return db.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function addVariant(productId: string, data: Prisma.ProductVariantCreateWithoutProductInput) {
  return db.productVariant.create({
    data: { ...data, product: { connect: { id: productId } } },
  })
}

export async function updateVariant(id: string, data: Prisma.ProductVariantUpdateInput) {
  return db.productVariant.update({ where: { id }, data })
}

export async function deleteVariant(id: string) {
  return db.productVariant.delete({ where: { id } })
}

export async function getProductImages(productId: string) {
  return db.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function addImage(productId: string, data: Prisma.ProductImageCreateWithoutProductInput) {
  return db.productImage.create({
    data: { ...data, product: { connect: { id: productId } } },
  })
}

export async function deleteImage(id: string) {
  return db.productImage.delete({ where: { id } })
}

export async function getPersonalizationOptions(productId: string) {
  return db.personalizationOption.findMany({
    where: { productId },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function addPersonalizationOption(productId: string, data: Prisma.PersonalizationOptionCreateWithoutProductInput) {
  return db.personalizationOption.create({
    data: { ...data, product: { connect: { id: productId } } },
  })
}

export async function updatePersonalizationOption(id: string, data: Prisma.PersonalizationOptionUpdateInput) {
  return db.personalizationOption.update({ where: { id }, data })
}

export async function deletePersonalizationOption(id: string) {
  return db.personalizationOption.delete({ where: { id } })
}