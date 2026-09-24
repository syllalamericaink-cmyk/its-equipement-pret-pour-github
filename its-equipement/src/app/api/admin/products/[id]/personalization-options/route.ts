import type { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/api-auth'
import { getPersonalizationOptions, addPersonalizationOption, updatePersonalizationOption, deletePersonalizationOption } from '@/lib/services/product.service'
import { personalizationOptionSchema } from '@/lib/validation'
import { success, error, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const options = await getPersonalizationOptions(id)
    return success(options)
  } catch {
    return serverError()
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const parsed = personalizationOptionSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return error(firstError?.message ?? 'Données invalides', 422)
    }

    const result = await addPersonalizationOption(id, {
      type: parsed.data.type,
      label: parsed.data.label,
      isRequired: parsed.data.isRequired ?? false,
      config: parsed.data.config ? JSON.parse(JSON.stringify(parsed.data.config)) as Prisma.InputJsonValue : undefined,
      sortOrder: parsed.data.sortOrder ?? 0,
    })

    return success(result)
  } catch {
    return serverError()
  }
}
