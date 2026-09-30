import { db } from '../db'
import { BusinessError } from '../errors'
import { formatCurrency } from '../format'
import { sendWhatsAppMessage } from './whatsapp.service'
import { getWhatsAppRecipient } from './settings.service'
import type { Prisma } from '@prisma/client'

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await db.publicOrder.count({
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    })
    const num = (count + 1 + attempt).toString().padStart(5, '0')
    const candidate = `ITS-${year}-${num}`
    const exists = await db.publicOrder.findUnique({ where: { orderNumber: candidate } })
    if (!exists) return candidate
  }
  return `ITS-${year}-${Date.now().toString().slice(-5)}`
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  NOUVELLE_COMMANDE: ['CLIENT_CONTACTE', 'ANNULEE'],
  CLIENT_CONTACTE: ['DEVIS_EN_PREPARATION', 'ANNULEE'],
  DEVIS_EN_PREPARATION: ['DEVIS_ENVOYE', 'ANNULEE'],
  DEVIS_ENVOYE: ['DEVIS_ACCEPTE', 'DEVIS_REFUSE'],
  DEVIS_ACCEPTE: ['COMMANDE_CONFIRMEE', 'ANNULEE'],
  DEVIS_REFUSE: ['ANNULEE'],
  COMMANDE_CONFIRMEE: ['EN_PREPARATION', 'ANNULEE'],
  EN_PREPARATION: ['LIVREE'],
  LIVREE: [],
  ANNULEE: [],
}

export async function createPublicOrder(data: {
  clientName: string
  clientFirstName?: string
  clientPhone: string
  clientEmail?: string
  clientType: string
  companyName?: string
  companyInfo?: string
  requestType?: string
  personalizationSummary?: string
  personalizationLogoUploadId?: string
  city: string
  commune?: string
  address?: string
  deliveryComment?: string
  deliveryFee?: number
  devisMode?: boolean
  items: {
    productId: string
    productName?: string
    productSlug?: string
    productSku?: string
    variantId?: string
    variantName?: string
    quantity: number
    unitPrice?: number
    lineTotal?: number
    hasPersonalization: boolean
    personalizationData?: Record<string, unknown>
  }[]
}) {
  if (!data.items.length) throw new BusinessError('La commande doit contenir au moins un produit')

  // Server is the source of truth: never trust prices, names, variants or
  // totals sent by the browser.
  const productIds = [...new Set(data.items.map(item => item.productId))]
  const products = await db.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: {
      variants: { where: { isActive: true } },
      quantityDiscounts: { orderBy: { minQuantity: 'asc' } },
    },
  })
  const productMap = new Map(products.map(product => [product.id, product]))

  if (products.length !== productIds.length) {
    throw new BusinessError('Un ou plusieurs produits sont introuvables ou inactifs')
  }

  const authoritativeItems = data.items.map(item => {
    const product = productMap.get(item.productId)!
    const quantity = Number.isInteger(item.quantity) ? item.quantity : 0
    if (quantity < product.minQuantity || quantity <= 0) {
      throw new BusinessError(`Quantité invalide pour ${product.name}`)
    }

    let variant: (typeof product.variants)[number] | undefined = undefined
    if (item.variantId) {
      variant = product.variants.find(v => v.id === item.variantId)
      if (!variant) throw new BusinessError(`Variante invalide pour ${product.name}`)
    }

    const unitPrice = Number(product.basePrice) + Number(variant?.priceModifier ?? 0)

    // Réduction par palier de quantité (définie dans l'admin) : on retient
    // le meilleur palier atteint pour cette quantité.
    const applicableDiscount = product.quantityDiscounts
      .filter((d) => quantity >= d.minQuantity)
      .reduce((best, d) => Math.max(best, Number(d.discountPercent)), 0)

    const lineTotal = Math.round(unitPrice * quantity * (1 - applicableDiscount / 100) * 100) / 100

    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productSku: product.sku,
      variantId: variant?.id,
      variantName: variant?.name,
      quantity,
      unitPrice,
      lineTotal,
      discountPercent: applicableDiscount,
      hasPersonalization: Boolean(item.hasPersonalization),
      personalizationData: item.personalizationData,
    }
  })

  // Logo de personnalisation : validé côté serveur (doit exister dans Upload,
  // et être une image). Injecté dans les articles personnalisés pour que
  // l'admin le voie directement sur la fiche commande.
  let personalizationLogo: { id: string; originalName: string } | null = null
  if (data.personalizationLogoUploadId) {
    const upload = await db.upload.findUnique({
      where: { id: data.personalizationLogoUploadId },
      select: { id: true, mimeType: true, originalName: true },
    })
    if (!upload || !upload.mimeType.startsWith('image/')) {
      throw new BusinessError('Logo de personnalisation invalide')
    }
    personalizationLogo = { id: upload.id, originalName: upload.originalName }
  }

  if (personalizationLogo) {
    for (const item of authoritativeItems) {
      if (!item.hasPersonalization) continue
      item.personalizationData = {
        ...(item.personalizationData ?? {}),
        logoFileId: personalizationLogo.id,
        logoFileName: personalizationLogo.originalName,
      }
    }
  }

  const subtotal = authoritativeItems.reduce((sum, item) => sum + item.lineTotal, 0)
  // Delivery pricing is currently server-controlled. The browser may not
  // increase it by submitting an arbitrary deliveryFee.
  const deliveryFee = 0
  const total = Math.round((subtotal + deliveryFee) * 100) / 100
  const requestType = data.requestType ?? 'COMMANDE_SIMPLE'

  const commonData = {
    clientName: data.clientName,
    clientFirstName: data.clientFirstName,
    clientPhone: data.clientPhone,
    clientEmail: data.clientEmail,
    clientType: data.clientType,
    companyName: data.companyName,
    companyInfo: data.companyInfo,
    requestType,
    personalizationSummary: data.personalizationSummary,
    personalizationLogoUploadId: personalizationLogo?.id,
    city: data.city,
    commune: data.commune,
    address: data.address,
    deliveryComment: data.deliveryComment,
    subtotal,
    deliveryFee,
    total,
    notificationStatus: 'PENDING' as const,
    items: {
      create: authoritativeItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        productSku: item.productSku,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        discountPercent: item.discountPercent,
        hasPersonalization: item.hasPersonalization,
        personalizationData: item.personalizationData ?? undefined,
      })) as Prisma.PublicOrderItemCreateWithoutPublicOrderInput[],
    },
  }

  if (data.devisMode) {
    const devisNumber = await generateDevisNumber()
    return db.publicOrder.create({
      data: {
        ...commonData,
        devisNumber,
        status: 'DEVIS_ENVOYE',
        statusHistory: { create: { toStatus: 'DEVIS_ENVOYE', changedBy: 'client' } },
      },
      include: { items: true, statusHistory: true },
    })
  }

  const orderNumber = await generateOrderNumber()
  return db.publicOrder.create({
    data: {
      ...commonData,
      orderNumber,
      status: 'NOUVELLE_COMMANDE',
      statusHistory: { create: { toStatus: 'NOUVELLE_COMMANDE', changedBy: 'client' } },
    },
    include: { items: true, statusHistory: true },
  })
}
async function generateDevisNumber(): Promise<string> {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await db.publicOrder.count({
      where: {
        devisNumber: { startsWith: `DEV-ITS-${year}-` },
      },
    })
    const num = (count + 1 + attempt).toString().padStart(5, '0')
    const candidate = `DEV-ITS-${year}-${num}`
    const exists = await db.publicOrder.findFirst({ where: { devisNumber: candidate } })
    if (!exists) return candidate
  }
  return `DEV-ITS-${year}-${Date.now().toString().slice(-5)}`
}

function buildNotificationMessage(order: PublicOrderWithItems): string {
  const isDevis = !order.orderNumber && order.devisNumber
  const title = isDevis ? 'NOUVEAU DEVIS' : 'NOUVELLE COMMANDE'
  const ref = isDevis ? `Devis : #${order.devisNumber}` : `Commande : #${order.orderNumber}`

  // Libellé lisible du type de demande
  const requestTypeLabel: Record<string, string> = {
    COMMANDE_SIMPLE: 'Commande simple',
    DEVIS: 'Demande de devis',
    BON_COMMANDE: 'Bon de commande',
    FNE: 'Demande de FNE',
  }
  const requestType = requestTypeLabel[order.requestType] ?? order.requestType

  let message = `\u{1F6D2} ${title} \u2014 ITS EQUIPEMENT\n\n`
  message += `${ref}\n`
  message += `Type de demande : ${requestType}\n\n`
  message += `\u{1F464} Client\n`
  message += `Nom : ${order.clientName}${order.clientFirstName ? ' ' + order.clientFirstName : ''}\n`
  message += `Téléphone WhatsApp : ${order.clientPhone}\n`
  message += `Type : ${order.clientType}\n`
  if (order.clientEmail) message += `Email : ${order.clientEmail}\n`
  message += '\n'
  // Section entreprise (si devis, bon de commande ou FNE)
  if (order.companyName || order.companyInfo) {
    message += `\u{1F3E2} Entreprise\n`
    if (order.companyName) message += `Nom : ${order.companyName}\n`
    if (order.companyInfo) message += `Informations : ${order.companyInfo}\n`
    message += '\n'
  }
  message += `\u{1F4CD} Livraison\n`
  message += `Ville : ${order.city}\n`
  if (order.commune) message += `Commune : ${order.commune}\n`
  if (order.address) message += `Adresse : ${order.address}\n`
  if (order.deliveryComment) message += `Instructions : ${order.deliveryComment}\n`
  message += '\n'
  // Récap personnalisations global
  if (order.personalizationSummary || order.personalizationLogoUploadId) {
    message += `\u{1F3A8} Personnalisation\n`
    if (order.personalizationSummary) message += `${order.personalizationSummary}\n`
    if (order.personalizationLogoUploadId) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? ''
      const logoUrl = `${siteUrl}/api/public/uploads/${order.personalizationLogoUploadId}`
      message += `Logo client (cliquer pour ouvrir) : ${logoUrl}\n`
    }
    message += '\n'
  }
  message += `\u{1F4E6} Produits\n`

  for (const item of order.items) {
    message += `* ${item.productName}\n`
    if (item.productSku) message += `  Ref : ${item.productSku}\n`
    if (item.variantName) message += `  Variante : ${item.variantName}\n`
    message += `  Quantité : ${item.quantity}\n`
    message += `  Prix : ${formatCurrency(Number(item.unitPrice))}\n`
    if (item.hasPersonalization && item.personalizationData) {
      const pd = item.personalizationData as Record<string, unknown>
      const details: string[] = []
      if (pd.logo) details.push('Logo')
      if (pd.texte) details.push(`Texte: ${pd.texte}`)
      if (details.length) message += `  Perso : ${details.join(', ')}\n`
    }
    message += '\n'
  }

  message += `\u{1F4B0} Montants\n`
  message += `Sous-total : ${formatCurrency(Number(order.subtotal))}\n`
  message += `Livraison : ${formatCurrency(Number(order.deliveryFee))}\n`
  message += `Total : ${formatCurrency(Number(order.total))}\n\n`

  message += `\u{1F514} ACTION\n**Un commercial doit recontacter le client sur ${order.clientPhone} pour finaliser.**`

  return message
}

type PublicOrderWithItems = {
  orderNumber: string | null
  devisNumber: string | null
  clientName: string
  clientFirstName: string | null
  clientPhone: string
  clientEmail: string | null
  clientType: string
  companyName: string | null
  companyInfo: string | null
  requestType: string
  personalizationSummary: string | null
  personalizationLogoUploadId: string | null
  city: string
  commune: string | null
  address: string | null
  deliveryComment: string | null
  subtotal: Prisma.Decimal
  deliveryFee: Prisma.Decimal
  total: Prisma.Decimal
  items: {
    productName: string
    productSku: string | null
    variantName: string | null
    quantity: number
    unitPrice: Prisma.Decimal
    lineTotal: Prisma.Decimal
    hasPersonalization: boolean
    personalizationData: Prisma.JsonValue | null
  }[]
}

export async function sendOrderNotification(orderId: string) {
  const order = await db.publicOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order) throw new Error('Commande introuvable')

  const recipient = await getWhatsAppRecipient()
  if (!recipient) {
    await db.publicOrder.update({
      where: { id: orderId },
      data: { notificationStatus: 'FAILED', notificationError: 'Numero destinataire non configure' },
    })
    return
  }

  const message = buildNotificationMessage(order as unknown as PublicOrderWithItems)
  const result = await sendWhatsAppMessage(recipient, message)

  await db.publicOrder.update({
    where: { id: orderId },
    data: {
      notificationStatus: result.success ? 'SENT' : 'FAILED',
      notificationError: result.success ? null : (result.error ?? 'Erreur inconnue'),
    },
  })

  await db.notification.create({
    data: {
      type: 'ORDER_CREATED',
      channel: 'WHATSAPP',
      to: recipient,
      message,
      status: result.success ? 'SENT' : 'FAILED',
      response: result.success ? { messageId: result.messageId } : { error: result.error },
      sentAt: result.success ? new Date() : undefined,
      publicOrderId: orderId,
    },
  })

  if (!result.success) throw new Error(result.error ?? 'Erreur notification')
}

export async function getPublicOrders(params: {
  page: number
  limit: number
  skip: number
  status?: string
  search?: string
}) {
  const where: Prisma.PublicOrderWhereInput = {}
  if (params.status) where.status = params.status
  if (params.search) {
    where.OR = [
      { orderNumber: { contains: params.search } },
      { devisNumber: { contains: params.search } },
      { clientName: { contains: params.search } },
      { clientEmail: { contains: params.search } },
      { clientPhone: { contains: params.search } },
    ]
  }

  const [total, items] = await Promise.all([
    db.publicOrder.count({ where }),
    db.publicOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: { items: true, quote: { select: { id: true, quoteNumber: true, status: true } } },
    }),
  ])

  return { items, total }
}

export async function getPublicOrderById(id: string) {
  return db.publicOrder.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      quote: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
}

export async function changePublicOrderStatus(id: string, toStatus: string, adminId: string) {
  const order = await db.publicOrder.findUnique({ where: { id } })
  if (!order) throw new Error('Commande introuvable')

  const allowed = VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(toStatus)) {
    throw new Error(`Transition invalide : ${order.status} -> ${toStatus}`)
  }

  await db.publicOrderStatusHistory.create({
    data: { publicOrderId: id, fromStatus: order.status, toStatus, changedBy: adminId },
  })

  return db.publicOrder.update({
    where: { id },
    data: { status: toStatus },
    include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
  })
}
