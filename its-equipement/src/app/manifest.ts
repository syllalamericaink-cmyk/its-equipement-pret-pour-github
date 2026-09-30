import type { MetadataRoute } from 'next'

/**
 * Manifeste PWA du site public (un seul manifeste s'applique à tout le site :
 * un visiteur qui installe le site doit voir le nom et la page d'accueil du
 * magasin, pas l'espace admin).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ITS Équipement',
    short_name: 'ITS Équipement',
    description: 'Équipement de protection individuelle et collective — Abidjan, Côte d\'Ivoire',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1626',
    theme_color: '#0B1626',
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
