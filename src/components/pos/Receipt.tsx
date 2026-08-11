'use client'

import { useEffect, useRef } from 'react'

export interface ReceiptData {
  order_number: string
  created_at: string
  subtotal: number
  tax: number
  discount: number
  total: number
  items: Array<{
    name: string
    quantity: number
    price: number
    modifiers: Array<{ name: string, price: number }>
  }>
  payments: Array<{
    method: string
    amount: number
  }>
  offline?: boolean
}

interface ReceiptProps {
  data: ReceiptData | null
  onClose: () => void
}

export function Receipt({ data, onClose }: ReceiptProps) {
  const printTriggered = useRef(false)

  useEffect(() => {
    if (data && !printTriggered.current) {
      printTriggered.current = true
      
      // Allow DOM to render before calling print
      setTimeout(() => {
        window.print()
        
        // After print dialog closes, we want to close the receipt view
        // Unfortunately there's no perfect way to know when print dialog closes across all browsers,
        // but window.onafterprint works in most modern browsers.
        const handleAfterPrint = () => {
          onClose()
          window.removeEventListener('afterprint', handleAfterPrint)
        }
        window.addEventListener('afterprint', handleAfterPrint)
        
        // Fallback for browsers that don't support afterprint well
        setTimeout(onClose, 2000)
      }, 500)
    }
  }, [data, onClose])

  if (!data) return null

  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-y-auto">
      {/* 
        This div models an 80mm receipt (roughly 302px).
        It centers on screen but prints precisely due to CSS print rules.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm; /* ESC/POS standard width */
            margin: 0;
            padding: 0;
          }
        }
      `}} />
      
      <div className="min-h-screen flex items-start justify-center p-8 print:p-0 bg-gray-100 print:bg-white">
        <div id="printable-receipt" className="w-[302px] bg-white p-4 font-mono text-sm text-black">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">WAFFLE BAY</h1>
            <p className="text-xs">123 Waffle Street, Baker City</p>
            <p className="text-xs">Tax ID: 987654321</p>
            <p className="text-xs mt-2">{new Date(data.created_at || Date.now()).toLocaleString()}</p>
            <h2 className="text-lg font-bold mt-2">Order #{data.order_number}</h2>
            {data.offline && <p className="text-xs border border-black inline-block px-1 mt-1 font-bold">OFFLINE MODE</p>}
          </div>

          {/* Items Header */}
          <div className="flex justify-between border-b border-black pb-1 mb-2 font-bold text-xs">
            <span>Qty Item</span>
            <span>Total</span>
          </div>

          {/* Items */}
          <div className="mb-4">
            {data.items.map((item, idx) => {
              const itemModsTotal = item.modifiers.reduce((sum, mod) => sum + mod.price, 0)
              const itemTotal = (item.price + itemModsTotal) * item.quantity

              return (
                <div key={idx} className="mb-2">
                  <div className="flex justify-between text-xs">
                    <span className="flex-1 pr-2">{item.quantity}x {item.name}</span>
                    <span>Rs. {itemTotal.toFixed(2)}</span>
                  </div>
                  {item.modifiers.length > 0 && (
                    <div className="text-[10px] pl-4 text-gray-700">
                      {item.modifiers.map((mod, midx) => (
                        <div key={midx}>+ {mod.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-black pt-2 mb-4 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs. {data.subtotal.toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-Rs. {data.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>Rs. {data.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold mt-2 border-t border-black pt-1">
              <span>TOTAL:</span>
              <span>Rs. {data.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="mb-6 text-xs">
            {data.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{p.method}:</span>
                <span>Rs. {p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center text-xs mt-8">
            <p className="font-bold">Thank you for visiting!</p>
            <p>wafflebay.example.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}
