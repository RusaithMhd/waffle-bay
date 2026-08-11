'use client'

import { useState } from 'react'
import { createProduct, updateProduct } from '@/app/actions/products'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/components/SettingsProvider'

export interface Category {
  id: string
  name: string
}

interface AddModalProps {
  onClose: () => void
  categories: Category[]
}

export function AddProductModal({ onClose, categories }: AddModalProps) {
  const router = useRouter()
  const settings = useSettings()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: categories.length > 0 ? categories[0].id : '',
    base_price: 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category_id) {
      setError('Please select a category')
      return
    }

    setIsProcessing(true)
    setError(null)
    
    const res = await createProduct({
      name: formData.name,
      category_id: formData.category_id,
      base_price: Number(formData.base_price)
    })

    if (res.success) {
      router.refresh()
      onClose()
    } else {
      setError(res.error || 'Failed to create product')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h2>
        
        {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
              placeholder="e.g. Strawberry Milkshake"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              required
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none bg-white"
            >
              <option value="" disabled>Select a Category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price ({settings.currency_symbol})</label>
            <input 
              required
              type="number"
              min="0"
              step="0.01"
              value={formData.base_price}
              onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
            />
          </div>
          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 mt-4"
          >
            {isProcessing ? 'Saving...' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  )
}

interface EditModalProps {
  onClose: () => void
  categories: Category[]
  item: {
    id: string
    name: string
    category_id: string
    base_price: number
    is_active: boolean
  }
}

export function EditProductModal({ onClose, categories, item }: EditModalProps) {
  const router = useRouter()
  const settings = useSettings()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: item.name,
    category_id: item.category_id || '',
    base_price: item.base_price,
    is_active: item.is_active
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)
    
    const res = await updateProduct(item.id, {
      name: formData.name,
      category_id: formData.category_id,
      base_price: Number(formData.base_price),
      is_active: formData.is_active
    })

    if (res.success) {
      router.refresh()
      onClose()
    } else {
      setError(res.error || 'Failed to update product')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h2>
        
        {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              required
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none bg-white"
            >
              <option value="" disabled>Select a Category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price ({settings.currency_symbol})</label>
            <input 
              required
              type="number"
              min="0"
              step="0.01"
              value={formData.base_price}
              onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="isActive"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (Visible on POS)</label>
          </div>
          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 mt-4"
          >
            {isProcessing ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
