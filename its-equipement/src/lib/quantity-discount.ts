/**
 * Réductions par palier de quantité — côté client.
 * Les paliers sont définis dans l'admin (QuantityDiscount) et renvoyés par
 * l'API publique produits. Le calcul affiché ici est une PRÉVISUALISATION :
 * c'est le serveur qui applique définitivement la remise à l'enregistrement
 * de la commande (public-order.service).
 */

export interface QuantityDiscountLite {
  minQuantity: number
  discountPercent: number
}

/** Meilleur palier de réduction atteint pour cette quantité (0 si aucun). */
export function applicableDiscount(
  discounts: QuantityDiscountLite[] | undefined | null,
  quantity: number,
): number {
  if (!discounts || discounts.length === 0) return 0
  let best = 0
  for (const d of discounts) {
    if (quantity >= d.minQuantity && d.discountPercent > best) {
      best = d.discountPercent
    }
  }
  return best
}

/** Total de ligne après remise quantité (prévisualisation). */
export function discountedLineTotal(
  unitPrice: number,
  quantity: number,
  discountPercent: number,
): number {
  return Math.round(unitPrice * quantity * (1 - discountPercent / 100) * 100) / 100
}
