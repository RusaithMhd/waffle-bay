'use client'

import { useState } from 'react'
import { updateStoreSettings } from '@/app/actions/settings'
import { Save } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function StoreConfigTab({ settings }: { settings: any }) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    store_name: settings?.store_name || 'Waffle Bay',
    store_address: settings?.store_address || '',
    currency_symbol: settings?.currency_symbol || 'Rs.',
    tax_rate: settings?.tax_rate || 0,
    receipt_header: settings?.receipt_header || 'Welcome to Waffle Bay!',
    receipt_footer: settings?.receipt_footer || 'Thank you for your business!'
  })
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    const res = await updateStoreSettings(formData)
    
    if (res.success) {
      toast.success('Settings saved successfully!')
    } else {
      toast.error(`Error: ${res.error}`)
    }
    setIsSaving(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Store Configuration</h2>
      
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
            <input 
              required
              type="text"
              value={formData.store_name}
              onChange={e => setFormData({ ...formData, store_name: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
            <input 
              required
              type="text"
              value={formData.currency_symbol}
              onChange={e => setFormData({ ...formData, currency_symbol: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
          <input 
            type="text"
            value={formData.store_address}
            onChange={e => setFormData({ ...formData, store_address: e.target.value })}
            className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
          <input 
            required
            type="number"
            step="0.01"
            min="0"
            value={formData.tax_rate}
            onChange={e => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
            className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Header Message</label>
          <input 
            type="text"
            value={formData.receipt_header}
            onChange={e => setFormData({ ...formData, receipt_header: e.target.value })}
            className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer Message</label>
          <input 
            type="text"
            value={formData.receipt_footer}
            onChange={e => setFormData({ ...formData, receipt_footer: e.target.value })}
            className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 outline-none"
          />
        </div>

        <button 
          type="submit"
          disabled={isSaving}
          className="bg-orange-500 text-white font-medium py-3 px-6 rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  )
}
