import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import { generateQuotePdf } from '@/lib/services/pdf.service'
import { db } from '@/lib/db'
import fs from 'fs'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, session } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params

    const quote = await db.quote.findUnique({ where: { id } })
    if (!quote) return error('Devis introuvable', 404)

    const filePath = await generateQuotePdf(id)

    await db.quote.update({
      where: { id },
      data: { pdfPath: filePath, pdfUrl: '' },
    })

    await logAction({
      adminId: session!.user.id,
      action: 'GENERATE_PDF',
      entityType: 'QUOTE',
      entityId: id,
      details: { quoteNumber: quote.quoteNumber, filePath },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success({ pdfPath: filePath, quoteNumber: quote.quoteNumber })
  } catch {
    return serverError()
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await params

    const quote = await db.quote.findUnique({ where: { id } })
    if (!quote || !quote.pdfPath) return error('PDF non disponible', 404)

    if (!fs.existsSync(quote.pdfPath)) {
      return error('Fichier PDF introuvable', 404)
    }

    const fileBuffer = fs.readFileSync(quote.pdfPath)

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
      },
    })
  } catch {
    return serverError()
  }
}
