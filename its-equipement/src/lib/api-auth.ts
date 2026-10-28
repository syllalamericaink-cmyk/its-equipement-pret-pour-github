import { getToken } from 'next-auth/jwt'
import { unauthorized } from './api-response'
import { db } from './db'
import { AUTH_SECRET } from './auth-secret'
import type { NextRequest } from 'next/server'
import { passwordFingerprint } from './password-fingerprint'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 60

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= max
}

if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key)
    }
  }, 120000)
}

export function checkApiRateLimit(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  return checkRateLimit(`api:${ip}`, RATE_LIMIT_MAX)
}

export async function requireAdmin(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request)) {
      return { error: new Response(JSON.stringify({ success: false, error: 'Trop de requetes' }), { status: 429 }), session: null }
    }

    const token = await getToken({
      req: request,
      secret: AUTH_SECRET,
    })

    if (!token?.id) {
      return { error: unauthorized(), session: null }
    }

    const admin = await db.admin.findUnique({ where: { id: token.id as string }, select: { id: true, isActive: true, role: true, password: true } })
    if (!admin || !admin.isActive) {
      return { error: unauthorized(), session: null }
    }

    // Session émise avant un changement de mot de passe : refusée.
    // (Les anciennes sessions sans empreinte expirent d'elles-mêmes sous 8 h.)
    if (token.pwv && token.pwv !== passwordFingerprint(admin.password)) {
      return { error: unauthorized(), session: null }
    }

    // Le rôle VIEWER est en lecture seule sur toute l'API d'administration.
    const method = request.method.toUpperCase()
    if (admin.role === 'VIEWER' && method !== 'GET' && method !== 'HEAD') {
      return {
        error: new Response(JSON.stringify({ success: false, error: 'Compte en lecture seule' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
        session: null,
      }
    }

    const session = {
      user: {
        id: admin.id,
        email: token.email as string,
        name: token.name as string,
        role: admin.role,
      },
      expires: new Date((token.exp as number) * 1000).toISOString(),
    }

    return { session, error: null }
  } catch {
    return { error: unauthorized(), session: null }
  }
}

