import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions legales | ITS Équipement',
  description: 'Mentions legales du site ITS Équipement : informations sur l\'editeur, l\'hebergeur et les conditions d\'utilisation du site.',
  alternates: { canonical: '/legal' },
  openGraph: {
    title: 'Mentions legales | ITS Équipement',
    description: 'Mentions legales du site ITS Équipement : informations sur l\'editeur, l\'hebergeur et les conditions d\'utilisation du site.',
    url: '/legal',
  },
}

export default function MentionsLegalesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Mentions legales</h1>
      <p className="mt-2 text-muted-foreground">
        Informations legales du site.
      </p>
    </div>
  )
}