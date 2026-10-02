import { db } from './db'

/**
 * Colonnes ajoutées au modèle Product pour le pilotage de l'accueil.
 *
 * Le déploiement Vercel est automatique à chaque push, mais `prisma db push`
 * n'est pas exécuté par la plateforme. Les routes produits appellent ce helper :
 * il ajoute les colonnes manquantes de façon idempotente (ADD COLUMN IF NOT
 * EXISTS — aucune perte de données). No-op si la base est déjà à jour.
 */
let ensured: Promise<boolean> | null = null

export function ensureProductHomeSectionColumn(): Promise<boolean> {
  ensured ??= (async () => {
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "Product"
           ADD COLUMN IF NOT EXISTS "homeSection" TEXT`
      )
      return true
    } catch (err) {
      console.error('[product-columns] Impossible d’ajouter homeSection:', err)
      ensured = null
      return false
    }
  })()
  return ensured
}

/** Valeurs autorisées pour la section d'accueil d'un produit. */
export const HOME_SECTION_VALUES = ['EPI', 'VETEMENTS'] as const
export type HomeSection = (typeof HOME_SECTION_VALUES)[number]

export function normalizeHomeSection(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toUpperCase()
  return (HOME_SECTION_VALUES as readonly string[]).includes(v) ? v : null
}
