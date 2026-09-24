import { db } from '@/lib/db'
import { confirmPayment, failPayment } from '@/lib/services/payment.service'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'
import type { Payment } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response('Webhook not configured', { status: 503 })
  }

  const signature = request.headers.get('x-webhook-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 401 })
  }

  try {
    const rawBody = await request.text()
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (signature.length !== expectedSignature.length) {
      return new Response('Invalid signature', { status: 401 })
    }

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return new Response('Invalid signature', { status: 401 })
    }

    const body = JSON.parse(rawBody)
    return processWebhook(provider, body)
  } catch {
    return new Response('Invalid request', { status: 400 })
  }
}

function processWebhook(provider: string, body: Record<string, unknown>) {
  if (provider === 'cinetpay') {
    return handleCinetPayWebhook(body)
  }
  if (provider === 'fedapay') {
    return handleFedaPayWebhook(body)
  }
  return NextResponse.json({ received: true }, { status: 200 })
}

async function handleCinetPayWebhook(body: Record<string, unknown>) {
  const cpmTransId = typeof body.cpm_trans_id === 'string' ? body.cpm_trans_id : undefined
  const cpmCustom = typeof body.cpm_custom === 'string' ? body.cpm_custom : undefined
  const statusCode = typeof body.cpm_status_code === 'string' ? body.cpm_status_code : undefined

  let payment: (Payment & { order: { hasPersonalization: boolean; status: string; id: string } }) | null = null

  if (cpmTransId) {
    payment = await db.payment.findFirst({
      where: { providerRef: cpmTransId },
      include: { order: { select: { hasPersonalization: true, status: true, id: true } } },
    })
  }

  if (!payment && cpmCustom) {
    payment = await db.payment.findFirst({
      where: { transactionRef: cpmCustom },
      include: { order: { select: { hasPersonalization: true, status: true, id: true } } },
    })
  }

  if (payment && payment.status === 'EN_ATTENTE') {
    if (statusCode === '00') {
      await confirmPayment(payment.id, { transactionRef: cpmTransId, providerRef: cpmTransId, adminId: 'webhook_cinetpay' })
    } else {
      await failPayment(payment.id, { reason: `CinetPay: ${statusCode}`, adminId: 'webhook_cinetpay' })
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

async function handleFedaPayWebhook(body: Record<string, unknown>) {
  const transactionId = typeof body.id === 'string' ? body.id : undefined
  const status = typeof body.status === 'string' ? body.status : undefined

  if (!transactionId || !status) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  let payment: (Payment & { order: { hasPersonalization: boolean; status: string; id: string } }) | null = null

  payment = await db.payment.findFirst({
    where: { providerRef: transactionId },
    include: { order: { select: { hasPersonalization: true, status: true, id: true } } },
  })

  if (payment && payment.status === 'EN_ATTENTE') {
    if (status === 'approved') {
      await confirmPayment(payment.id, { transactionRef: transactionId, providerRef: transactionId, adminId: 'webhook_fedapay' })
    } else {
      await failPayment(payment.id, { reason: `FedaPay: ${status}`, adminId: 'webhook_fedapay' })
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}