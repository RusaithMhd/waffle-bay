'use client'

import { useState, useEffect, useRef } from 'react'
import { Product, Category, ModifierGroup, Modifier } from '@/types'
import { usePosStore, CartItem } from '@/stores/usePosStore'
import { hasPermission, AppRole } from '@/lib/rbac'
import { ShoppingCart, Plus, Minus, X, Check, Search, Menu, MoreVertical, Image as ImageIcon, LogOut, Edit2, Coffee, ShoppingBag, Settings, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PaymentModal } from './PaymentModal'
import { SyncService } from '@/services/sync'
import { useLiveQuery } from 'dexie-react-hooks'
import { createKOTOrder, appendItemsToOrder } from '@/app/actions/checkout'
import { db } from '@/lib/db'
import { Receipt, ReceiptData } from './Receipt'
import { ShiftBlocker, CloseShiftButton, CloseShiftModal } from './ShiftManager'
import { useSettings } from '@/components/SettingsProvider'
import { createClient } from '@/lib/supabase/client'
import { getBusinessDate } from '@/lib/dateUtils'
import Link from 'next/link'
import Image from 'next/image'

const CartItemRow = ({
  item,
  settings,
  updateQuantity,
  removeFromCart,
  updateCartItemDetails,
  isMobile,
  readOnly = false
}: {
  item: CartItem
  settings: any
  updateQuantity: (id: string, delta: number) => void
  removeFromCart: (id: string) => void
  updateCartItemDetails: (id: string, note?: string, price?: number) => void
  isMobile: boolean
  readOnly?: boolean
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [note, setNote] = useState(item.note || '')
  const [price, setPrice] = useState(item.customPrice !== undefined ? String(item.customPrice) : String(item.product.base_price))

  const handleSave = () => {
    updateCartItemDetails(item.id, note, Number(price))
    setIsEditing(false)
  }

  return (
    <li className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-col shadow-sm group relative">
      {!readOnly && (
        <button onClick={() => removeFromCart(item.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden lg:block hover:bg-red-200">
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex justify-between items-start mb-2 pr-4">
        <div>
          <h4 className="font-semibold text-[#111827] text-[14px]">{item.product.name}</h4>
          {item.note && <p className="text-[12px] text-[#FF6500] font-medium mt-0.5">Note: {item.note}</p>}
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

      {readOnly ? (
        <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
          <span className="text-xs font-bold text-gray-500">Quantity: {item.quantity}</span>
        </div>
      ) : isEditing ? (
        <div className="mt-2 p-3 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB] space-y-3">
          <div>
            <label className="block text-[12px] font-bold text-[#111827] mb-1">Special Note (KOT)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] text-[#111827] rounded-md focus:ring-1 focus:ring-[#FF6500] focus:border-[#FF6500] outline-none"
              placeholder="e.g. Less sugar, extra crispy..."
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#111827] mb-1">Unit Price ({settings.currency_symbol})</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] text-[#111827] rounded-md focus:ring-1 focus:ring-[#FF6500] focus:border-[#FF6500] outline-none"
            />
          </div>
          <button onClick={handleSave} className="w-full py-1.5 bg-[#111827] text-white text-[13px] font-bold rounded-md hover:bg-gray-800 transition-colors">Save Details</button>
        </div>
      ) : (
        <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
          <div className="flex items-center space-x-1 bg-[#F8FAFC] rounded-lg p-0.5 border border-[#E5E7EB]">
            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors"><Minus className="w-4 h-4" /></button>
            <span className="font-bold text-[14px] w-8 text-center text-[#111827]">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsEditing(true)} className="text-[#6B7280] hover:text-[#111827] text-[13px] font-medium px-2 py-1 rounded transition-colors flex items-center bg-gray-50 hover:bg-gray-100">
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </button>
            {isMobile && (
              <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-[13px] font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors lg:hidden">Remove</button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

interface CartInternalsProps {
  isMobile?: boolean
  settings: any
  orderType: string
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY') => void
  cart: any[]
  tableNumber: string
  setTableNumber: (val: string) => void
  updateQuantity: (id: string, delta: number) => void
  removeFromCart: (id: string) => void
  updateCartItemDetails: (id: string, note?: string, price?: number) => void
  showDiscountControl: boolean
  discountInput: string
  setDiscountInput: (val: string) => void
  handleDiscountChange: (val: string) => void
  setIsFocused: (focused: boolean) => void
  discountType: 'percentage' | 'amount'
  setDiscount: (val: number) => void
  setDiscountType: (type: 'percentage' | 'amount') => void
  discountValue: number
  discountError: string | null
  setDiscountError: (err: string | null) => void
  getSubtotal: () => number
  getDiscountAmount: () => number
  getTaxAmount: () => number
  getTotal: () => number
  setHoldName: (name: string) => void
  setIsHoldModalOpen: (open: boolean) => void
  handleCheckout: () => void

  // NEW PROPS
  activeOrderId: string | null
  activeOrder: any
  onSendToKitchen: () => void
  onNewOrder: () => void
  onTakePayment: () => void
  isSubmittingKOT: boolean
  userRole?: string | null
}

const CartInternals = ({
  isMobile = false,
  settings,
  orderType,
  setOrderType,
  tableNumber,
  setTableNumber,
  cart,
  updateQuantity,
  removeFromCart,
  updateCartItemDetails,
  showDiscountControl,
  discountInput,
  setDiscountInput,
  handleDiscountChange,
  setIsFocused,
  discountType,
  setDiscount,
  setDiscountType,
  discountValue,
  discountError,
  setDiscountError,
  getSubtotal,
  getDiscountAmount,
  getTaxAmount,
  getTotal,
  setHoldName,
  setIsHoldModalOpen,
  handleCheckout,
  activeOrderId,
  activeOrder,
  onSendToKitchen,
  onNewOrder,
  onTakePayment,
  isSubmittingKOT,
  userRole
}: CartInternalsProps) => (
  <>
    <div className="px-4 pt-3 pb-1 shrink-0 bg-[#F8FAFC]">
      <div className="bg-gray-100 p-0.5 rounded-xl flex items-center border border-gray-200">
        <button
          onClick={() => !activeOrderId && setOrderType('DINE_IN')}
          disabled={!!activeOrderId}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center disabled:opacity-70 ${orderType === 'DINE_IN'
              ? 'bg-white text-gray-950 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
            }`}
        >
          Dine In
        </button>
        <button
          onClick={() => !activeOrderId && setOrderType('TAKEAWAY')}
          disabled={!!activeOrderId}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center disabled:opacity-70 ${orderType === 'TAKEAWAY'
              ? 'bg-white text-gray-950 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
            }`}
        >
          Takeaway
        </button>
      </div>
    </div>

    {orderType === 'DINE_IN' && (
      <div className="px-4 py-2 shrink-0 bg-[#F8FAFC]">
        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
          Table Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="e.g. T1, 5, Balcony"
          disabled={!!activeOrderId}
          className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>
    )}

    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
      {cart.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-[#6B7280] space-y-3">
          <ShoppingCart className="w-12 h-12 opacity-30" />
          <p className="font-medium text-[15px]">Cart is empty</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cart.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              settings={settings}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              updateCartItemDetails={updateCartItemDetails}
              isMobile={isMobile}
              readOnly={item.saved || activeOrder?.status === 'PAID'}
            />
          ))}
        </ul>
      )}
    </div>

    {/* Totals & Checkout */}
    <div className="p-4 bg-white border-t border-[#E5E7EB] shrink-0">
      {showDiscountControl && (
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
            Discount
          </label>
          <div className="flex border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm bg-white focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
            <input
              type="number"
              step="any"
              min="0"
              value={discountInput}
              onChange={(e) => handleDiscountChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="0"
              disabled={!!activeOrderId}
              className="flex-1 min-w-0 p-3 text-sm text-[#111827] outline-none font-bold bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:text-gray-400"
            />
            <select
              value={discountType}
              disabled={!!activeOrderId}
              onChange={(e) => {
                const nextType = e.target.value as 'percentage' | 'amount'
                let nextValue = 0
                const currentVal = Number(discountInput)
                const currentSubtotal = getSubtotal()
                if (!isNaN(currentVal) && currentVal > 0 && currentSubtotal > 0) {
                  if (nextType === 'amount') {
                    nextValue = Number(((currentSubtotal * currentVal) / 100).toFixed(2))
                  } else {
                    nextValue = Number(((currentVal / currentSubtotal) * 100).toFixed(2))
                  }
                }
                setDiscountType(nextType)
                if (nextValue > 0) {
                  setDiscount(nextValue)
                  setDiscountInput(String(nextValue))
                } else {
                  setDiscountInput('')
                }
                setDiscountError(null)
              }}
              className="px-3 border-l border-gray-100 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 outline-none cursor-pointer transition-colors select-none disabled:opacity-60"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="amount">Amount</option>
            </select>
          </div>
          {discountError && (
            <p className="text-[12px] font-bold text-red-500 mt-1.5 leading-snug">
              {discountError}
            </p>
          )}
        </div>
      )}

      {activeOrderId && activeOrder && (
        <div className="mb-4 p-3.5 bg-orange-50/60 border border-orange-100/80 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-600">Order Number:</span>
            <span className="font-black text-gray-900">INV-{String(activeOrder.order_number).padStart(6, '0')}</span>
          </div>
          {activeOrder.kot_number && (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-600">KOT Number:</span>
              <span className="font-black text-gray-900">KOT-{String(activeOrder.kot_number).padStart(3, '0')}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-600">Kitchen Status:</span>
            <span className={`px-2.5 py-0.5 rounded-md font-black uppercase text-[10px] tracking-wide shadow-sm border ${activeOrder.fulfillment_status === 'READY' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse' :
                activeOrder.fulfillment_status === 'PREPARING' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  'bg-blue-100 text-blue-800 border-blue-200'
              }`}>{activeOrder.fulfillment_status}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-600">Payment Status:</span>
            <span className={`px-2.5 py-0.5 rounded-md font-black uppercase text-[10px] tracking-wide shadow-sm border ${activeOrder.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                activeOrder.status === 'VOID' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
              }`}>{activeOrder.status === 'PAID' ? 'PAID' : activeOrder.status === 'VOID' ? 'CANCELLED' : 'UNPAID'}</span>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-[14px] font-medium text-[#6B7280]">
          <span>Subtotal</span>
          <span className="text-[#111827]">{settings.currency_symbol} {getSubtotal().toFixed(2)}</span>
        </div>
        {getDiscountAmount() > 0 && (
          <div className="flex justify-between text-[14px] font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
            <span>
              Discount {discountType === 'percentage' ? `(${discountValue}%)` : `(${settings.currency_symbol}${discountValue})`}
            </span>
            <span>-{settings.currency_symbol} {getDiscountAmount().toFixed(2)}</span>
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
      <div className="flex gap-3">
        {!activeOrderId ? (
          <>
            <button
              onClick={() => {
                setHoldName(`Order #${Date.now().toString().slice(-4)}`)
                setIsHoldModalOpen(true)
              }}
              disabled={cart.length === 0}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed text-gray-700 text-[14px] font-bold py-3.5 rounded-xl border border-gray-200 transition-colors flex items-center justify-center active:scale-[0.98]"
            >
              Hold
            </button>
            <button
              onClick={onSendToKitchen}
              disabled={cart.length === 0 || !!discountError || isSubmittingKOT || (orderType === 'DINE_IN' && !tableNumber.trim())}
              className="w-2/3 bg-[#FF6500] hover:bg-[#e65a00] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-[15px] font-bold py-3.5 rounded-xl shadow-sm transition-colors flex items-center justify-center active:scale-[0.98]"
            >
              {isSubmittingKOT ? 'Sending...' : 'Send to Kitchen'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onNewOrder}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[14px] font-bold py-3.5 rounded-xl border border-gray-200 transition-colors flex items-center justify-center active:scale-[0.98]"
            >
              New Order
            </button>
            {cart.some(item => !item.saved) ? (
              <button
                onClick={onSendToKitchen}
                disabled={isSubmittingKOT}
                className="w-2/3 bg-[#FF6500] hover:bg-[#e65a00] text-white text-[15px] font-bold py-3.5 rounded-xl shadow-sm transition-colors flex items-center justify-center active:scale-[0.98]"
              >
                {isSubmittingKOT ? 'Sending...' : 'Send to Kitchen'}
              </button>
            ) : activeOrder?.status !== 'PAID' ? (
              userRole === 'waiter' ? (
                <button
                  disabled
                  className="w-2/3 bg-gray-200 text-gray-500 text-[15px] font-bold py-3.5 rounded-xl shadow-sm flex items-center justify-center cursor-not-allowed"
                >
                  Pending Payment
                </button>
              ) : (
                <button
                  onClick={onTakePayment}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-bold py-3.5 rounded-xl shadow-sm transition-colors flex items-center justify-center active:scale-[0.98]"
                >
                  Take Payment
                </button>
              )
            ) : (
              <button
                onClick={handleCheckout}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-bold py-3.5 rounded-xl shadow-sm transition-colors flex items-center justify-center active:scale-[0.98]"
              >
                Print Bill
              </button>
            )}
          </>
        )}
      </div>
    </div>
  </>
)

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
    updateCartItemDetails,
    removeFromCart,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotal,
    discountType,
    discountValue,
    setDiscount,
    setDiscountType,
    getDiscountAmount,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    heldOrders,
    loadHeldOrders,
    holdOrder,
    resumeOrder,
    deleteHeldOrder,
    activeOrderId,
    setActiveOrderId,
    loadSavedOrder
  } = usePosStore()

  const showDiscountControl = settings.enable_discount && hasPermission(userRole as AppRole, 'pos.discount')
  const [discountInput, setDiscountInput] = useState(discountValue > 0 ? String(discountValue) : '')
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setDiscountInput(discountValue > 0 ? String(discountValue) : '')
    }
  }, [discountValue, isFocused])

  const subtotal = getSubtotal()

  useEffect(() => {
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        if (discountValue > 100) {
          setDiscountError('Percentage discount cannot exceed 100%')
        } else {
          setDiscountError(null)
        }
      } else {
        if (discountValue > subtotal) {
          setDiscountError('Discount cannot be greater than the order subtotal.')
        } else {
          setDiscountError(null)
        }
      }
    } else if (discountInput !== '' && Number(discountInput) > 0) {
      const val = Number(discountInput)
      if (discountType === 'amount' && val > subtotal) {
        setDiscountError('Discount cannot be greater than the order subtotal.')
      } else {
        setDiscountError(null)
      }
    } else {
      setDiscountError(null)
    }
  }, [subtotal, discountValue, discountType, discountInput])

  const handleDiscountChange = (valStr: string) => {
    setDiscountInput(valStr)
    const val = Number(valStr)
    if (valStr === '') {
      setDiscount(0)
      setDiscountError(null)
      return
    }

    if (isNaN(val) || val < 0) {
      setDiscountError('Invalid discount value')
      setDiscount(0)
      return
    }

    if (discountType === 'percentage') {
      if (val > 100) {
        setDiscountError('Percentage discount cannot exceed 100%')
        setDiscount(0)
      } else {
        setDiscountError(null)
        setDiscount(val)
      }
    } else {
      if (val > subtotal) {
        setDiscountError('Discount cannot be greater than the order subtotal.')
        setDiscount(0)
      } else {
        setDiscountError(null)
        setDiscount(val)
      }
    }
  }

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([])
  const [selectedNote, setSelectedNote] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals / Toggles
  const [showCart, setShowCart] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false)

  // Held orders states
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false)
  const [holdName, setHoldName] = useState('')
  const [isHeldListOpen, setIsHeldListOpen] = useState(false)
  const [showOrderTypePrompt, setShowOrderTypePrompt] = useState(false)

  // KOT and Unpaid orders states
  const [activeOrder, setActiveOrder] = useState<any | null>(null)
  const [isSubmittingKOT, setIsSubmittingKOT] = useState(false)
  const [isOpenOrdersModalOpen, setIsOpenOrdersModalOpen] = useState(false)
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>([])
  const [loadingUnpaid, setLoadingUnpaid] = useState(false)
  const [unpaidCount, setUnpaidCount] = useState(0)
  const readyAudioRef = useRef<HTMLAudioElement | null>(null)
  const notifiedOrdersRef = useRef<Set<string>>(new Set())

  // KOT Session Manager states
  const [isKOTManagerOpen, setIsKOTManagerOpen] = useState(false)
  const [kotManagerBusinessDate, setKotManagerBusinessDate] = useState('')
  const [kotCurrentCount, setKotCurrentCount] = useState<number | null>(null)
  const [kotNewNumber, setKotNewNumber] = useState<string>('')
  const [kotReason, setKotReason] = useState('')
  const [kotAuditLogs, setKotAuditLogs] = useState<any[]>([])
  const [isKOTProcessing, setIsKOTProcessing] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const loadKOTManagerData = async () => {
    const supabase = createClient()
    const bDate = getBusinessDate(new Date(), settings.timezone || 'Asia/Colombo')
    setKotManagerBusinessDate(bDate)

    // Fetch current counter
    const { data: counterData } = await supabase
      .from('kot_counters')
      .select('last_value')
      .eq('business_date', bDate)
      .maybeSingle()

    setKotCurrentCount(counterData?.last_value ?? 0)

    // Fetch audit logs
    const { data: logs } = await supabase
      .from('kot_audit_logs')
      .select(`
        created_at, old_number, new_number, reason, business_date,
        profiles:cashier_id ( first_name )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    setKotAuditLogs(logs || [])
  }

  const handleAdjustKOT = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kotNewNumber || !kotReason.trim()) {
      alert('Please specify the new KOT sequence number and reason.')
      return
    }

    setIsKOTProcessing(true)
    const supabase = createClient()

    const { data, error } = await supabase.rpc('adjust_kot_counter', {
      p_business_date: kotManagerBusinessDate,
      p_new_number: parseInt(kotNewNumber),
      p_reason: kotReason
    })

    setIsKOTProcessing(false)
    if (error) {
      alert(error.message)
    } else {
      alert('KOT Counter successfully updated!')
      setKotNewNumber('')
      setKotReason('')
      loadKOTManagerData()
    }
  }

  useEffect(() => {
    if (isKOTManagerOpen) {
      loadKOTManagerData()
    }
  }, [isKOTManagerOpen])

  // Real-time unpaid orders count
  useEffect(() => {
    const supabase = createClient()
    const getUnpaidCount = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING')
      setUnpaidCount(count || 0)
    }
    getUnpaidCount()

    const channel = supabase
      .channel('unpaid-count-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        getUnpaidCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Real-time active order subscription and alerts
  useEffect(() => {
    if (!activeOrderId) return

    const supabase = createClient()

    const fetchOrderDetails = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, subtotal, tax, discount, total, status, fulfillment_status, order_type, table_number, created_at, discount_type, discount_value,
          payments(*),
          order_items(
            id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal, notes,
            order_item_modifiers(
              id, modifier_id, modifier_name_snapshot, modifier_price_snapshot, quantity
            )
          )
        `)
        .eq('id', activeOrderId)
        .single()
      if (!error && data) {
        setActiveOrder(data)
      }
    }
    fetchOrderDetails()

    const channel = supabase
      .channel(`order-sync-${activeOrderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}` }, (payload) => {
        const updated = payload.new
        setActiveOrder((prev: any) => {
          if (!prev) return prev

          // Check if fulfillment_status transitioned to READY
          if (prev.fulfillment_status !== 'READY' && updated.fulfillment_status === 'READY') {
            if (readyAudioRef.current) {
              readyAudioRef.current.currentTime = 0
              readyAudioRef.current.volume = 0.85
              readyAudioRef.current.play().catch(e => console.warn('Ready chime play blocked:', e))
            }
          }

          return {
            ...prev,
            status: updated.status,
            fulfillment_status: updated.fulfillment_status
          }
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeOrderId])

  // Global order ready listener for waitstaff/cashiers
  useEffect(() => {
    const supabase = createClient()
    const globalChannel = supabase
      .channel('global-order-ready')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new
        if (updated.fulfillment_status === 'READY' && !notifiedOrdersRef.current.has(updated.id)) {
          notifiedOrdersRef.current.add(updated.id)
          
          if (readyAudioRef.current) {
            readyAudioRef.current.currentTime = 0
            readyAudioRef.current.volume = 0.85
            readyAudioRef.current.play().catch(e => console.warn('Ready chime play blocked:', e))
          }
          
          toast.success(
            `Order #${updated.order_number} ${updated.table_number ? `(Table ${updated.table_number})` : ''} is READY!`, 
            { duration: 6000, icon: '🛎️' }
          )
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(globalChannel)
    }
  }, [])

  // Load unpaid orders when modal opens
  useEffect(() => {
    if (isOpenOrdersModalOpen) {
      fetchUnpaidOrders()
    }
  }, [isOpenOrdersModalOpen])

  const fetchUnpaidOrders = async () => {
    setLoadingUnpaid(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, subtotal, tax, discount, total, status, fulfillment_status, order_type, table_number, created_at, discount_type, discount_value,
        order_items(
          id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal, notes,
          order_item_modifiers(
            id, modifier_id, modifier_name_snapshot, modifier_price_snapshot, quantity
          )
        )
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
    setLoadingUnpaid(false)
    if (!error && data) {
      setUnpaidOrders(data)
    }
  }

  // Sync menu locally on load
  useEffect(() => {
    SyncService.pullMenu()
    loadHeldOrders()

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
      setSelectedNote('')
    } else {
      addToCart(product, [], 1)
    }
  }

  const handleAddWithModifiers = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, selectedModifiers, 1, selectedNote)
      setSelectedProduct(null)
      setSelectedModifiers([])
      setSelectedNote('')
    }
  }

  const handleReprintActiveOrder = () => {
    if (!activeOrderId || !activeOrder) return

    const repData: ReceiptData = {
      order_number: activeOrder.order_number,
      receipt_id: activeOrder.receipt_id || `INV-${String(activeOrder.order_number).padStart(6, '0')}`,
      kot_number: activeOrder.kot_number,
      business_date: activeOrder.business_date,
      table_number: activeOrder.table_number,
      created_at: activeOrder.created_at,
      subtotal: Number(activeOrder.subtotal),
      tax: Number(activeOrder.tax),
      discount: Number(activeOrder.discount),
      total: Number(activeOrder.total),
      discount_type: activeOrder.discount_type || 'percentage',
      discount_value: Number(activeOrder.discount_value || 0),
      items: cart.map(i => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.customPrice !== undefined ? i.customPrice : i.product.base_price,
        notes: i.note,
        modifiers: i.modifiers.map(m => ({ name: m.name, price: m.price }))
      })),
      payments: activeOrder.payments || []
    }

    setReceiptData(repData)
  }

  const handleCheckout = () => {
    if (activeOrderId && activeOrder?.status === 'PAID') {
      handleReprintActiveOrder()
    } else {
      setShowOrderTypePrompt(true)
    }
  }

  const handlePaymentSuccess = async (receipt: ReceiptData) => {
    setShowPayment(false)
    setReceiptData(receipt)
    if (activeOrderId) {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, subtotal, tax, discount, total, status, fulfillment_status, order_type, table_number, created_at, discount_type, discount_value,
          payments(*),
          order_items(
            id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal, notes,
            order_item_modifiers(
              id, modifier_id, modifier_name_snapshot, modifier_price_snapshot, quantity
            )
          )
        `)
        .eq('id', activeOrderId)
        .single()
      if (!error && data) {
        setActiveOrder(data)
      }
    }
  }

  const onSendToKitchen = async () => {
    if (cart.length === 0 || !!discountError || isSubmittingKOT) return
    setIsSubmittingKOT(true)

    if (activeOrderId) {
      const newItems = cart.filter(item => !item.saved)
      if (newItems.length === 0) {
        setIsSubmittingKOT(false)
        return
      }

      const payload = {
        order_id: activeOrderId,
        new_items: newItems.map(item => ({
          product_id: item.product.id,
          product_name_snapshot: item.product.name,
          unit_price_snapshot: item.customPrice !== undefined ? item.customPrice : item.product.base_price,
          quantity: item.quantity,
          subtotal: item.itemTotal,
          notes: item.note,
          modifiers: item.modifiers.map(mod => ({
            modifier_id: mod.id,
            modifier_name_snapshot: mod.name,
            modifier_price_snapshot: mod.price,
            quantity: 1
          }))
        })),
        subtotal: getSubtotal(),
        tax: getTaxAmount(),
        discount: getDiscountAmount(),
        total: getTotal()
      }

      try {
        const res = await appendItemsToOrder(payload)
        if (res.success && res.data) {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('orders')
            .select(`
              id, order_number, subtotal, tax, discount, total, status, fulfillment_status, order_type, table_number, created_at, discount_type, discount_value,
              payments(*),
              order_items(
                id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal, notes,
                order_item_modifiers(
                  id, modifier_id, modifier_name_snapshot, modifier_price_snapshot, quantity
                )
              )
            `)
            .eq('id', activeOrderId)
            .single()

          if (!error && data) {
            loadSavedOrder(data)
          }
        } else {
          alert(res.error || 'Failed to add items to order')
        }
      } catch (e: any) {
        alert(e.message || 'Error occurred while adding items to order')
      } finally {
        setIsSubmittingKOT(false)
      }
      return
    }

    const payload = {
      idempotency_key: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      subtotal: getSubtotal(),
      tax: getTaxAmount(),
      discount: getDiscountAmount(),
      total: getTotal(),
      discount_type: discountType,
      discount_value: discountValue,
      order_type: orderType || 'DINE_IN',
      table_number: tableNumber,
      items: cart.map(item => ({
        product_id: item.product.id,
        product_name_snapshot: item.product.name,
        unit_price_snapshot: item.customPrice !== undefined ? item.customPrice : item.product.base_price,
        quantity: item.quantity,
        subtotal: item.itemTotal,
        notes: item.note,
        modifiers: item.modifiers.map(mod => ({
          modifier_id: mod.id,
          modifier_name_snapshot: mod.name,
          modifier_price_snapshot: mod.price,
          quantity: 1
        }))
      }))
    }

    try {
      const res = await createKOTOrder(payload)
      if (res.success && res.data) {
        setActiveOrderId(res.data.order_id)
      } else {
        alert(res.error || 'Failed to submit order to kitchen')
      }
    } catch (e: any) {
      alert(e.message || 'Error occurred while submitting order')
    } finally {
      setIsSubmittingKOT(false)
    }
  }

  const onNewOrder = () => {
    clearCart()
    setActiveOrder(null)
    setDiscountInput('')
    setShowCart(false)
  }

  const onTakePayment = () => {
    setShowCart(false)
    setShowPayment(true)
  }



  return (
    <div className="flex h-full bg-[#F8FAFC] text-[#111827] overflow-hidden font-sans">
      {!hasActiveShift && <ShiftBlocker />}
      <CloseShiftModal isOpen={isCloseShiftModalOpen} onClose={() => setIsCloseShiftModalOpen(false)} />

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

            <button
              onClick={() => setIsHeldListOpen(true)}
              className="relative ml-1 sm:ml-4 px-2 sm:px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#FF6500] text-[12px] font-bold rounded-xl transition-all flex items-center space-x-1 sm:space-x-1.5 border border-orange-100 shadow-sm shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Held Bills</span>
              {heldOrders.length > 0 && (
                <span className="bg-[#FF6500] text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                  {heldOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsOpenOrdersModalOpen(true)}
              className="relative ml-1 sm:ml-4 px-2 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[12px] font-bold rounded-xl transition-all flex items-center space-x-1 sm:space-x-1.5 border border-emerald-100 shadow-sm shrink-0"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Open KOTs</span>
              {unpaidCount > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unpaidCount}
                </span>
              )}
            </button>
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
                  {hasActiveShift && (
                    <button
                      onClick={() => { setShowMoreMenu(false); setIsCloseShiftModalOpen(true); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Close Shift
                    </button>
                  )}
                  <div className="h-px bg-[#E5E7EB] my-1" />
                  <Link href="/kitchen" className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-gray-50 transition-colors block">Kitchen Display (KOT)</Link>
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <>
                      <div className="h-px bg-[#E5E7EB] my-1" />
                      <button
                        onClick={() => { setShowMoreMenu(false); setIsKOTManagerOpen(true); }}
                        className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#FF6500] hover:bg-orange-50 transition-colors flex items-center"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        KOT Session
                      </button>
                    </>
                  )}
                  <div className="h-px bg-[#E5E7EB] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-gray-50 transition-colors flex items-center"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CATEGORY NAVIGATION */}
        <div className="bg-white border-b border-[#E5E7EB] shrink-0 z-10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex overflow-x-auto hide-scrollbar px-3 py-2 sm:py-3 gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl whitespace-nowrap text-[13px] sm:text-[14px] font-semibold transition-all duration-200 shrink-0 ${!activeCategoryId
                  ? 'bg-[#FF6500] text-white shadow-[0_4px_12px_rgba(255,101,0,0.25)]'
                  : 'bg-gray-100/80 text-[#6B7280] hover:bg-gray-200/80 hover:text-[#111827]'
                }`}
            >
              All Items
            </button>
            {activeCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl whitespace-nowrap text-[13px] sm:text-[14px] font-semibold transition-all duration-200 shrink-0 ${activeCategoryId === category.id
                    ? 'bg-[#FF6500] text-white shadow-[0_4px_12px_rgba(255,101,0,0.25)]'
                    : 'bg-gray-100/80 text-[#6B7280] hover:bg-gray-200/80 hover:text-[#111827]'
                  }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-4 shrink-0 bg-[#F8FAFC]">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#FF6500] transition-colors" />
            <input
              type="text"
              placeholder="Search delicious waffles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 border-2 border-transparent bg-white rounded-xl focus:outline-none focus:border-[#FF6500]/20 focus:ring-4 focus:ring-[#FF6500]/10 transition-all text-[14px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] placeholder-[#9CA3AF] font-medium text-[#111827]"
            />
          </div>
        </div>

        {/* PRODUCT GRID */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-32 lg:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
            {filteredProducts.map(product => {
              const inCartCount = cart.filter(item => item.product.id === product.id).reduce((sum, item) => sum + item.quantity, 0)

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-xl sm:rounded-2xl border border-[#E5E7EB] overflow-hidden hover:border-[#FF6500]/50 hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col active:scale-[0.97] relative text-left group"
                >
                  {/* Quantity Badge */}
                  {inCartCount > 0 && (
                    <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 bg-[#FF6500] text-white text-[11px] sm:text-[12px] font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center z-10 shadow-md ring-2 ring-white">
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
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Details */}
                  <div className="p-2.5 sm:p-3.5 flex flex-col flex-1 justify-between">
                    <h3 className="font-semibold text-[#111827] text-[13px] sm:text-[15px] leading-snug mb-1.5 sm:mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-[#111827] font-bold text-[13px] sm:text-[15px]">{settings.currency_symbol} {Number(product.base_price).toFixed(2)}</p>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#F3F4F6] text-[#6B7280] group-hover:bg-[#FF6500] group-hover:text-white flex items-center justify-center transition-colors duration-300">
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
        <CartInternals
          userRole={userRole}
          isMobile={false}
          settings={settings}
          orderType={orderType}
          setOrderType={setOrderType}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
          cart={cart}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          updateCartItemDetails={updateCartItemDetails}
          showDiscountControl={showDiscountControl}
          discountInput={discountInput}
          setDiscountInput={setDiscountInput}
          handleDiscountChange={handleDiscountChange}
          setIsFocused={setIsFocused}
          discountType={discountType}
          setDiscount={setDiscount}
          setDiscountType={setDiscountType}
          discountValue={discountValue}
          discountError={discountError}
          setDiscountError={setDiscountError}
          getSubtotal={getSubtotal}
          getDiscountAmount={getDiscountAmount}
          getTaxAmount={getTaxAmount}
          getTotal={getTotal}
          setHoldName={setHoldName}
          setIsHoldModalOpen={setIsHoldModalOpen}
          handleCheckout={handleCheckout}
          activeOrderId={activeOrderId}
          activeOrder={activeOrder}
          onSendToKitchen={onSendToKitchen}
          onNewOrder={onNewOrder}
          onTakePayment={onTakePayment}
          isSubmittingKOT={isSubmittingKOT}
        />
      </div>

      {/* MOBILE FLOATING CART BUTTON */}
      <div className="lg:hidden fixed bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-4 z-30">
        {/* Active order status pill above button */}
        {activeOrderId && activeOrder && activeOrder.status !== 'PAID' && (
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide shadow-md border backdrop-blur-sm ${activeOrder.fulfillment_status === 'READY' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse' :
                activeOrder.fulfillment_status === 'PREPARING' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  'bg-blue-100 text-blue-800 border-blue-200'
              }`}>
              {activeOrder.fulfillment_status === 'READY' ? '✓ Ready for pickup!' :
                activeOrder.fulfillment_status === 'PREPARING' ? '⏳ Kitchen is preparing...' :
                  '📋 Order sent to kitchen'}
            </span>
          </div>
        )}

        <button
          onClick={() => setShowCart(true)}
          disabled={cart.length === 0 && !activeOrderId}
          className={`w-full text-white py-3.5 sm:p-4 px-4 rounded-2xl shadow-xl flex items-center justify-between font-medium active:scale-[0.98] transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${!activeOrderId
              ? 'bg-[#FF6500] hover:bg-[#e65a00] border-orange-600/20 shadow-orange-500/25'
              : activeOrder?.status === 'PAID'
                ? 'bg-blue-600 hover:bg-blue-700 border-blue-700/20 shadow-blue-500/25'
                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700/20 shadow-emerald-500/25'
            }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4.5 h-4.5" />
            </div>
            <div className="text-left">
              <div className="text-[14px] sm:text-[15px] font-black leading-tight">
                {activeOrderId
                  ? activeOrder?.status === 'PAID' ? 'View Paid Order' : 'View Order'
                  : cart.length === 0 ? 'Cart Empty' : `${cart.length} item${cart.length !== 1 ? 's' : ''} in cart`
                }
              </div>
              {activeOrderId && activeOrder && (
                <div className="text-[10px] font-bold text-white/70 leading-none mt-0.5">
                  INV-{String(activeOrder.order_number).padStart(6, '0')}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.some(i => !i.saved) && (
              <span className="text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                {cart.filter(i => !i.saved).length} new
              </span>
            )}
            <div className="text-right">
              <div className="font-extrabold text-[15px] sm:text-[16px] leading-tight">
                {settings.currency_symbol} {getTotal().toFixed(2)}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* MOBILE CART MODAL — full-screen bottom sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={(e) => { if (e.target === e.currentTarget) setShowCart(false) }}>
          {/* Scrim */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowCart(false)} />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#E5E7EB] bg-white shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-[#111827]">Current Order</h2>
                <span className="bg-[#FFF1DC] text-[#FF6500] px-2 py-0.5 rounded-lg text-[11px] font-bold">{cart.length} items</span>
              </div>
              <button onClick={() => setShowCart(false)} className="p-2 bg-gray-100 hover:bg-gray-200 text-[#6B7280] rounded-full active:scale-90 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CartInternals
              userRole={userRole}
              isMobile={true}
              settings={settings}
              orderType={orderType}
              setOrderType={setOrderType}
              tableNumber={tableNumber}
              setTableNumber={setTableNumber}
              cart={cart}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              updateCartItemDetails={updateCartItemDetails}
              showDiscountControl={showDiscountControl}
              discountInput={discountInput}
              setDiscountInput={setDiscountInput}
              handleDiscountChange={handleDiscountChange}
              setIsFocused={setIsFocused}
              discountType={discountType}
              setDiscount={setDiscount}
              setDiscountType={setDiscountType}
              discountValue={discountValue}
              discountError={discountError}
              setDiscountError={setDiscountError}
              getSubtotal={getSubtotal}
              getDiscountAmount={getDiscountAmount}
              getTaxAmount={getTaxAmount}
              getTotal={getTotal}
              setHoldName={setHoldName}
              setIsHoldModalOpen={setIsHoldModalOpen}
              handleCheckout={handleCheckout}
              activeOrderId={activeOrderId}
              activeOrder={activeOrder}
              onSendToKitchen={onSendToKitchen}
              onNewOrder={onNewOrder}
              onTakePayment={onTakePayment}
              isSubmittingKOT={isSubmittingKOT}
            />
          </div>
        </div>
      )}

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
                          className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${isSelected ? 'border-[#FF6500] bg-[#FFF1DC]/50 shadow-sm' : 'border-[#E5E7EB] hover:border-[#FF6500] bg-white'
                            }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-[#FF6500] border-[#FF6500]' : 'border-gray-300'
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
            {/* Special Note Input */}
            <div className="p-5 border-t border-[#E5E7EB] bg-gray-50 shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Requirements / Notes</label>
              <textarea
                value={selectedNote}
                onChange={(e) => setSelectedNote(e.target.value)}
                placeholder="E.g. No sugar, extra crispy, allergy info..."
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-[#FF6500] focus:border-[#FF6500] focus:outline-none transition-shadow"
                rows={2}
              />
            </div>

            <div className="p-5 border-t border-[#E5E7EB] bg-white shrink-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { setSelectedProduct(null); setSelectedNote(''); }}
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
          userRole={userRole}
        />
      )}

      {/* Receipt Modal (Triggers native print automatically) */}
      <Receipt data={receiptData} onClose={() => setReceiptData(null)} />

      {/* Hold Order Modal */}
      {isHoldModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div>
              <h3 className="text-[17px] font-bold text-[#111827]">Hold Order</h3>
              <p className="text-xs text-gray-500 mt-1">Enter a friendly reference name (e.g. Table number or customer name) to identify this bill later.</p>
            </div>
            <input
              type="text"
              value={holdName}
              onChange={(e) => setHoldName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
              placeholder="e.g. Table 5 / Alex"
              autoFocus
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsHoldModalOpen(false)
                  setHoldName('')
                }}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  holdOrder(holdName)
                  setIsHoldModalOpen(false)
                  setHoldName('')
                  setShowCart(false)
                }}
                disabled={!holdName.trim()}
                className="px-4 py-2 bg-[#FF6500] hover:bg-[#e65a00] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm"
              >
                Hold Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Drawer / List */}
      {isHeldListOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex justify-between items-center shrink-0">
              <h2 className="text-[16px] font-bold text-[#111827] flex items-center">
                Held Bills
                <span className="ml-2 bg-orange-100 text-[#FF6500] px-2 py-0.5 rounded-full text-xs font-bold">{heldOrders.length}</span>
              </h2>
              <button onClick={() => setIsHeldListOpen(false)} className="p-1.5 bg-gray-50 hover:bg-gray-100 text-[#6B7280] rounded-full transition-all active:scale-90"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
              {heldOrders.length === 0 ? (
                <div className="h-full py-16 flex flex-col items-center justify-center text-[#6B7280] space-y-3 bg-white border border-dashed rounded-xl">
                  <ShoppingCart className="w-10 h-10 opacity-30 text-gray-400" />
                  <p className="font-semibold text-sm">No bills are currently held</p>
                </div>
              ) : (
                heldOrders.map((order) => {
                  const itemsCount = order.cart.reduce((sum, item) => sum + item.quantity, 0)
                  const totalSum = order.cart.reduce((sum, item) => sum + item.itemTotal, 0)
                  return (
                    <div key={order.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900 text-[15px]">{order.name}</h4>
                          <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded mt-1 ${order.orderType === 'TAKEAWAY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {order.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Dine In'}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-1">
                            Held: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-sm">{settings.currency_symbol} {totalSum.toFixed(2)}</p>
                          <p className="text-[11px] text-gray-400">{itemsCount} item{itemsCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-gray-150">
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this held bill?')) {
                              deleteHeldOrder(order.id)
                            }
                          }}
                          className="flex-1 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition-all active:scale-95"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            if (cart.length > 0 && !confirm('Active items in cart will be replaced. Proceed?')) {
                              return
                            }
                            resumeOrder(order.id)
                            setIsHeldListOpen(false)
                            setShowCart(true)
                          }}
                          className="flex-2 py-1.5 bg-[#FF6500] hover:bg-[#e65a00] text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm px-4"
                        >
                          Resume Cart
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Type Selection Prompt */}
      {showOrderTypePrompt && (
        <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="text-center">
              <h3 className="text-[18px] font-extrabold text-[#111827]">Order Type</h3>
              <p className="text-sm text-gray-500 mt-1">Select fulfillment option before entering payment</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setOrderType('DINE_IN')
                  setShowOrderTypePrompt(false)
                  setShowPayment(true)
                }}
                className={`p-6 rounded-2xl border-2 hover:border-[#FF6500]/50 hover:bg-orange-50/20 active:scale-95 transition-all flex flex-col items-center justify-center space-y-3 ${orderType === 'DINE_IN' ? 'border-[#FF6500] bg-orange-50/40 text-[#FF6500]' : 'border-gray-200 text-gray-700 bg-white'
                  }`}
              >
                <Coffee className="w-10 h-10" />
                <span className="font-bold text-[15px]">Dine In</span>
              </button>

              <button
                onClick={() => {
                  setOrderType('TAKEAWAY')
                  setShowOrderTypePrompt(false)
                  setShowPayment(true)
                }}
                className={`p-6 rounded-2xl border-2 hover:border-[#FF6500]/50 hover:bg-orange-50/20 active:scale-95 transition-all flex flex-col items-center justify-center space-y-3 ${orderType === 'TAKEAWAY' ? 'border-[#FF6500] bg-orange-50/40 text-[#FF6500]' : 'border-gray-200 text-gray-700 bg-white'
                  }`}
              >
                <ShoppingBag className="w-10 h-10" />
                <span className="font-bold text-[15px]">Takeaway</span>
              </button>
            </div>

            <button
              onClick={() => setShowOrderTypePrompt(false)}
              className="w-full py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* KOT Session Manager Modal */}
      {isKOTManagerOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-black text-gray-950 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-[#FF6500]" /> KOT Session Manager
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage daily queue sequence counters</p>
              </div>
              <button
                onClick={() => setIsKOTManagerOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-500 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Current business day stats */}
              <div className="bg-orange-50/60 border border-orange-100 p-4 rounded-2xl grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wider">Business Date</p>
                  <p className="text-lg font-black text-gray-900 mt-0.5">
                    {kotManagerBusinessDate ? new Date(kotManagerBusinessDate + 'T00:00:00').toLocaleDateString([], { dateStyle: 'medium' }) : 'Loading...'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">Reset point: 6:00 AM daily</p>
                </div>
                <div>
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wider">Current KOT Count</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">
                    {kotCurrentCount !== null ? String(kotCurrentCount).padStart(3, '0') : '...'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">Next KOT will be: {kotCurrentCount !== null ? String(kotCurrentCount + 1).padStart(3, '0') : '...'}</p>
                </div>
              </div>

              {/* Adjust KOT Counter form */}
              <form onSubmit={handleAdjustKOT} className="space-y-4">
                <h4 className="font-bold text-gray-900 text-sm">Force Reset / Adjust Sequence</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">New KOT Number</label>
                    <input
                      type="number"
                      value={kotNewNumber}
                      onChange={e => setKotNewNumber(e.target.value)}
                      placeholder="e.g. 1"
                      min={0}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Target Business Date</label>
                    <input
                      type="text"
                      value={kotManagerBusinessDate}
                      disabled
                      className="w-full border border-gray-100 bg-gray-50 text-gray-500 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Reason for Adjustment</label>
                  <input
                    type="text"
                    value={kotReason}
                    onChange={e => setKotReason(e.target.value)}
                    placeholder="e.g. Testing reset / Counter discrepancy"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isKOTProcessing || !kotNewNumber || !kotReason.trim()}
                  className="w-full py-2.5 bg-[#FF6500] hover:bg-[#e65a00] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center active:scale-[0.98]"
                >
                  {isKOTProcessing ? 'Processing...' : 'Apply Adjustment'}
                </button>
              </form>

              {/* Audit Logs */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Sequence Override Audit Logs</h4>
                {kotAuditLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No override audits recorded recently.</p>
                ) : (
                  <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white max-h-[160px] overflow-y-auto">
                    {kotAuditLogs.map((log, i) => (
                      <div key={i} className="p-3 text-xs flex justify-between items-start gap-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900">{log.reason}</p>
                          <p className="text-[10px] text-gray-400">
                            By: {log.profiles?.first_name || 'System'} | Business Date: {log.business_date}
                          </p>
                          <p className="text-[9px] text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-gray-500 block">Override</span>
                          <span className="font-bold text-orange-700">
                            {String(log.old_number).padStart(3, '0')} → {String(log.new_number).padStart(3, '0')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open Orders Modal */}
      {isOpenOrdersModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-black text-gray-950 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-[#FF6500]" /> Open / Unpaid KOTs
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Active kitchen orders pending cashier payment</p>
              </div>
              <button
                onClick={() => setIsOpenOrdersModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-500 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUnpaid ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#FF6500] border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-gray-500">Loading open orders...</p>
                </div>
              ) : unpaidOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <p className="font-bold">No open orders</p>
                  <p className="text-xs">All KOT orders have been paid or completed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unpaidOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-[#E5E7EB] rounded-2xl p-4 bg-[#F8FAFC]/50 hover:bg-orange-50/20 hover:border-orange-200 transition-all flex flex-col justify-between space-y-3 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-gray-900 text-sm">INV-{String(order.order_number).padStart(6, '0')}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Created: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] border ${order.fulfillment_status === 'READY' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse' :
                              order.fulfillment_status === 'PREPARING' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>{order.fulfillment_status}</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                        <span className="text-sm font-bold text-[#FF6500]">{settings.currency_symbol} {Number(order.total).toFixed(2)}</span>
                        <button
                          onClick={() => {
                            loadSavedOrder(order)
                            setIsOpenOrdersModalOpen(false)
                          }}
                          className="px-3 py-1.5 bg-[#FF6500] hover:bg-[#e65a00] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          Pay / View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audio notification */}
      <audio ref={readyAudioRef} src="/Complete.mp3" preload="auto" />
    </div>
  )
}
