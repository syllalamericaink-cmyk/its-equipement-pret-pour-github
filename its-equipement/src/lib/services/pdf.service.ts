import PDFDocument from 'pdfkit'
import path from 'path'
import { db } from '../db'
import { formatDate } from '../format'
import { getSettingNumber } from './settings.service'
import { montantEnLettresCfa } from '../number-to-words'
import type {
  Quote,
  QuoteItem,
  Personalization,
  PersonalizationOption,
  ProductVariant,
  QuoteRequest,
  Client,
  Product,
} from '@prisma/client'

type QuoteForPdf = Quote & {
  quoteRequest: QuoteRequest & { client: Client }
  items: (QuoteItem & {
    personalizations: (Personalization & { personalizationOption: PersonalizationOption | null })[]
    productVariant: ProductVariant | null
  })[]
}

/**
 * PDF de devis administrateur au format du modèle officiel « ITS & DGE »
 * (identique au devis papier de la société et au PDF du devis public) :
 * en-tête société avec logo et activités, bloc client (Facturer à /
 * Tél / Adresse / REFERENCE BC / DEVIS N° / Date / Validité), tableau
 * produits (N°, Désignations, U, Qté, Prix Unitaire, R%, Prix U Net,
 * Prix Total), TOTAL HT / TVA / TOTAL, conditions de paiement,
 * ACOMPTE / NET A PAYER, montant arrêté en toutes lettres, cadre
 * LA DIRECTION et pied de page RCCM.
 */

const INK = '#000000'
const MIN_LIGNES = 12 // le modèle réserve 12 lignes produits

/** Montant au format du site : « 1 500 FCFA ». */
function fmtCFA(montant: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant) + ' FCFA'
}

/** Dessine des segments [texte, gras, italique] sur une même ligne. */
function richLine(
  doc: PDFKit.PDFDocument,
  segments: [string, boolean, boolean][],
  x: number,
  y: number,
  size = 7.5,
): void {
  let cursor = x
  for (const [text, bold, italic] of segments) {
    doc.font(bold && italic ? 'Helvetica-BoldOblique' : bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica')
    doc.fontSize(size).fillColor(INK)
    doc.text(text, cursor, y, { lineBreak: false })
    cursor += doc.widthOfString(text)
  }
}

function textRight(doc: PDFKit.PDFDocument, str: string, rightX: number, y: number, size: number, bold = false): void {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(INK)
  doc.text(str, rightX - doc.widthOfString(str), y, { lineBreak: false })
}

function textCenter(doc: PDFKit.PDFDocument, str: string, cx: number, y: number, size: number, bold = false, italic = false): void {
  doc.font(bold && italic ? 'Helvetica-BoldOblique' : bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica')
  doc.fontSize(size).fillColor(INK)
  doc.text(str, cx - doc.widthOfString(str) / 2, y, { lineBreak: false })
}

/** Tronque une chaîne pour tenir dans une largeur donnée (avec « … »). */
function tronquer(doc: PDFKit.PDFDocument, str: string, maxWidth: number): string {
  if (doc.widthOfString(str) <= maxWidth) return str
  let s = str
  while (s.length > 1 && doc.widthOfString(s + '…') > maxWidth) s = s.slice(0, -1)
  return s + '…'
}

export async function generateQuotePdf(quoteId: string): Promise<Buffer> {
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

  // Capture pour usage dans les closures (narrowing non propagé)
  const refDevis = quote.quoteNumber

  // Prix catalogue par produit (pour la colonne R% du modèle papier) :
  // QuoteItem.unitPrice stocke le prix NET remisé, on recalcule la remise
  // en comparant au prix de base du produit (ou de sa variante).
  const productIds = [...new Set(quote.items.map(i => i.productId))]
  const produits = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, basePrice: true },
  })
  const prixParProduit = new Map<string, number>(produits.map((p: Pick<Product, 'id' | 'basePrice'>) => [p.id, Number(p.basePrice)]))

  const W = 595.28, H = 842, ML = 40, MR = 40, CW = W - ML - MR

  const buffers: Buffer[] = []
  const doc = new PDFDocument({ size: 'A4', margin: 0 })
  const pdfReady = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)
  })

  // ------------------------------------------------------------------
  // Repères du tableau produits (8 colonnes, largeurs = modèle papier)
  // ------------------------------------------------------------------
  const COLW = [22, 197, 26, 32, 70, 26, 70, 72] // N° Désign. U Qté PU R% PUNet Total
  const COLX: number[] = [ML]
  for (let i = 1; i < COLW.length; i++) COLX.push(COLX[i - 1] + COLW[i - 1])
  const HEADERS = ['N°', 'Désignations', 'U', 'Qté', 'Prix Unitaire', 'R%', 'Prix U Net', 'Prix Total']

  // ------------------------------------------------------------------
  // Helpers de mise en page
  // ------------------------------------------------------------------
  let y = 0
  let pageNumber = 1

  function cadre(x1: number, yy1: number, x2: number, yy2: number, lw = 1): void {
    doc.lineWidth(lw).rect(x1, yy1, x2 - x1, yy2 - yy1).strokeColor(INK).stroke()
  }

  function ligneH(yh: number, x1: number, x2: number, lw = 0.75): void {
    doc.lineWidth(lw).moveTo(x1, yh).lineTo(x2, yh).strokeColor(INK).stroke()
  }

  function ligneV(xv: number, yy1: number, yy2: number, lw = 0.75): void {
    doc.lineWidth(lw).moveTo(xv, yy1).lineTo(xv, yy2).strokeColor(INK).stroke()
  }

  function piedDePage(): void {
    const fy = H - 42
    doc.font('Helvetica').fontSize(7.5).fillColor(INK)
    doc.text('Siège social: Abidjan 2 plateau cité sanon - RCCM:CI- ABJ-03-2021-B13-06005', ML, fy, {
      width: CW,
      align: 'center',
    })
  }

  function enTeteSuite(): void {
    doc.font('Helvetica-BoldOblique').fontSize(12).fillColor(INK)
    doc.text('ITS & DGE', ML, 28, { lineBreak: false })
    const suiteLabel = `Devis ${refDevis} — suite (page ${pageNumber})`
    doc.font('Helvetica').fontSize(8).fillColor(INK)
    doc.text(suiteLabel, W - MR - doc.widthOfString(suiteLabel), 30, { lineBreak: false })
    y = 60
    enteteTableau()
  }

  function enteteTableau(): void {
    const hh = 24
    cadre(ML, y, W - MR, y + hh)
    for (let i = 1; i < COLW.length; i++) ligneV(COLX[i], y, y + hh)
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(INK)
    HEADERS.forEach((h, i) => {
      const cx = COLX[i] + COLW[i] / 2
      const lines = h.split(' ') // « Prix Unitaire » → 2 lignes si besoin
      if (i === 1 || doc.widthOfString(h) <= COLW[i] - 6) {
        textCenter(doc, h, cx, y + 8, 7.5, true)
      } else {
        textCenter(doc, lines[0], cx, y + 3.5, 7.5, true)
        textCenter(doc, lines.slice(1).join(' '), cx, y + 13, 7.5, true)
      }
    })
    y += hh
  }

  function ligneProduit(
    num: string,
    designation: string,
    note: string | null,
    unite: string,
    qte: string,
    pu: string,
    remise: string,
    punet: string,
    total: string,
  ): void {
    const rh = note ? 22 : 15
    if (y + rh > H - 130) {
      piedDePage()
      doc.addPage()
      pageNumber++
      enTeteSuite()
    }
    cadre(ML, y, W - MR, y + rh, 0.75)
    for (let i = 1; i < COLW.length; i++) ligneV(COLX[i], y, y + rh, 0.5)

    doc.fillColor(INK)
    textCenter(doc, num, COLX[0] + COLW[0] / 2, y + 4, 8)
    doc.font('Helvetica').fontSize(8).fillColor(INK)
    doc.text(tronquer(doc, designation, COLW[1] - 8), COLX[1] + 4, y + 4, { lineBreak: false })
    if (note) {
      doc.font('Helvetica-Oblique').fontSize(6.2).fillColor('#555555')
      doc.text(tronquer(doc, note, COLW[1] - 8), COLX[1] + 4, y + 13, { lineBreak: false })
    }
    textCenter(doc, unite, COLX[2] + COLW[2] / 2, y + 4, 8)
    textCenter(doc, qte, COLX[3] + COLW[3] / 2, y + 4, 8)
    textRight(doc, pu, COLX[4] + COLW[4] - 4, y + 4, 8)
    textCenter(doc, remise, COLX[5] + COLW[5] / 2, y + 4, 8)
    textRight(doc, punet, COLX[6] + COLW[6] - 4, y + 4, 8)
    textRight(doc, total, COLX[7] + COLW[7] - 4, y + 4, 8)
    y += rh
  }

  // ------------------------------------------------------------------
  // PAGE 1 — en-tête société (logo + nom + activités), encadré
  // ------------------------------------------------------------------
  const headerTop = 34
  const headerH = 74
  cadre(ML, headerTop, W - MR, headerTop + headerH)

  const logoPath = path.join(process.cwd(), 'public', 'logo-its-equipement.jpg')
  try {
    doc.image(logoPath, ML + 6, headerTop + 12, { fit: [64, 50], align: 'center', valign: 'center' })
  } catch {
    /* logo absent : en-tête textuel conservé */
  }

  doc.font('Helvetica-BoldOblique').fontSize(16).fillColor(INK)
  doc.text('ITS & DGE', ML + 78, headerTop + 8, { lineBreak: false })
  doc.font('Helvetica-BoldOblique').fontSize(9)
  doc.text('International Training', ML + 78, headerTop + 30, { lineBreak: false })
  doc.font('Helvetica-BoldOblique').fontSize(8)
  doc.text('School & dynamic Group SARL', ML + 78, headerTop + 43, { lineBreak: false })

  const boxW = 215
  const boxX = W - MR - boxW
  doc.font('Helvetica-Oblique').fontSize(6.8).fillColor(INK)
  doc.text(
    "*Génie Civil, Vente d'Equipement de Protection Individuel, Formation d'Entreprise, Immigration et colloque à l'étranger, Divers prestation de services",
    boxX + 8,
    headerTop + 8,
    { width: boxW - 16, align: 'right' },
  )
  ligneV(boxX, headerTop, headerTop + headerH)

  // Bandes email / lieu
  y = headerTop + headerH
  richLine(doc, [
    ['Email: ', true, false],
    ['internationaltrainingschoolc@gmail.com', false, false],
    ['      facebook: ', true, false],
    ["ITSCHOOL & DGE cote d'ivoire", false, false],
  ], ML, y + 4)
  y += 14
  richLine(doc, [
    ['Lieu: ', true, false],
    ['Cocody 2 plateau cité sanon', false, false],
    ['      Tel : ', true, false],
    ['(+225) 0708600242/0777314781', false, false],
  ], ML, y + 4)
  y += 14
  ligneH(y, ML, W - MR)
  y += 10

  // ------------------------------------------------------------------
  // Bloc client / références (3 lignes × 3 zones)
  // ------------------------------------------------------------------
  const client = quote.quoteRequest.client
  const clientTop = y
  const rowH = 17
  const clientH = rowH * 3
  const sep1 = ML + 205
  const sep2 = ML + 310

  const facturerA = client.companyName
    ? client.contactName && client.contactName !== client.companyName
      ? `${client.companyName} (${client.contactName})`
      : client.companyName
    : client.contactName
  const adresse = [client.address, client.zipCode, client.city, client.country].filter(Boolean).join(', ')

  cadre(ML, clientTop, W - MR, clientTop + clientH, 0.75)
  for (let r = 1; r < 3; r++) ligneH(clientTop + r * rowH, ML, W - MR, 0.5)
  ligneV(sep1, clientTop, clientTop + clientH, 0.5)
  ligneV(sep2, clientTop, clientTop + clientH, 0.5)

  doc.font('Helvetica-Bold').fontSize(8).fillColor(INK)
  doc.text('Facturer à :', ML + 4, clientTop + 4.5, { lineBreak: false })
  doc.font('Helvetica').fontSize(8)
  doc.text(tronquer(doc, facturerA ?? '-', sep1 - ML - 66), ML + 62, clientTop + 4.5, { lineBreak: false })

  doc.font('Helvetica-Bold').fontSize(8)
  doc.text('Tél :', sep1 + 4, clientTop + 4.5, { lineBreak: false })
  doc.font('Helvetica').fontSize(8)
  doc.text(tronquer(doc, client.phone ?? '', sep2 - sep1 - 30), sep1 + 26, clientTop + 4.5, { lineBreak: false })

  doc.font('Helvetica-Bold').fontSize(8)
  doc.text(`DEVIS N° : ${quote.quoteNumber}`, sep2 + 4, clientTop + 4.5, { lineBreak: false })

  doc.font('Helvetica-Bold').fontSize(8)
  doc.text('Adresse :', ML + 4, clientTop + rowH + 4.5, { lineBreak: false })
  doc.font('Helvetica').fontSize(8)
  doc.text(tronquer(doc, adresse, sep1 - ML - 66), ML + 62, clientTop + rowH + 4.5, { lineBreak: false })

  doc.font('Helvetica-Bold').fontSize(8)
  doc.text('REFERENCE BC :', sep1 + 4, clientTop + rowH + 4.5, { lineBreak: false })
  doc.font('Helvetica').fontSize(8)
  doc.text(tronquer(doc, quote.quoteRequest.reference, W - MR - sep2 - 10), sep2 + 4, clientTop + rowH + 4.5, { lineBreak: false })

  doc.font('Helvetica-Bold').fontSize(8)
  doc.text(`Date : ${formatDate(new Date(quote.createdAt))}`, sep2 + 4, clientTop + 2 * rowH + 4.5, { lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(8)
  doc.text(`Valable jusqu'au : ${formatDate(new Date(quote.validUntil))}`, sep1 + 4, clientTop + 2 * rowH + 4.5, { lineBreak: false })

  y = clientTop + clientH + 14

  // Objet
  doc.font('Helvetica-BoldOblique').fontSize(9).fillColor(INK)
  doc.text('OBJET : DEVIS', ML, y, { lineBreak: false })
  y += 16

  // ------------------------------------------------------------------
  // Tableau produits
  // ------------------------------------------------------------------
  enteteTableau()

  quote.items.forEach((item, idx) => {
    const designation = item.productVariant
      ? `${item.productName} (${item.productVariant.name})`
      : item.productName

    const persoParts = item.personalizations.map(p => {
      const valeur = typeof p.value === 'string' ? p.value : JSON.stringify(p.value ?? '').replace(/"/g, '')
      return `${p.personalizationOption?.label ?? 'Option'} : ${valeur}`
    })
    const note = item.hasPersonalization && persoParts.length > 0
      ? `Personnalisation : ${persoParts.join(' | ')}`
      : item.hasPersonalization
        ? 'Personnalisé — logo client fourni'
        : null

    // R% : remise calculée par rapport au prix catalogue (produit ou variante)
    const prixBase = Number(prixParProduit.get(item.productId) ?? 0)
      + (item.productVariant ? Number(item.productVariant.priceModifier) : 0)
    const prixNet = Number(item.unitPrice)
    const remise = prixBase > 0 && prixNet < prixBase - 0.005
      ? Math.round((1 - prixNet / prixBase) * 1000) / 10
      : 0

    ligneProduit(
      String(idx + 1),
      designation,
      note,
      '',
      String(item.quantity),
      fmtCFA(remise > 0 ? prixBase : prixNet),
      remise > 0 ? `${remise % 1 === 0 ? remise : remise.toFixed(1)}` : '',
      fmtCFA(prixNet),
      fmtCFA(Number(item.lineTotal)),
    )
  })

  // Lignes vides pour atteindre le minimum du modèle
  for (let i = quote.items.length; i < MIN_LIGNES; i++) {
    ligneProduit(String(i + 1), '', null, '', '', '', '', '', '')
  }

  // ------------------------------------------------------------------
  // Totaux : TOTAL HT / TVA / TOTAL (si pagination : réaffichés en bas)
  // ------------------------------------------------------------------
  const totalHT = Number(quote.totalAmountHT)
  const totalTTC = Number(quote.totalAmountTTC)
  const tvaMontant = Math.round((totalTTC - totalHT) * 100) / 100
  const tvaPct = Math.round(Number(quote.tvaRate) * 100)

  if (y + 3 * 17 > H - 130) {
    piedDePage()
    doc.addPage()
    pageNumber++
    enTeteSuite()
    for (let i = 0; i < 4; i++) ligneProduit('', '', null, '', '', '', '', '', '')
  }

  cadre(ML, y, W - MR, y + 17)
  ligneV(COLX[5], y, y + 17)
  textRight(doc, 'TOTAL HT :', COLX[5] - 6, y + 4.5, 8)
  textRight(doc, fmtCFA(totalHT), W - MR - 4, y + 4.5, 8)
  y += 17

  cadre(ML, y, W - MR, y + 17)
  ligneV(COLX[5], y, y + 17)
  textRight(doc, `TVA ${tvaPct} % :`, COLX[5] - 6, y + 4.5, 8)
  textRight(doc, fmtCFA(tvaMontant), W - MR - 4, y + 4.5, 8)
  y += 17

  cadre(ML, y, W - MR, y + 17)
  ligneV(COLX[5], y, y + 17)
  textRight(doc, 'TOTAL :', COLX[5] - 6, y + 4.5, 8, true)
  textRight(doc, fmtCFA(totalTTC), W - MR - 4, y + 4.5, 8, true)
  y += 17

  // ------------------------------------------------------------------
  // Conditions de paiement + ACOMPTE / NET A PAYER
  // ------------------------------------------------------------------
  y += 12
  const condTop = y
  const condH = 34

  const hasPerso = quote.items.some(i => i.hasPersonalization)
  const depositPct = hasPerso ? await getSettingNumber('DEPOSIT_PERCENTAGE', 50) : 0
  const acompte = Math.round(totalTTC * (depositPct / 100))
  const netAPayer = Math.round((totalTTC - acompte) * 100) / 100

  richLine(doc, [
    ['Mode de paiement: ', true, false],
    ['Cash, Virement bancaire, Chèque', false, false],
  ], ML, condTop + 2, 8)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(INK)
  doc.text('DELAI LIVRAISON :', ML, condTop + 14, { lineBreak: false })
  doc.font('Helvetica-BoldOblique').fontSize(8)
  doc.text(
    depositPct > 0
      ? `PAIEMENT : ACOMPTE ${depositPct}% A LA COMMANDE, SOLDE A LA LIVRAISON`
      : 'PAIEMENT : 60 JOURS APRES LIVRAISON',
    ML,
    condTop + 25,
    { lineBreak: false },
  )

  const bxW = 130
  const bxX = W - MR - bxW
  cadre(bxX, condTop, W - MR, condTop + condH, 0.75)
  ligneH(condTop + condH / 2, bxX, W - MR, 0.5)
  textRight(doc, 'ACOMPTE :', W - MR - 42, condTop + 4, 8, true)
  if (acompte > 0) textRight(doc, fmtCFA(acompte), W - MR - 4, condTop + 4, 8)
  textRight(doc, 'NET A PAYER :', W - MR - 72, condTop + condH / 2 + 4, 8, true)
  textRight(doc, fmtCFA(netAPayer), W - MR - 4, condTop + condH / 2 + 4, 8, true)
  y = condTop + condH

  // Conditions spécifiques du devis (référence commande web, personnalisation…)
  if (quote.conditions) {
    y += 8
    doc.font('Helvetica-Oblique').fontSize(6.8).fillColor('#333333')
    doc.text(quote.conditions, ML, y, { width: CW - 120 })
    y += doc.heightOfString(quote.conditions, { width: CW - 120 }) + 4
  }

  // ------------------------------------------------------------------
  // Arrêté en toutes lettres + LA DIRECTION
  // ------------------------------------------------------------------
  y += 10
  if (y + 70 > H - 60) {
    piedDePage()
    doc.addPage()
    pageNumber++
    y = 60
  }
  doc.font('Helvetica-Bold').fontSize(8).fillColor(INK)
  doc.text('Arrêté la présente facture pro-forma à la somme de :', ML, y, { lineBreak: false })
  doc.font('Helvetica-Oblique').fontSize(8)
  doc.text(montantEnLettresCfa(netAPayer) || '—', ML, y + 12, { width: CW - 110 })

  const dirX = W - MR - 95
  const dirY = y + 34
  cadre(dirX, dirY, W - MR, dirY + 58, 0.75)
  textCenter(doc, 'LA DIRECTION', dirX + 95 / 2, dirY + 6, 8, true)

  piedDePage()

  // ------------------------------------------------------------------
  // Collecte du PDF en mémoire (compatible Vercel : aucun accès disque)
  // ------------------------------------------------------------------
  doc.end()
  return pdfReady
}
