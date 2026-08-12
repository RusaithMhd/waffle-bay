'use client'

import { useState } from 'react'
import { Product, Category, ModifierGroup, Modifier } from '@/types'
import { usePosStore } from '@/stores/usePosStore'
import { ShoppingCart, Plus, Minus, X, Check, Search, Menu, MoreVertical, Image as ImageIcon } from 'lucide-react'
import { PaymentModal } from './PaymentModal'
import { useEffect } from 'react'
import { SyncService } from '@/services/sync'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Receipt, ReceiptData } from './Receipt'
import { ShiftBlocker, CloseShiftButton } from './ShiftManager'
import { useSettings } from '@/components/SettingsProvider'
import Link from 'next/link'
import Image from 'next/image'

export function PosApp({
  categories,
  products,
  hasActiveShift = true,
  globalToppingsGroup,
  userRole
}: {
  categories: Category[]
  products: Product[]
  hasActiveShift?: boolean
  globalToppingsGroup?: any
  userRole?: string | null
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
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals / Toggles
  const [showCart, setShowCart] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

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

  const filteredProducts = activeProducts.filter(p => {
    const matchesCategory = activeCategoryId ? p.category_id === activeCategoryId : true
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleProductClick = (product: Product) => {
    const hasGlobalToppings = globalToppingsGroup && globalToppingsGroup.modifiers && globalToppingsGroup.modifiers.length > 0
    const hasProductModifiers = product.modifier_groups && product.modifier_groups.length > 0
    
    if (hasProductModifiers || hasGlobalToppings) {
      let mergedGroups = product.modifier_groups ? [...product.modifier_groups] : []
      
      // Filter out the old 'Extra Toppings' group to keep only the global 'Toppings'
      mergedGroups = mergedGroups.filter(g => g.name !== 'Extra Toppings')
      
      if (hasGlobalToppings && !mergedGroups.some(g => g.id === globalToppingsGroup.id)) {
        mergedGroups.push(globalToppingsGroup)
      }
      setSelectedProduct({ ...product, modifier_groups: mergedGroups })
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

  // Extracted Cart Internals for reuse in Desktop and Mobile views
  const CartInternals = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#6B7280] space-y-3">
            <ShoppingCart className="w-12 h-12 opacity-30" />
            <p className="font-medium text-[15px]">Cart is empty</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.map((item) => (
              <li key={item.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-col shadow-sm group relative">
                <button onClick={() => removeFromCart(item.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden lg:block hover:bg-red-200">
                  <X className="w-4 h-4" />
                </button>
                <div className="flex justify-between items-start mb-2 pr-4">
                  <div>
                    <h4 className="font-semibold text-[#111827] text-[14px]">{item.product.name}</h4>
                    {item.modifiers.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {item.modifiers.map(mod => (
                          <p key={mod.id} className="text-[12px] text-[#6B7280]">
                            + {mod.name} <span className="ml-0.5">(+{settings.currency_symbol}{Number(mod.price).toFixed(2)})</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#111827] text-[14px]">{settings.currency_symbol} {item.itemTotal.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
                  <div className="flex items-center space-x-1 bg-[#F8FAFC] rounded-lg p-0.5 border border-[#E5E7EB]">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors"><Minus className="w-4 h-4" /></button>
                    <span className="font-bold text-[14px] w-8 text-center text-[#111827]">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors"><Plus className="w-4 h-4" /></button>
                  </div>
                  {isMobile && (
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-sm font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors lg:hidden">Remove</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totals & Checkout */}
      <div className="p-4 bg-white border-t border-[#E5E7EB] shrink-0">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-[14px] font-medium text-[#6B7280]">
            <span>Subtotal</span>
            <span className="text-[#111827]">{settings.currency_symbol} {getSubtotal().toFixed(2)}</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex justify-between text-[14px] font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
              <span>Discount ({discountPercent}%)</span>
              <span>-{settings.currency_symbol} {(getSubtotal() * (discountPercent/100)).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[14px] font-medium text-[#6B7280]">
            <span>Tax</span>
            <span className="text-[#111827]">{settings.currency_symbol} {getTaxAmount().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[18px] font-bold text-[#111827] pt-2 border-t border-[#E5E7EB]">
            <span>Total</span>
            <span>{settings.currency_symbol} {getTotal().toFixed(2)}</span>
          </div>
        </div>
        <button
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className="w-full bg-[#FF6500] hover:bg-[#e65a00] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-[16px] font-bold py-3.5 rounded-xl shadow-sm transition-colors flex items-center justify-center active:scale-[0.98]"
        >
          Pay {settings.currency_symbol} {getTotal().toFixed(2)}
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-full bg-[#F8FAFC] text-[#111827] overflow-hidden font-sans">
      {!hasActiveShift && <ShiftBlocker />}
      
      {/* LEFT SIDE: CATALOG */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center space-x-4">
            {userRole !== 'cashier' && (
              <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-[#6B7280] transition-colors">
                <Menu className="w-6 h-6" />
              </Link>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#FF6500] rounded-lg flex items-center justify-center text-white font-bold text-[16px]">W</div>
              <h1 className="text-[17px] font-semibold tracking-tight text-[#111827]">Waffle Bay</h1>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 -mr-2 rounded-lg hover:bg-gray-100 text-[#6B7280] transition-colors"
            >
              <MoreVertical className="w-6 h-6" />
            </button>
            
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#E5E7EB] z-50 overflow-hidden py-1">
                  <button className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-gray-50 transition-colors">Current Shift</button>
                  <button className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-gray-50 transition-colors">Cash Drawer</button>
                  {hasActiveShift && (
                    <div onClick={() => setShowMoreMenu(false)}>
                      <CloseShiftButton className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center" />
                    </div>
                  )}
                  <div className="h-px bg-[#E5E7EB] my-1" />
                  <Link href="/kitchen" className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-gray-50 transition-colors block">Kitchen Display (KOT)</Link>
                  {userRole !== 'cashier' && (
                    <>
                      <div className="h-px bg-[#E5E7EB] my-1" />
                      <button className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-gray-50 transition-colors">Reports</button>
                      <button className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-gray-50 transition-colors">Settings</button>
                    </>
                  )}
                  <div className="h-px bg-[#E5E7EB] my-1" />
                  <Link href="/login" className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-gray-50 transition-colors block">Logout</Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CATEGORY NAVIGATION */}
        <div className="bg-white border-b border-[#E5E7EB] shrink-0 z-10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex overflow-x-auto hide-scrollbar px-4 py-3 space-x-2.5">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-5 py-2 rounded-xl whitespace-nowrap text-[14px] font-semibold transition-all duration-200 ${
                !activeCategoryId 
                  ? 'bg-[#FF6500] text-white shadow-[0_4px_12px_rgba(255,101,0,0.25)] scale-[1.02]' 
                  : 'bg-gray-100/80 text-[#6B7280] hover:bg-gray-200/80 hover:text-[#111827]'
              }`}
            >
              All Items
            </button>
            {activeCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-5 py-2 rounded-xl whitespace-nowrap text-[14px] font-semibold transition-all duration-200 ${
                  activeCategoryId === category.id 
                    ? 'bg-[#FF6500] text-white shadow-[0_4px_12px_rgba(255,101,0,0.25)] scale-[1.02]' 
                    : 'bg-gray-100/80 text-[#6B7280] hover:bg-gray-200/80 hover:text-[#111827]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="px-4 py-4 shrink-0 bg-[#F8FAFC]">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9CA3AF] group-focus-within:text-[#FF6500] transition-colors" />
            <input
              type="text"
              placeholder="Search delicious waffles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-transparent bg-white rounded-xl focus:outline-none focus:border-[#FF6500]/20 focus:ring-4 focus:ring-[#FF6500]/10 transition-all text-[14px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] placeholder-[#9CA3AF] font-medium text-[#111827]"
            />
          </div>
        </div>

        {/* PRODUCT GRID */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 lg:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => {
              const inCartCount = cart.filter(item => item.product.id === product.id).reduce((sum, item) => sum + item.quantity, 0)
              
              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:border-[#FF6500]/50 hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col active:scale-[0.97] relative text-left group"
                >
                  {/* Quantity Badge */}
                  {inCartCount > 0 && (
                    <div className="absolute top-2.5 right-2.5 bg-[#FF6500] text-white text-[12px] font-bold w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-md ring-2 ring-white">
                      {inCartCount}
                    </div>
                  )}
                  
                  {/* Image Area */}
                  <div className="aspect-[4/3] w-full bg-[#F3F4F6] relative overflow-hidden">
                    {product.image_url ? (
                      <Image 
                        src={product.image_url} 
                        alt={product.name} 
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#9CA3AF] group-hover:bg-[#FFF1DC] group-hover:text-[#FF6500] transition-colors duration-300">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                    
                    {/* Add button overlay on hover (desktop mainly, but provides a nice touch) */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  
                  {/* Details */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between">
                    <h3 className="font-semibold text-[#111827] text-[15px] leading-snug mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <p className="text-[#111827] font-bold text-[15px]">{settings.currency_symbol} {Number(product.base_price).toFixed(2)}</p>
                      
                      <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#6B7280] group-hover:bg-[#FF6500] group-hover:text-white flex items-center justify-center transition-colors duration-300">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: DESKTOP CART */}
      <div className="hidden lg:flex w-[360px] xl:w-[400px] bg-white border-l border-[#E5E7EB] flex-col h-full shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-30">
        <div className="px-5 py-4 border-b border-[#E5E7EB] bg-white flex justify-between items-center shrink-0">
          <h2 className="text-[16px] font-semibold text-[#111827] flex items-center">
            Current Order
          </h2>
          <span className="bg-[#FFF1DC] text-[#FF6500] px-2.5 py-0.5 rounded text-[12px] font-bold">{cart.length} items</span>
        </div>
        <CartInternals isMobile={false} />
      </div>

      {/* MOBILE FLOATING CART BUTTON */}
      <div className="lg:hidden fixed bottom-6 inset-x-4 z-30">
        <button
          onClick={() => setShowCart(true)}
          disabled={cart.length === 0}
          className="w-full bg-[#FF6500] disabled:bg-gray-300 disabled:shadow-none text-white p-4 rounded-2xl shadow-[0_8px_20px_rgba(255,101,0,0.25)] flex items-center justify-between font-medium active:scale-[0.98] transition-all"
        >
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[15px] font-semibold">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
          </div>
          <span className="font-bold text-[17px]">{settings.currency_symbol} {getTotal().toFixed(2)}</span>
        </button>
      </div>

      {/* MOBILE CART MODAL */}
      <div className={`
        fixed inset-0 z-50 bg-white flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden
        ${showCart ? 'translate-y-0' : 'translate-y-full'}
      `}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-[#E5E7EB] bg-white shrink-0">
          <h2 className="text-[16px] font-semibold text-[#111827] flex items-center">
            Current Order <span className="ml-2 bg-[#FFF1DC] text-[#FF6500] px-2 py-0.5 rounded text-[11px] font-bold">{cart.length}</span>
          </h2>
          <button onClick={() => setShowCart(false)} className="p-2 -mr-2 bg-white hover:bg-gray-50 text-[#6B7280] rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <CartInternals isMobile={true} />
      </div>

      {/* Modifier Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex justify-between items-center bg-white shrink-0">
              <h2 className="text-[16px] font-semibold text-[#111827]">Customize {selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 bg-gray-50 hover:bg-gray-100 text-[#6B7280] rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-6 bg-[#F8FAFC]">
              {selectedProduct.modifier_groups?.map(group => (
                <div key={group.id} className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[#111827] text-[14px]">{group.name}</h3>
                    {group.is_required && <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">Required</span>}
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
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
                          className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${
                            isSelected ? 'border-[#FF6500] bg-[#FFF1DC]/50 shadow-sm' : 'border-[#E5E7EB] hover:border-[#FF6500] bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isSelected ? 'bg-[#FF6500] border-[#FF6500]' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-[14px] ${isSelected ? 'font-medium text-[#FF6500]' : 'text-[#111827]'}`}>{modifier.name}</span>
                          </div>
                          <span className="text-[13px] font-medium text-[#6B7280]">+{settings.currency_symbol}{Number(modifier.price).toFixed(2)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-5 border-t border-[#E5E7EB] bg-white shrink-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-full sm:w-1/4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold py-3.5 rounded-xl shadow-sm transition-all flex justify-center items-center active:scale-[0.98]"
              >
                Cancel
              </button>
              <div className="flex w-full sm:w-3/4 gap-3">
                <button
                  onClick={handleAddWithModifiers}
                  className="w-1/2 bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold py-3.5 rounded-xl shadow-sm transition-all flex justify-center items-center active:scale-[0.98]"
                >
                  Add Item
                </button>
                <button
                  onClick={() => {
                    handleAddWithModifiers()
                    handleCheckout()
                  }}
                  className="w-1/2 bg-[#FF6500] hover:bg-[#e65a00] text-white font-bold py-3.5 rounded-xl shadow-sm transition-all flex justify-center items-center active:scale-[0.98]"
                >
                  Add & Checkout
                </button>
              </div>
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
