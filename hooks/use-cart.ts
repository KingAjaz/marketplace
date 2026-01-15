/**
 * Cart Store using Zustand
 * Manages shopping cart state across the application
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  productName: string
  productImage: string
  pricingUnitId: string
  unit: string
  price: number
  quantity: number
  shopId: string
  shopName: string
}

interface CartStore {
  items: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (pricingUnitId: string) => void
  updateQuantity: (pricingUnitId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (item) => {
        const existingItem = get().items.find(
          (i) => i.pricingUnitId === item.pricingUnitId
        )
        if (existingItem) {
          set({
            items: get().items.map((i) =>
              i.pricingUnitId === item.pricingUnitId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          })
        } else {
          set({ items: [...get().items, item] })
        }
      },
      removeFromCart: (pricingUnitId) => {
        set({
          items: get().items.filter((i) => i.pricingUnitId !== pricingUnitId),
        })
      },
      updateQuantity: (pricingUnitId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(pricingUnitId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.pricingUnitId === pricingUnitId ? { ...i, quantity } : i
          ),
        })
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
