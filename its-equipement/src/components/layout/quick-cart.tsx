'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useCartStore, itemMinQuantity } from '@/stores/cart-store'
import { formatCurrency } from '@/lib/public-api'

/**
 * Panier de devis rapide (maquette mobile v5/v6) — en complément de /panier.
 *
 * - Feuille du bas ouverte par : l'icône panier du header, l'onglet « Panier »
 *   de la barre du bas et la mini-barre « N produits dans ma demande ».
 * - Quantités +/- (respect du minimum de commande), suppression.
 * - « Continuer ma demande » renvoie vers le formulaire de devis en bas de
 *   l'accueil ; le panier complet reste accessible via /panier.
 *
 * Le panier est mémorisé sur l'appareil (zustand persist + localStorage).
 */

/** Ouvre la feuille du panier rapide depuis n'importe quel composant client. */
export function openQuickCart() {
  window.dispatchEvent(new CustomEvent('its:open-cart'))
}

export function QuickCart() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const subtotal = useCartStore((s) => s.subtotal)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('its:open-cart', onOpen)
    return () => window.removeEventListener('its:open-cart', onOpen)
  }, [])

  // Échap géré par Radix ; le focus est piégé et restitué par Radix aussi.
  const count = items.length
  const total = subtotal()
  const hasPricedItems = items.some((i) => i.unitPrice > 0)

  const goDevis = () => {
    setOpen(false)
    router.push('/#devis')
  }

  return (
    <>
      {/* Mini-barre au-dessus des onglets (mobile) — visible si le panier n'est pas vide */}
      {count > 0 && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom,0px))] z-40 flex min-h-[48px] items-center justify-between gap-2 bg-its-dark px-4 py-2 text-left text-white shadow-lg md:hidden"
          aria-label={`${count} produit${count > 1 ? 's' : ''} dans ma demande, ouvrir le panier rapide`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBasket className="h-5 w-5 text-its-lime" aria-hidden="true" />
            {count} produit{count > 1 ? 's' : ''} dans ma demande
          </span>
          <span className="bg-its-lime px-3 py-1.5 text-[0.8rem] font-bold text-its-dark">Voir</span>
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[85dvh] w-full max-w-lg rounded-none p-0 sm:rounded-none"
        >
          <SheetHeader className="border-b border-its-border bg-its-dark px-4 py-3.5 pr-12">
            <SheetTitle className="font-display text-lg font-bold text-white">
              Ma demande de devis
            </SheetTitle>
            <SheetDescription className="text-[0.85rem] text-white/70">
              {count > 0
                ? `${count} produit${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''} — ajustez les quantités si besoin.`
                : 'Votre demande est vide pour le moment.'}
            </SheetDescription>
          </SheetHeader>

          {count === 0 ? (
            <div className="overflow-y-auto px-4 py-8 text-center">
              <ShoppingBasket className="mx-auto h-10 w-10 text-its-gray" aria-hidden="true" />
              <p className="mt-3 text-sm text-its-gray">
                Ajoutez des produits avec le bouton « + Devis » pour préparer votre demande.
              </p>
              <Button
                className="mt-4 min-h-[48px] w-full bg-its-lime font-semibold text-its-dark hover:bg-its-lime-dark"
                onClick={() => {
                  setOpen(false)
                  router.push('/produits')
                }}
              >
                Voir les produits
              </Button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-its-border overflow-y-auto px-4">
                {items.map((item) => {
                  const min = itemMinQuantity(item)
                  return (
                    <li key={item.id} className="flex gap-3 py-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden border border-its-border bg-its-light">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-its-gray">
                            <ShoppingBasket className="h-5 w-5" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-its-dark">{item.productName}</p>
                        {item.variantName && (
                          <p className="truncate text-xs text-its-gray">{item.variantName}</p>
                        )}
                        <p className="text-xs text-its-gray">
                          {item.unitPrice > 0 ? formatCurrency(item.unitPrice) : 'Prix sur devis'}{' '}
                          {item.minQuantity && item.minQuantity > 1 ? `· min. ${item.minQuantity}` : ''}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex items-stretch border border-its-border">
                            <button
                              type="button"
                              aria-label={`Retirer une unité de ${item.productName}`}
                              disabled={item.quantity <= min}
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="grid h-9 w-9 place-items-center text-its-dark transition-colors hover:bg-its-light disabled:opacity-40"
                            >
                              <Minus className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <span
                              className="grid min-w-[44px] place-items-center border-x border-its-border text-sm font-bold text-its-dark"
                              aria-label={`Quantité de ${item.productName} : ${item.quantity}`}
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Ajouter une unité de ${item.productName}`}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="grid h-9 w-9 place-items-center text-its-dark transition-colors hover:bg-its-light"
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                          <span className="ml-auto text-sm font-bold text-its-dark">
                            {item.unitPrice > 0 ? formatCurrency(item.unitPrice * item.quantity) : '—'}
                          </span>
                          <button
                            type="button"
                            aria-label={`Retirer ${item.productName} de ma demande`}
                            onClick={() => removeItem(item.id)}
                            className="grid h-9 w-9 place-items-center text-its-gray transition-colors hover:text-its-dark"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="border-t border-its-border bg-white px-4 py-3">
                {hasPricedItems && (
                  <p className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-its-gray">Total indicatif (hors personnalisation)</span>
                    <b className="font-display text-lg font-bold text-its-dark">{formatCurrency(total)}</b>
                  </p>
                )}
                <Button
                  onClick={goDevis}
                  className="flex min-h-[50px] w-full items-center justify-center bg-its-lime font-semibold text-its-dark hover:bg-its-lime-dark"
                >
                  Continuer ma demande
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    router.push('/panier')
                  }}
                  className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 border-[1.5px] border-its-dark font-semibold text-its-dark transition-colors hover:bg-its-light"
                >
                  Panier complet et commande
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
