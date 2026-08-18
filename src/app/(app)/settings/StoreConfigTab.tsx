'use client'

import { useState } from 'react'
import { updateStoreSettings } from '@/app/actions/settings'
import { Save, Upload, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export function StoreConfigTab({ settings }: { settings: any }) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    store_name: settings?.store_name || 'Waffle Bay',
    store_address: settings?.store_address || '',
    currency_symbol: settings?.currency_symbol || 'Rs.',
    tax_rate: settings?.tax_rate || 0,
    receipt_header: settings?.receipt_header || 'Welcome to Waffle Bay!',
    receipt_footer: settings?.receipt_footer || 'Thank you for your business!',
    enable_discount: settings?.enable_discount ?? true,
    phone_number: settings?.phone_number || '',
    logo_url: settings?.logo_url || '',
    half_and_half_surcharge: settings?.half_and_half_surcharge || 0
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(settings?.logo_url || '')
  
  const supabase = createClient()
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    let finalLogoUrl = formData.logo_url
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const { error: uploadError, data } = await supabase.storage
        .from('store-assets')
        .upload(fileName, logoFile, { upsert: true })

      if (uploadError) {
        toast.error('Failed to upload logo: ' + uploadError.message)
        setIsSaving(false)
        return
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(data.path)
        
      finalLogoUrl = publicUrl
    }
    
    const res = await updateStoreSettings({
      ...formData,
      logo_url: finalLogoUrl
    })
    
    if (res.success) {
      setFormData(prev => ({ ...prev, logo_url: finalLogoUrl }))
      setLogoFile(null)
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input 
              type="text"
              value={formData.phone_number}
              onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Store Logo</label>
          <div className="flex items-center space-x-6">
            {logoPreview ? (
              <div className="relative w-32 h-32 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                <img src={logoPreview} alt="Store Logo" className="max-w-full max-h-full object-contain p-2" />
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview('')
                    setLogoFile(null)
                    setFormData({ ...formData, logo_url: '' })
                  }}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No Logo</span>
              </div>
            )}
            <div>
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setLogoFile(file)
                    setLogoPreview(URL.createObjectURL(file))
                  }
                }}
              />
              <label
                htmlFor="logo-upload"
                className="cursor-pointer bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 inline-flex items-center space-x-2 shadow-sm text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                <span>Choose Image</span>
              </label>
              <p className="text-xs text-gray-500 mt-2">Recommended: Square PNG/JPG</p>
            </div>
          </div>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Half & Half Surcharge</label>
          <input 
            required
            type="number"
            step="0.01"
            min="0"
            value={formData.half_and_half_surcharge}
            onChange={e => setFormData({ ...formData, half_and_half_surcharge: Number(e.target.value) })}
            className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 focus:border-orange-500 outline-none"
            placeholder="Extra charge for half & half waffles"
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount Setting</label>
          <div className="flex bg-gray-100 p-1 rounded-xl items-center w-fit border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enable_discount: true })}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                formData.enable_discount
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              ON
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enable_discount: false })}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                !formData.enable_discount
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              OFF
            </button>
          </div>
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
