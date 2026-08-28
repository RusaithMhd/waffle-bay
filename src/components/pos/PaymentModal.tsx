'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, Banknote, HelpCircle, QrCode, Building, CheckCircle2, DollarSign } from 'lucide-react'
import { usePosStore } from '@/stores/usePosStore'
import { useSettings } from '@/components/SettingsProvider'
import { processCheckout, processPayment, CheckoutPayload } from '@/app/actions/checkout'
import { db } from '@/lib/db'
import { hasPermission, AppRole } from '@/lib/rbac'

type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'BANK_TRANSFER'

interface PaymentEntry {
  method: PaymentMethod
  amount: number
}

interface PaymentModalProps {
  onClose: () => void
  onSuccess: (receiptData: any) => void
  userRole?: string | null
  activeOrder?: any
}

export function PaymentModal({ onClose, onSuccess, userRole, activeOrder }: PaymentModalProps) {
  const { cart, getSubtotal, getTaxAmount, getDiscountAmount, getTotal, clearCart, orderType, tableNumber, discountType, discountValue, setDiscount, setDiscountType, activeOrderId } = usePosStore()
  const settings = useSettings()
  const total = getTotal()

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

  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [currentInput, setCurrentInput] = useState<string>('')
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('CASH')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Idempotency key generated once per modal session
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const balanceDue = Math.max(0, total - paidAmount)
  const changeDue = Math.max(0, paidAmount - total)
  
  const isFullyPaid = paidAmount >= total

  const handleAddPayment = (amount: number) => {
    if (amount <= 0) return
    setPayments([...payments, { method: activeMethod, amount }])
    setCurrentInput('')
  }

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index))
  }

  const handleCheckout = async () => {
    if (!isFullyPaid) return
    setIsProcessing(true)
    setError(null)

    const payload: CheckoutPayload = {
      subtotal: getSubtotal(),
      tax: getTaxAmount(),
      discount: getDiscountAmount(),
      total: total,
      discount_type: discountType,
      discount_value: discountValue,
      order_type: orderType,
      table_number: tableNumber,
      idempotency_key: idempotencyKey,
      items: cart.map(item => ({
        product_id: item.product.id === 'HALF-AND-HALF' ? null : item.product.id,
        product_name_snapshot: item.product.name,
        unit_price_snapshot: item.customPrice !== undefined ? item.customPrice : item.product.base_price,
        quantity: item.quantity,
        subtotal: item.itemTotal,
        notes: item.note,
        metadata: item.metadata,
        modifiers: item.modifiers.map(mod => ({
          modifier_id: mod.id,
          modifier_name_snapshot: mod.name,
          modifier_price_snapshot: mod.price,
          quantity: 1
        }))
      })),
      payments: payments
    }

    try {
      if (!navigator.onLine) {
        throw new Error('Offline')
      }
      
      let res
      if (activeOrderId) {
        res = await processPayment({
          ...payload,
          order_id: activeOrderId,
          payments: payments
        })
      } else {
        res = await processCheckout(payload)
      }
      
      setIsProcessing(false)

      if (res.success) {
        const receiptData = {
          order_number: res.data.order_number,
          receipt_id: res.data.receipt_id,
          kot_number: res.data.kot_number,
          business_date: res.data.business_date,
          created_at: new Date().toISOString(),
          subtotal: activeOrderId ? Number(activeOrder?.subtotal || payload.subtotal) : payload.subtotal,
          tax: activeOrderId ? Number(activeOrder?.tax || payload.tax) : payload.tax,
          discount: activeOrderId ? Number(activeOrder?.discount || payload.discount) : payload.discount,
          total: activeOrderId ? Number(activeOrder?.total || payload.total) : payload.total,
          discount_type: activeOrderId ? (activeOrder?.discount_type || discountType) : payload.discount_type,
          discount_value: activeOrderId ? Number(activeOrder?.discount_value || discountValue) : payload.discount_value,
          items: cart.map(i => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.customPrice !== undefined ? i.customPrice : i.product.base_price,
            notes: i.note,
            modifiers: i.modifiers.map(m => ({ name: m.name, price: m.price }))
          })),
          payments: payments,
          offline: false
        }
        if (!activeOrderId) {
          clearCart()
        }
        onSuccess(receiptData)
      } else {
        setError(res.error || 'Checkout failed')
      }
    } catch (err: any) {
      setIsProcessing(false)
      await db.syncOutbox.add({
        payload,
        status: 'PENDING',
        created_at: Date.now()
      })
      
      const receiptData = {
        order_number: 'PENDING (OFFLINE)',
        receipt_id: 'PENDING (OFFLINE)',
        created_at: new Date().toISOString(),
        subtotal: payload.subtotal,
        tax: payload.tax,
        discount: payload.discount,
        total: payload.total,
        discount_type: payload.discount_type,
        discount_value: payload.discount_value,
        items: cart.map(i => ({
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.base_price,
          notes: i.note,
          modifiers: i.modifiers.map(m => ({ name: m.name, price: m.price }))
        })),
        payments: payload.payments,
        offline: true
      }
      if (!activeOrderId) {
        clearCart()
      }
      onSuccess(receiptData)
    }
  }



  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl overflow-y-auto md:overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[95vh] md:max-h-[90vh]">
        
        <div className="flex-1 border-r bg-gray-50 flex flex-col">
          <div className="p-6 border-b bg-white flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full md:hidden"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="p-6 md:flex-1 md:overflow-y-auto">
            <div className="bg-orange-50 p-6 flex flex-col rounded-2xl mb-6 space-y-2.5">
              <div className="flex justify-between text-sm font-semibold text-gray-600 border-b border-orange-100 pb-2">
                <span>Subtotal</span>
                <span>{settings.currency_symbol} {getSubtotal().toFixed(2)}</span>
              </div>
              {getDiscountAmount() > 0 && (
                <div className="flex justify-between text-sm text-green-700 font-bold">
                  <span>
                    Discount {discountType === 'percentage' ? `(${discountValue}%)` : `(${settings.currency_symbol}${discountValue})`}
                  </span>
                  <span>-{settings.currency_symbol} {getDiscountAmount().toFixed(2)}</span>
                </div>
              )}
              {getTaxAmount() > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>{settings.currency_symbol} {getTaxAmount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-orange-100/50">
                <span className="text-orange-600 font-bold">Total Amount</span>
                <span className="text-3xl font-black text-gray-900">{settings.currency_symbol} {total.toFixed(2)}</span>
              </div>
            </div>

            {showDiscountControl && (
              <div className="mb-6 p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
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
                    className="flex-1 min-w-0 p-3 text-sm text-[#111827] outline-none font-bold bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => {
                      const nextType = e.target.value as 'percentage' | 'amount'
                      let nextValue = 0
                      const currentVal = Number(discountInput)
                      if (!isNaN(currentVal) && currentVal > 0 && subtotal > 0) {
                        if (nextType === 'amount') {
                          nextValue = Number(((subtotal * currentVal) / 100).toFixed(2))
                        } else {
                          nextValue = Number(((currentVal / subtotal) * 100).toFixed(2))
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
                    className="px-3 border-l border-gray-100 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 outline-none cursor-pointer transition-colors select-none"
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

            <h3 className="font-semibold text-gray-900 mb-4">Payments Applied</h3>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm">No payments added yet.</p>
            ) : (
              <div className="space-y-3 mb-6">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <span className="font-medium flex items-center gap-2">
                      {p.method === 'CASH' && <Banknote className="w-4 h-4 text-green-500" />}
                      {p.method === 'CARD' && <CreditCard className="w-4 h-4 text-blue-500" />}
                      {p.method === 'QR' && <QrCode className="w-4 h-4 text-purple-500" />}
                      {p.method === 'BANK_TRANSFER' && <Building className="w-4 h-4 text-gray-500" />}
                      {p.method}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-green-600">{settings.currency_symbol} {p.amount.toFixed(2)}</span>
                      <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-gray-600 text-lg">
                <span>Balance Due</span>
                <span className="font-bold text-red-500">{settings.currency_symbol} {balanceDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-lg">
                <span>Change Due</span>
                <span className="font-bold text-green-500">{settings.currency_symbol} {changeDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white flex flex-col relative">
          <div className="hidden md:flex justify-end p-4 absolute top-0 right-0">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
          </div>

          <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
            
            <div className="grid grid-cols-4 gap-2 mb-8 bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveMethod('CASH')} className={`py-3 rounded-lg font-medium text-sm flex flex-col items-center justify-center transition-all ${activeMethod === 'CASH' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}>
                <DollarSign className="w-5 h-5 mb-1" /> Cash
              </button>
              <button onClick={() => setActiveMethod('CARD')} className={`py-3 rounded-lg font-medium text-sm flex flex-col items-center justify-center transition-all ${activeMethod === 'CARD' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}>
                <CreditCard className="w-5 h-5 mb-1" /> Card
              </button>
              <button onClick={() => setActiveMethod('QR')} className={`py-3 rounded-lg font-medium text-sm flex flex-col items-center justify-center transition-all ${activeMethod === 'QR' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}>
                <QrCode className="w-5 h-5 mb-1" /> QR
              </button>
              <button onClick={() => setActiveMethod('BANK_TRANSFER')} className={`py-3 rounded-lg font-medium text-sm flex flex-col items-center justify-center transition-all ${activeMethod === 'BANK_TRANSFER' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Building className="w-5 h-5 mb-1" /> Bank
              </button>
            </div>

            {/* Amount Input */}
            <div className="mb-8">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">{settings.currency_symbol}</span>
                <input
                  type="number"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder={balanceDue.toFixed(2)}
                  className="w-full text-4xl font-bold p-6 pl-12 bg-gray-50 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/20 transition-all border border-gray-200 focus:border-orange-500"
                />
              </div>
              <button
                onClick={() => handleAddPayment(Number(currentInput || balanceDue))}
                disabled={isFullyPaid}
                className="w-full mt-4 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Add {activeMethod} Payment
              </button>
            </div>

            {/* Quick Cash Buttons */}
            {activeMethod === 'CASH' && (
              <div className="grid grid-cols-1 gap-3 mb-8">
                <button
                  onClick={() => handleAddPayment(balanceDue)}
                  className="bg-green-100 text-green-700 font-bold py-3 rounded-xl hover:bg-green-200 transition-colors"
                >
                  Exact Amount ({settings.currency_symbol} {balanceDue.toFixed(2)})
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-4 font-medium text-sm">
                {error}
              </div>
            )}

            {/* Final Action */}
            <button
              onClick={handleCheckout}
              disabled={!isFullyPaid || isProcessing || !!discountError}
              className="w-full mt-auto bg-orange-500 text-white text-xl font-bold py-6 rounded-2xl shadow-lg hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? 'Processing...' : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" /> Complete Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
