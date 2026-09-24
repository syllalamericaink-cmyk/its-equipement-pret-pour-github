'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Home, Package, MessageCircle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ref = searchParams.get('ref') || null
  const viaWhatsApp = searchParams.get('via') === 'whatsapp'
  const [whatsappPending, setWhatsappPending] = useState(viaWhatsApp)

  useEffect(() => {
    // Si l'utilisateur est arrivé via le tunnel WhatsApp, on lui propose de
    // garder le lien sous la main au cas où la fenêtre pop-up ait été bloquée.
    if (viaWhatsApp) {
      const t = setTimeout(() => setWhatsappPending(false), 5000)
      return () => clearTimeout(t)
    }
  }, [viaWhatsApp])

  useEffect(() => {
    // Si pas de référence ET pas via WhatsApp, retour accueil
    if (!ref && !viaWhatsApp) {
      router.replace('/')
    }
  }, [ref, viaWhatsApp, router])

  if (!ref && !viaWhatsApp) return null

  const handleCopyRef = () => {
    if (ref) {
      navigator.clipboard.writeText(ref)
      toast.success('Référence copiée')
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center py-12 px-4">
      <section className="w-full max-w-lg mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-20 w-20 text-emerald-500" strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Votre commande a été validée avec succès.
        </h1>

        <p className="text-muted-foreground text-base leading-relaxed">
          Un commercial prendra contact avec vous pour confirmer les détails de votre commande.
        </p>

        {ref && (
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="text-left">
                <p className="text-sm text-muted-foreground">Référence de votre demande :</p>
                <p className="text-lg font-bold">#{ref}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="min-h-[44px] min-w-[44px] shrink-0"
                onClick={handleCopyRef}
                aria-label="Copier la référence"
              >
                <Copy className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {whatsappPending && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="flex items-start gap-3">
              <MessageCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                  Votre demande a été transmise sur WhatsApp
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Si la fenêtre WhatsApp ne s&apos;est pas ouverte automatiquement,
                  vérifiez les pop-ups de votre navigateur. Le commercial vous
                  recontactera de toute façon sur le numéro que vous avez renseigné.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Votre demande a été enregistrée et transmise à notre équipe commerciale.
          Vous n&apos;avez rien d&apos;autre à faire — un commercial vous recontactera
          sur WhatsApp.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="outline" asChild className="w-full sm:w-auto min-h-[44px]">
            <Link href="/">
              <Home className="size-4 mr-2" />
              Retour à l&apos;accueil
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto min-h-[44px]">
            <Link href="/produits">
              <Package className="size-4 mr-2" />
              Voir le catalogue
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  )
}
