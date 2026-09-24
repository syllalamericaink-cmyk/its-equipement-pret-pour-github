/**
 * Clé secrète partagée par toute l'application (NextAuth, middleware, API admin).
 *
 * ⚠️ IMPORTANT :
 * Si NEXTAUTH_SECRET est défini dans les variables d'environnement Vercel,
 * c'est CETTE valeur qui est utilisée (recommandé en production).
 *
 * Sinon, la valeur de secours ci-dessous garantit que la SIGNATURE du cookie
 * (auth.ts) et la VÉRIFICATION du token (middleware.ts, api-auth.ts) utilisent
 * TOUJOURS la même clé — c'est ce qui corrige la redirection en boucle après login.
 */
export const AUTH_SECRET: string =
  process.env.NEXTAUTH_SECRET ??
  'its-equipement-cle-de-secours-2026-x8Q2vN7mR4tW1zB5cD9fG3hJ6lL0kKpQ'
