import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demande de devis | ITS Équipement',
  description: 'Demandez votre devis personnalise en ligne pour des equipements et vetements de travail professionnels. Reponse sous 24 a 48 heures.',
  alternates: { canonical: '/demande-devis' },
  openGraph: {
    title: 'Demande de devis | ITS Équipement',
    description: 'Demandez votre devis personnalise en ligne pour des equipements et vetements de travail professionnels. Reponse sous 24 a 48 heures.',
    url: '/demande-devis',
  },
}

export default function DemandeDevisLayout({ children }: { children: React.ReactNode }) {
  return children
}
