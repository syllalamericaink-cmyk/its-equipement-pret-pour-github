'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, MessageCircle, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/stores/cart-store'
import { openQuickCart } from '@/components/layout/quick-cart'
import { CONTACT_WHATSAPP, CONTACT_PHONE } from '@/constants'

/**
 * Formulaire de devis court en bas de l'accueil (maquette mobile v5/v6).
 *
 * - Reprend automatiquement les produits du panier (avec leurs quantités).
 * - Validation : nom (2 caractères minimum), téléphone (8 à 15 chiffres),
 *   ville requise — l'API /api/public/devis l'exige pour organiser la livraison.
 * - Champ anti-spam caché (honeypot) ; le rate limit serveur existant s'applique.
 * - Envoi vers POST /api/public/devis : crée un devis notifié sur WhatsApp,
 *   Telegram et Google Sheets, puis vide le panier et affiche la confirmation.
 */

interface FormState {
  name: string
  phone: string
  company: string
  city: string
  message: string
}

const EMPTY: FormState = { name: '', phone: '', company: '', city: '', message: '' }

export function HomeQuoteForm() {
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)

  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'items', string>>>({})
  const [sending, setSending] = useState(false)
  const [sentRef, setSentRef] = useState<string | null>(null)

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const validate = (): Partial<Record<keyof FormState | 'items', string>> => {
    const errs: Partial<Record<keyof FormState | 'items', string>> = {}
    if (form.name.trim().length < 2) errs.name = 'Indiquez votre nom.'
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) errs.phone = 'Indiquez un numéro valide (8 à 15 chiffres).'
    if (form.city.trim().length < 2) errs.city = 'Indiquez votre ville ou commune.'
    if (items.length === 0) errs.items = 'Ajoutez au moins un produit avec le bouton « + Devis ».'
    return errs
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    // Honeypot : rempli par un robot → on fait semblant de réussir sans envoyer
    if ((data.get('website') as string)?.trim()) {
      setSentRef('—')
      return
    }

    const allErrors = validate()
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      return
    }
    setErrors({})

    setSending(true)
    try {
      const res = await fetch('/api/public/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: form.name.trim(),
          clientPhone: form.phone.trim(),
          // L'API exige un type ; on reste « PARTICULIER » pour ne pas imposer
          // l'email. La société éventuelle est enregistrée dans companyName.
          clientType: 'PARTICULIER',
          companyName: form.company.trim() || undefined,
          city: form.city.trim(),
          deliveryComment: form.message.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSlug: i.productSlug,
            productSku: i.productSku || undefined,
            variantId: i.variantId || undefined,
            variantName: i.variantName || undefined,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.unitPrice * i.quantity,
            hasPersonalization: i.hasPersonalization,
            personalizationData: i.hasPersonalization ? { ...i.personalization } : undefined,
          })),
        }),
      })
      const json = (await res.json()) as { success: boolean; data?: { devisNumber?: string; id?: string }; error?: string }
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Impossible d’envoyer la demande. Réessayez.')
        return
      }
      setSentRef(json.data?.devisNumber ?? '—')
      clearCart()
      setForm(EMPTY)
    } catch {
      toast.error('Erreur de connexion. Vérifiez votre réseau et réessayez.')
    } finally {
      setSending(false)
    }
  }

  /* --------------------------- Confirmation --------------------------- */
  if (sentRef) {
    return (
      <div className="px-4 py-8 md:mx-auto md:max-w-3xl">
        <div className="bg-white p-5 text-center" role="status" tabIndex={-1}>
          <span className="mx-auto grid h-12 w-12 place-items-center bg-its-lime">
            <Check className="h-6 w-6 text-its-dark" aria-hidden="true" />
          </span>
          <h3 className="mt-3 font-display text-xl font-bold text-its-dark">Demande envoyée !</h3>
          {sentRef !== '—' && (
            <p className="mt-1 text-sm text-its-gray">
              Référence : <b className="font-semibold text-its-dark">{sentRef}</b>
            </p>
          )}
          <p className="mx-auto mt-2 max-w-md text-sm text-its-gray">
            Notre équipe vous répond sous 24 à 48 h ouvrées avec les prix, les délais et les conditions
            de livraison. Gardez votre référence pour le suivi.
          </p>
          <div className="mx-auto mt-4 grid max-w-sm gap-2">
            <a
              href={CONTACT_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] items-center justify-center gap-2 bg-its-lime font-semibold text-its-dark transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Suivre ma demande sur WhatsApp
            </a>
            <button
              type="button"
              onClick={() => setSentRef(null)}
              className="flex min-h-[48px] items-center justify-center border-[1.5px] border-its-dark font-semibold text-its-dark transition-colors hover:bg-its-light"
            >
              Faire une autre demande
            </button>
          </div>
        </div>
      </div>
    )
  }

  const inputClass =
    'h-12 w-full border-[1.5px] border-its-dark/25 bg-white px-3.5 text-base text-its-dark outline-none placeholder:text-its-gray focus:border-its-dark'

  return (
    <div className="px-4 md:mx-auto md:max-w-3xl">
      {/* Récapitulatif des produits du panier */}
      <div className="bg-its-dark/95 p-3.5 text-white">
        {items.length === 0 ? (
          <p className="text-[0.9rem] text-white/85">
            Aucun produit sélectionné. Ajoutez des produits avec le bouton «{' '}
            <b className="text-its-lime">+ Devis</b> », ou{' '}
            <Link href="/produits" className="font-semibold text-its-lime underline underline-offset-2">
              parcourez le catalogue
            </Link>{' '}
            puis revenez ici.
          </p>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="text-[0.9rem] leading-snug text-white/90">
              <b className="text-its-lime">Produits :</b>{' '}
              {items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
            </p>
            <button
              type="button"
              onClick={openQuickCart}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 bg-white/10 px-3 py-2 text-[0.85rem] font-semibold text-white transition-colors hover:bg-white/20"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Modifier
            </button>
          </div>
        )}
        {errors.items && (
          <p role="alert" className="mt-2 bg-white/10 px-2.5 py-2 text-[0.85rem] font-medium text-its-lime">
            {errors.items}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-3 grid gap-3">
        {/* Anti-spam caché (honeypot) : invisible et ignoré par les humains */}
        <div className="hidden" aria-hidden="true">
          <label>
            Ne pas remplir ce champ
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="dq-name" className="mb-1 block text-[0.85rem] font-semibold text-its-dark">
              Votre nom <span aria-hidden="true">*</span>
            </label>
            <input
              id="dq-name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={set('name')}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'dq-name-err' : undefined}
              placeholder="Ex. : Konan Yao"
              className={inputClass}
            />
            {errors.name && (
              <p id="dq-name-err" role="alert" className="mt-1 text-[0.8rem] font-medium text-its-dark">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="dq-phone" className="mb-1 block text-[0.85rem] font-semibold text-its-dark">
              Téléphone <span aria-hidden="true">*</span>
            </label>
            <input
              id="dq-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={set('phone')}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'dq-phone-err' : undefined}
              placeholder="Ex. : 07 00 24 92 78"
              className={inputClass}
            />
            {errors.phone && (
              <p id="dq-phone-err" role="alert" className="mt-1 text-[0.8rem] font-medium text-its-dark">
                {errors.phone}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="dq-company" className="mb-1 block text-[0.85rem] font-semibold text-its-dark">
              Entreprise (optionnel)
            </label>
            <input
              id="dq-company"
              type="text"
              autoComplete="organization"
              value={form.company}
              onChange={set('company')}
              placeholder="Ex. : BTP Abidjan SARL"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="dq-city" className="mb-1 block text-[0.85rem] font-semibold text-its-dark">
              Ville / Commune <span aria-hidden="true">*</span>
            </label>
            <input
              id="dq-city"
              type="text"
              autoComplete="address-level2"
              value={form.city}
              onChange={set('city')}
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? 'dq-city-err' : undefined}
              placeholder="Ex. : Abidjan, Cocody"
              className={inputClass}
            />
            {errors.city && (
              <p id="dq-city-err" role="alert" className="mt-1 text-[0.8rem] font-medium text-its-dark">
                {errors.city}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="dq-message" className="mb-1 block text-[0.85rem] font-semibold text-its-dark">
            Votre besoin (optionnel)
          </label>
          <textarea
            id="dq-message"
            rows={3}
            value={form.message}
            onChange={set('message')}
            placeholder="Précisez les tailles, les couleurs, le logo à marquer, la date souhaitée…"
            className="w-full border-[1.5px] border-its-dark/25 bg-white px-3.5 py-2.5 text-base text-its-dark outline-none placeholder:text-its-gray focus:border-its-dark"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="submit"
            disabled={sending}
            className="flex min-h-[50px] items-center justify-center bg-its-dark font-semibold text-white transition-colors hover:bg-its-panel disabled:opacity-60 sm:col-span-2"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Envoi en cours…
              </>
            ) : (
              'Envoyer ma demande de devis'
            )}
          </button>
          <a
            href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
            className="flex min-h-[50px] items-center justify-center border-2 border-its-dark font-semibold text-its-dark transition-colors hover:bg-its-dark hover:text-its-lime"
          >
            Appeler {CONTACT_PHONE}
          </a>
        </div>
        <p className="text-[0.8rem] text-its-dark/70">
          Réponse sous 24–48 h ouvrées. Vous pouvez aussi{' '}
          <a
            href={CONTACT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline decoration-2 underline-offset-2"
          >
            nous écrire sur WhatsApp
          </a>
          .
        </p>
      </form>
    </div>
  )
}
