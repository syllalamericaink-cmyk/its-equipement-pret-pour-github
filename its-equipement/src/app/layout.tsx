import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { APP_NAME, COMPANY_NAME } from "@/constants"

const geistSans = Geist({
  variable: "--font-geist-sans",
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
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}
