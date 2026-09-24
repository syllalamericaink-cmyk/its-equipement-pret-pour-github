import { db } from '../db'
import { sendWhatsAppMessage } from './whatsapp.service'
import type { Prisma } from '@prisma/client'

function sanitizeForText(input: string): string {
  return input
    .replace(/[\r\n]/g, ' ')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .slice(0, 500)
}

export async function sendOrderNotification(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      quote: {
        include: {
          quoteRequest: {
            include: { client: true },
          },
        },
      },
      items: {
        include: {
          personalizations: { include: { personalizationOption: true } },
          productVariant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      delivery: true,
    },
  })

  if (!order) throw new Error('Commande introuvable')

  const client = order.quote.quoteRequest.client
  const baseUrl = process.env.NEXTAUTH_URL ?? ''

  const products: string[] = []
  const quantities: string[] = []
  const tailles: string[] = []
  const couleurs: string[] = []
  const impressions: string[] = []
  const textesImpression: string[] = []
  const emplacements: string[] = []
  const fileLinks: string[] = []

  for (const item of order.items) {
    products.push(sanitizeForText(item.productName))
    quantities.push(String(item.quantity))

    if (item.productVariant) {
      tailles.push(sanitizeForText(item.productVariant.name))
      couleurs.push(sanitizeForText(item.productVariant.name))
    } else {
      tailles.push('\u2014')
      couleurs.push('\u2014')
    }

    if (item.hasPersonalization) {
      impressions.push('Oui')
    } else {
      impressions.push('Non')
    }

    let textPerso = '\u2014'
    let locationPerso = '\u2014'
    for (const p of item.personalizations) {
      const opt = p.personalizationOption
      const val = typeof p.value === 'string' ? p.value : JSON.stringify(p.value)
      if (opt.type === 'TEXT' || opt.label.toLowerCase().includes('texte')) {
        textPerso = sanitizeForText(val)
      }
      if (opt.type === 'LOCATION' || opt.label.toLowerCase().includes('emplac')) {
        locationPerso = sanitizeForText(val)
      }
      if (typeof p.value === 'object' && p.value !== null) {
        const valObj = p.value as Record<string, unknown>
        if (valObj.url && typeof valObj.url === 'string' && valObj.url.startsWith('/uploads/')) {
          fileLinks.push(valObj.url)
        }
      }
    }
    textesImpression.push(textPerso)
    emplacements.push(locationPerso)
  }

  const totalTTC = Number(order.totalAmountTTC)
  const depositAmt = Number(order.depositAmount)
  const balanceAmt = Number(order.balanceAmount)

  const address = [client.address, client.zipCode, client.city, client.country]
    .filter(Boolean)
    .map(s => sanitizeForText(s as string))
    .join(', ')

  let message = `NOUVELLE COMMANDE\n`
  message += `Ref: ${sanitizeForText(order.orderNumber)}\n`
  message += `Client: ${sanitizeForText(client.companyName)}\n`
  message += `Contact: ${sanitizeForText(client.contactName)}\n`
  if (client.phone) message += `Tel: ${sanitizeForText(client.phone)}\n`
  message += `Produit(s): ${products.join(', ')}\n`
  message += `Quantite(s): ${quantities.join(', ')}\n`
  message += `Tailles: ${tailles.join(', ')}\n`
  message += `Couleurs: ${couleurs.join(', ')}\n`
  message += `Impression: ${impressions.join(', ')}\n`
  message += `Texte si impression: ${textesImpression.join(', ')}\n`
  message += `Emplacement: ${emplacements.join(', ')}\n`
  message += `Total: ${totalTTC} EUR\n`
  message += `Acompte: ${depositAmt > 0 ? depositAmt + ' EUR' : '0'}\n`
  message += `Solde: ${balanceAmt > 0 ? balanceAmt + ' EUR' : totalTTC + ' EUR'}\n`
  if (address) message += `Adresse: ${address}\n`
  message += `Lien commande: ${baseUrl}/admin/orders/${orderId}\n`

  if (order.quote.pdfPath) {
    message += `Lien devis: ${baseUrl}/admin/quotes/${order.quote.id}\n`
  }

  if (fileLinks.length > 0) {
    message += `Lien fichiers: ${fileLinks.join(', ')}\n`
  }

  const recipient = process.env.WHATSAPP_RECIPIENT_NUMBER
  if (!recipient) throw new Error('Numero destinataire WhatsApp non configure')

  const result = await sendWhatsAppMessage(recipient, message)

  const notificationData: Prisma.NotificationCreateInput = {
    type: 'ORDER_CREATED',
    channel: 'WHATSAPP',
    to: recipient,
    message,
    status: result.success ? 'SENT' : 'FAILED',
    response: result.success
      ? { messageId: result.messageId }
      : { error: result.error },
    sentAt: result.success ? new Date() : undefined,
    order: { connect: { id: orderId } },
  }

  await db.notification.create({ data: notificationData })
}

export async function retryFailedNotification(notificationId: string): Promise<void> {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification) throw new Error('Notification introuvable')
  if (notification.status !== 'FAILED') throw new Error('Seules les notifications echouees peuvent etre reessayees')

  const result = await sendWhatsAppMessage(notification.to, notification.message)

  await db.notification.update({
    where: { id: notificationId },
    data: {
      status: result.success ? 'SENT' : 'FAILED',
      response: result.success
        ? { messageId: result.messageId, retried: true }
        : { error: result.error, retried: true },
      sentAt: result.success ? new Date() : undefined,
    },
  })

  if (!result.success) {
    throw new Error(result.error ?? 'Echec de l\'envoi WhatsApp')
  }
}

export async function getNotifications(params: {
  page: number
  limit: number
  skip: number
  status?: string
  channel?: string
}) {
  const where: Prisma.NotificationWhereInput = {}
  if (params.status) where.status = params.status
  if (params.channel) where.channel = params.channel

  const [total, items] = await Promise.all([
    db.notification.count({ where }),
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        order: { select: { id: true, orderNumber: true } },
      },
    }),
  ])

  return { items, total }
}