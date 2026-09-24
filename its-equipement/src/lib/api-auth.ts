import { getToken } from 'next-auth/jwt'
import { unauthorized } from './api-response'
import { db } from './db'
import type { NextRequest } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 60
const AUTH_RATE_LIMIT_MAX = 5

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

export function checkAuthRateLimit(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  return checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT_MAX)
}

export async function requireAdmin(request: NextRequest) {
  try {
    if (!checkApiRateLimit(request)) {
      return { error: new Response(JSON.stringify({ success: false, error: 'Trop de requetes' }), { status: 429 }), session: null }
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token?.id) {
      return { error: unauthorized(), session: null }
    }

    const admin = await db.admin.findUnique({ where: { id: token.id as string }, select: { id: true, isActive: true, role: true } })
    if (!admin || !admin.isActive) {
      return { error: unauthorized(), session: null }
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

export function parseBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>
}
