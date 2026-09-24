import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  try {
    const product = await db.product.findUnique({
      where: { slug, isActive: true },
      select: {
        name: true,
        description: true,
        slug: true,
        category: { select: { name: true, slug: true } },
      },
    })

    if (product) {
      const truncatedDescription = product.description
        ? product.description.substring(0, 160)
        : `${product.name} - ${product.category.name} | ITS Équipement`

      return {
        title: `${product.name} | ITS Équipement`,
        description: truncatedDescription,
        alternates: { canonical: `/produits/${product.slug}` },
        openGraph: {
          title: `${product.name} | ITS Équipement`,
          description: truncatedDescription,
          url: `/produits/${product.slug}`,
          type: 'website',
        },
      }
    }
  } catch {
  }

  return {
    title: 'Produit introuvable | ITS Équipement',
  }
}

export default async function ProductDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  try {
    const product = await db.product.findUnique({
      where: { slug, isActive: true },
      select: { id: true },
    })

    if (product) {
      return children
    }
  } catch {
  }

  notFound()
}
