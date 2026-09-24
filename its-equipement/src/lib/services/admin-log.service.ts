import { db } from '../db'
import type { Prisma } from '@prisma/client'

export async function logAction(data: {
  adminId: string
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}) {
  return db.adminActionLog.create({
    data: {
      adminId: data.adminId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) as Prisma.InputJsonValue : undefined,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  })
}

export async function getActionLogs(params: {
  page: number
  limit: number
  skip: number
  adminId?: string
  entityType?: string
  action?: string
}) {
  const where: Prisma.AdminActionLogWhereInput = {}
  if (params.adminId) where.adminId = params.adminId
  if (params.entityType) where.entityType = params.entityType
  if (params.action) where.action = params.action

  const [total, items] = await Promise.all([
    db.adminActionLog.count({ where }),
    db.adminActionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  return { items, total }
}