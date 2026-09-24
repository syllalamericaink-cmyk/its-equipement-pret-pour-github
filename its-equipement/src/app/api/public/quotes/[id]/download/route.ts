import { db } from '@/lib/db'
import { getSecureDownloadToken } from '@/lib/services/pdf.service'
import { error, serverError } from '@/lib/api-response'
import fs from 'fs'
import crypto from 'crypto'
import type { NextRequest } from 'next/server'

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\r\n\"\\]/g, '').slice(0, 100)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) return error('Jeton manquant', 401)

    const expectedToken = getSecureDownloadToken(id)
    if (!safeCompare(token, expectedToken)) return error('Jeton invalide', 403)

    const quote = await db.quote.findUnique({ where: { id } })
    if (!quote || !quote.pdfPath) return error('Devis ou PDF introuvable', 404)

    if (quote.status !== 'SENT' && quote.status !== 'ACCEPTED') {
      return error('Devis non disponible', 403)
    }

    if (!fs.existsSync(quote.pdfPath)) {
      return error('Fichier PDF introuvable', 404)
    }

    const fileBuffer = fs.readFileSync(quote.pdfPath)
    const safeName = sanitizeFilename(quote.quoteNumber)

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      },
    })
  } catch {
    return serverError()
  }
}
