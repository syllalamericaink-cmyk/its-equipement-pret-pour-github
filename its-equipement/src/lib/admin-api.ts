import type { ApiResponse } from '@/types'

/**
 * fetch robuste pour l'admin : ne lève JAMAIS d'exception.
 * En cas d'erreur réseau ou de réponse non-JSON, renvoie une ApiResponse d'erreur
 * au lieu de faire planter le composant appelant (fin des pages bloquées en skeleton).
 */
export async function adminFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const text = await res.text()
    try {
      return JSON.parse(text) as ApiResponse<T>
    } catch {
      return { success: false, error: `Erreur serveur (${res.status})` } as ApiResponse<T>
    }
  } catch {
    return { success: false, error: 'Erreur de connexion. Vérifiez votre connexion internet.' } as ApiResponse<T>
  }
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

// Formatage centralisé (voir src/lib/format.ts)
export { formatCurrency, formatDate, formatDateTime } from '@/lib/format'