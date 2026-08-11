'use client'

import { useState } from 'react'
import { Product, Category, ModifierGroup, Modifier } from '@/types'
import { usePosStore } from '@/stores/usePosStore'
import { ShoppingCart, Plus, Minus, X, Check } from 'lucide-react'
import { PaymentModal } from './PaymentModal'
import { useEffect } from 'react'
import { SyncService } from '@/services/sync'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Receipt, ReceiptData } from './Receipt'
import { ShiftBlocker, CloseShiftButton } from './ShiftManager'
import { useSettings } from '@/components/SettingsProvider'

export function PosApp({
  categories,
  products,
  hasActiveShift = true
}: {
  categories: Category[]
  products: Product[]
  hasActiveShift?: boolean
}) {
  const settings = useSettings()

  const {
    activeCategoryId,
    setActiveCategory,
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotal,
    discountPercent
  } = usePosStore()

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([])
  
  // Modals / Toggles
  const [showCart, setShowCart] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  // Sync menu locally on load
  useEffect(() => {
    SyncService.pullMenu()
    
    // Attempt outbox push every 30 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        SyncService.pushOutbox()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Read from local DB, fallback to props
  const localCategories = useLiveQuery(() => db.categories.toArray())
  const localProducts = useLiveQuery(() => db.products.toArray())

  const activeCategories = localCategories?.length ? localCategories : categories
  const activeProducts = localProducts?.length ? localProducts : products

  const filteredProducts = activeCategoryId
    ? activeProducts.filter(p => p.category_id === activeCategoryId)
    : activeProducts

  const handleProductClick = (product: Product) => {
    if (product.modifier_groups && product.modifier_groups.length > 0) {
      setSelectedProduct(product)
      setSelectedModifiers([])
    } else {
      addToCart(product, [], 1)
    }
  }

  const handleAddWithModifiers = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, selectedModifiers, 1)
      setSelectedProduct(null)
      setSelectedModifiers([])
    }
  }

  const handleCheckout = () => {
    setShowPayment(true)
  }

  const handlePaymentSuccess = (receipt: ReceiptData) => {
    setShowPayment(false)
    setReceiptData(receipt)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {!hasActiveShift && <ShiftBlocker />}
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Categories Header */}
        <div className="bg-white p-4 shadow-sm z-10 flex items-center justify-between shrink-0">
          <div className="flex overflow-x-auto space-x-2 hide-scrollbar">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-6 py-3 rounded-full whitespace-nowrap font-medium transition-colors ${
              !activeCategoryId ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          {activeCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-6 py-3 rounded-full whitespace-nowrap font-medium transition-colors ${
                activeCategoryId === category.id ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
          </div>
          <div className="ml-4 shrink-0">
            {hasActiveShift && <CloseShiftButton />}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group active:scale-95"
              >
                <div className="w-24 h-24 bg-orange-100 rounded-full mb-3 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  {/* Real images will go here, using a placeholder for now */}
                  <span className="text-2xl font-bold">{product.name.charAt(0)}</span>
                </div>
                <h3 className="font-medium text-gray-900 leading-tight">{product.name}</h3>
                <p className="text-orange-600 font-semibold mt-1">{settings.currency_symbol} {Number(product.base_price).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar (Desktop) / Bottom Sheet (Mobile) */}
      <div className={`
        fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out
        ${showCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:relative'}
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center"><ShoppingCart className="mr-2" /> Current Order</h2>
          <button onClick={() => setShowCart(false)} className="p-2 bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex p-6 border-b items-center justify-between bg-orange-500 text-white">
          <h2 className="text-xl font-bold flex items-center"><ShoppingCart className="mr-2" /> Current Order</h2>
          <span className="bg-white text-orange-500 px-3 py-1 rounded-full text-sm font-bold">{cart.length} items</span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingCart className="w-16 h-16 opacity-20" />
              <p>No items in cart</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.id} className="bg-gray-50 rounded-xl p-3 flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{item.product.name}</h4>
                      {item.modifiers.map(mod => (
                        <p key={mod.id} className="text-xs text-gray-500">+ {mod.name} ({settings.currency_symbol} {Number(mod.price).toFixed(2)})</p>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{settings.currency_symbol} {item.itemTotal.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center space-x-3 bg-white rounded-lg shadow-sm">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-gray-500 hover:text-orange-500"><Minus className="w-5 h-5" /></button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-gray-500 hover:text-orange-500"><Plus className="w-5 h-5" /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-sm font-medium hover:underline">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="p-6 border-t bg-gray-50">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{settings.currency_symbol} {getSubtotal().toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({discountPercent}%)</span>
                <span>-{settings.currency_symbol} {(getSubtotal() * (discountPercent/100)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{settings.currency_symbol} {getTaxAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-gray-900 pt-3 border-t border-gray-200">
              <span>Total</span>
              <span>{settings.currency_symbol} {getTotal().toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-2xl shadow-sm transition-colors"
          >
            Pay {settings.currency_symbol} {getTotal().toFixed(2)}
          </button>
        </div>
      </div>

      {/* Mobile Cart Toggle FAB */}
      {!showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="lg:hidden fixed bottom-6 right-6 bg-orange-500 text-white p-4 rounded-full shadow-2xl z-30 flex items-center justify-center animate-bounce-slight"
        >
          <div className="relative">
            <ShoppingCart className="w-7 h-7" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-orange-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-orange-500">
                {cart.length}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Modifier Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-orange-500 text-white">
              <h2 className="text-xl font-bold">Customize {selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-1 hover:bg-orange-600 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {selectedProduct.modifier_groups?.map(group => (
                <div key={group.id}>
                  <h3 className="font-bold text-gray-900 mb-3">{group.name} {group.is_required && <span className="text-red-500">*</span>}</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {group.modifiers?.map(modifier => {
                      const isSelected = selectedModifiers.some(m => m.id === modifier.id)
                      return (
                        <button
                          key={modifier.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedModifiers(prev => prev.filter(m => m.id !== modifier.id))
                            } else {
                              if (group.max_selections === 1) {
                                const otherModsInGroup = group.modifiers?.map(m => m.id) || []
                                setSelectedModifiers(prev => [...prev.filter(m => !otherModsInGroup.includes(m.id)), modifier])
                              } else {
                                setSelectedModifiers(prev => [...prev, modifier])
                              }
                            }
                          }}
                          className={`p-3 rounded-xl border-2 text-left flex justify-between items-center transition-all ${
                            isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" checked={isSelected} readOnly className="w-5 h-5 text-orange-500 rounded" />
                            <span>{modifier.name}</span>
                          </div>
                          <span className="text-sm text-gray-500">+ {settings.currency_symbol} {Number(modifier.price).toFixed(2)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={handleAddWithModifiers}
                className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl shadow hover:bg-orange-600 flex justify-center items-center"
              >
                <Check className="mr-2" /> Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal 
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Receipt Modal (Triggers native print automatically) */}
      <Receipt data={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  )
}
