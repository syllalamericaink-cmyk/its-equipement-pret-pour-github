import { requireAdmin } from '@/lib/api-auth'
import { getCategoryById, updateCategory, deleteCategory } from '@/lib/services/category.service'
import { categorySchema } from '@/lib/validation'
import { success, notFound, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const result = await getCategoryById(id)
    if (!result) return notFound('Catégorie introuvable')
    return success(result)
  } catch {
    return serverError()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await updateCategory(id, parsed.data)
    await logAction({
      adminId: session!.user.id,
      action: 'UPDATE',
      entityType: 'CATEGORY',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const result = await deleteCategory(id)
    await logAction({
      adminId: session!.user.id,
      action: 'DELETE',
      entityType: 'CATEGORY',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success(result)
  } catch {
    return serverError()
  }
}
