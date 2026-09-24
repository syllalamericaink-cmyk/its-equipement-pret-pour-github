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
  hasPersonalization: boolean
  personalizationOptions: { label: string; type: string }[]
  personalization: CartPersonalization
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updatePersonalization: (id: string, p: Partial<CartPersonalization>) => void
  clearCart: () => void
  itemCount: () => number
  subtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
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
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, id: `${item.productId}-${item.variantId ?? 'default'}-${Date.now()}` }] }
        })
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        }))
      },

      updatePersonalization: (id, p) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, personalization: { ...i.personalization, ...p } }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      itemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },

      subtotal: () => {
        return get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
      },
    }),
    {
      name: 'its-equip-cart',
    }
  )
)