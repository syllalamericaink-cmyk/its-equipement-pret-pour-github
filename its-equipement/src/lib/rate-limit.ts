import { db } from './db'

/**
 * Limiteur de requêtes partagé, stocké dans Postgres (table "RateLimit").
 *
 * Sur Vercel, chaque requête peut tomber sur une instance différente : un
 * compteur en mémoire ne protège donc rien. Ici le compteur est atomique
 * (INSERT ... ON CONFLICT) et commun à toutes les instances.
 *
 * Retourne true si la requête est autorisée. En cas de panne de la base, on
 * laisse passer (le reste de l'appli échouera de toute façon).
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, now() + (${windowSeconds}::int * interval '1 second'))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < now()
          THEN now() + (${windowSeconds}::int * interval '1 second')
          ELSE "RateLimit"."resetAt" END
      RETURNING "count"`

    // Nettoyage occasionnel des compteurs expirés
    if (Math.random() < 0.02) {
      db.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < now()`.catch(() => {})
    }

    return Number(rows[0]?.count ?? 0) <= limit
  } catch {
    return true
  }
}

/** Adresse IP du client (Vercel renseigne x-forwarded-for / x-real-ip). */
export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (name: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(name) ?? undefined
    const v = headers[name]
    return Array.isArray(v) ? v[0] : v
  }
  return get('x-forwarded-for')?.split(',')[0]?.trim() || get('x-real-ip') || 'unknown'
}
