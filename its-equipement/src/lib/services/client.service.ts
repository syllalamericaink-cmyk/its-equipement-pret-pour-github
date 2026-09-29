import { db } from '../db'
import type { Prisma } from '@prisma/client'

export async function findOrCreateClient(data: {
  companyName: string
  contactName: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  country?: string | null
  notes?: string | null
}) {
  const email = data.email?.trim().toLowerCase() || ''

  // Recherche du client existant : par email si fourni, sinon par téléphone
  const existing = email
    ? await db.client.findFirst({ where: { email } })
    : data.phone
      ? await db.client.findFirst({ where: { phone: data.phone } })
      : null

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

  // Email requis en base (clé de dédoublonnage) : si absent, on génère un identifiant technique
  const emailForDb = email || `sans-email-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}@its-equipement.local`

  return db.client.create({
    data: {
      companyName: data.companyName,
      contactName: data.contactName,
      email: emailForDb,
      phone: data.phone,
      address: data.address,
      city: data.city,
      zipCode: data.zipCode,
      country: data.country ?? "Côte d'Ivoire",
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