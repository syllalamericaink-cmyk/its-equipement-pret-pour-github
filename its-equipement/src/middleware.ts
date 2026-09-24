import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>()
const MW_RATE_LIMIT = 200          // global : 200 req/min/IP
const MW_WINDOW = 60000
const AUTH_RATE_LIMIT = 5           // login : 5 tentatives/min/IP
const AUTH_RATE_WINDOW = 60000

function middlewareRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = RATE_LIMIT_MAP.get(ip)
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + MW_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= MW_RATE_LIMIT
}

function authRateLimit(ip: string): boolean {
  const now = Date.now()
  const key = `auth:${ip}`
  const entry = RATE_LIMIT_MAP.get(key)
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(key, { count: 1, resetAt: now + AUTH_RATE_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= AUTH_RATE_LIMIT
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (pathname.startsWith('/private/')) {
    return new NextResponse(null, { status: 404 })
  }

  if (!middlewareRateLimit(ip)) {
    return NextResponse.json({ success: false, error: 'Trop de requetes' }, { status: 429 })
  }

  // Rate-limit strict sur les tentatives de login (credentials callback)
  if (pathname === '/api/auth/callback/credentials' && request.method === 'POST') {
    if (!authRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Trop de tentatives. Réessayez dans une minute.' },
        { status: 429 },
      )
    }
  }

  if (pathname.startsWith('/api/admin')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !token.id) {
      return NextResponse.json({ success: false, error: 'Non autorise' }, { status: 401 })
    }
  }

  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/') && pathname !== '/admin/login') {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !token.id) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname === '/auth/login') {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (token && token.id) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/auth/:path*', '/api/admin/:path*', '/api/auth/callback/credentials', '/private/:path*'],
}