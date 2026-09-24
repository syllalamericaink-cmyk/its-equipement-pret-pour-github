import { PDFDocument, StandardFonts, rgb } from 'jspdf'
import fs from 'fs'
import path from 'path'

const LOGO_PATH = path.resolve('/home/z/my-project/public/logo-its-equipement.jpg')

function formatFCFA(amount) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' FCFA'
}

function generatePdf(devis) {
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4', putOnly: ['Title', 'Author'] })
  const pw = 841.89
  const ph = 1190.59
  const ml = 10
  const mr = 45
  const cw = pw - ml - mr

  doc.setFillColor('#0056A7').rect(0, 0, pw, 7)
  let y = 16

  try {
    const logoBuf = fs.readFileSync(LOGO_PATH)
    const logoBase64 = logoBuf.toString('base64')
    const logoUrl = `data:image/jpeg;base64,${logoBase64}`
    doc.image(logoUrl, ml, y, { width: 44, height: 44 })
    y += 10
    doc.setFont('Helvetica', 'bold', 16).setTextColor('#1a1a2e')
    doc.text('ITS EQUIPEMENT', ml, y)
    doc.setFont('Helvetica', 'normal', 8).setTextColor('#555')
    doc.text('ITSchool & Dynamic Group', ml, y + 5)
    doc.text('contact@itschoolci.com | +225 07 79 07 45 47', ml, y + 10)
    doc.text('Cocody 2 Plateaux, Cite Sanon — Abidjan', ml, y + 15)
  } catch (e) { console.error('Logo skip:', e.message) }

  const boxW = 148
  const boxX = pw - boxW - mr
  doc.setDrawColor('#ddd').setLineWidth(0.5)
  doc.roundedRect(boxX, y + 2, boxW, 48, 4).stroke()
  doc.setFont('Helvetica', 'normal', 8).setTextColor('#888')
  doc.text('DEVIS', boxX + 10, y + 10)
  doc.setFont('Helvetica', 'bold', 12).setTextColor('#1a1a2e')
  doc.text('#' + devis.devisNumber, boxX + 10, y + 22)
  doc.setFont('Helvetica', 'normal', 8).setTextColor('#888')
  doc.text(new Date(devis.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }), boxX + 10, y + 32)

  y += 56
  doc.setDrawColor('#ccc').setLineWidth(0.5).line(ml, y, pw - ml, y)
  y += 14

  doc.setFillColor(LIGHT_BG).setDrawColor('#e0e0e0').setLineWidth(0.5)
  doc.roundedRect(ml, y + 2, cw, 78, 3).fill().stroke()
  doc.setFont('Helvetica', 'bold', 9).setTextColor('#1a1a2e')
  doc.text('CLIENT', ml + 13, y + 14)
  doc.setFont('Helvetica', 'normal', 9).setTextColor('#333')

  const clientLabel = devis.clientType === 'ENTREPRISE'
    ? (devis.companyName || devis.clientName)
    : devis.clientName
  doc.text(clientLabel, ml + 13, y + 27)
  const fullName = devis.clientFirstName
    ? `${devis.clientFirstName} ${devis.clientName}`
    : devis.clientName
  doc.text(fullName, ml + 13, y + 39)
  doc.text(`Telephone : ${devis.clientPhone}`, ml + 13, y + 51)
  if (devis.clientEmail) doc.text(`Email : ${devis.clientEmail}`, ml + 13, y + 63)
  doc.text(`Type : ${devis.clientType === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'}`, ml + 13, y + 75)
  doc.text(`Ville : ${devis.city}${devis.commune ? ` — ${devis.commune}` : ''}`, ml + 13, y + 87)
  if (devis.address) doc.text(`Adresse : ${devis.address}`, ml + 13, y + 99)
  if (devis.companyName && devis.clientType === 'ENTREPRISE') {
    doc.setFont('Helvetica', 'bold', 8).setTextColor('#1a1a2e')
    doc.text(`Entreprise : ${devis.companyName}`, ml + 13, y + 111)
  }

  y += 94

  const colW = [cw * 0.27, cw * 0.14, cw * 0.14, cw * 0.09, cw * 0.18, cw * 0.16]
  const cx = [ml]
  for (let i = 1; i < colW.length; i++) cx.push(cx[i - 1] + colW[i - 1])

  doc.setFillColor('#1a1a2e').rect(ml, y + 2, cw, 17).fill()
  doc.setFont('Helvetica', 'bold', 7.5).setTextColor('#fff')
  const headers = ['Produit', 'Reference', 'Variante', 'Qte', 'Prix unit.', 'Total']
  headers.forEach((h, i) => doc.text(h, cx[i] + 3, y + 12, { width: colW[i] - 6 }))

  y += 19

  devis.items.forEach((item, idx) => {
    if (y > ph - 80) {
      doc.addPage({ orientation: 'portrait', unit: 'mm', format: 'a4', margin: { top: 50, bottom: 60, left: 45, right: 45 } })
      doc.setFillColor('#0056A7').rect(0, 0, pw, 7).fill()
      y = 16
    }

    if (idx % 2 === 1) {
      doc.setFillColor('#fafbfc').rect(ml, y + 2, cw, 15).fill()
    }
    doc.setDrawColor('#eee').setLineWidth(0.2).rect(ml, y + 2, cw, 15).stroke()

    doc.setFont('Helvetica', 'bold', 7.5).setTextColor('#333')
    doc.text(item.productName || '', cx[0] + 3, y + 12, { width: colW[0] - 6 })
    if (item.hasPersonalization) {
      doc.setFont('Helvetica', 'italic', 6).setTextColor('#7c3aed')
      doc.text('Personnalise', cx[0] + 3, y + 21)
    }
    doc.setFont('Helvetica', 'normal', 7).setTextColor('#555')
    doc.text(item.productSku || '-', cx[1] + 3, y + 12)
    doc.text(item.variantName || '-', cx[2] + 3, y + 12)
    doc.text(String(item.quantity), cx[3] + 3, y + 12)
    doc.text(formatFCFA(Number(item.unitPrice)), cx[4] + 3, y + 12)
    doc.setFont('Helvetica', 'bold', 7.5).setTextColor('#333')
    doc.text(formatFCFA(Number(item.lineTotal)), cx[5] + 3, y + 12)
    y += 17
  })

  y += 8
  const tx = pw - 240
  const tw = 195
  doc.setDrawColor('#e0e0e0').setLineWidth(0.5).setFillColor(LIGHT_BG)
  doc.roundedRect(tx, y + 2, tw, 54, 3).fill().stroke()
  doc.setFillColor(LIGHT_BG).rect(tx, y + 2, tw, 18).fill()
  doc.setFillColor('#1a1a2e').rect(tx, y + 20, tw, 20).fill()

  doc.setFont('Helvetica', 'normal', 8).setTextColor('#555')
  doc.text('Sous-total', tx + 8, y + 14)
  doc.setFont('Helvetica', 'bold', 8).setTextColor('#333')
  doc.text(formatFCFA(Number(devis.subtotal)), tx + tw - 8, y + 14, { align: 'right' })
  doc.text('Livraison', tx + 8, y + 28)
  doc.setFont('Helvetica', 'bold', 8).setTextColor('#333')
  doc.text(formatFCFA(Number(devis.deliveryFee)), tx + tw - 8, y + 28, { align: 'right' })

  doc.setFont('Helvetica', 'bold', 9).setTextColor('#fff')
  doc.text('TOTAL', tx + 8, y + 36)
  doc.text(formatFCFA(Number(devis.total)), tx + tw - 8, y + 36, { align: 'right' })

  const fy = ph - 40
  doc.setDrawColor('#ccc').setLineWidth(0.3).line(ml, fy + 15, pw - ml, fy + 15).stroke()
  doc.setFont('Helvetica', 'normal', 7).setTextColor('#aaa')
  doc.text('ITS EQUIPEMENT — ITSchool & Dynamic Group', ml, fy + 6)
  doc.text('contact@itschoolci.com | +225 07 79 07 45 47 | Cocody 2 Plateaux, Cite Sanon — Abidjan', ml, fy + 16)
  doc.setFont('Helvetica', 'italic', 6.5).setColor('#999')
  doc.text('Ce devis est valable 30 jours. Les prix sont indicatifs et peuvent etre ajustes apres confirmation.', 45, fy + 34, { align: 'center', width: cw })

  return doc.end()
}

const args = JSON.parse(process.argv[2])
const devis = args.devis
const outPath = args.out || `/home/z/my-project/download/${devis.devisNumber}.pdf`
console.log('Generating PDF for', devis.devisNumber, '->', outPath)
const pdfDoc = generatePdf(devis)
const pdfBytes = Buffer.from(pdfDoc)
fs.writeFileSync(outPath, pdfBytes)
console.log('PDF saved:', outPath, '(', pdfBytes.length, 'bytes)')
