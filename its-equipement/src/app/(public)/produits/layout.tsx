import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Catalogue | ITS Équipement',
  description: "Parcourez le catalogue ITS Équipement : vêtements de travail, EPI et equipements professionnels personnalisés pour les entreprises en Afrique de l'Ouest.",
  alternates: { canonical: '/produits' },
  openGraph: {
    title: 'Catalogue | ITS Équipement',
    description: "Parcourez le catalogue ITS Équipement : vêtements de travail, EPI et equipements professionnels personnalisés pour les entreprises en Afrique de l'Ouest.",
    url: '/produits',
  },
}

export default function ProduitsLayout({ children }: { children: React.ReactNode }) {
  return children
}
