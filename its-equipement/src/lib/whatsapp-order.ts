// Helper client-side pour générer un lien WhatsApp pré-rempli avec la
// demande du client. Le message est VOLONTAIREMENT COURT : le commercial
// doit pouvoir le relire en un coup d'œil (le détail complet part de notre
// côté sur Telegram + Google Sheets + le tableau admin).
//
// Format demandé par l'exploitant :
//
//   Bonjour, je souhaite passer cette commande :
//
//   📦 Produit : Casquette de sécurité noir
//   Quantité : 15
//   Personnalisation : Assa sylla
//
//   📍 Livraison : Cocody, Abidjan
//   Adresse : Ggfff
//
//   👤 Nom : Ggfcgh Hhjshxb
//   📞 WhatsApp : 80088676540
//
//   Merci de me confirmer la disponibilité et les modalités.
//
// Le message s'adapte au type de demande (commande simple / devis / bon de
// commande / FNE) et aux informations réellement remplies par le client.

import type { CartItem } from '@/stores/cart-store'

// Numéro WhatsApp de réception des demandes. Le fallback en dur garantit que
// le bouton fonctionne même si la variable NEXT_PUBLIC_* n'est pas définie
// dans l'environnement de build (elle peut la remplacer à tout moment).
export const ADMIN_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER ?? '+2250700249278'

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export type RequestType = 'COMMANDE_SIMPLE' | 'DEVIS' | 'BON_COMMANDE' | 'FNE'

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  COMMANDE_SIMPLE: 'Commande simple',
  DEVIS: 'Demande de devis',
  BON_COMMANDE: 'Bon de commande',
  FNE: 'Demande de FNE',
}

/** Verbe d'introduction adapté au type de demande. */
function introForType(requestType: RequestType): string {
  switch (requestType) {
    case 'DEVIS':
      return 'Bonjour, je souhaite demander un devis :'
    case 'BON_COMMANDE':
      return 'Bonjour, je souhaite établir un bon de commande :'
    case 'FNE':
      return 'Bonjour, je souhaite demander une facture normalisée (FNE) :'
    default:
      return 'Bonjour, je souhaite passer cette commande :'
  }
}

/** Formule de politesse finale adaptée au type de demande. */
function closingForType(requestType: RequestType): string {
  switch (requestType) {
    case 'DEVIS':
      return 'Merci de me faire un retour avec les prix et les délais.'
    case 'BON_COMMANDE':
      return 'Merci de me confirmer la réception et les modalités.'
    case 'FNE':
      return 'Merci de me confirmer les informations nécessaires à la facture.'
    default:
      return 'Merci de me confirmer la disponibilité et les modalités.'
  }
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

export interface LogoInfo {
  id: string
  fileName?: string
}

/**
 * Construit une URL wa.me avec le message COURT pré-rempli.
 * Les détails complets (prix, références, logo…) sont transmis de notre côté
 * via Telegram / Google Sheets — ici on reste lisible pour le commercial.
 */
export function buildWhatsAppOrderLink(
  customer: OrderCustomerInfo,
  items: CartItem[],
  _total: number,
  options: {
    requestType: RequestType
    company?: CompanyInfo
    personalization?: PersonalizationInfo
    logo?: LogoInfo
    orderRef?: string
  },
): string {
  const lines: string[] = []
  const requestType = options.requestType

  lines.push(introForType(requestType))
  lines.push('')

  // Produits — un seul produit → format « Produit / Quantité » comme dans le
  // modèle ; plusieurs produits → liste compacte.
  if (items.length === 1) {
    const item = items[0]
    lines.push(`📦 Produit : ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`)
    lines.push(`Quantité : ${item.quantity}`)
  } else {
    lines.push('📦 Produits :')
    for (const item of items) {
      lines.push(`- ${item.productName}${item.variantName ? ` (${item.variantName})` : ''} × ${item.quantity}`)
    }
  }

  // Personnalisation — seulement si le client l'a demandée
  const persoSummary = options.personalization?.summary?.trim()
  if (options.personalization?.hasPersonalization) {
    lines.push(`Personnalisation : ${persoSummary || 'Oui (détails à convenir)'}`)
  }
  lines.push('')

  // Livraison
  const lieuParts = [customer.commune, customer.city].filter((p) => p?.trim())
  lines.push(`📍 Livraison : ${lieuParts.join(', ') || customer.city}`)
  if (customer.address?.trim()) {
    lines.push(`Adresse : ${customer.address.trim()}`)
  }
  lines.push('')

  // Entreprise (si renseignée) — les entreprises demandent souvent un devis
  if (customer.clientType === 'ENTREPRISE' && options.company?.companyName?.trim()) {
    lines.push(`🏢 Entreprise : ${options.company.companyName.trim()}`)
    lines.push('')
  }

  // Client
  const fullName = [customer.clientName, customer.clientFirstName].filter((p) => p?.trim()).join(' ')
  lines.push(`👤 Nom : ${fullName}`)
  lines.push(`📞 WhatsApp : ${customer.clientPhone}`)
  lines.push('')

  lines.push(closingForType(requestType))

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
  _productSku?: string,
  variantName?: string,
  quantity: number = 1,
  _unitPrice: number = 0,
  hasPersonalization: boolean = false,
  _productImageUrl?: string,
): string {
  const lines: string[] = []
  lines.push('Bonjour, je souhaite passer cette commande :')
  lines.push('')
  lines.push(`📦 Produit : ${productName}${variantName ? ` (${variantName})` : ''}`)
  lines.push(`Quantité : ${quantity}`)
  if (hasPersonalization) {
    lines.push('Personnalisation : Oui (détails à convenir)')
  }
  lines.push('')
  lines.push('Merci de me confirmer la disponibilité et les modalités.')

  const message = lines.join('\n')
  const phone = normalizePhone(ADMIN_WHATSAPP_NUMBER)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
