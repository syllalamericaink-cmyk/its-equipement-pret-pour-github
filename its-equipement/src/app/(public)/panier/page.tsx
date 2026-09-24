'use client'

import Link from 'next/link'
import { ShoppingBag, Minus, Plus, Trash2, FileText, MessageCircle, Clock } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const fmt = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'

export default function PanierPage() {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const subtotal = useCartStore((s) => s.subtotal)

  if (items.length === 0) {
    return (
      <section className="container py-16 px-4 md:px-6 max-w-2xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center size-20 rounded-full bg-muted">
            <ShoppingBag className="size-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Votre panier est vide
        </h1>
        <p className="text-muted-foreground mb-8">
          Ajoutez des produits a votre panier pour passer commande.
        </p>
        <Button asChild size="lg">
          <Link href="/produits">
            <ShoppingBag className="size-4 mr-2" />
            Voir le catalogue
          </Link>
        </Button>
      </section>
    )
  }

  return (
    <section className="container py-8 px-4 md:px-6 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Votre panier
      </h1>

      {items.some((i) => i.hasPersonalization) && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
          <Clock className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Produits personnalisés : délai 24h.</span>{' '}
            Les produits avec personnalisation seront préparés sous 24h après validation de votre commande sur WhatsApp.
          </p>
        </div>
      )}

      <div className="hidden lg:block">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-center">Quantite</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const lineTotal = item.unitPrice * item.quantity
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div
                        className="size-16 rounded-lg bg-muted shrink-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${item.productImage || '/placeholder.png'})`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.productName}</span>
                        {item.variantName && (
                          <span className="text-sm text-muted-foreground">
                            {item.variantName}
                          </span>
                        )}
                        {item.hasPersonalization && (
                          <Badge variant="secondary" className="w-fit text-xs">
                            Personnalise
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Diminuer"
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Augmenter"
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(lineTotal)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:hidden">
        {items.map((item) => {
          const lineTotal = item.unitPrice * item.quantity
          return (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex gap-4">
                <div
                  className="size-16 rounded-lg bg-muted shrink-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${item.productImage || '/placeholder.png'})`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      {item.hasPersonalization && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Personnalise
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label="Diminuer"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Augmenter"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {fmt(item.unitPrice)} / piece
                  </p>
                  <p className="font-semibold">{fmt(lineTotal)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-lg border p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-medium">Sous-total</span>
          <span className="text-lg font-bold">{fmt(subtotal())}</span>
        </div>
        <Separator className="mb-4" />
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/commande">
              <MessageCircle className="size-4 mr-2" />
              Commander sur WhatsApp
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full h-12 text-base">
            <Link href="/devis">
              <FileText className="size-4 mr-2" />
              Demander un devis
            </Link>
          </Button>
        </div>
        <div className="text-center mt-4">
          <Link
            href="/produits"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Continuer vos achats
          </Link>
        </div>
      </div>
    </section>
  )
}