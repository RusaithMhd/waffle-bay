'use client'

import { useState } from 'react'
import { createIngredient, updateIngredient } from '@/app/actions/inventory'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/components/SettingsProvider'

interface ModalProps {
  onClose: () => void
}

export function AddIngredientModal({ onClose }: ModalProps) {
  const router = useRouter()
  const settings = useSettings()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    unit_of_measure: 'grams',
    reorder_level: 0,
    cost_per_unit: 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)
    
    const res = await createIngredient({
      name: formData.name,
      unit_of_measure: formData.unit_of_measure,
      reorder_level: Number(formData.reorder_level),
      cost_per_unit: Number(formData.cost_per_unit)
    })

    if (res.success) {
      router.refresh()
      onClose()
    } else {
      setError(res.error || 'Failed to create ingredient')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Ingredient</h2>
        
        {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
              placeholder="e.g. Waffle Base"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
              <input 
                required
                type="text"
                value={formData.unit_of_measure}
                onChange={e => setFormData({ ...formData, unit_of_measure: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
                placeholder="e.g. grams, pcs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
              <input 
                required
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_level}
                onChange={e => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit ({settings.currency_symbol})</label>
            <input 
              required
              type="number"
              min="0"
              step="0.01"
              value={formData.cost_per_unit}
              onChange={e => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
            />
          </div>
          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 mt-4"
          >
            {isProcessing ? 'Saving...' : 'Add Ingredient'}
          </button>
        </form>
      </div>
    </div>
  )
}

interface EditModalProps extends ModalProps {
  item: {
    id: string
    name: string
    unit_of_measure: string
    reorder_level: number
    cost_per_unit: number
  }
}

export function EditIngredientModal({ onClose, item }: EditModalProps) {
  const router = useRouter()
  const settings = useSettings()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: item.name,
    unit_of_measure: item.unit_of_measure,
    reorder_level: item.reorder_level,
    cost_per_unit: item.cost_per_unit
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)
    
    const res = await updateIngredient(item.id, {
      name: formData.name,
      unit_of_measure: formData.unit_of_measure,
      reorder_level: Number(formData.reorder_level),
      cost_per_unit: Number(formData.cost_per_unit)
    })

    if (res.success) {
      router.refresh()
      onClose()
    } else {
      setError(res.error || 'Failed to update ingredient')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Ingredient</h2>
        
        {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
              <input 
                required
                type="text"
                value={formData.unit_of_measure}
                onChange={e => setFormData({ ...formData, unit_of_measure: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
              <input 
                required
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_level}
                onChange={e => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit ({settings.currency_symbol})</label>
            <input 
              required
              type="number"
              min="0"
              step="0.01"
              value={formData.cost_per_unit}
              onChange={e => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
            />
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
