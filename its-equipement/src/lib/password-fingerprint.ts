import { createHash } from 'crypto'

/**
 * Empreinte courte du hash de mot de passe, stockée dans la session admin.
 * Quand le mot de passe change, l'empreinte change : les sessions ouvertes
 * avant le changement sont alors refusées par requireAdmin().
 */
export function passwordFingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('base64url').slice(0, 16)
}
