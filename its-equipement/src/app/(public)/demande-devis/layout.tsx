import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demande de devis | ITS Équipement',
  description: 'Demandez votre devis personnalisé en ligne pour des équipements et vetements de travail professionnels. Réponse sous 24 à 48 heures.',
  alternates: { canonical: '/demande-devis' },
  openGraph: {
    title: 'Demande de devis | ITS Équipement',
    description: 'Demandez votre devis personnalisé en ligne pour des équipements et vetements de travail professionnels. Réponse sous 24 à 48 heures.',
    url: '/demande-devis',
  },
}

export default function DemandeDevisLayout({ children }: { children: React.ReactNode }) {
  return children
}
