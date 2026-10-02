/**
 * Clé secrète partagée par toute l'application (NextAuth, middleware, API admin).
 *
 * ⚠️ SÉCURITÉ — plus aucune clé « de secours » codée en dur :
 *   - En production, NEXTAUTH_SECRET DOIT être défini dans les variables
 *     d'environnement Vercel. S'il manque, l'application bascule en mode
 *     « échoue-fermé » : un secret aléatoire par instance est utilisé, donc
 *     AUCUN cookie de session falsifiable avec une clé connue du dépôt public,
 *     et les connexions admin ne fonctionnent plus tant que la variable n'est
 *     pas configurée (le site public, lui, reste fonctionnel).
 *   - En développement local (NODE_ENV != production), une clé de dev fixe
 *     évite de devoir configurer un fichier .env pour travailler.
 */
function resolveAuthSecret(): string {
  const fromEnv = process.env.NEXTAUTH_SECRET?.trim()
  if (fromEnv) return fromEnv

  if (process.env.NODE_ENV !== 'production') {
    return 'its-equipement-secret-dev-local-uniquement'
  }

  console.error(
    '[auth] NEXTAUTH_SECRET manquant en production. ' +
      'Ajoutez la variable NEXTAUTH_SECRET sur Vercel (Settings > Environment Variables) ' +
      'puis redéployez : sans elle, les connexions administrateur sont désactivées.'
  )
  // Secret éphémère imprévisible : les sessions émises par une instance ne
  // peuvent être validées ni par les autres instances ni forgées par un tiers.
  return `ephemeral-${crypto.randomUUID()}`
}

export const AUTH_SECRET: string = resolveAuthSecret()
