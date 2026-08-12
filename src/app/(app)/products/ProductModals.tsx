'use client'

import { useState, useRef } from 'react'
import { createProduct, updateProduct } from '@/app/actions/products'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/components/SettingsProvider'
import Image from 'next/image'

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

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category_id) {
      setError('Please select a category')
      return
    }

    setIsProcessing(true)
    setError(null)
    
    const submitData = new FormData()
    submitData.append('name', formData.name)
    submitData.append('category_id', formData.category_id)
    submitData.append('base_price', formData.base_price.toString())
    if (imageFile) {
      submitData.append('image', imageFile)
    }

    const res = await createProduct(submitData)

    if (res.success) {
      router.refresh()
      onClose()
    } else {
      setError(res.error || 'Failed to create product')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative my-8">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h2>
        
        {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Image Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-orange-400 transition-colors bg-gray-50/50"
            >
              {imagePreview ? (
                <div className="relative w-full h-40">
                  <Image src={imagePreview} alt="Preview" fill unoptimized={imagePreview.startsWith('blob:')} className="object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                    <span className="text-white font-medium flex items-center"><Upload className="w-4 h-4 mr-2" /> Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center text-gray-500">
                  <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="text-sm font-medium">Click to upload image</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none bg-white"
              >
                <option value="" disabled>Select...</option>
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
          </div>
          
          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50 mt-4 transition-colors"
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
    image_url?: string | null
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

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(item.image_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)
    
    const submitData = new FormData()
    submitData.append('name', formData.name)
    submitData.append('category_id', formData.category_id)
    submitData.append('base_price', formData.base_price.toString())
    submitData.append('is_active', formData.is_active.toString())
    if (imageFile) {
      submitData.append('image', imageFile)
    }

    const res = await updateProduct(item.id, submitData)

    if (res.success) {
      router.refresh()
      onClose()
    } else {
      setError(res.error || 'Failed to update product')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative my-8">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h2>
        
        {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Image Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-orange-400 transition-colors bg-gray-50/50"
            >
              {imagePreview ? (
                <div className="relative w-full h-40">
                  <Image src={imagePreview} alt="Preview" fill unoptimized={imagePreview.startsWith('blob:')} className="object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                    <span className="text-white font-medium flex items-center"><Upload className="w-4 h-4 mr-2" /> Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center text-gray-500">
                  <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="text-sm font-medium">Click to upload image</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none bg-white"
              >
                <option value="" disabled>Select...</option>
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
          </div>
          <div className="flex items-center space-x-2 pt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <input 
              type="checkbox" 
              id="isActive"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500 border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (Visible on POS)</label>
          </div>
          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50 mt-4 transition-colors"
          >
            {isProcessing ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
