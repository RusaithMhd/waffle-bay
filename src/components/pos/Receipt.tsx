'use client'

import { useEffect, useRef, useState } from 'react'
import { Printer, Bluetooth } from 'lucide-react'
import { useSettings } from '@/components/SettingsProvider'
import { toast } from 'react-hot-toast'
import { PrinterConnectionManager } from '@/lib/printer/connection'
import { buildReceiptBytes } from '@/lib/printer/receipt-builder'
import { PrinterConfig, PrintJobData, StoreProfile } from '@/lib/printer/types'

export interface ReceiptData {
  order_number: string
  receipt_id: string
  kot_number?: number
  business_date?: string
  created_at: string
  subtotal: number
  tax: number
  discount: number
  total: number
  items: Array<{
    name: string
    quantity: number
    price: number
    notes?: string
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
  autoPrint?: boolean
}

export function Receipt({ data, onClose, autoPrint = true }: ReceiptProps) {
  const printTriggered = useRef(false)
  const settings = useSettings()
  const [isPrinting, setIsPrinting] = useState(false)

  const handleBluetoothPrint = async () => {
    if (!data) return;
    setIsPrinting(true);
    const toastId = toast.loading('Initiating Bluetooth Print...');
    try {
      const manager = PrinterConnectionManager.getInstance();
      
      // 1. Connect if not already connected
      if (manager.getState() !== 'CONNECTED') {
        toast.loading('Connecting to XP-E200L...', { id: toastId });
        
        // Load config from localStorage or fallback to defaults
        let config: PrinterConfig = {
          transport: 'spp',
          bleServiceUuid: '0000fff0-0000-1000-8000-00805f9b34fb',
          bleWriteCharacteristicUuid: '0000fff1-0000-1000-8000-00805f9b34fb',
          sppServiceClassId: '00001101-0000-1000-8000-00805f9b34fb',
          sppBaudRate: 9600,
          paperWidth: 80,
          dotsPerLine: 576,
          charactersPerLine: 48,
          useRasterization: true,
        };
        
        const saved = localStorage.getItem('waffle_bay_printer_config');
        if (saved) {
          try {
            config = { ...config, ...JSON.parse(saved) };
          } catch (e) {}
        }
        
        const connected = await manager.connect(config);
        if (!connected) {
          throw new Error('Could not connect to printer. Please verify connection under settings.');
        }
      }

      // 2. Prepare order and store details
      toast.loading('Compiling receipt data...', { id: toastId });
      
      const printJob: PrintJobData = {
        order_number: data.order_number,
        receipt_id: data.receipt_id,
        kot_number: data.kot_number,
        business_date: data.business_date,
        created_at: data.created_at,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        items: data.items,
        payments: data.payments,
        offline: data.offline,
      };

      const storeProfile: StoreProfile = {
        store_name: settings.store_name || 'Waffle Bay',
        store_address: settings.store_address || '',
        receipt_header: settings.receipt_header || '',
        receipt_footer: settings.receipt_footer || '',
        currency_symbol: settings.currency_symbol || '$',
      };

      let activeConfig = manager.getActiveConfig() || {
        transport: 'spp' as const,
        bleServiceUuid: '0000fff0-0000-1000-8000-00805f9b34fb',
        bleWriteCharacteristicUuid: '0000fff1-0000-1000-8000-00805f9b34fb',
        sppServiceClassId: '00001101-0000-1000-8000-00805f9b34fb',
        sppBaudRate: 9600,
        paperWidth: 80,
        dotsPerLine: 576,
        charactersPerLine: 48,
        useRasterization: true,
      };

      const bytes = buildReceiptBytes(printJob, activeConfig, storeProfile);
      
      // 3. Print
      toast.loading('Transmitting bytes to XP-E200L...', { id: toastId });
      const success = await manager.print(bytes);
      
      if (success) {
        toast.success('Receipt printed successfully!', { id: toastId });
      } else {
        throw new Error('Printer write failed. View printer settings console log.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred during print', { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    if (data && !printTriggered.current && autoPrint) {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] overflow-y-auto flex items-start justify-center p-4 sm:p-8 print:p-0 print:bg-white">
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
      
      <div className="flex flex-col items-center w-full max-w-[340px] print:max-w-none my-auto">
        {/* Actions panel */}
        <div className="w-[302px] mb-4 flex flex-col gap-2 print:hidden">
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white text-gray-800 border border-gray-200 font-semibold text-xs rounded-xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center justify-center"
            >
              Close
            </button>
            <button 
              onClick={() => window.print()}
              className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 font-semibold text-xs rounded-xl hover:bg-gray-100 active:scale-95 transition-all shadow-sm flex items-center justify-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Native Print</span>
            </button>
          </div>
          
          <button 
            disabled={isPrinting}
            onClick={handleBluetoothPrint}
            className="w-full px-4 py-2.5 bg-[#FF6500] hover:bg-[#e65a00] disabled:bg-orange-300 text-white font-semibold text-xs rounded-xl active:scale-[0.98] transition-all shadow-md flex items-center justify-center space-x-1.5"
          >
            <Bluetooth className="w-4 h-4" />
            <span>{isPrinting ? 'Printing...' : 'Print via Bluetooth (XP-E200L)'}</span>
          </button>
        </div>

        <div id="printable-receipt" className="w-[302px] bg-white p-6 font-mono text-sm text-black shadow-2xl rounded-2xl print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{settings.store_name}</h2>
            {settings.store_address && <p className="text-xs text-gray-700 whitespace-pre-wrap">{settings.store_address}</p>}
            {settings.receipt_header && <p className="text-xs text-gray-600 mt-2 italic">{settings.receipt_header}</p>}
            
            <div className="text-xs text-gray-700 mt-3 pt-3 border-t border-dashed border-gray-300 space-y-1">
              <p className="font-bold text-[14px]">Invoice: {data.receipt_id}</p>
              <p>
                Business Date:{' '}
                <span className="font-semibold">
                  {data.business_date ? new Date(data.business_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </span>
              </p>
              <p>Created: {new Date(data.created_at).toLocaleString()}</p>
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
          <div className="border-t border-dashed border-gray-300 pt-4 mt-4 space-y-1">
            <h4 className="font-semibold text-gray-700 mb-2">Payments</h4>
            {data.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between text-gray-600 text-sm">
                <span>{p.payment_method || (p as any).method}</span>
                <span>{settings.currency_symbol} {p.amount.toFixed(2)}</span>
              </div>
            ))}
            
            <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-200 mt-2 text-sm">
              <span>Amount Received</span>
              <span>{settings.currency_symbol} {data.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
            </div>
            
            {data.payments.reduce((sum, p) => sum + p.amount, 0) > data.total && (
              <div className="flex justify-between text-gray-900 font-bold text-sm">
                <span>Change</span>
                <span>{settings.currency_symbol} {(data.payments.reduce((sum, p) => sum + p.amount, 0) - data.total).toFixed(2)}</span>
              </div>
            )}
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
