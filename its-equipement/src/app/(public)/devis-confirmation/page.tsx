'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Home, Package, Copy, Download, Loader2, ArrowRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

function DevisConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ref = searchParams.get('ref') || null
  const devisId = searchParams.get('id') || null
  const [finalizing, setFinalizing] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    if (!ref) {
      router.replace('/')
    }
  }, [ref, router])

  if (!ref) return null

  const handleCopyRef = () => {
    navigator.clipboard.writeText(ref)
    toast.success('Reference copiee')
  }

  const handleDownloadPdf = async () => {
    if (!devisId) {
      toast.error('Identifiant du devis manquant')
      return
    }
    setGeneratingPdf(true)
    try {
      const res = await fetch(`/api/public/devis/${devisId}/pdf`)
      if (!res.ok) {
        toast.error('Erreur de generation du PDF')
        setGeneratingPdf(false)
        return
      }
      const blob = await res.blob()
      if (!blob || blob.size === 0) {
        toast.error('Erreur de generation du PDF')
        setGeneratingPdf(false)
        return
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${ref.replace(/[^a-zA-Z0-9-_]/g, '')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF telecharge')
    } catch {
      toast.error('Erreur lors du telechargement du PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleFinalize = async () => {
    if (!devisId) {
      toast.error('Identifiant du devis manquant')
      return
    }
    setFinalizing(true)
    try {
      const res = await fetch(`/api/public/devis/${devisId}/finalize`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Erreur lors de la finalisation')
        setFinalizing(false)
        return
      }
      router.push(`/confirmation?ref=${json.data.orderNumber}`)
    } catch {
      toast.error('Erreur de connexion. Reessayez.')
      setFinalizing(false)
    }
  }

  return (
    <main className="container py-16 px-4 md:px-6 max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="flex items-center justify-center size-20 rounded-full bg-emerald-50 mb-6">
          <CheckCircle className="size-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Devis cree avec succes
        </h1>
        <p className="text-muted-foreground">
          Votre demande de devis a ete enregistree. Voici votre reference.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Reference du devis</p>
            <p className="text-2xl font-bold tracking-tight">{ref}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyRef}
            className="gap-2"
          >
            <Copy className="size-4" />
            Copier la reference
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 mb-8">
        <Button
          size="lg"
          className="w-full h-12 text-base gap-2"
          onClick={handleDownloadPdf}
          disabled={generatingPdf || !devisId}
        >
          {generatingPdf ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {generatingPdf ? 'Generation du PDF...' : 'Telecharger le devis en PDF'}
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="w-full h-12 text-base gap-2"
          onClick={handleFinalize}
          disabled={finalizing || !devisId}
        >
          {finalizing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {finalizing ? 'Finalisation...' : 'Confirmer et commander'}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
        <Button variant="ghost" asChild className="gap-2 min-h-[44px]">
          <Link href="/produits">
            <Package className="size-4" />
            Voir le catalogue
          </Link>
        </Button>
        <Button variant="ghost" asChild className="gap-2 min-h-[44px]">
          <Link href="/">
            <Home className="size-4" />
            Retour a l'accueil
          </Link>
        </Button>
      </div>
    </main>
  )
}

export default function DevisConfirmationPage() {
  return (
    <Suspense>
      <DevisConfirmationContent />
    </Suspense>
  )
}
