import PDFDocument from 'pdfkit'
import crypto from 'crypto'
import { db } from '../db'
import { getSetting, getSettingNumber } from './settings.service'
import { AUTH_SECRET } from '../auth-secret'
import fs from 'fs'
import path from 'path'
import type { Quote, QuoteItem, Personalization, ProductVariant, PersonalizationOption, QuoteRequest, Client } from '@prisma/client'

type QuoteForPdf = Quote & {
  quoteRequest: QuoteRequest & { client: Client }
  items: (QuoteItem & {
    personalizations: (Personalization & { personalizationOption: PersonalizationOption })[]
    productVariant: ProductVariant | null
  })[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function generateQuotePdf(quoteId: string): Promise<string> {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: {
      quoteRequest: { include: { client: true } },
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  }) as QuoteForPdf | null

  if (!quote) throw new Error('Devis introuvable')

  const [companyName, companyAddress, companyPhone, companyEmail, companySiret, depositPercentage] = await Promise.all([
    getSetting('COMPANY_NAME') ?? 'ITS Équipement',
    getSetting('COMPANY_ADDRESS') ?? '',
    getSetting('COMPANY_PHONE') ?? '',
    getSetting('COMPANY_EMAIL') ?? '',
    getSetting('COMPANY_SIRET') ?? '',
    getSettingNumber('DEPOSIT_PERCENTAGE', 50),
  ])

  const privateDir = path.join(process.cwd(), 'private', 'quotes')
  if (!fs.existsSync(privateDir)) fs.mkdirSync(privateDir, { recursive: true })

  const filePath = path.join(privateDir, `${quote.quoteNumber}.pdf`)

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  const pageWidth = doc.page.width - 100
  const totalAmountHT = Number(quote.totalAmountHT)
  const totalAmountTTC = Number(quote.totalAmountTTC)
  const tvaAmount = totalAmountTTC - totalAmountHT
  const discountAmount = Number(quote.discountAmount)
  const subtotalHT = Number(quote.subtotalHT)
  const hasPersonalization = quote.items.some(i => i.hasPersonalization)

  doc.rect(0, 0, doc.page.width, 6).fill('#1a1a2e')

  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e').text(companyName ?? 'ITS Équipement', 50, 30)
  doc.fontSize(9).font('Helvetica').fillColor('#555')
  let headerY = 55
  if (companyAddress) { doc.text(companyAddress, 50, headerY); headerY += 14 }
  if (companyPhone) { doc.text(`Tél : ${companyPhone}`, 50, headerY); headerY += 14 }
  if (companyEmail) { doc.text(`Email : ${companyEmail}`, 50, headerY); headerY += 14 }
  if (companySiret) { doc.text(`SIRET : ${companySiret}`, 50, headerY); headerY += 14 }

  doc.rect(doc.page.width - 200, 25, 150, 55).lineWidth(1).strokeColor('#e0e0e0').stroke()
  doc.fontSize(8).font('Helvetica').fillColor('#888').text('DEVIS', doc.page.width - 195, 28, { width: 140, align: 'center' })
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text(quote.quoteNumber, doc.page.width - 195, 40, { width: 140, align: 'center' })
  doc.fontSize(8).font('Helvetica').fillColor('#888').text(formatDate(new Date(quote.createdAt)), doc.page.width - 195, 60, { width: 140, align: 'center' })

  let yPos = Math.max(headerY + 15, 95)

  doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).lineWidth(0.5).strokeColor('#ccc').stroke()
  yPos += 15

  doc.rect(50, yPos, pageWidth, 80).fillColor('#f8f9fa').fill()
  doc.rect(50, yPos, pageWidth, 80).lineWidth(0.5).strokeColor('#e0e0e0').stroke()
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a2e').text('CLIENT', 60, yPos + 8)
  const client = quote.quoteRequest.client
  doc.fontSize(9).font('Helvetica').fillColor('#333')
  let cY = yPos + 22
  doc.text(client.companyName, 60, cY); cY += 13
  doc.text(client.contactName, 60, cY); cY += 13
  if (client.address) { doc.text(client.address, 60, cY); cY += 13 }
  const cityLine = [client.zipCode, client.city, client.country].filter(Boolean).join(' ')
  if (cityLine) { doc.text(cityLine, 60, cY); cY += 13 }

  let rightInfoY = yPos + 8
  doc.fontSize(8).font('Helvetica').fillColor('#888').text('Date :', doc.page.width - 180, rightInfoY)
  doc.font('Helvetica-Bold').fillColor('#333').text(formatDate(new Date(quote.createdAt)), doc.page.width - 140, rightInfoY)
  rightInfoY += 13
  doc.font('Helvetica').fillColor('#888').text('Validité :', doc.page.width - 180, rightInfoY)
  doc.font('Helvetica-Bold').fillColor('#333').text(formatDate(new Date(quote.validUntil)), doc.page.width - 140, rightInfoY)
  rightInfoY += 13
  doc.font('Helvetica').fillColor('#888').text('Réf. demande :', doc.page.width - 180, rightInfoY)
  doc.font('Helvetica-Bold').fillColor('#333').text(quote.quoteRequest.reference, doc.page.width - 110, rightInfoY)

  yPos += 100

  const colX = [50, 220, 295, 355, 415, 490]
  const colW = [170, 75, 60, 60, 75, 55]
  const headers = ['Produit', 'Réf.', 'Variante', 'Qté', 'Prix unit.', 'Total']

  doc.rect(50, yPos, pageWidth, 22).fillColor('#1a1a2e').fill()
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff')
  headers.forEach((h, i) => doc.text(h, colX[i] + 4, yPos + 6, { width: colW[i] - 8 }))
  yPos += 22

  quote.items.forEach((item, idx) => {
    const lineH = item.hasPersonalization && item.personalizations.length > 0 ? 38 : 22
    if (yPos + lineH > doc.page.height - 200) {
      doc.addPage()
      yPos = 50
      doc.rect(50, yPos, pageWidth, 22).fillColor('#1a1a2e').fill()
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff')
      headers.forEach((h, i) => doc.text(h, colX[i] + 4, yPos + 6, { width: colW[i] - 8 }))
      yPos += 22
    }

    if (idx % 2 === 1) {
      doc.rect(50, yPos, pageWidth, lineH).fillColor('#fafbfc').fill()
    }

    doc.rect(50, yPos, pageWidth, lineH).lineWidth(0.3).strokeColor('#eee').stroke()

    const variantName = item.productVariant?.name ?? ''
    const ref = item.productVariant?.sku ?? ''

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#333').text(item.productName, colX[0] + 4, yPos + 4, { width: colW[0] - 8 })
    doc.fontSize(7).font('Helvetica').fillColor('#888').text(ref || '-', colX[1] + 4, yPos + 6, { width: colW[1] - 8 })
    doc.text(variantName || '-', colX[2] + 4, yPos + 6, { width: colW[2] - 8 })
    doc.text(String(item.quantity), colX[3] + 4, yPos + 6, { width: colW[3] - 8 })
    doc.text(formatCurrency(Number(item.unitPrice)), colX[4] + 4, yPos + 6, { width: colW[4] - 8 })
    doc.font('Helvetica-Bold').text(formatCurrency(Number(item.lineTotal)), colX[5] + 4, yPos + 6, { width: colW[5] - 8 })

    if (item.hasPersonalization && item.personalizations.length > 0) {
      doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#8b5cf6')
      const persoText = item.personalizations
        .map(p => `${p.personalizationOption?.label ?? ''}: ${JSON.stringify(p.value).replace(/"/g, '')}`)
        .join(' | ')
      doc.text(`✎ Personnalisation : ${persoText}`, colX[0] + 4, yPos + 18, { width: pageWidth - 8 })
    }

    yPos += lineH
  })

  yPos += 10
  const totalsX = doc.page.width - 200
  const totalsW = 150

  doc.rect(totalsX, yPos, totalsW, 20).fillColor('#f8f9fa').fill()
  doc.rect(totalsX, yPos, totalsW, 20).strokeColor('#e0e0e0').stroke()
  doc.fontSize(8).font('Helvetica').fillColor('#555').text('Sous-total HT', totalsX + 8, yPos + 5)
  doc.font('Helvetica-Bold').text(formatCurrency(subtotalHT), totalsX + 8, yPos + 5, { width: totalsW - 16, align: 'right' })
  yPos += 20

  if (discountAmount > 0) {
    doc.rect(totalsX, yPos, totalsW, 20).fillColor('#fff5f5').fill()
    doc.rect(totalsX, yPos, totalsW, 20).strokeColor('#e0e0e0').stroke()
    doc.fontSize(8).font('Helvetica').fillColor('#e53e3e').text('Remise', totalsX + 8, yPos + 5)
    doc.font('Helvetica-Bold').text(`- ${formatCurrency(discountAmount)}`, totalsX + 8, yPos + 5, { width: totalsW - 16, align: 'right' })
    yPos += 20
  }

  doc.rect(totalsX, yPos, totalsW, 20).fillColor('#f8f9fa').fill()
  doc.rect(totalsX, yPos, totalsW, 20).strokeColor('#e0e0e0').stroke()
  doc.fontSize(8).font('Helvetica').fillColor('#555').text(`TVA (${(Number(quote.tvaRate) * 100).toFixed(0)}%)`, totalsX + 8, yPos + 5)
  doc.font('Helvetica-Bold').text(formatCurrency(tvaAmount), totalsX + 8, yPos + 5, { width: totalsW - 16, align: 'right' })
  yPos += 20

  doc.rect(totalsX, yPos, totalsW, 26).fillColor('#1a1a2e').fill()
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#fff').text('TOTAL TTC', totalsX + 8, yPos + 7)
  doc.text(formatCurrency(totalAmountTTC), totalsX + 8, yPos + 7, { width: totalsW - 16, align: 'right' })
  yPos += 36

  if (yPos > doc.page.height - 150) {
    doc.addPage()
    yPos = 50
  }

  doc.rect(50, yPos, pageWidth, hasPersonalization ? 55 : 30).lineWidth(1).strokeColor('#1a1a2e').stroke()
  doc.rect(50, yPos, pageWidth, 20).fillColor('#f0f4ff').fill()
  doc.rect(50, yPos, pageWidth, 20).lineWidth(1).strokeColor('#1a1a2e').stroke()
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a2e').text('CONDITIONS DE PAIEMENT', 60, yPos + 5)
  yPos += 24

  if (hasPersonalization) {
    const depositAmt = totalAmountTTC * (depositPercentage / 100)
    const balanceAmt = totalAmountTTC - depositAmt
    const balancePct = 100 - depositPercentage
    doc.fontSize(8).font('Helvetica').fillColor('#333')
    doc.text(`Acompte : ${depositPercentage.toFixed(0)}% = ${formatCurrency(depositAmt)} à la commande`, 60, yPos)
    doc.text(`Solde : ${balancePct.toFixed(0)}% = ${formatCurrency(balanceAmt)} à la livraison`, 60, yPos + 13)
  } else {
    doc.fontSize(8).font('Helvetica').fillColor('#333').text('Paiement intégral à la livraison', 60, yPos)
  }
  yPos += hasPersonalization ? 40 : 18

  if (quote.conditions) {
    if (yPos > doc.page.height - 100) {
      doc.addPage()
      yPos = 50
    }
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666').text(quote.conditions, 50, yPos, { width: pageWidth })
    yPos += 20
  }

  const pageCount = doc.bufferedPageRange().count
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i)
    const bottomY = doc.page.height - 40
    doc.moveTo(50, bottomY - 10).lineTo(doc.page.width - 50, bottomY - 10).lineWidth(0.3).strokeColor('#ccc').stroke()
    doc.fontSize(7).font('Helvetica').fillColor('#aaa').text(companyName ?? 'ITS Équipement', 50, bottomY, { width: 200 })
    doc.text(`${companyAddress ?? ''} | ${companyPhone ?? ''}`, 50, bottomY + 10, { width: 350 })
    doc.text(`Page ${i + 1} / ${pageCount}`, doc.page.width - 150, bottomY + 5, { width: 100, align: 'right' })
  }

  return new Promise<string>((resolve, reject) => {
    doc.end()
    stream.on('finish', () => resolve(filePath))
    stream.on('error', reject)
  })
}

export function getSecureDownloadToken(quoteId: string): string {
  const secret = AUTH_SECRET
  return crypto.createHmac('sha256', secret).update(quoteId).digest('hex')
}
