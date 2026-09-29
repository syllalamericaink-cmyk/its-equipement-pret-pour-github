import { requireAdmin } from '@/lib/api-auth'
import { success, error, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/services/admin-log.service'
import { generateQuotePdf } from '@/lib/services/pdf.service'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

/**
 * PDF du devis — généré EN MÉMOIRE (filesystem Vercel en lecture seule).
 *   POST → valide la génération, marque le devis comme « PDF disponible »
 *          (pdfPath = 'generated') et journalise l'action admin.
 *   GET  → génère à la volée et renvoie le fichier PDF au navigateur.
 */
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

    // Valide réellement la génération (lève une erreur si le PDF échoue)
    await generateQuotePdf(id)

    await db.quote.update({
      where: { id },
      data: { pdfPath: 'generated', pdfUrl: '' },
    })

    await logAction({
      adminId: session!.user.id,
      action: 'GENERATE_PDF',
      entityType: 'QUOTE',
      entityId: id,
      details: { quoteNumber: quote.quoteNumber },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return success({ pdfPath: 'generated', quoteNumber: quote.quoteNumber })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur lors de la génération du PDF'
    return error(message, 500)
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
    if (!quote) return error('Devis introuvable', 404)

    // Génération à la volée — toujours à jour avec les dernières
    // modifications (quantités, remise, conditions…) du devis.
    const pdfBuffer = await generateQuotePdf(id)
    const bytes = new Uint8Array(pdfBuffer)

    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur lors de la génération du PDF'
    return error(message, 500)
  }
}
