'use client'

import { useState } from 'react'
import { X, DollarSign, CreditCard, QrCode, Building, CheckCircle2 } from 'lucide-react'
import { usePosStore } from '@/stores/usePosStore'
import { processCheckout, CheckoutPayload } from '@/app/actions/checkout'
import { db } from '@/lib/db'

type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'BANK_TRANSFER'

interface PaymentEntry {
  method: PaymentMethod
  amount: number
}

interface PaymentModalProps {
  onClose: () => void
  onSuccess: (receiptData: any) => void
}

export function PaymentModal({ onClose, onSuccess }: PaymentModalProps) {
  const { cart, getSubtotal, getTaxAmount, getDiscountAmount, getTotal, clearCart } = usePosStore()
  const total = getTotal()

  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [currentInput, setCurrentInput] = useState<string>('')
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('CASH')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const balanceDue = Math.max(0, total - paidAmount)
  const changeDue = Math.max(0, paidAmount - total)
  
  const isFullyPaid = paidAmount >= total

  const handleAddPayment = (amount: number) => {
    if (amount <= 0) return
    setPayments([...payments, { method: activeMethod, amount }])
    setCurrentInput('')
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
      items: cart.map(item => ({
        product_id: item.product.id,
        product_name_snapshot: item.product.name,
        unit_price_snapshot: item.product.base_price,
        quantity: item.quantity,
        subtotal: item.itemTotal,
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
      
      const res = await processCheckout(payload)
      setIsProcessing(false)

      if (res.success) {
        const receiptData = {
          order_number: res.data.order_number,
          created_at: new Date().toISOString(),
          subtotal: payload.subtotal,
          tax: payload.tax,
          discount: payload.discount,
          total: payload.total,
          items: cart.map(i => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.base_price,
            modifiers: i.modifiers.map(m => ({ name: m.name, price: m.price }))
          })),
          payments: payload.payments,
          offline: false
        }
        clearCart()
        onSuccess(receiptData)
      } else {
        setError(res.error || 'Checkout failed')
      }
    } catch (err: any) {
      // Offline fallback
      setIsProcessing(false)
      await db.syncOutbox.add({
        payload,
        status: 'PENDING',
        created_at: Date.now()
      })
      
      const receiptData = {
        order_number: 'PENDING (OFFLINE)',
        created_at: new Date().toISOString(),
        subtotal: payload.subtotal,
        tax: payload.tax,
        discount: payload.discount,
        total: payload.total,
        items: cart.map(i => ({
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.base_price,
          modifiers: i.modifiers.map(m => ({ name: m.name, price: m.price }))
        })),
        payments: payload.payments,
        offline: true
      }
      clearCart()
      onSuccess(receiptData)
    }
  }

  const quickCashAmounts = [5, 10, 20, 50, 100]

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Side: Order Summary & Payments */}
        <div className="flex-1 border-r bg-gray-50 flex flex-col">
          <div className="p-6 border-b bg-white flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full md:hidden"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 text-center">
              <p className="text-gray-500 font-medium mb-1">Total Due</p>
              <p className="text-4xl font-bold text-gray-900">${total.toFixed(2)}</p>
            </div>

            {payments.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="font-bold text-gray-700">Applied Payments</h3>
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <span className="font-medium flex items-center gap-2">
                      {p.method === 'CASH' && <DollarSign className="w-4 h-4 text-green-500" />}
                      {p.method === 'CARD' && <CreditCard className="w-4 h-4 text-blue-500" />}
                      {p.method === 'QR' && <QrCode className="w-4 h-4 text-purple-500" />}
                      {p.method === 'BANK_TRANSFER' && <Building className="w-4 h-4 text-gray-500" />}
                      {p.method}
                    </span>
                    <span className="font-bold text-green-600">${p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-gray-600 text-lg">
                <span>Balance Due</span>
                <span className="font-bold text-red-500">${balanceDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-lg">
                <span>Change Due</span>
                <span className="font-bold text-green-500">${changeDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Payment Input */}
        <div className="flex-1 bg-white flex flex-col relative">
          <div className="hidden md:flex justify-end p-4 absolute top-0 right-0">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
          </div>

          <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
            
            {/* Payment Method Tabs */}
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
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
              <div className="grid grid-cols-3 gap-3 mb-8">
                <button
                  onClick={() => handleAddPayment(balanceDue)}
                  className="bg-green-100 text-green-700 font-bold py-3 rounded-xl hover:bg-green-200 transition-colors col-span-3"
                >
                  Exact Amount (${balanceDue.toFixed(2)})
                </button>
                {quickCashAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleAddPayment(amt)}
                    className="bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    ${amt}
                  </button>
                ))}
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
              disabled={!isFullyPaid || isProcessing}
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
