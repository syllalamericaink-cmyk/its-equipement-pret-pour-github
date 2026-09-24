import type { ApiResponse } from '@/types'

export async function adminFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json()
}

export async function adminPost<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return adminFetch<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminPut<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return adminFetch<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function adminPatch<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return adminFetch<T>(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDelete<T = void>(url: string): Promise<ApiResponse<T>> {
  return adminFetch<T>(url, { method: 'DELETE' })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' XOF'
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}