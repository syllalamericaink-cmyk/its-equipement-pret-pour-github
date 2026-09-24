import { db } from '../db'
import type { Prisma } from '@prisma/client'

export async function findOrCreateClient(data: {
  companyName: string
  contactName: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  country?: string | null
  notes?: string | null
}) {
  const existing = await db.client.findFirst({
    where: { email: data.email },
  })

  if (existing) {
    const needsUpdate =
      existing.companyName !== data.companyName ||
      existing.contactName !== data.contactName ||
      (data.phone !== undefined && data.phone !== null && existing.phone !== data.phone) ||
      (data.address !== undefined && data.address !== null && existing.address !== data.address) ||
      (data.city !== undefined && data.city !== null && existing.city !== data.city) ||
      (data.zipCode !== undefined && data.zipCode !== null && existing.zipCode !== data.zipCode)

    if (needsUpdate) {
      return db.client.update({
        where: { id: existing.id },
        data: {
          companyName: data.companyName,
          contactName: data.contactName,
          phone: data.phone ?? existing.phone,
          address: data.address ?? existing.address,
          city: data.city ?? existing.city,
          zipCode: data.zipCode ?? existing.zipCode,
          country: data.country ?? existing.country,
        },
      })
    }
    return existing
  }

  return db.client.create({
    data: {
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      zipCode: data.zipCode,
      country: data.country ?? 'France',
      notes: data.notes,
    },
  })
}

export async function getClients(params: {
  page: number
  limit: number
  skip: number
  search?: string
}) {
  const where: Prisma.ClientWhereInput = {}
  if (params.search) {
    where.OR = [
      { companyName: { contains: params.search } },
      { contactName: { contains: params.search } },
      { email: { contains: params.search } },
    ]
  }

  const [total, items] = await Promise.all([
    db.client.count({ where }),
    db.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        _count: { select: { quoteRequests: true } },
      },
    }),
  ])

  return { items, total }
}

export async function getClientById(id: string) {
  return db.client.findUnique({
    where: { id },
    include: {
      _count: { select: { quoteRequests: true } },
    },
  })
}

export async function updateClient(id: string, data: Prisma.ClientUpdateInput) {
  return db.client.update({ where: { id }, data })
}

export async function deleteClient(id: string) {
  const hasRequests = await db.quoteRequest.count({ where: { clientId: id } })
  if (hasRequests > 0) {
    throw new Error('Ce client a des demandes de devis associées')
  }
  return db.client.delete({ where: { id } })
}