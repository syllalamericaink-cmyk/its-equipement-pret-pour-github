export async function publicFetch<T>(url: string): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { success: false, error: `Erreur serveur (${res.status})` }
    }
    return res.json()
  } catch {
    return { success: false, error: 'Erreur de connexion' }
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export function generateSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
