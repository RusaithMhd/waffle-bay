'use client'

import { useState, useEffect } from 'react'
import { PrinterConnectionManager } from '@/lib/printer/connection'
import { ConnectionState, PrinterConfig } from '@/lib/printer/types'
import { toast } from 'react-hot-toast'
import { Printer, X, Wifi, AlertTriangle } from 'lucide-react'

export function PrinterConnectModal({
  isOpen,
  onClose,
  settings
}: {
  isOpen: boolean
  onClose: () => void
  settings: any
}) {
  const [connState, setConnState] = useState<ConnectionState>('IDLE')
  
  useEffect(() => {
    if (!isOpen) return
    const manager = PrinterConnectionManager.getInstance()
    
    // Set initial state
    setConnState(manager.getState())
    
    const handleStateChange = (state: ConnectionState) => {
      setConnState(state)
    }
    
    manager.addStateListener(handleStateChange)
    return () => {
      manager.removeStateListener(handleStateChange)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConnect = async () => {
    const config: PrinterConfig = {
      transport: settings.printer_transport || 'spp',
      bleServiceUuid: settings.printer_ble_service_uuid || '0000fff0-0000-1000-8000-00805f9b34fb',
      bleWriteCharacteristicUuid: settings.printer_ble_characteristic_uuid || '0000fff1-0000-1000-8000-00805f9b34fb',
      sppServiceClassId: settings.printer_spp_service_class_uuid || '00001101-0000-1000-8000-00805f9b34fb',
      sppBaudRate: settings.printer_spp_baud_rate || 9600,
      paperWidth: settings.printer_paper_width || 80,
      dotsPerLine: settings.printer_dots_per_line || 576,
      charactersPerLine: settings.printer_characters_per_line || 48,
      useRasterization: settings.printer_use_rasterization !== undefined ? settings.printer_use_rasterization : true,
    }

    const manager = PrinterConnectionManager.getInstance()
    toast.loading('Connecting to printer...', { id: 'printer-conn' })
    const success = await manager.connect(config)
    if (success) {
      toast.success('Connected successfully!', { id: 'printer-conn' })
    } else {
      toast.error('Connection failed.', { id: 'printer-conn' })
    }
  }

  const handleDisconnect = async () => {
    const manager = PrinterConnectionManager.getInstance()
    await manager.disconnect()
    toast.success('Disconnected printer.')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gray-700" />
            <h2 className="text-[16px] font-bold text-[#111827]">Printer Connection</h2>
          </div>
          <button onClick={onClose} className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-colors active:scale-95">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${
            connState === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600' :
            connState === 'CONNECTING' ? 'bg-amber-100 text-amber-600 animate-pulse' :
            'bg-gray-100 text-gray-400'
          }`}>
            <Printer className="w-10 h-10" />
          </div>

          <h3 className="font-bold text-[18px] text-gray-900 mb-1">
            {connState === 'CONNECTED' ? 'Printer Connected' :
             connState === 'CONNECTING' ? 'Connecting...' :
             'Printer Disconnected'}
          </h3>

          <p className="text-center text-[13px] text-gray-500 mb-6">
            {connState === 'CONNECTED' ? 'Your POS is ready to print receipts.' :
             'Connect to your Bluetooth/USB receipt printer to start printing.'}
          </p>

          <div className="w-full space-y-3">
            {connState !== 'CONNECTED' ? (
              <button
                onClick={handleConnect}
                disabled={connState === 'CONNECTING'}
                className="w-full bg-[#111827] hover:bg-gray-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 active:scale-95"
              >
                <Wifi className="w-4 h-4" />
                {connState === 'CONNECTING' ? 'Connecting...' : 'Connect Printer'}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3 px-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 active:scale-95"
              >
                Disconnect Printer
              </button>
            )}
          </div>
          
          {settings.printer_transport === 'spp' && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200 w-full text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Web Serial (SPP) requires desktop Chrome. Ensure your printer is paired in system Bluetooth settings first.</span>
            </div>
          )}

          {(settings.printer_transport === 'ble' || !settings.printer_transport) && (
            <div className="mt-4 flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-200 w-full text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                On tablets (Android), all nearby Bluetooth devices may appear in the picker if the printer
                doesn&apos;t broadcast its service UUID. Select your printer (e.g. <strong>XP-E200L</strong>) from the list.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
