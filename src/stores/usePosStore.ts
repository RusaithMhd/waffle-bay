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

export interface HeldOrder {
  id: string
  name: string
  cart: CartItem[]
  orderType: 'DINE_IN' | 'TAKEAWAY'
  discountPercent: number
  created_at: number
}

interface PosState {
  cart: CartItem[]
  discountPercent: number
  taxRatePercent: number
  activeCategoryId: string | null
  orderType: 'DINE_IN' | 'TAKEAWAY'
  heldOrders: HeldOrder[]

  // Actions
  setActiveCategory: (id: string | null) => void
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY') => void
  addToCart: (product: Product, modifiers: Modifier[], quantity: number, note?: string) => void
  updateQuantity: (itemId: string, delta: number) => void
  updateCartItemDetails: (itemId: string, note?: string, customPrice?: number) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  setDiscount: (percent: number) => void
  setTaxRate: (percent: number) => void
  setHeldOrders: (orders: HeldOrder[]) => void
  loadHeldOrders: () => void
  holdOrder: (name: string) => void
  resumeOrder: (id: string) => void
  deleteHeldOrder: (id: string) => void

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
  orderType: 'DINE_IN',
  heldOrders: [],

  setActiveCategory: (id) => set({ activeCategoryId: id }),
  setOrderType: (type) => set({ orderType: type }),
  setHeldOrders: (orders) => set({ heldOrders: orders }),

  loadHeldOrders: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wb_held_orders')
      if (saved) {
        try {
          set({ heldOrders: JSON.parse(saved) })
        } catch (e) {
          console.error('Error loading held orders:', e)
        }
      }
    }
  },

  holdOrder: (name) => {
    set((state) => {
      if (state.cart.length === 0) return {}
      const newHeld: HeldOrder = {
        id: Date.now().toString(),
        name: name || `Order #${Date.now().toString().slice(-4)}`,
        cart: state.cart,
        orderType: state.orderType,
        discountPercent: state.discountPercent,
        created_at: Date.now()
      }
      const updated = [...state.heldOrders, newHeld]
      localStorage.setItem('wb_held_orders', JSON.stringify(updated))
      return {
        heldOrders: updated,
        cart: [],
        discountPercent: 0,
        orderType: 'DINE_IN'
      }
    })
  },

  resumeOrder: (id) => {
    set((state) => {
      const order = state.heldOrders.find(o => o.id === id)
      if (!order) return {}
      const updated = state.heldOrders.filter(o => o.id !== id)
      localStorage.setItem('wb_held_orders', JSON.stringify(updated))
      return {
        heldOrders: updated,
        cart: order.cart,
        orderType: order.orderType,
        discountPercent: order.discountPercent
      }
    })
  },

  deleteHeldOrder: (id) => {
    set((state) => {
      const updated = state.heldOrders.filter(o => o.id !== id)
      localStorage.setItem('wb_held_orders', JSON.stringify(updated))
      return { heldOrders: updated }
    })
  },

  addToCart: (product, modifiers, quantity, note) => {
    set((state) => {
      // Create a unique hash for the product + modifiers combo to group same items
      const modsHash = modifiers.map(m => m.id).sort().join(',')
      const itemHash = `${product.id}-${modsHash}-${note || ''}`
      
      const existingItemIndex = state.cart.findIndex(
        i => {
          const iHash = `${i.product.id}-${i.modifiers.map(m => m.id).sort().join(',')}-${i.note || ''}`
          return iHash === itemHash && i.customPrice === undefined
        }
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
        itemTotal: calculateItemTotal(product, modifiers, quantity),
        note
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

  clearCart: () => set({ cart: [], discountPercent: 0, orderType: 'DINE_IN' }),

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
