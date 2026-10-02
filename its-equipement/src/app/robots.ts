import type { MetadataRoute } from 'next'
import { ADMIN_SEGMENT } from '@/lib/admin-path'

const baseUrl = process.env.NEXTAUTH_URL || 'https://equippro.fr'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [`/${ADMIN_SEGMENT}/`, '/api/', '/private/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
