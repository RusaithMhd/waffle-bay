'use client'

import { useState } from 'react'
import { Edit2, Trash2, Plus, X } from 'lucide-react'
import { createTopping, updateTopping, deleteTopping } from '@/app/actions/modifiers'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/components/SettingsProvider'

export interface ToppingItem {
  id: string
  name: string
  price: number
  is_active: boolean
}

export function ToppingsRowActions({ item }: { item: ToppingItem }) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    const res = await deleteTopping(item.id)
    if (res.success) {
      toast.success('Topping deleted successfully')
      router.refresh()
      setShowDeleteConfirm(false)
    } else {
      toast.error(res.error || 'Failed to delete topping')
    }
  }

  return (
    <>
      <div className="flex items-center justify-end space-x-2">
        <button 
          onClick={() => setShowEditModal(true)}
          title="Edit"
          className="text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors border border-blue-100 flex items-center justify-center space-x-1.5 bg-white shadow-sm"
        >
          <Edit2 className="w-4 h-4" />
          <span className="font-medium text-sm">Edit</span>
        </button>
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete"
          className="text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-red-100 flex items-center justify-center space-x-1.5 bg-white shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          <span className="font-medium text-sm">Delete</span>
        </button>
      </div>
      
      {showEditModal && <EditToppingModal item={item} onClose={() => setShowEditModal(false)} />}
      
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Topping"
          message={`Are you sure you want to delete "${item.name}"?`}
          confirmText="Delete Topping"
          isDestructive={true}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}

export function AddToppingButton() {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <>
      <button 
        onClick={() => setShowAddModal(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 h-[42px] rounded-lg shadow-sm flex items-center justify-center space-x-2 font-medium transition-colors w-full sm:w-auto"
      >
        <Plus className="w-5 h-5" />
        <span>New Topping</span>
      </button>

      {showAddModal && <AddToppingModal onClose={() => setShowAddModal(false)} />}
    </>
  )
}

function AddToppingModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const settings = useSettings()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await createTopping(formData)
    
    setIsLoading(false)
    if (res.success) {
      toast.success('Topping added successfully')
      router.refresh()
      onClose()
    } else {
      toast.error(res.error || 'Failed to add topping')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Add New Topping</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gray-50/50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Topping Name</label>
            <input name="name" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900" placeholder="e.g. Extra Whipped Cream" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ({settings.currency_symbol})</label>
            <input name="price" type="number" step="0.01" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900" placeholder="0.00" />
          </div>
          
          <div className="pt-2 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:bg-orange-300 transition-colors flex items-center shadow-sm">
              {isLoading ? 'Saving...' : 'Save Topping'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditToppingModal({ item, onClose }: { item: ToppingItem, onClose: () => void }) {
  const router = useRouter()
  const settings = useSettings()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await updateTopping(item.id, formData)
    
    setIsLoading(false)
    if (res.success) {
      toast.success('Topping updated successfully')
      router.refresh()
      onClose()
    } else {
      toast.error(res.error || 'Failed to update topping')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Edit Topping</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gray-50/50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Topping Name</label>
            <input name="name" defaultValue={item.name} required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ({settings.currency_symbol})</label>
            <input name="price" type="number" step="0.01" defaultValue={item.price} required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="is_active" id="is_active_edit" value="true" defaultChecked={item.is_active} className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500" />
            <label htmlFor="is_active_edit" className="ml-2 block text-sm text-gray-900">Active (available in POS)</label>
          </div>
          
          <div className="pt-2 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:bg-orange-300 transition-colors flex items-center shadow-sm">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
