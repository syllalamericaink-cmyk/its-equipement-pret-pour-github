import type { Metadata, Viewport } from "next"
import { Archivo, Barlow_Condensed, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { APP_NAME, COMPANY_NAME } from "@/constants"

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
})

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const baseUrl = process.env.NEXTAUTH_URL || "https://itschoolci.com"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${APP_NAME} — EPI & EPC | ${COMPANY_NAME}`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "ITS Équipement : votre partenaire EPI & EPC en Côte d'Ivoire. Équipements de protection individuelle, vêtements de travail personnalisés. Devis gratuit. Livraison à Abidjan et partout en CI.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${APP_NAME} — EPI & EPC | ${COMPANY_NAME}`,
    description:
      "ITS Équipement : votre partenaire EPI & EPC en Côte d'Ivoire. Équipements de protection individuelle, vêtements de travail personnalisés. Devis gratuit.",
    type: "website",
    locale: "fr_FR",
    siteName: APP_NAME,
    url: baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — EPI & EPC`,
    description:
      "ITS Équipement : votre partenaire EPI & EPC en Côte d'Ivoire. Équipements de protection individuelle et vêtements de travail personnalisés.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${archivo.variable} ${barlowCondensed.variable} ${geistMono.variable}`}
    >
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
