'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import { publicFetch } from '@/lib/public-api'
import { ProductImage as ProductPhoto, isUsableImageUrl } from '@/components/public/product-image'

interface Suggestion {
  id: string
  name: string
  slug: string
  basePrice: number
  category?: { name: string }
  images?: { url: string }[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA'

/**
 * Barre de recherche façon marketplace : suggestions de produits pendant la
 * frappe, Entrée ou bouton pour voir tous les résultats dans le catalogue.
 */
export function SearchBox({
  variant = 'desktop',
  tabIndex,
  onDone,
}: {
  variant?: 'desktop' | 'mobile'
  tabIndex?: number
  onDone?: () => void
}) {
  const router = useRouter()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)

  // Suggestions (300 ms après la dernière frappe)
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await publicFetch<Suggestion[]>(`/api/public/products?search=${encodeURIComponent(q)}&limit=6`)
      if (cancelled) return
      setResults(res.success && res.data ? res.data : [])
      setActive(-1)
      setLoading(false)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  // Fermeture au clic en dehors
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const finish = () => {
    setOpen(false)
    setQuery('')
    setResults([])
    onDone?.()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (active >= 0 && results[active]) {
      router.push(`/produits/${results[active].slug}`)
      finish()
      return
    }
    const q = query.trim()
    if (!q) return
    router.push(`/produits?search=${encodeURIComponent(q)}`)
    finish()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && query.trim().length >= 2
  const isDesktop = variant === 'desktop'

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search" className="flex w-full items-stretch">
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search
            className={`pointer-events-none absolute left-3 h-5 w-5 text-its-gray ${isDesktop ? '' : 'hidden'}`}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={isDesktop ? 'Rechercher un casque, des gants, un gilet, des chaussures…' : 'Rechercher un produit…'}
            aria-label="Rechercher un produit"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            tabIndex={tabIndex}
            className={`h-11 w-full min-w-0 bg-white text-base text-its-dark outline-none placeholder:text-its-gray ${
              isDesktop
                ? 'border-2 border-its-dark pl-10 pr-3 focus:border-its-lime-dark'
                : 'px-3.5'
            }`}
          />
        </div>
        <button
          type="submit"
          aria-label="Lancer la recherche"
          tabIndex={tabIndex}
          className={`flex shrink-0 items-center justify-center gap-2 bg-its-lime font-semibold text-its-dark transition-colors hover:bg-its-lime-dark ${
            isDesktop ? 'h-11 px-6' : 'h-11 w-12'
          }`}
        >
          {isDesktop ? 'Rechercher' : <Search className="h-5 w-5" aria-hidden="true" />}
        </button>
      </form>

      {showList && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto border border-its-border bg-white shadow-xl"
        >
          {loading && results.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-its-gray">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Recherche…
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-its-gray">
              Aucun produit trouvé. Appuyez sur Entrée pour chercher dans tout le catalogue.
            </p>
          ) : (
            <>
              {results.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/produits/${p.slug}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={finish}
                  className={`flex items-center gap-3 px-3 py-2 transition-colors hover:bg-its-cream ${
                    i === active ? 'bg-its-cream' : ''
                  }`}
                >
                  <span className="h-11 w-11 shrink-0 overflow-hidden border border-its-border bg-its-light">
                    <ProductPhoto
                      src={p.images?.find((img) => isUsableImageUrl(img.url))?.url}
                      alt=""
                      names={[p.category?.name, p.name]}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-its-dark">{p.name}</span>
                    {p.category?.name && <span className="block truncate text-xs text-its-gray">{p.category.name}</span>}
                  </span>
                  {p.basePrice > 0 && <span className="shrink-0 text-sm font-bold text-its-dark">{fmt(p.basePrice)}</span>}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  router.push(`/produits?search=${encodeURIComponent(query.trim())}`)
                  finish()
                }}
                className="flex w-full items-center gap-2 border-t border-its-border px-4 py-2.5 text-left text-sm font-semibold text-its-dark hover:bg-its-cream"
              >
                <Search className="h-4 w-4" aria-hidden="true" /> Voir tous les résultats pour « {query.trim()} »
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
