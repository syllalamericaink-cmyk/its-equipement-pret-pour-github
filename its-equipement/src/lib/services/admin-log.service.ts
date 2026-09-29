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
