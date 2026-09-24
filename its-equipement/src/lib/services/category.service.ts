import { db } from '../db'
import type { Prisma } from '@prisma/client'

export async function getCategories(params?: {
  includeInactive?: boolean
  withChildren?: boolean
}) {
  const where: Prisma.CategoryWhereInput = {}
  if (!params?.includeInactive) {
    where.isActive = true
  }

  const [total, items] = await Promise.all([
    db.category.count({ where }),
    db.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: params?.withChildren
        ? {
            children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
            _count: { select: { products: true } },
          }
        : { _count: { select: { products: true } } },
    }),
  ])

  return { items, total }
}

export async function getCategoryTree() {
  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          children: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        },
      },
      _count: { select: { products: true } },
    },
  })
  return categories
}

export async function getCategoryById(id: string) {
  return db.category.findUnique({
    where: { id },
    include: {
      parent: true,
      children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      _count: { select: { products: true } },
    },
  })
}

export async function createCategory(data: Prisma.CategoryCreateInput) {
  return db.category.create({ data })
}

export async function updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
  return db.category.update({ where: { id }, data })
}

export async function deleteCategory(id: string) {
  const hasProducts = await db.product.count({ where: { categoryId: id } })
  if (hasProducts > 0) {
    throw new Error('Cette catégorie contient des produits')
  }
  const hasChildren = await db.category.count({ where: { parentId: id } })
  if (hasChildren > 0) {
    throw new Error('Cette catégorie contient des sous-catégories')
  }
  return db.category.delete({ where: { id } })
}