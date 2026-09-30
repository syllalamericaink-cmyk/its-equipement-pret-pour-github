/**
 * Normalisation des segments d'URL dynamiques ([slug]).
 *
 * Next.js 16 transmet les paramètres de route encrés dans l'URL tels quels :
 * un slug contenant des accents (« gilets-de-sécurité-… ») arrive côté serveur
 * et client sous forme percent-encoded (« gilets-de-s%C3%A9curit%C3%A9-… »).
 * La comparaison directe avec la base échoue alors → 404 à tort.
 *
 * decodeSlug() décode le percent-encoding puis normalise en Unicode NFC
 * (forme canonique, celle stockée en base par Prisma/PostgreSQL).
 */
export function decodeSlug(slug: string): string {
  let decoded = slug
  try {
    decoded = decodeURIComponent(slug)
  } catch {
    // slug mal formé (ex. « % » isolé) : on garde la valeur brute
  }
  return decoded.normalize('NFC')
}
