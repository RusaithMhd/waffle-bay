'use client'

import { createContext, useContext } from 'react'

export interface StoreSettings {
  id: number
  store_name: string
  store_address: string
  currency_symbol: string
  tax_rate: number
  receipt_header: string
  receipt_footer: string
  timezone?: string
  enable_discount: boolean
  printer_transport?: 'ble' | 'spp'
  printer_ble_service_uuid?: string
  printer_ble_characteristic_uuid?: string
  printer_spp_service_class_uuid?: string
  printer_spp_baud_rate?: number
  printer_paper_width?: number
  printer_dots_per_line?: number
  printer_characters_per_line?: number
  printer_use_rasterization?: boolean
  phone_number?: string
  logo_url?: string
  half_and_half_surcharge?: number
}

const SettingsContext = createContext<StoreSettings | null>(null)

export function SettingsProvider({ 
  settings, 
  children 
}: { 
  settings: StoreSettings
  children: React.ReactNode 
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
