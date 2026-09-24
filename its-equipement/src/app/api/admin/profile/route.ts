import { requireAdmin } from '@/lib/api-auth'
import { compare } from 'bcryptjs'
import { hashPassword, authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { success, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import { z } from 'zod'
import type { NextRequest } from 'next/server'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export async function GET(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const admin = await db.admin.findUnique({
      where: { id: session!.user.id },
      select: { id: true, email: true, name: true, role: true, lastLogin: true, createdAt: true },
    })
    if (!admin) return error('Utilisateur introuvable', 404)

    return success(admin)
  } catch {
    return serverError()
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Donnees invalides', 422)
    }

    const admin = await db.admin.findUnique({
      where: { id: session!.user.id },
      select: { id: true, password: true },
    })
    if (!admin) return error('Utilisateur introuvable', 404)

    const isCurrentValid = await compare(parsed.data.currentPassword, admin.password)
    if (!isCurrentValid) {
      return error('Mot de passe actuel incorrect', 403)
    }

    const hashedNewPassword = await hashPassword(parsed.data.newPassword)
    await db.admin.update({
      where: { id: admin.id },
      data: { password: hashedNewPassword },
    })

    await logAction({
      adminId: session!.user.id,
      action: 'UPDATE',
      entityType: 'ADMIN_PROFILE',
      entityId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success({ updated: true })
  } catch {
    return serverError()
  }
}
