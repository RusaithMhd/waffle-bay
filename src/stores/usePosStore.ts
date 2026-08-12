import { create } from 'zustand'
import { Product, Modifier } from '@/types'

export interface CartItem {
  id: string // local unique id for the cart line item (e.g. timestamp)
  product: Product
  quantity: number
  modifiers: Modifier[]
  itemTotal: number // (product.price + sum(modifier.prices)) * quantity
  note?: string
  customPrice?: number
}

interface PosState {
  cart: CartItem[]
  discountPercent: number
  taxRatePercent: number
  activeCategoryId: string | null

  // Actions
  setActiveCategory: (id: string | null) => void
  addToCart: (product: Product, modifiers: Modifier[], quantity: number) => void
  updateQuantity: (itemId: string, delta: number) => void
  updateCartItemDetails: (itemId: string, note?: string, customPrice?: number) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  setDiscount: (percent: number) => void
  setTaxRate: (percent: number) => void

  // Computed equivalent getters
  getSubtotal: () => number
  getDiscountAmount: () => number
  getTaxAmount: () => number
  getTotal: () => number
}

const calculateItemTotal = (product: Product, modifiers: Modifier[], quantity: number, customPrice?: number) => {
  const basePrice = customPrice !== undefined ? Number(customPrice) : Number(product.base_price)
  const modsPrice = modifiers.reduce((sum, mod) => sum + Number(mod.price), 0)
  return (basePrice + modsPrice) * quantity
}

const areModifiersEqual = (modsA: Modifier[], modsB: Modifier[]) => {
  if (modsA.length !== modsB.length) return false
  const idsA = [...modsA].map(m => m.id).sort()
  const idsB = [...modsB].map(m => m.id).sort()
  return idsA.every((id, i) => id === idsB[i])
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  discountPercent: 0,
  taxRatePercent: 0, // Defaults can be updated from DB settings later
  activeCategoryId: null,

  setActiveCategory: (id) => set({ activeCategoryId: id }),

  addToCart: (product, modifiers, quantity) => {
    set((state) => {
      const existingItemIndex = state.cart.findIndex(
        (item) => item.product.id === product.id && areModifiersEqual(item.modifiers, modifiers)
      )

      if (existingItemIndex !== -1) {
        // Increase quantity of existing identical item
        const newCart = [...state.cart]
        const existingItem = newCart[existingItemIndex]
        const newQuantity = existingItem.quantity + quantity
        newCart[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          itemTotal: calculateItemTotal(product, modifiers, newQuantity, existingItem.customPrice)
        }
        return { cart: newCart }
      }

      const newItem: CartItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        product,
        modifiers,
        quantity,
        itemTotal: calculateItemTotal(product, modifiers, quantity)
      }
      return { cart: [...state.cart, newItem] }
    })
  },

  updateQuantity: (itemId, delta) => {
    set((state) => {
      const newCart = state.cart.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + delta)
          return {
            ...item,
            quantity: newQuantity,
            itemTotal: calculateItemTotal(item.product, item.modifiers, newQuantity, item.customPrice)
          }
        }
        return item
      })
      return { cart: newCart }
    })
  },

  updateCartItemDetails: (itemId, note, customPrice) => {
    set((state) => {
      const newCart = state.cart.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            note: note !== undefined ? note : item.note,
            customPrice: customPrice !== undefined ? customPrice : item.customPrice,
            itemTotal: calculateItemTotal(
              item.product, 
              item.modifiers, 
              item.quantity, 
              customPrice !== undefined ? customPrice : item.customPrice
            )
          }
        }
        return item
      })
      return { cart: newCart }
    })
  },

  removeFromCart: (itemId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== itemId)
    }))
  },

  clearCart: () => set({ cart: [], discountPercent: 0 }),

  setDiscount: (percent) => set({ discountPercent: Math.max(0, Math.min(100, percent)) }),
  
  setTaxRate: (percent) => set({ taxRatePercent: Math.max(0, percent) }),

  getSubtotal: () => {
    const { cart } = get()
    return cart.reduce((sum, item) => sum + item.itemTotal, 0)
  },

  getDiscountAmount: () => {
    const { getSubtotal, discountPercent } = get()
    return getSubtotal() * (discountPercent / 100)
  },

  getTaxAmount: () => {
    const { getSubtotal, getDiscountAmount, taxRatePercent } = get()
    const discountedSubtotal = getSubtotal() - getDiscountAmount()
    return discountedSubtotal * (taxRatePercent / 100)
  },

  getTotal: () => {
    const { getSubtotal, getDiscountAmount, getTaxAmount } = get()
    return getSubtotal() - getDiscountAmount() + getTaxAmount()
  }
}))
