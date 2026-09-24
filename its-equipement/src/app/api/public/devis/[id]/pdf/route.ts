import { db } from '@/lib/db'
import { error, serverError } from '@/lib/api-response'
import type { NextRequest } from 'next/server'
import PDFDocument from 'pdfkit'
import path from 'path'

const PRIMARY_COLOR = '#0056A7'
const DARK_COLOR = '#1a1a2e'
const LIGHT_BG = '#f8f9fa'

function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' FCFA'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const devis = await db.publicOrder.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })

    if (!devis || !devis.devisNumber) {
      return error('Devis introuvable', 404)
    }

    const W = 595.28, H = 842, ML = 45, MR = 45, CW = W - ML - MR

    // Buffer-based PDF generation
    const buffers: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4' })

    // Set up listeners BEFORE calling doc.end()
    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)
    })

    // --- PDF CONTENT ---
    let y = H - 50
    doc.rect(0, H - 8, W, 8).fill(PRIMARY_COLOR)
    const logoPath = path.join(process.cwd(), 'public', 'logo-its-equipement.jpg')
    try { doc.image(logoPath, ML, y - 44, { width: 44, height: 44 }) } catch {}
    doc.font('Helvetica-Bold').fontSize(16).fillColor(DARK_COLOR)
    doc.text('ITS EQUIPEMENT', ML + 53, y - 26)
    doc.font('Helvetica').fontSize(8).fillColor('#555555')
    doc.text('ITSchool & Dynamic Group', ML + 53, y - 39)
    doc.text('contact@itschoolci.com | +225 07 79 07 45 47', ML + 53, y - 50)
    doc.text("Cocody 2 Plateaux, Cite Sanon — Abidjan, Cote d'Ivoire", ML + 53, y - 61)

    const bx = W - MR - 155
    doc.roundedRect(bx, y - 8, 155, 52, 4).lineWidth(0.5).stroke('#dddddd')
    doc.font('Helvetica').fontSize(8).fillColor('#888888')
    doc.text('DEVIS', bx + 10, y)
    doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK_COLOR)
    doc.text(`#${devis.devisNumber}`, bx + 10, y + 12)
    doc.font('Helvetica').fontSize(8).fillColor('#888888')
    const dateStr = new Date(devis.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    doc.text(dateStr, bx + 10, y + 28)

    y -= 75
    doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).strokeColor('#cccccc').stroke()
    y -= 15

    doc.roundedRect(ML, y - 80, CW, 80, 3).lineWidth(0.5).strokeColor('#e0e0e0').fill(LIGHT_BG)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_COLOR)
    doc.text('CLIENT', ML + 13, y - 18)
    doc.font('Helvetica').fontSize(9).fillColor('#333333')
    let cy = y - 33
    if (devis.clientType === 'ENTREPRISE' && devis.companyName) { doc.text(devis.companyName, ML + 13, cy); cy -= 13 }
    const fullName = devis.clientFirstName ? `${devis.clientFirstName} ${devis.clientName}` : devis.clientName
    doc.text(fullName, ML + 13, cy); cy -= 13
    doc.text(`Telephone : ${devis.clientPhone}`, ML + 13, cy); cy -= 13
    if (devis.clientEmail) { doc.text(`Email : ${devis.clientEmail}`, ML + 13, cy); cy -= 13 }
    doc.text(`Type : ${devis.clientType === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'}`, ML + 13, cy); cy -= 13
    doc.text(`Ville : ${devis.city}${devis.commune ? ` — ${devis.commune}` : ''}`, ML + 13, cy); cy -= 13
    if (devis.address) doc.text(`Adresse : ${devis.address}`, ML + 13, cy)

    y -= 100
    const colW = [CW * 0.28, CW * 0.15, CW * 0.15, CW * 0.10, CW * 0.16, CW * 0.16]
    const colX = [ML]
    for (let i = 1; i < colW.length; i++) colX.push(colX[i - 1] + colW[i - 1])
    doc.rect(ML, y - 18, CW, 18).fill(DARK_COLOR)
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff')
    const hdr = ['Produit', 'Reference', 'Variante', 'Qte', 'Prix unit.', 'Total']
    hdr.forEach((h, i) => doc.text(h, colX[i] + 4, y - 12, { width: colW[i] - 8 }))
    y -= 20

    devis.items.forEach((item: any, idx: number) => {
      const rh = item.hasPersonalization ? 24 : 16
      if (idx % 2 === 1) doc.rect(ML, y - rh, CW, rh).fill('#fafbfc')
      doc.rect(ML, y - rh, CW, rh).lineWidth(0.2).strokeColor('#eeeeee').stroke()
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#333333')
      doc.text(item.productName || '', colX[0] + 4, y - 12, { width: colW[0] - 8, lineBreak: false })
      if (item.hasPersonalization) {
        doc.font('Helvetica').fontSize(6).fillColor('#7c3aed')
        doc.text('Personnalise', colX[0] + 4, y - 20, { width: colW[0] - 8, lineBreak: false })
      }
      doc.font('Helvetica').fontSize(7).fillColor('#555555')
      doc.text(item.productSku || '-', colX[1] + 4, y - 12, { lineBreak: false })
      doc.text(item.variantName || '-', colX[2] + 4, y - 12, { lineBreak: false })
      doc.text(String(item.quantity), colX[3] + 4, y - 12, { lineBreak: false })
      doc.text(formatFCFA(Number(item.unitPrice)), colX[4] + 4, y - 12, { lineBreak: false })
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#333333')
      doc.text(formatFCFA(Number(item.lineTotal)), colX[5] + 4, y - 12, { lineBreak: false })
      y -= rh
    })

    y -= 10
    const tw = 200, tx = W - MR - tw
    doc.roundedRect(tx, y - 56, tw, 56, 3).lineWidth(0.5).strokeColor('#e0e0e0').fill(LIGHT_BG)
    doc.rect(tx, y - 20, tw, 20).fill(DARK_COLOR)
    doc.font('Helvetica').fontSize(8).fillColor('#555555')
    doc.text('Sous-total', tx + 8, y - 14)
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333333')
    doc.text(formatFCFA(Number(devis.subtotal)), tx + tw - 8, y - 14, { align: 'right', width: tw - 16 })
    doc.font('Helvetica').fontSize(8).fillColor('#555555')
    doc.text('Livraison', tx + 8, y - 28)
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333333')
    doc.text(formatFCFA(Number(devis.deliveryFee)), tx + tw - 8, y - 28, { align: 'right', width: tw - 16 })
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
    doc.text('TOTAL', tx + 8, y - 8)
    doc.text(formatFCFA(Number(devis.total)), tx + tw - 8, y - 8, { align: 'right', width: tw - 16 })

    const fy = 35
    doc.moveTo(ML, fy + 15).lineTo(W - MR, fy + 15).lineWidth(0.3).strokeColor('#cccccc').stroke()
    doc.font('Helvetica').fontSize(7).fillColor('#aaaaaa')
    doc.text('ITS EQUIPEMENT — ITSchool & Dynamic Group', ML, fy + 6)
    doc.text('contact@itschoolci.com | +225 07 79 07 45 47 | Cocody 2 Plateaux, Abidjan', ML, fy + 16)
    doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#999999')
    doc.text('Ce devis est valable 30 jours. Les prix sont en FCFA et peuvent etre ajustes apres confirmation.', ML, fy + 28, { align: 'center', width: CW })

    doc.end()

    // Wait for PDF to finish rendering
    const pdfBuffer = await pdfReady
    const pdfArray = new Uint8Array(pdfBuffer)

    return new Response(pdfArray, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${devis.devisNumber.replace(/[^a-zA-Z0-9-_]/g, '')}.pdf"`,
        'Content-Length': String(pdfArray.byteLength),
      },
    })
  } catch {
    // Log volontairement minimal : on n'écrit pas l'erreur détaillée (risque
    // de fuite d'infos si les logs sont exposés).
    return serverError()
  }
}
