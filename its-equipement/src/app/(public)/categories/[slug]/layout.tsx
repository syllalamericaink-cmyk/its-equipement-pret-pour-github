import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  try {
    const category = await db.category.findUnique({
      where: { slug, isActive: true },
      select: {
        name: true,
        slug: true,
        description: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    })

    if (category) {
      return {
        title: `${category.name} | ITS Équipement`,
        description:
          category.description ||
          `Decouvrez notre selection de ${category._count.products} produit${category._count.products > 1 ? 's' : ''} dans la categorie ${category.name} chez ITS Équipement.`,
        alternates: { canonical: `/categories/${category.slug}` },
        openGraph: {
          title: `${category.name} | ITS Équipement`,
          description:
            category.description ||
            `Decouvrez notre selection de ${category._count.products} produit${category._count.products > 1 ? 's' : ''} dans la categorie ${category.name} chez ITS Équipement.`,
          url: `/categories/${category.slug}`,
          type: 'website',
        },
      }
    }
  } catch {
  }

  return {
    title: 'Categorie introuvable | ITS Équipement',
  }
}

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  try {
    const category = await db.category.findUnique({
      where: { slug, isActive: true },
      select: { id: true },
    })

    if (category) {
      return children
    }
  } catch {
  }

  notFound()
}
