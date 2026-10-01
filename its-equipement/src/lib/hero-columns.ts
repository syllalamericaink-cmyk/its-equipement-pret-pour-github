import { db } from '@/lib/db'

/**
 * Colonnes de texte de la bannière d'accueil (HeroImage).
 *
 * Le déploiement Vercel est automatique à chaque push, mais la synchronisation
 * du schéma (`npx prisma db push`) n'est pas exécutée par la plateforme. Pour
 * éviter que le site casse entre deux mises à jour de base, les routes hero
 * appellent ce helper : il ajoute les colonnes manquantes de façon idempotente
 * (`ADD COLUMN IF NOT EXISTS`, toutes nullables — aucune perte de données).
 *
 * Si la base est déjà à jour (db push effectué), l'opération est un no-op.
 */
let ensured: Promise<boolean> | null = null

export function ensureHeroTextColumns(): Promise<boolean> {
  ensured ??= (async () => {
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "HeroImage"
           ADD COLUMN IF NOT EXISTS "title" TEXT,
           ADD COLUMN IF NOT EXISTS "text" TEXT,
           ADD COLUMN IF NOT EXISTS "ctaLabel" TEXT,
           ADD COLUMN IF NOT EXISTS "href" TEXT`
      )
      return true
    } catch (err) {
      console.error('[hero] Impossible d’ajouter les colonnes de texte:', err)
      // Réessaie au prochain appel (ex. base momentanément indisponible)
      ensured = null
      return false
    }
  })()
  return ensured
}
