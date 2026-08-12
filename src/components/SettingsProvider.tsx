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
