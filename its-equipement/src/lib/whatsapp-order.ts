// Helper client-side pour générer un lien WhatsApp pré-rempli avec le récap
// complet de la demande du client. Le message est volontairement structuré
// pour qu'un commercial puisse relire la demande en un coup d'œil.
//
// Note : wa.me ne supporte que du texte. Les images des articles sont donc
// transmises sous forme d'URL cliquables dans le message — le commercial peut
// les ouvrir pour identifier visuellement chaque produit.
//
// Pour envoyer VRAIMENT les images via WhatsApp (avec médias), il faudrait
// activer WhatsApp Business Cloud API côté serveur (déjà scaffoldé dans
// src/lib/services/whatsapp.service.ts).

import type { CartItem } from '@/stores/cart-store'

const ADMIN_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? ''

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n) + ' FCFA'

export type RequestType = 'COMMANDE_SIMPLE' | 'DEVIS' | 'BON_COMMANDE' | 'FNE'

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  COMMANDE_SIMPLE: 'Commande simple',
  DEVIS: 'Demande de devis',
  BON_COMMANDE: 'Bon de commande',
  FNE: 'Demande de FNE',
}

export interface OrderCustomerInfo {
  clientType: 'PARTICULIER' | 'ENTREPRISE'
  clientName: string
  clientFirstName?: string
  clientPhone: string
  clientEmail?: string
  city: string
  commune?: string
  address?: string
  deliveryComment?: string
}

export interface CompanyInfo {
  companyName?: string
  companyInfo?: string
}

export interface PersonalizationInfo {
  hasPersonalization: boolean
  summary?: string
}

/**
 * Construit une URL wa.me avec le récap COMPLET de la commande pré-rempli.
 * Le client clique sur le bouton → WhatsApp s'ouvre avec le message déjà
 * rédigé vers le compte administrateur.
 *
 * Le message inclut :
 *   - Le type de demande (Commande simple / Devis / Bon de commande / FNE)
 *   - Les infos client (nom, téléphone WhatsApp, lieu de livraison)
 *   - Les infos entreprise (si devis, bon de commande ou FNE)
 *   - Le récap des personnalisations (si activées)
 *   - La liste des produits avec quantités, prix et URL des images
 *   - Le total
 *   - Un appel à l'action clair pour le commercial
 */
export function buildWhatsAppOrderLink(
  customer: OrderCustomerInfo,
  items: CartItem[],
  total: number,
  options: {
    requestType: RequestType
    company?: CompanyInfo
    personalization?: PersonalizationInfo
    orderRef?: string
  },
): string {
  const lines: string[] = []
  const requestTypeLabel = REQUEST_TYPE_LABELS[options.requestType]

  // En-tête
  lines.push('*🛒 NOUVELLE DEMANDE - ITS Équipement*')
  if (options.orderRef) {
    lines.push(`Référence : ${options.orderRef}`)
  }
  lines.push(`Type de demande : *${requestTypeLabel}*`)
  lines.push('')

  // Client
  lines.push('*👤 Client*')
  lines.push(`Nom : ${customer.clientName}${customer.clientFirstName ? ' ' + customer.clientFirstName : ''}`)
  lines.push(`Téléphone WhatsApp : ${customer.clientPhone}`)
  if (customer.clientEmail) {
    lines.push(`Email : ${customer.clientEmail}`)
  }
  lines.push(`Type : ${customer.clientType === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'}`)
  lines.push('')

  // Entreprise (si devis, bon de commande ou FNE)
  if (options.requestType !== 'COMMANDE_SIMPLE') {
    lines.push('*🏢 Entreprise*')
    if (options.company?.companyName) {
      lines.push(`Nom : ${options.company.companyName}`)
    }
    if (options.company?.companyInfo) {
      lines.push(`Informations : ${options.company.companyInfo}`)
    }
    lines.push('')
  }

  // Livraison
  lines.push('*📍 Livraison*')
  lines.push(`Ville : ${customer.city}`)
  if (customer.commune) {
    lines.push(`Commune : ${customer.commune}`)
  }
  if (customer.address) {
    lines.push(`Adresse : ${customer.address}`)
  }
  if (customer.deliveryComment) {
    lines.push(`Instructions : ${customer.deliveryComment}`)
  }
  lines.push('')

  // Personnalisation (récap global)
  if (options.personalization?.hasPersonalization) {
    lines.push('*🎨 Personnalisation demandée*')
    if (options.personalization.summary?.trim()) {
      lines.push(options.personalization.summary.trim())
    } else {
      lines.push('Oui — voir le détail par article ci-dessous.')
    }
    lines.push('⚠ Délai de préparation des personnalisations : 24h.')
    lines.push('')
  }

  // Produits
  lines.push('*📦 Produits commandés*')
  items.forEach((item, idx) => {
    lines.push(`${idx + 1}. *${item.productName}*`)
    if (item.productSku) {
      lines.push(`   Réf : ${item.productSku}`)
    }
    if (item.variantName) {
      lines.push(`   Variante : ${item.variantName}`)
    }
    lines.push(`   Quantité : ${item.quantity}`)
    lines.push(`   Prix unitaire : ${fmtPrice(item.unitPrice)}`)
    lines.push(`   Total ligne : ${fmtPrice(item.unitPrice * item.quantity)}`)
    // URL de l'image — le commercial peut cliquer pour identifier le produit
    if (item.productImage) {
      const absoluteUrl = item.productImage.startsWith('http')
        ? item.productImage
        : `${SITE_URL}${item.productImage.startsWith('/') ? '' : '/'}${item.productImage}`
      lines.push(`   🖼 Image : ${absoluteUrl}`)
    }
    // Détail perso par item
    if (item.hasPersonalization) {
      const p = item.personalization
      const details: string[] = []
      if (p.impression) details.push('impression')
      if (p.logo) details.push('logo')
      if (p.texte) details.push(`texte: "${p.texte}"`)
      if (p.emplacement) details.push(`emplacement: ${p.emplacement}`)
      if (p.taille) details.push(`taille: ${p.taille}`)
      if (p.couleur) details.push(`couleur: ${p.couleur}`)
      if (p.instructions) details.push(`instructions: ${p.instructions}`)
      lines.push(`   🎨 Personnalisation : ${details.join(' | ') || 'cf. récap global'}`)
    }
    lines.push('')
  })

  // Totaux
  lines.push('*💰 Montants*')
  lines.push(`Sous-total : ${fmtPrice(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}`)
  lines.push(`*TOTAL À PAYER : ${fmtPrice(total)}*`)
  lines.push('')

  // Action commercial
  lines.push('*🔔 ACTION COMMERCIAL*')
  lines.push(`Recontacter le client sur WhatsApp : ${customer.clientPhone}`)
  lines.push('⚠ Ne pas présenter cette étape comme un paiement. Il s\'agit d\'une demande à valider manuellement.')

  const message = lines.join('\n')
  const phone = normalizePhone(ADMIN_WHATSAPP_NUMBER)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * Variante pour un achat immédiat d'un seul produit (sans formulaire client).
 * Le client finalise ses infos directement dans WhatsApp.
 */
export function buildWhatsAppDirectBuyLink(
  productName: string,
  productSku?: string,
  variantName?: string,
  quantity: number = 1,
  unitPrice: number = 0,
  hasPersonalization: boolean = false,
  productImageUrl?: string,
): string {
  const lines: string[] = []
  lines.push('*🛒 ACHAT DIRECT - ITS Équipement*')
  lines.push('')
  lines.push('*Produit*')
  lines.push(`Nom : ${productName}`)
  if (productSku) {
    lines.push(`Réf : ${productSku}`)
  }
  if (variantName) {
    lines.push(`Variante : ${variantName}`)
  }
  lines.push(`Quantité : ${quantity}`)
  lines.push(`Prix unitaire : ${fmtPrice(unitPrice)}`)
  lines.push(`Total : ${fmtPrice(unitPrice * quantity)}`)
  if (productImageUrl) {
    const absoluteUrl = productImageUrl.startsWith('http')
      ? productImageUrl
      : `${SITE_URL}${productImageUrl.startsWith('/') ? '' : '/'}${productImageUrl}`
    lines.push(`🖼 Image : ${absoluteUrl}`)
  }
  if (hasPersonalization) {
    lines.push('')
    lines.push('⚠ Produit personnalisable : délai 24h.')
  }
  lines.push('')
  lines.push('_Bonjour, je souhaite commander ce produit._')

  const message = lines.join('\n')
  const phone = normalizePhone(ADMIN_WHATSAPP_NUMBER)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
