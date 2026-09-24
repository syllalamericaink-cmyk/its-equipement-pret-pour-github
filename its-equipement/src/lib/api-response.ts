import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

export function success<T>(data: T, meta?: ApiResponse<T>['meta']): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, meta })
}

export function error(message: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function unauthorized(): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
}

export function notFound(message = 'Ressource introuvable'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 404 })
}

export function serverError(message = 'Erreur serveur'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 500 })
}

export function getPaginationParams(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export function buildMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}