/**
 * Notification Telegram — chaque nouvelle commande est envoyée au bot Telegram
 * de l'administrateur, qui peut la recevoir et la traiter en temps réel.
 *
 * Configuration (variables d'environnement Vercel) :
 *   TELEGRAM_BOT_TOKEN  — token du bot (créé via @BotFather)
 *   TELEGRAM_CHAT_ID    — identifiant du chat qui reçoit les messages
 *
 * Comportement :
 *   - Non configuré → aucun envoi, aucun échec (fonctionnalité dormante).
 *   - Échec d'envoi → journalisé dans la table Notification (canal TELEGRAM),
 *     mais JAMAIS propagé : une commande ne doit jamais échouer à cause d'une
 *     notification.
 */

import { db } from '../db'
import { formatCurrency } from '../format'

const TELEGRAM_API = 'https://api.telegram.org'

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

type TelegramResult = { success: boolean; error?: string; messageId?: number }

async function sendTelegramMessage(html: string): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { success: false, error: 'Telegram non configure' }
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const json = (await res.json()) as { ok?: boolean; result?: { message_id?: number }; description?: string }
    if (json.ok) {
      return { success: true, messageId: json.result?.message_id }
    }
    return { success: false, error: json.description ?? `HTTP ${res.status}` }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur reseau' }
  }
}

/** Échappe les caractères spéciaux HTML de Telegram. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  COMMANDE_SIMPLE: 'Commande simple',
  DEVIS: 'Demande de devis',
  BON_COMMANDE: 'Bon de commande',
  FNE: 'Demande de FNE',
}

function buildOrderTelegramMessage(order: {
  orderNumber: string | null
  devisNumber: string | null
  clientName: string
  clientFirstName: string | null
  clientPhone: string
  clientEmail: string | null
  clientType: string
  companyName: string | null
  requestType: string
  personalizationSummary: string | null
  personalizationLogoUploadId: string | null
  city: string
  commune: string | null
  address: string | null
  subtotal: number | string
  total: number | string
  items: {
    productName: string
    variantName: string | null
    quantity: number
    lineTotal: number | string
  }[]
}): string {
  const isDevis = !order.orderNumber && order.devisNumber
  const ref = isDevis ? `Devis : #${order.devisNumber}` : `Commande : #${order.orderNumber}`
  const title = isDevis ? 'NOUVEAU DEVIS FINALISÉ' : 'NOUVELLE COMMANDE'

  const lines: string[] = []
  lines.push(`🛒 <b>${title}</b> — ITS Équipement`)
  lines.push('')
  lines.push(`<b>${esc(ref)}</b>`)
  lines.push(`Type : ${esc(REQUEST_TYPE_LABELS[order.requestType] ?? order.requestType)}`)
  lines.push('')
  lines.push('👤 <b>Client</b>')
  lines.push(`Nom : ${esc(order.clientName)}${order.clientFirstName ? ' ' + esc(order.clientFirstName) : ''}`)
  lines.push(`Téléphone : ${esc(order.clientPhone)}`)
  lines.push(`Type : ${order.clientType === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'}`)
  if (order.clientEmail) lines.push(`Email : ${esc(order.clientEmail)}`)
  if (order.companyName) lines.push(`Entreprise : ${esc(order.companyName)}`)
  lines.push('')
  lines.push('📍 <b>Livraison</b>')
  lines.push(`Ville : ${esc(order.city)}`)
  if (order.commune) lines.push(`Commune : ${esc(order.commune)}`)
  if (order.address) lines.push(`Adresse : ${esc(order.address)}`)
  lines.push('')

  if (order.personalizationSummary || order.personalizationLogoUploadId) {
    lines.push('🎨 <b>Personnalisation</b>')
    if (order.personalizationSummary) lines.push(esc(order.personalizationSummary))
    if (order.personalizationLogoUploadId) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? ''
      lines.push(
        `Logo : <a href="${esc(siteUrl)}/api/public/uploads/${esc(order.personalizationLogoUploadId)}">ouvrir le logo du client</a>`,
      )
    }
    lines.push('')
  }

  lines.push('📦 <b>Produits</b>')
  for (const item of order.items) {
    const variant = item.variantName ? ` (${esc(item.variantName)})` : ''
    lines.push(`• ${esc(item.productName)}${variant} × ${item.quantity} — ${esc(formatCurrency(Number(item.lineTotal)))}`)
  }
  lines.push('')
  lines.push(`💰 Sous-total : ${esc(formatCurrency(Number(order.subtotal)))}`)
  lines.push(`💰 <b>Total : ${esc(formatCurrency(Number(order.total)))}</b>`)
  lines.push('')
  lines.push(`🔔 <b>Action :</b> recontacter le client au ${esc(order.clientPhone)} pour finaliser (paiement manuel — jamais en ligne).`)

  return lines.join('\n')
}

/**
 * Envoie la notification Telegram d'une commande publique.
 * Journalise le résultat dans la table Notification (canal TELEGRAM).
 * Ne lève jamais d'exception — appelée en fire-and-forget.
 */
export async function sendOrderTelegramNotification(orderId: string): Promise<TelegramResult> {
  if (!isTelegramConfigured()) {
    return { success: false, error: 'Telegram non configure' }
  }

  try {
    const order = await db.publicOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) {
      return { success: false, error: 'Commande introuvable' }
    }

    const message = buildOrderTelegramMessage({
      ...order,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
    })
    const result = await sendTelegramMessage(message)

    await db.notification.create({
      data: {
        type: 'ORDER_CREATED',
        channel: 'TELEGRAM',
        to: process.env.TELEGRAM_CHAT_ID ?? '',
        message,
        status: result.success ? 'SENT' : 'FAILED',
        response: result.success ? { messageId: result.messageId } : { error: result.error },
        sentAt: result.success ? new Date() : undefined,
        publicOrderId: orderId,
      },
    })

    return result
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
