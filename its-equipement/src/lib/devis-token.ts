import { createHmac, timingSafeEqual } from 'crypto'
import { AUTH_SECRET } from './auth-secret'

/**
 * Jeton d'accès aux devis publics (PDF et confirmation en ligne).
 *
 * L'identifiant seul ne suffit plus : le lien contient aussi une signature
 * calculée avec le secret du serveur. Sans elle, impossible de lire le devis
 * d'un autre client (nom, téléphone, adresse).
 *
 * Les devis créés avant la mise en place de ce jeton restent accessibles
 * par leur identifiant, pour ne pas casser les liens déjà ouverts.
 */
export const DEVIS_TOKEN_SINCE = new Date('2026-10-28T00:00:00Z')

export function signDevisId(id: string): string {
  return createHmac('sha256', AUTH_SECRET).update(`devis:${id}`).digest('base64url').slice(0, 32)
}

export function canAccessDevis(devis: { id: string; createdAt: Date }, token: string | null): boolean {
  if (token) {
    const expected = Buffer.from(signDevisId(devis.id))
    const given = Buffer.from(token)
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true
  }
  return devis.createdAt < DEVIS_TOKEN_SINCE
}
