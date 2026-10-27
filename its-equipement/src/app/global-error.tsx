'use client'

// Dernier filet de sécurité (erreur dans la mise en page racine) : page
// autonome, sans dépendance au reste de l'application.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#F4F3EE',
          color: '#151A1D',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 16,
        }}
      >
        <div>
          <p style={{ fontSize: 56, fontWeight: 800, margin: 0 }}>Oups</p>
          <h1 style={{ fontSize: 24, margin: '8px 0' }}>Le site rencontre un problème</h1>
          <p style={{ color: '#5f6b70', margin: '0 0 24px' }}>Réessayez dans un instant, ou appelez le +225 07 79 07 45 47.</p>
          <button
            type="button"
            onClick={reset}
            style={{ background: '#D8F24A', border: 0, padding: '14px 24px', fontWeight: 700, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
