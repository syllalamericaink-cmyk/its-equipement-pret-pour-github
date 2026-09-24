import { db } from '../db'
import { createProvider } from './payment-provider.service'
import type { Prisma } from '@prisma/client'

export async function createPayment(data: {
  orderId: string
  type: string
  amount?: number
  method?: string
  transactionRef?: string
  dueDate?: string
  notes?: string
  adminId: string
}) {
  const order = await db.order.findUnique({ where: { id: data.orderId } })
  if (!order) throw new Error('Commande introuvable')

  let amount = data.amount
  if (!amount || amount <= 0) {
    if (data.type === 'DEPOSIT') {
      amount = Number(order.depositAmount)
    } else if (data.type === 'BALANCE') {
      amount = Number(order.balanceAmount)
    } else {
      amount = Number(order.totalAmountTTC)
    }
  }

  amount = Math.round(amount * 100) / 100

  const existingPayments = await db.payment.findMany({
    where: { orderId: data.orderId },
  })
  const totalPaid = existingPayments
    .filter(p => p.status === 'PAYE')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  if (totalPaid + amount > Number(order.totalAmountTTC) + 0.01) {
    throw new Error('Le montant total des paiements depasse le montant de la commande')
  }

  const payment = await db.payment.create({
    data: {
      orderId: data.orderId,
      type: data.type,
      amount,
      currency: 'XOF',
      method: data.method,
      transactionRef: data.transactionRef,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes,
      status: 'EN_ATTENTE',
      statusHistory: {
        create: { toStatus: 'EN_ATTENTE', changedBy: data.adminId },
      },
    },
    include: { order: true },
  })

  return payment
}

export async function initiatePayment(orderId: string, type: string, provider?: string, adminId?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('Commande introuvable')

  if (type === 'DEPOSIT' && order.paymentMethod !== 'DEPOSIT_PLUS_BALANCE') {
    throw new Error('Le type ACOMPTE n\'est autorise que pour les commandes avec acompte + solde')
  }

  if (type === 'FULL' && order.paymentMethod !== 'ON_DELIVERY') {
    throw new Error('Le paiement complet n\'est pas compatible avec cette commande')
  }

  let amount = 0
  if (type === 'DEPOSIT') {
    amount = Number(order.depositAmount)
  } else if (type === 'BALANCE') {
    amount = Number(order.balanceAmount)
  } else {
    amount = Number(order.totalAmountTTC)
  }

  amount = Math.round(amount * 100) / 100

  const existingPayments = await db.payment.findMany({
    where: { orderId },
  })
  const totalPaid = existingPayments
    .filter(p => p.status === 'PAYE')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  if (totalPaid + amount > Number(order.totalAmountTTC) + 0.01) {
    throw new Error('Le montant total des paiements depasse le montant de la commande')
  }

  const reference = `PAY-${order.orderNumber}-${type}-${Date.now()}`

  let providerRef: string | undefined
  let paymentUrl: string | undefined

  if (provider) {
    const providerInstance = createProvider(provider)
    if (providerInstance) {
      const result = await providerInstance.initiatePayment({
        amount,
        currency: 'XOF',
        reference,
        orderId,
        type,
      })
      providerRef = result.providerRef
      paymentUrl = result.paymentUrl
    }
  }

  const payment = await db.payment.create({
    data: {
      orderId,
      type,
      amount,
      currency: 'XOF',
      provider: provider ?? null,
      providerRef: providerRef ?? null,
      status: 'EN_ATTENTE',
      statusHistory: {
        create: {
          toStatus: 'EN_ATTENTE',
          changedBy: adminId ?? null,
        },
      },
    },
    include: { order: true },
  })

  return { ...payment, paymentUrl }
}

export async function confirmPayment(paymentId: string, data: {
  transactionRef?: string
  method?: string
  providerRef?: string
  adminId: string
}) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  })
  if (!payment) throw new Error('Paiement introuvable')

  await db.paymentStatusHistory.create({
    data: {
      paymentId,
      fromStatus: payment.status,
      toStatus: 'PAYE',
      changedBy: data.adminId,
    },
  })

  const updatedPayment = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'PAYE',
      paidAt: new Date(),
      transactionRef: data.transactionRef ?? payment.transactionRef,
      method: data.method ?? payment.method,
      providerRef: data.providerRef ?? payment.providerRef,
    },
    include: {
      order: {
        include: {
          quote: { include: { quoteRequest: { include: { client: true } } } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (payment.type === 'DEPOSIT' && payment.order.hasPersonalization) {
    if (payment.order.status === 'CONFIRMED') {
      await db.orderStatusHistory.create({
        data: {
          orderId: payment.order.id,
          fromStatus: payment.order.status,
          toStatus: 'ACOMPTE_RECU',
          changedBy: data.adminId,
        },
      })
      await db.order.update({
        where: { id: payment.order.id },
        data: { status: 'ACOMPTE_RECU' },
      })
      updatedPayment.order.status = 'ACOMPTE_RECU'
    }
  }

  return updatedPayment
}

export async function failPayment(paymentId: string, data: {
  reason: string
  adminId: string
}) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new Error('Paiement introuvable')

  await db.paymentStatusHistory.create({
    data: {
      paymentId,
      fromStatus: payment.status,
      toStatus: 'ECHEC',
      changedBy: data.adminId,
    },
  })

  return db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'ECHEC',
      notes: data.reason ? `${payment.notes ? payment.notes + ' | ' : ''}${data.reason}` : payment.notes,
    },
    include: {
      order: {
        include: {
          quote: { include: { quoteRequest: { include: { client: true } } } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function cancelPayment(paymentId: string, adminId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new Error('Paiement introuvable')

  await db.paymentStatusHistory.create({
    data: {
      paymentId,
      fromStatus: payment.status,
      toStatus: 'ANNULE',
      changedBy: adminId,
    },
  })

  return db.payment.update({
    where: { id: paymentId },
    data: { status: 'ANNULE' },
    include: {
      order: {
        include: {
          quote: { include: { quoteRequest: { include: { client: true } } } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function refundPayment(paymentId: string, adminId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new Error('Paiement introuvable')

  await db.paymentStatusHistory.create({
    data: {
      paymentId,
      fromStatus: payment.status,
      toStatus: 'REMBOURSE',
      changedBy: adminId,
    },
  })

  return db.payment.update({
    where: { id: paymentId },
    data: { status: 'REMBOURSE', paidAt: null },
    include: {
      order: {
        include: {
          quote: { include: { quoteRequest: { include: { client: true } } } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function getPayments(params: {
  page: number
  limit: number
  skip: number
  status?: string
  orderId?: string
}) {
  const where: Prisma.PaymentWhereInput = {}
  if (params.status) where.status = params.status
  if (params.orderId) where.orderId = params.orderId

  const [total, items] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.skip,
      include: {
        order: {
          include: {
            quote: { include: { quoteRequest: { include: { client: true } } } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    }),
  ])

  return { items, total }
}

export async function getPaymentById(id: string) {
  return db.payment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          quote: { include: { quoteRequest: { include: { client: true } } } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function updatePayment(id: string, data: {
  status?: string
  amount?: number
  method?: string
  transactionRef?: string
  dueDate?: string
  paidAt?: string
  receiptUrl?: string
  notes?: string
  provider?: string
  providerRef?: string
  adminId: string
}) {
  const payment = await db.payment.findUnique({ where: { id } })
  if (!payment) throw new Error('Paiement introuvable')

  const updateData: Prisma.PaymentUpdateInput = {}
  if (data.amount !== undefined) updateData.amount = data.amount
  if (data.method !== undefined) updateData.method = data.method
  if (data.transactionRef !== undefined) updateData.transactionRef = data.transactionRef
  if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate)
  if (data.paidAt !== undefined) updateData.paidAt = new Date(data.paidAt)
  if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.provider !== undefined) updateData.provider = data.provider
  if (data.providerRef !== undefined) updateData.providerRef = data.providerRef

  if (data.status && data.status !== payment.status) {
    await db.paymentStatusHistory.create({
      data: {
        paymentId: id,
        fromStatus: payment.status,
        toStatus: data.status,
        changedBy: data.adminId,
      },
    })
    updateData.status = data.status

    if (data.status === 'PAYE' && !data.paidAt) {
      updateData.paidAt = new Date()
    }

    if (data.status === 'REMBOURSE') {
      updateData.paidAt = null
    }
  }

  return db.payment.update({
    where: { id },
    data: updateData,
    include: {
      order: {
        include: {
          quote: { include: { quoteRequest: { include: { client: true } } } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}
