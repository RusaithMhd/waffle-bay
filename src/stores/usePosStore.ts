import { useState } from 'react'
import { Product, Category, ModifierGroup, Modifier } from '@/types'
import { calculateOrderTotals } from '@/lib/calculations'

export interface CartItem {
  id: string // local unique id for the cart line item (e.g. timestamp)
  product: Product
  quantity: number
  modifiers: Modifier[]
  itemTotal: number // (product.price + sum(modifier.prices)) * quantity
  note?: string
  customPrice?: number
  saved?: boolean
}

export interface HeldOrder {
  id: string
  name: string
  cart: CartItem[]
  orderType: 'DINE_IN' | 'TAKEAWAY'
  discountType: 'percentage' | 'amount'
  discountValue: number
  created_at: number
}

interface PosState {
  cart: CartItem[]
  discountType: 'percentage' | 'amount'
  discountValue: number
  taxRatePercent: number
  activeCategoryId: string | null
  orderType: 'DINE_IN' | 'TAKEAWAY'
  tableNumber: string
  heldOrders: HeldOrder[]
  activeOrderId: string | null

  // Actions
  setActiveCategory: (id: string | null) => void
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY') => void
  setTableNumber: (val: string) => void
  addToCart: (product: Product, modifiers: Modifier[], quantity: number, note?: string) => void
  updateQuantity: (itemId: string, delta: number) => void
  updateCartItemDetails: (itemId: string, note?: string, customPrice?: number) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  setDiscount: (value: number) => void
  setDiscountType: (type: 'percentage' | 'amount') => void
  setTaxRate: (percent: number) => void
  setHeldOrders: (orders: HeldOrder[]) => void
  loadHeldOrders: () => void
  holdOrder: (name: string) => void
  resumeOrder: (id: string) => void
  deleteHeldOrder: (id: string) => void
  setActiveOrderId: (id: string | null) => void
  loadSavedOrder: (order: any) => void

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

// Re-import create since it was removed from top chunk
import { create } from 'zustand'

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  discountType: 'percentage',
  discountValue: 0,
  taxRatePercent: 0, // Defaults can be updated from DB settings later
  activeCategoryId: null,
  orderType: 'DINE_IN',
  tableNumber: '',
  heldOrders: [],
  activeOrderId: null,

  setActiveCategory: (id) => set({ activeCategoryId: id }),
  setOrderType: (type) => set((state) => ({ 
    orderType: type,
    tableNumber: type === 'TAKEAWAY' ? '' : state.tableNumber 
  })),
  setTableNumber: (val) => set({ tableNumber: val }),
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
        discountType: state.discountType,
        discountValue: state.discountValue,
        created_at: Date.now()
      }
      const updated = [...state.heldOrders, newHeld]
      localStorage.setItem('wb_held_orders', JSON.stringify(updated))
      return {
        heldOrders: updated,
        cart: [],
        discountType: 'percentage',
        discountValue: 0,
        orderType: 'DINE_IN',
        tableNumber: ''
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
        discountType: order.discountType ?? 'percentage',
        discountValue: order.discountValue ?? 0
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

  clearCart: () => set({ cart: [], discountType: 'percentage', discountValue: 0, orderType: 'DINE_IN', tableNumber: '', activeOrderId: null }),

  setDiscount: (value) => set({ discountValue: Math.max(0, value) }),
  
  setDiscountType: (type) => set({ discountType: type, discountValue: 0 }),
  
  setTaxRate: (percent) => set({ taxRatePercent: Math.max(0, percent) }),

  setActiveOrderId: (id) => set({ activeOrderId: id }),

  loadSavedOrder: (order) => {
    const mappedCart: CartItem[] = (order.order_items || []).map((i: any) => {
      const modifiers = (i.order_item_modifiers || []).map((m: any) => ({
        id: m.modifier_id || m.id,
        name: m.modifier_name_snapshot,
        price: Number(m.modifier_price_snapshot)
      }))
      
      return {
        id: i.id,
        product: {
          id: i.product_id,
          name: i.product_name_snapshot,
          base_price: Number(i.unit_price_snapshot)
        } as any,
        quantity: i.quantity,
        note: i.notes || undefined,
        customPrice: Number(i.unit_price_snapshot),
        modifiers,
        itemTotal: Number(i.subtotal),
        saved: true
      }
    })

    set({
      activeOrderId: order.id,
      cart: mappedCart,
      discountType: order.discount_type || 'percentage',
      discountValue: Number(order.discount_value || 0),
      orderType: order.order_type || 'DINE_IN',
      tableNumber: order.table_number || ''
    })
  },

  getSubtotal: () => {
    const { cart } = get()
    return cart.reduce((sum, item) => sum + item.itemTotal, 0)
  },

  getDiscountAmount: () => {
    const { getSubtotal, discountType, discountValue, taxRatePercent } = get()
    const totals = calculateOrderTotals(getSubtotal(), discountType, discountValue, taxRatePercent)
    return totals.discountAmount
  },

  getTaxAmount: () => {
    const { getSubtotal, discountType, discountValue, taxRatePercent } = get()
    const totals = calculateOrderTotals(getSubtotal(), discountType, discountValue, taxRatePercent)
    return totals.taxAmount
  },

  getTotal: () => {
    const { getSubtotal, discountType, discountValue, taxRatePercent } = get()
    const totals = calculateOrderTotals(getSubtotal(), discountType, discountValue, taxRatePercent)
    return totals.total
  }
}))
