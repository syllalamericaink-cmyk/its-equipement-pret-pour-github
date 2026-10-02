'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Pause, Play } from 'lucide-react'

/**
 * Carrousel des bannières d'accueil (maquette mobile v4/v6).
 *
 * - Défilement automatique toutes les 5 secondes (scroll-snap, swipe tactile).
 * - Pause au toucher, au survol, au focus et quand l'onglet est caché ;
 *   bouton pause/lecture en haut à droite ; points de navigation en bas à gauche.
 * - Aucune animation automatique si l'appareil demande moins d'animations
 *   (prefers-reduced-motion).
 * - Sans image active dans l'admin : bannières colorées de repli avec messages.
 * - Les textes optionnels (title, text, ctaLabel) s'affichent en bas de la
 *   bannière sur un dégradé sombre ; un lien sans titre rend l'image cliquable.
 */

export interface HeroSlideData {
  id: string
  url: string | null
  altText: string
  title?: string | null
  text?: string | null
  ctaLabel?: string | null
  href?: string | null
  objectPosition?: string | null
}

/** Convertit la valeur admin (top/center/bottom) en CSS object-position. */
function objectPositionCss(value: string | null | undefined): string {
  switch (value) {
    case 'top':
      return 'center top'
    case 'bottom':
      return 'center bottom'
    default:
      return 'center center'
  }
}

const DELAY_MS = 5000

/** Bannières de repli (aucune image active dans l'admin) — mêmes messages que la maquette. */
const FALLBACK_STYLES = [
  { bg: 'bg-its-dark text-white', sub: 'text-white/90', cta: 'bg-its-lime text-its-dark' },
  { bg: 'bg-its-panel text-white', sub: 'text-white/90', cta: 'bg-its-lime text-its-dark' },
  { bg: 'bg-its-lime text-its-dark', sub: 'text-its-dark/80', cta: 'bg-its-dark text-its-lime' },
]

const FALLBACK_BANNERS: HeroSlideData[] = [
  {
    id: 'fallback-1',
    url: null,
    altText: 'Équipements de protection individuelle',
    title: 'Équiper vos équipes, sans compromis sur le terrain.',
    text: 'Protection et tenues pour le BTP, l’industrie, la logistique.',
    ctaLabel: 'Recevoir un devis',
    href: '/demande-devis',
  },
  {
    id: 'fallback-2',
    url: null,
    altText: 'Marquage de vêtements professionnels',
    title: 'Vos couleurs sur chaque tenue.',
    text: 'Broderie, sérigraphie, transfert. Bon à tirer avant production.',
    ctaLabel: 'Personnaliser',
    href: '/#personnalisation',
  },
  {
    id: 'fallback-3',
    url: null,
    altText: 'Référence introuvable',
    title: 'Référence introuvable ?',
    text: 'Envoyez une fiche technique ou une photo, on cherche l’équivalent.',
    ctaLabel: 'Décrire mon besoin',
    href: '/demande-devis',
  },
]

/** Lien interne → Link (navigation client), sinon <a> (lien externe). */
function SmartLink({ href, className, children, ariaLabel }: {
  href: string
  className: string
  children: React.ReactNode
  ariaLabel?: string
}) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function HeroCarousel({ slides }: { slides: HeroSlideData[] }) {
  const data = slides.length > 0 ? slides : FALLBACK_BANNERS
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [interacting, setInteracting] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  // Init paresseuse : la valeur n'influe que sur le comportement (pas le markup SSR)
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Les diapositives changent (chargement des images admin) → repart du début
  // (ajustement pendant le rendu, pattern recommandé par React)
  const [prevCount, setPrevCount] = useState(data.length)
  if (prevCount !== data.length) {
    setPrevCount(data.length)
    setIndex(0)
  }

  const go = useCallback((i: number, smooth = true) => {
    const track = trackRef.current
    if (!track) return
    const n = ((i % data.length) + data.length) % data.length
    setIndex(n)
    track.scrollTo({ left: n * track.clientWidth, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' })
  }, [data.length, reduceMotion])

  const canPlay = !reduceMotion && !userPaused && !interacting && !tabHidden && data.length > 1

  useEffect(() => {
    if (!canPlay) return
    const timer = setInterval(() => go(index + 1), DELAY_MS)
    return () => clearInterval(timer)
  }, [canPlay, index, go])

  // Synchronise l'index quand l'utilisateur glisse manuellement
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let t: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      clearTimeout(t)
      t = setTimeout(() => {
        const n = Math.round(track.scrollLeft / Math.max(1, track.clientWidth))
        setIndex((prev) => {
          const clamped = Math.min(data.length - 1, Math.max(0, n))
          return clamped === prev ? prev : clamped
        })
      }, 80)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(t)
      track.removeEventListener('scroll', onScroll)
    }
  }, [data.length])

  // Réaligne après un redimensionnement (largeur d'une diapositive = largeur piste)
  useEffect(() => {
    const onResize = () => {
      const track = trackRef.current
      if (track) track.scrollTo({ left: index * track.clientWidth, behavior: 'auto' })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [index])

  // Pause pendant le toucher, le survol ou le focus ; reprise ensuite
  // (capture pour focus : l'événement focus ne « bubble » pas en React)
  const pauseHandlers = {
    onPointerDown: () => setInteracting(true),
    onTouchStart: () => setInteracting(true),
    onMouseEnter: () => setInteracting(true),
    onFocusCapture: () => setInteracting(true),
    onPointerUp: () => setInteracting(false),
    onTouchEnd: () => setInteracting(false),
    onMouseLeave: () => setInteracting(false),
    onBlurCapture: () => setInteracting(false),
  }

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Bannières ITS Équipement"
      className="relative w-full overflow-hidden bg-its-dark"
      {...pauseHandlers}
    >
      <div
        key={data.length}
        ref={trackRef}
        className="flex h-[62.5vw] max-h-[560px] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:h-[400px] md:max-h-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {data.map((slide, i) => {
          const style = FALLBACK_STYLES[i % FALLBACK_STYLES.length]
          const hasCaption = !!(slide.title || slide.text || (slide.ctaLabel && slide.href))
          const clickableImage = !!(slide.url && slide.href && !slide.title)

          const body = clickableImage ? (
            <SmartLink
              href={slide.href!}
              className="block h-full w-full"
              ariaLabel={slide.ctaLabel ?? slide.altText}
            >
              <img
                src={slide.url!}
                alt={slide.altText}
                loading={i === 0 ? 'eager' : 'lazy'}
                style={{ objectPosition: objectPositionCss(slide.objectPosition) }}
                className="h-full w-full object-cover object-center"
              />
            </SmartLink>
          ) : slide.url ? (
            <>
              <img
                src={slide.url}
                alt={slide.altText}
                loading={i === 0 ? 'eager' : 'lazy'}
                style={{ objectPosition: objectPositionCss(slide.objectPosition) }}
                className="h-full w-full object-cover object-center"
              />
              {hasCaption && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-4 pb-16 pt-14 md:p-6 md:pb-14 md:pt-20">
                  <div className="max-w-3xl">
                    {slide.title && (
                      <h2 className="font-display text-[1.4rem] font-bold leading-tight text-white md:text-3xl">
                        {slide.title}
                      </h2>
                    )}
                    {slide.text && <p className="mt-1 text-[0.9rem] text-white/90 md:text-base">{slide.text}</p>}
                    {slide.ctaLabel && slide.href && (
                      <div className="pointer-events-auto mt-2.5">
                        <SmartLink
                          href={slide.href}
                          className="inline-flex min-h-[44px] items-center bg-its-lime px-4 py-2 font-semibold text-its-dark transition-colors hover:bg-its-lime-dark"
                        >
                          {slide.ctaLabel}
                        </SmartLink>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Bannière texte de repli (aucune image admin) — pb élargi pour
            // dégager la zone des points de navigation
            <div className={`flex h-full w-full flex-col justify-between p-5 pb-20 md:p-8 md:pb-16 ${style.bg}`}>
              <div>
                {slide.title && (
                  <h2 className="max-w-3xl font-display text-[1.65rem] font-bold leading-[1.05] md:text-4xl">
                    {slide.title}
                  </h2>
                )}
                {slide.text && <p className={`mt-1.5 text-[0.92rem] md:text-lg ${style.sub}`}>{slide.text}</p>}
              </div>
              {slide.ctaLabel && slide.href && (
                <SmartLink
                  href={slide.href}
                  className={`inline-flex min-h-[44px] w-fit items-center self-start px-4 py-2 font-semibold transition-opacity hover:opacity-90 ${style.cta}`}
                >
                  {slide.ctaLabel}
                </SmartLink>
              )}
            </div>
          )

          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${data.length}`}
              className="relative h-full w-full shrink-0 snap-center"
            >
              {body}
            </div>
          )
        })}
      </div>

      {/* Points de navigation (bas gauche) — actif lime et allongé */}
      {data.length > 1 && (
        <div className="absolute bottom-2.5 left-3 z-10 flex items-center rounded-sm bg-its-dark/60 p-0.5 backdrop-blur-sm">
          {data.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i, true)}
              aria-label={`Aller à la bannière ${i + 1}`}
              aria-current={i === index}
              className="flex h-9 min-w-[36px] items-center justify-center px-1"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-7 bg-its-lime' : 'w-2.5 bg-white/60'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Bouton pause / lecture (haut droite) */}
      {data.length > 1 && (
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          aria-label={userPaused ? 'Reprendre le défilement' : 'Mettre en pause le défilement'}
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center bg-its-dark/60 text-white backdrop-blur-sm transition-colors hover:bg-its-dark"
        >
          {userPaused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
        </button>
      )}
    </section>
  )
}
