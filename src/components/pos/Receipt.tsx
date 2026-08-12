'use client'

import { useEffect, useRef } from 'react'
import { Printer } from 'lucide-react'
import { useSettings } from '@/components/SettingsProvider'

export interface ReceiptData {
  order_number: string
  receipt_id: string
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
    payment_method: string
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
  const settings = useSettings()

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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{settings.store_name}</h2>
            {settings.store_address && <p className="text-sm text-gray-700 whitespace-pre-wrap">{settings.store_address}</p>}
            {settings.receipt_header && <p className="text-sm text-gray-600 mt-2 italic">{settings.receipt_header}</p>}
            
            <div className="text-sm text-gray-500 mt-3 pt-3 border-t border-dashed border-gray-300">
              <p>Receipt #{data.receipt_id}</p>
              <p>{new Date(data.created_at).toLocaleString()}</p>
            </div>
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
                    <span>{settings.currency_symbol} {itemTotal.toFixed(2)}</span>
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
          <div className="border-t border-dashed border-gray-300 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{settings.currency_symbol} {data.subtotal.toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{settings.currency_symbol} {data.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{settings.currency_symbol} {data.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200 mt-2">
              <span>Total</span>
              <span>{settings.currency_symbol} {data.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="border-t border-dashed border-gray-300 pt-4 mt-4">
            <h4 className="font-semibold text-gray-700 mb-2">Payments</h4>
            {data.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between text-gray-600 text-sm">
                <span>{p.payment_method}</span>
                <span>{settings.currency_symbol} {p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          {settings.receipt_footer && (
            <div className="text-center mt-8 text-gray-600 text-sm whitespace-pre-wrap font-medium italic">
              <p>{settings.receipt_footer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
