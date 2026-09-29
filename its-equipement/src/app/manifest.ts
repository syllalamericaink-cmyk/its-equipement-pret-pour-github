import type { MetadataRoute } from 'next'

/**
 * Manifeste PWA : rend l'espace administrateur installable sur mobile
 * (« Ajouter à l'écran d'accueil ») — alternative simple et sécurisée à une
 * application native, même codebase, même authentification NextAuth.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ITS Équipement — Administration',
    short_name: 'ITS Admin',
    description: 'Suivi des commandes ITS Équipement en temps réel',
    start_url: '/admin',
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
