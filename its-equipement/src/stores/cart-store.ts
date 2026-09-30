import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartPersonalization {
  impression: boolean
  logo: boolean
  logoFileId?: string
  logoFileName?: string
  texte: string
  emplacement: string
  taille?: string
  couleur?: string
  instructions?: string
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  productSlug: string
  productSku?: string
  productImage: string
  variantId?: string
  variantName?: string
  quantity: number
  unitPrice: number
  /** Quantité minimum de commande définie par l'admin (défaut 1). */
  minQuantity?: number
  hasPersonalization: boolean
  personalizationOptions: { label: string; type: string }[]
  personalization: CartPersonalization
}

/** Quantité minimum applicable pour un article (compat paniers anciens). */
export function itemMinQuantity(item: Pick<CartItem, 'minQuantity'>): number {
  return Math.max(1, Number(item.minQuantity) || 1)
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  subtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          // La quantité ajoutée ne peut pas être sous le minimum du produit
          const min = itemMinQuantity(item)
          const quantity = Math.max(Number(item.quantity) || 1, min)
          const existing = state.items.find(
            (i) =>
              i.productId === item.productId &&
              i.variantId === item.variantId &&
              JSON.stringify(i.personalization) === JSON.stringify(item.personalization)
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id
                  ? { ...i, quantity: i.quantity + quantity, minQuantity: i.minQuantity ?? min }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity, id: `${item.productId}-${item.variantId ?? 'default'}-${Date.now()}` }] }
        })
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      },

      updateQuantity: (id, quantity) => {
        const item = get().items.find((i) => i.id === id)
        const min = item ? itemMinQuantity(item) : 1
        if (quantity < min) return
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        }))
      },

      clearCart: () => set({ items: [] }),

      subtotal: () => {
        return get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
      },
    }),
    {
      name: 'its-equip-cart',
      // Réhydratation manuelle (composant CartHydration) : évite le décalage
      // entre le HTML rendu côté serveur (panier vide) et le localStorage.
      skipHydration: true,
    }
  )
)
