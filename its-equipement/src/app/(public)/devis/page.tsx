'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Info } from 'lucide-react'
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

const devisSchema = z.object({
  clientType: z.enum(['PARTICULIER', 'ENTREPRISE']),
  clientName: z.string().min(1, 'Nom requis').max(200),
  clientFirstName: z.string().max(200).optional(),
  clientPhone: z.string().min(1, 'Telephone requis').max(20),
  clientEmail: z.string().email('Email invalide').max(200).optional().or(z.literal('')),
  companyName: z.string().max(200).optional(),
  city: z.string().min(1, 'Ville requise').max(200),
  commune: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  deliveryComment: z.string().max(2000).optional(),
})

type DevisFormData = z.infer<typeof devisSchema>

const fmt = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'

export default function DevisPage() {
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
  } = useForm<DevisFormData>({
    resolver: zodResolver(devisSchema),
    defaultValues: {
      clientType: 'PARTICULIER',
      clientName: '',
      clientFirstName: '',
      clientPhone: '',
      clientEmail: '',
      companyName: '',
      city: '',
      commune: '',
      address: '',
      deliveryComment: '',
    },
  })

  const clientType = watch('clientType')

  const onSubmit = async (data: DevisFormData) => {
    setSubmitting(true)
    try {
      const body = {
        clientName: data.clientName,
        clientFirstName: data.clientFirstName || undefined,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail || undefined,
        clientType: data.clientType,
        companyName: data.clientType === 'ENTREPRISE' ? data.companyName : undefined,
        city: data.city,
        commune: data.commune,
        address: data.address,
        deliveryComment: data.deliveryComment,
        deliveryFee: 0,
        devisMode: true,
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
      }
      const res = await fetch('/api/public/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Erreur lors de la demande de devis')
        setSubmitting(false)
        return
      }
      clearCart()
      router.push(`/devis-confirmation?ref=${json.data.devisNumber}&id=${json.data.id}`)
    } catch {
      toast.error('Erreur de connexion. Reessayez.')
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
          Ajoutez des produits avant de demander un devis.
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
        Demander un devis
      </h1>

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
                  setValue('clientType', val as DevisFormData['clientType'], {
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

            {clientType === 'ENTREPRISE' && (
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
            )}

            <div className="space-y-2">
              <Label htmlFor="clientPhone">
                Telephone <span className="text-destructive">*</span>
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
                Les prix sont indicatifs. Le devis sera genere et envoye apres
                validation.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 pb-8">
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base"
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Generer le devis
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
