'use client'

import { useEffect } from 'react'
import { StatusScreen } from '@/components/public/status-screen'

// Erreur inattendue sur une page du site : l'en-tête et le pied restent
// affichés, le visiteur peut réessayer ou repartir vers le catalogue.
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[page] Erreur:', error)
  }, [error])

  return (
    <StatusScreen
      code="Oups"
      title="Un souci technique est survenu"
      message="La page n’a pas pu s’afficher. Réessayez dans un instant : votre panier est conservé."
      onRetry={reset}
    />
  )
}
