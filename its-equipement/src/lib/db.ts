import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __itsColumnsEnsured?: Promise<boolean>
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Migration douce : certaines colonnes récentes ne sont pas créées par le
 * déploiement Vercel (qui n'exécute pas `prisma db push`). On les ajoute de
 * façon idempotente une seule fois par instance, au premier chargement du
 * client Prisma — ainsi toutes les routes qui interrogent Product ou
 * HeroImage fonctionnent même si la base n'a pas encore été synchronisée.
 */
/** Attend (une fois par instance) que les colonnes récentes existent. */
export function ensureSoftColumns(): Promise<boolean> {
  if (!globalForPrisma.__itsColumnsEnsured) {
    globalForPrisma.__itsColumnsEnsured = runSoftColumns()
  }
  return globalForPrisma.__itsColumnsEnsured
}

// Préchauffe la migration douce dès l'import du module (fire-and-forget).
void ensureSoftColumns()

function runSoftColumns(): Promise<boolean> {
  return (async () => {
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "Product"
           ADD COLUMN IF NOT EXISTS "homeSection" TEXT`
      )
      await db.$executeRawUnsafe(
        `ALTER TABLE "HeroImage"
           ADD COLUMN IF NOT EXISTS "title" TEXT,
           ADD COLUMN IF NOT EXISTS "text" TEXT,
           ADD COLUMN IF NOT EXISTS "ctaLabel" TEXT,
           ADD COLUMN IF NOT EXISTS "href" TEXT,
           ADD COLUMN IF NOT EXISTS "objectPosition" TEXT DEFAULT 'center'`
      )
      return true
    } catch (err) {
      // Base momentanément indisponible : les routes critiques rappellent
      // leurs helpers dédiés (hero-columns.ts / product-columns.ts).
      console.error('[db] Migration douce des colonnes:', err)
      return false
    }
  })()
}
