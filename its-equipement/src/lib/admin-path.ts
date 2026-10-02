/**
 * Chemin de l'interface d'administration, configurable pour éviter qu'un
 * curieux ne « tombe » sur /admin.
 *
 * Définissez NEXT_PUBLIC_ADMIN_PATH sur Vercel (ex. : gestion-its-9f3k) :
 *   - l'administration devient https://votre-site.fr/gestion-its-9f3k
 *   - l'ancienne adresse /admin renvoie une 404 (voir middleware.ts)
 *   - tous les liens internes suivent automatiquement via adminPath()
 *
 * Sans variable, le comportement historique (/admin) est conservé.
 */
export const ADMIN_SEGMENT: string =
  (process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin')
    .trim()
    .replace(/^\/+|\/+$/g, '') || 'admin'

/** Construit une URL d'administration : adminPath('/dashboard') → '/gestion-xxx/dashboard'. */
export function adminPath(path = ''): string {
  const p = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  return `/${ADMIN_SEGMENT}${p}`
}

/** Vrai si le chemin URL appartient à l'administration (hors /api/admin). */
export function isAdminPagePath(pathname: string): boolean {
  return pathname === `/${ADMIN_SEGMENT}` || pathname.startsWith(`/${ADMIN_SEGMENT}/`)
}
