import { db } from '@/lib/db'
import { success, error, serverError } from '@/lib/api-response'
import { checkApiRateLimit } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request)) {
      return error('Trop de requêtes. Réessayez dans une minute.', 429)
    }

    const body = await request.json()

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!name) return error('Votre nom est requis')
    if (name.length > 200) return error('Le nom est trop long (200 caractères maximum)')
    if (email && !emailRegex.test(email)) return error('Adresse email invalide')
    if (phone && phone.length > 30) return error('Numéro de téléphone trop long')
    if (!subject) return error('Le sujet est requis')
    if (subject.length > 200) return error('Le sujet est trop long (200 caractères maximum)')
    if (!message) return error('Votre message est requis')
    if (message.length > 5000) return error('Le message est trop long (5000 caractères maximum)')

    const contactMessage = await db.contactMessage.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        subject,
        message,
      },
      select: { id: true },
    })

    return success({ id: contactMessage.id })
  } catch (err) {
    console.error('[api /public/contact] Erreur:', err)
    return serverError()
  }
}
