/**
 * Conversion d'un montant en lettres (français) pour les documents
 * officiels : « Arrêté la présente facture pro-forma à la somme de ... »
 *
 * Règles gérées : soixante-dix / quatre-vingts / quatre-vingt-dix,
 * « et un » (21, 31, ... 61), « cents » pluriel (200, 300...),
 * mille invariable, millions/milliards pluriels.
 */

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
]

const TENS: Record<number, string> = {
  2: 'vingt',
  3: 'trente',
  4: 'quarante',
  5: 'cinquante',
  6: 'soixante',
  8: 'quatre-vingt',
}

function below100(n: number): string {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  const u = n % 10

  // 70-79 : soixante-dix … soixante-dix-neuf (71 = soixante et onze)
  // 90-99 : quatre-vingt-dix … quatre-vingt-dix-neuf
  if (t === 7 || t === 9) {
    if (n === 71) return 'soixante et onze'
    const base = t === 7 ? 'soixante' : 'quatre-vingt'
    const rest = n - (t === 7 ? 60 : 80)
    return `${base}-${UNITS[rest]}`
  }

  if (u === 0) return t === 8 ? 'quatre-vingts' : TENS[t]
  if (u === 1 && t !== 8) return `${TENS[t]} et un`
  return `${TENS[t]}-${UNITS[u]}`
}

function below1000(n: number): string {
  const c = Math.floor(n / 100)
  const r = n % 100
  if (c === 0) return below100(r)
  const cent = c === 1 ? 'cent' : `${below100(c)} cent${r === 0 ? 's' : ''}`
  return r === 0 ? cent : `${cent} ${below100(r)}`
}

/** Convertit un entier positif (< 10^12) en mots français. */
export function entierEnLettres(valeur: number): string {
  if (!Number.isFinite(valeur)) return ''
  let n = Math.round(Math.abs(valeur))
  if (n === 0) return 'zéro'
  if (n >= 1e12) return 'montant hors plage'

  const parts: string[] = []

  const milliards = Math.floor(n / 1e9)
  n %= 1e9
  if (milliards > 0) {
    parts.push(`${milliards === 1 ? 'un' : below1000(milliards)} milliard${milliards > 1 ? 's' : ''}`)
  }

  const millions = Math.floor(n / 1e6)
  n %= 1e6
  if (millions > 0) {
    parts.push(`${millions === 1 ? 'un' : below1000(millions)} million${millions > 1 ? 's' : ''}`)
  }

  const milliers = Math.floor(n / 1000)
  n %= 1000
  if (milliers > 0) {
    // « mille » est invariable : 1000 = mille, 21000 = vingt et un mille
    parts.push(milliers === 1 ? 'mille' : `${below1000(milliers)} mille`)
  }

  if (n > 0) parts.push(below1000(n))

  return parts.join(' ')
}

/**
 * Montant en francs CFA en toutes lettres, avec majuscule initiale :
 * montantEnLettresCfa(125000) → « Cent vingt-cinq mille francs CFA »
 */
export function montantEnLettresCfa(montant: number): string {
  const mots = entierEnLettres(montant)
  if (!mots) return ''
  const phrase = `${mots} francs CFA`
  return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}
