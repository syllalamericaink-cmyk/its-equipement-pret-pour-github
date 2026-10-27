'use client'

import { createElement, useState } from 'react'
import {
  Ear,
  Footprints,
  Glasses,
  Hand,
  HardHat,
  Package,
  Shirt,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Icône du métier selon le nom (catégorie ou produit) : visuel de secours
// quand il n'y a pas encore de photo, ou si le lien de la photo est cassé.
const RULES: [RegExp, LucideIcon][] = [
  [/chaussure|botte|basket|pied|sabot/i, Footprints],
  [/casque|casquette|t[eê]te|cagoule/i, HardHat],
  [/gilet|veste|tenue|v[eê]tement|combinaison|polo|t-shirt|blouse|chasuble/i, Shirt],
  [/gant|main/i, Hand],
  [/lunette|visi[eè]re|yeux|oeil|œil/i, Glasses],
  [/bouchon|auditi|oreille|bruit/i, Ear],
  [/protection|epi|epc|s[ée]curit[ée]/i, ShieldCheck],
]

export function iconFor(names: (string | null | undefined)[]): LucideIcon {
  for (const name of names) {
    if (!name) continue
    for (const [re, icon] of RULES) if (re.test(name)) return icon
  }
  return Package
}

/**
 * Un lien vers une page de recherche (Bing, Google…) n'est pas une image :
 * on l'ignore directement au lieu d'afficher une image cassée.
 */
export function isUsableImageUrl(url: string | null | undefined): url is string {
  if (!url) return false
  if (url.startsWith('/')) return true
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    if (/(^|\.)bing\.com$/.test(u.hostname) && u.pathname.startsWith('/images/search')) return false
    if (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname.startsWith('/search')) return false
    return true
  } catch {
    return false
  }
}

export function ProductImageFallback({
  names,
  className,
  iconClassName,
}: {
  names: (string | null | undefined)[]
  className?: string
  iconClassName?: string
}) {
  return (
    <div
      className={cn('flex h-full w-full items-center justify-center bg-its-light', className)}
      aria-hidden="true"
    >
      {createElement(iconFor(names), {
        className: cn('size-10 text-its-gray/60', iconClassName),
        strokeWidth: 1.25,
      })}
    </div>
  )
}

/** Photo produit avec chargement différé et visuel de secours. */
export function ProductImage({
  src,
  alt,
  names,
  className,
  fallbackClassName,
  fit = 'cover',
  eager = false,
}: {
  src?: string | null
  alt: string
  names: (string | null | undefined)[]
  className?: string
  fallbackClassName?: string
  fit?: 'cover' | 'contain'
  eager?: boolean
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!isUsableImageUrl(src) || failedSrc === src) {
    return <ProductImageFallback names={names} className={fallbackClassName} />
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain bg-white', className)}
    />
  )
}
