'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Info, MessageCircle, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCartStore } from '@/stores/cart-store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { buildWhatsAppOrderLink } from '@/lib/whatsapp-order'

const checkoutSchema = z.object({
  clientType: z.enum(['PARTICULIER', 'ENTREPRISE']),
  clientName: z.string().min(1, 'Nom requis').max(200),
  clientFirstName: z.string().max(200).optional(),
  clientPhone: z.string().min(1, 'Téléphone requis').max(20),
  clientEmail: z.string().email('Email invalide').max(200).optional().or(z.literal('')),
  companyName: z.string().max(200).optional(),
  companyInfo: z.string().max(2000).optional(),
  requestType: z.enum(['COMMANDE_SIMPLE', 'DEVIS', 'BON_COMMANDE', 'FNE']),
  hasPersonalization: z.boolean(),
  personalizationSummary: z.string().max(2000).optional(),
  city: z.string().min(1, 'Ville requise').max(200),
  commune: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  deliveryComment: z.string().max(2000).optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

const REQUEST_TYPE_OPTIONS: { value: CheckoutFormData['requestType']; label: string; description: string }[] = [
  { value: 'COMMANDE_SIMPLE', label: 'Commande simple', description: 'Achat direct, expédition rapide après confirmation.' },
  { value: 'DEVIS', label: 'Demande de devis', description: 'Recevoir un devis avant de confirmer.' },
  { value: 'BON_COMMANDE', label: 'Bon de commande', description: 'Établir un bon de commande officiel.' },
  { value: 'FNE', label: 'Demande de FNE', description: 'Formation Négociable par l\'Entreprise — pièces justificatives requises.' },
]

const fmt = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'

export default function CommandePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal)
  const clearCart = useCartStore((s) => s.clearCart)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      clientType: 'PARTICULIER',
      clientName: '',
      clientFirstName: '',
      clientPhone: '',
      clientEmail: '',
      companyName: '',
      companyInfo: '',
      requestType: 'COMMANDE_SIMPLE',
      hasPersonalization: false,
      personalizationSummary: '',
      city: '',
      commune: '',
      address: '',
      deliveryComment: '',
    },
  })

  const clientType = watch('clientType')
  const requestType = watch('requestType')
  const hasPersonalization = watch('hasPersonalization')
  const needsCompanyInfo = requestType !== 'COMMANDE_SIMPLE' || clientType === 'ENTREPRISE'

  const onSubmit = async (data: CheckoutFormData) => {
    setSubmitting(true)
    try {
      // Validation supplémentaire : pour devis / BC / FNE, infos entreprise obligatoires
      if (data.requestType !== 'COMMANDE_SIMPLE') {
        if (!data.companyName?.trim()) {
          toast.error('Le nom de l\'entreprise est requis pour ce type de demande')
          setSubmitting(false)
          return
        }
        if (!data.companyInfo?.trim()) {
          toast.error('Les informations de l\'entreprise sont requises')
          setSubmitting(false)
          return
        }
      }
      // Si personnalisation activée mais détail vide
      if (data.hasPersonalization && !data.personalizationSummary?.trim()) {
        toast.error('Veuillez décrire votre personnalisation')
        setSubmitting(false)
        return
      }

      const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

      // 1. Enregistrer la demande en base (POST API)
      const apiRes = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: data.clientName,
          clientFirstName: data.clientFirstName || undefined,
          clientPhone: data.clientPhone,
          clientEmail: data.clientEmail || undefined,
          clientType: data.clientType,
          companyName: data.companyName || undefined,
          companyInfo: data.companyInfo || undefined,
          requestType: data.requestType,
          personalizationSummary: data.hasPersonalization ? data.personalizationSummary : undefined,
          city: data.city,
          commune: data.commune || undefined,
          address: data.address || undefined,
          deliveryComment: data.deliveryComment || undefined,
          deliveryFee: 0,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSlug: i.productSlug,
            productSku: i.productSku,
            variantId: i.variantId,
            variantName: i.variantName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.unitPrice * i.quantity,
            hasPersonalization: i.hasPersonalization,
            personalizationData: i.hasPersonalization ? i.personalization : undefined,
          })),
        }),
      })
      const apiJson = await apiRes.json()
      if (!apiJson.success) {
        toast.error(apiJson.error || 'Erreur lors de l\'enregistrement de la demande')
        setSubmitting(false)
        return
      }

      // 2. Construire et ouvrir le lien WhatsApp avec TOUTES les infos
      if (!process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER) {
        toast.error('Numéro WhatsApp non configuré. Contactez l\'administrateur.')
        setSubmitting(false)
        return
      }
      const whatsappUrl = buildWhatsAppOrderLink(
        {
          clientType: data.clientType,
          clientName: data.clientName,
          clientFirstName: data.clientFirstName || undefined,
          clientPhone: data.clientPhone,
          clientEmail: data.clientEmail || undefined,
          city: data.city,
          commune: data.commune || undefined,
          address: data.address || undefined,
          deliveryComment: data.deliveryComment || undefined,
        },
        items,
        total,
        {
          requestType: data.requestType,
          company: {
            companyName: data.companyName || undefined,
            companyInfo: data.companyInfo || undefined,
          },
          personalization: {
            hasPersonalization: data.hasPersonalization,
            summary: data.personalizationSummary,
          },
          orderRef: apiJson.data?.orderNumber ?? undefined,
        },
      )
      clearCart()
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      const orderRef = apiJson.data?.orderNumber ?? 'DEMANDE-' + Date.now()
      router.push(`/confirmation?ref=${encodeURIComponent(orderRef)}&via=whatsapp`)
    } catch {
      toast.error('Erreur lors de la redirection. Réessayez.')
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <section className="container py-16 px-4 md:px-6 max-w-2xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center size-20 rounded-full bg-muted">
            <Info className="size-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Votre panier est vide
        </h1>
        <p className="text-muted-foreground mb-8">
          Ajoutez des produits avant de passer commande.
        </p>
        <Button asChild size="lg">
          <Link href="/produits">Voir le catalogue</Link>
        </Button>
      </section>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="container py-8 px-4 md:px-6 max-w-3xl mx-auto"
    >
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Finaliser la commande
      </h1>

      {items.some((i) => i.hasPersonalization) && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
          <Clock className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Produits personnalisés : délai 24h.</span>{' '}
            Les produits avec personnalisation seront préparés sous 24h après validation de votre commande sur WhatsApp.
          </p>
        </div>
      )}

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
        <MessageCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          <span className="font-semibold">Commande validée sur WhatsApp.</span>{' '}
          À la soumission, votre commande s'ouvre dans WhatsApp avec tous les détails pré-remplis.
          Notre équipe confirmera la disponibilité et la livraison.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vos informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label>Type de client</Label>
              <RadioGroup
                value={clientType}
                onValueChange={(val) =>
                  setValue('clientType', val as CheckoutFormData['clientType'], {
                    shouldValidate: true,
                  })
                }
                className="flex flex-wrap gap-4"
              >
                {(
                  [
                    ['PARTICULIER', 'Particulier'],
                    ['ENTREPRISE', 'Entreprise'],
                  ] as const
                ).map(([value, label]) => (
                  <div key={value} className="flex items-center gap-2 min-h-[44px]">
                    <RadioGroupItem value={value} id={value} />
                    <Label htmlFor={value} className="cursor-pointer font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clientName"
                  {...register('clientName')}
                  placeholder="Votre nom de famille"
                  className="min-h-[44px]"
                />
                {errors.clientName && (
                  <p className="text-sm text-destructive">{errors.clientName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientFirstName">Prenom</Label>
                <Input
                  id="clientFirstName"
                  {...register('clientFirstName')}
                  placeholder="Votre prenom"
                  className="min-h-[44px]"
                />
              </div>
            </div>

            {needsCompanyInfo && (
              <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Nom de l'entreprise <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    {...register('companyName')}
                    placeholder="Nom de votre entreprise"
                    className="min-h-[44px]"
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">{errors.companyName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyInfo">
                    Informations entreprise <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="companyInfo"
                    {...register('companyInfo')}
                    placeholder="RCCM, numéro d'identification, contact comptable, adresse complète, etc. — toutes les informations nécessaires à l'établissement du document."
                    className="min-h-[88px]"
                  />
                  {errors.companyInfo && (
                    <p className="text-sm text-destructive">{errors.companyInfo.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Ces informations seront transmises au commercial pour préparer le document.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="clientPhone">
                Numéro WhatsApp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clientPhone"
                type="tel"
                {...register('clientPhone')}
                placeholder="Ex: 225 07 00 00 00 00"
                className="min-h-[44px]"
              />
              {errors.clientPhone && (
                <p className="text-sm text-destructive">{errors.clientPhone.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Un commercial vous recontactera sur ce numéro WhatsApp pour confirmer votre demande.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">
                Email {clientType === 'ENTREPRISE' && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="clientEmail"
                type="email"
                {...register('clientEmail')}
                placeholder="Ex: contact@exemple.com"
                className="min-h-[44px]"
              />
              {errors.clientEmail && (
                <p className="text-sm text-destructive">{errors.clientEmail.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* === Type de demande === */}
        <Card>
          <CardHeader>
            <CardTitle>Type de demande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={requestType}
              onValueChange={(val) =>
                setValue('requestType', val as CheckoutFormData['requestType'], {
                  shouldValidate: true,
                })
              }
              className="grid gap-3"
            >
              {REQUEST_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={opt.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors min-h-[44px] ${
                    requestType === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
            {requestType !== 'COMMANDE_SIMPLE' && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Pour ce type de demande, vous devez renseigner les informations de votre entreprise (section ci-dessus).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* === Personnalisation === */}
        <Card>
          <CardHeader>
            <CardTitle>Personnalisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Clock className="size-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Personnalisations sous 24h.</span>{' '}
                La maquette est réalisée manuellement par notre équipe après échange avec vous sur WhatsApp.
              </p>
            </div>
            <div className="space-y-3">
              <Label>Souhaitez-vous une personnalisation ?</Label>
              <RadioGroup
                value={hasPersonalization ? 'oui' : 'non'}
                onValueChange={(val) =>
                  setValue('hasPersonalization', val === 'oui', { shouldValidate: true })
                }
                className="flex gap-6"
              >
                <div className="flex items-center gap-2 min-h-[44px]">
                  <RadioGroupItem value="non" id="perso-non" />
                  <Label htmlFor="perso-non" className="cursor-pointer font-normal">Non</Label>
                </div>
                <div className="flex items-center gap-2 min-h-[44px]">
                  <RadioGroupItem value="oui" id="perso-oui" />
                  <Label htmlFor="perso-oui" className="cursor-pointer font-normal">Oui</Label>
                </div>
              </RadioGroup>
            </div>
            {hasPersonalization && (
              <div className="space-y-2">
                <Label htmlFor="personalizationSummary">
                  Détails de personnalisation <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="personalizationSummary"
                  {...register('personalizationSummary')}
                  placeholder="Décrivez votre demande : logo, texte à imprimer, emplacement, couleurs, taille, etc. Notre commercial vous contactera pour finaliser."
                  className="min-h-[100px]"
                />
                {errors.personalizationSummary && (
                  <p className="text-sm text-destructive">{errors.personalizationSummary.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Vous pouvez envoyer votre logo et vos éléments graphiques directement via WhatsApp après validation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="city">
                Ville <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Ex: Abidjan"
                className="min-h-[44px]"
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commune">Commune</Label>
              <Input
                id="commune"
                {...register('commune')}
                placeholder="Ex: Cocody"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Ex: Rue des prix, angle BV"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryComment">Commentaire (optionnel)</Label>
              <Textarea
                id="deliveryComment"
                {...register('deliveryComment')}
                placeholder="Instructions specifiques pour la livraison..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {items.map((item) => {
                const lineTotal = item.unitPrice * item.quantity
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {item.productName}
                          {item.variantName && (
                            <span className="text-muted-foreground font-normal">
                              {' '}- {item.variantName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(item.unitPrice)} x {item.quantity}
                        </p>
                      </div>
                      <span className="font-medium text-sm whitespace-nowrap">
                        {fmt(lineTotal)}
                      </span>
                    </div>
                    {item.hasPersonalization && (
                      <div className="ml-2 pl-3 border-l-2 border-muted-foreground/20 space-y-1">
                        <Badge variant="secondary" className="text-xs">
                          Personnalise
                        </Badge>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {item.personalization.impression && (
                            <p>- Impression</p>
                          )}
                          {item.personalization.logo && <p>- Logo</p>}
                          {item.personalization.texte && (
                            <p>- Texte : {item.personalization.texte}</p>
                          )}
                          {item.personalization.emplacement && (
                            <p>- Emplacement : {item.personalization.emplacement}</p>
                          )}
                          {item.personalization.taille && (
                            <p>- Taille : {item.personalization.taille}</p>
                          )}
                          {item.personalization.couleur && (
                            <p>- Couleur : {item.personalization.couleur}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <Separator />
                  </div>
                )
              })}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{fmt(subtotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span>0 FCFA</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{fmt(subtotal())}</span>
              </div>
            </div>

            <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="size-4 shrink-0 mt-0.5" />
              <p>
                Les prix sont indicatifs. Le devis final sera envoye apres
                validation.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 pb-8">
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="size-4 mr-2" />
            )}
            Envoyer ma demande sur WhatsApp
          </Button>
          <div className="text-center">
            <Link
              href="/panier"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline min-h-[44px]"
            >
              <ArrowLeft className="size-4" />
              Retour au panier
            </Link>
          </div>
        </div>
      </div>
    </form>
  )
}