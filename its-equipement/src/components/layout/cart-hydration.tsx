'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/stores/cart-store'

/**
 * Réhydrate le panier (localStorage) après le montage côté client.
 * Combiné à skipHydration: true du store, ça garantit que le premier rendu
 * (serveur ET client) affiche un panier vide : plus de décalage d'hydratation
 * sur le badge du panier et les pages panier/commande.
 */
export function CartHydration() {
  useEffect(() => {
    void useCartStore.persist.rehydrate()
  }, [])
  return null
}
