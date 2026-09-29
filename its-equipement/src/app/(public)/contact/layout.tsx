import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact | ITS Équipement',
  description: "Contactez l'équipe ITS Équipement pour toute question sur nos équipements professionnels, demandes de devis ou suivi de commande.",
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact | ITS Équipement',
    description: "Contactez l'équipe ITS Équipement pour toute question sur nos équipements professionnels, demandes de devis ou suivi de commande.",
    url: '/contact',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}