'use client'

import { useState } from 'react'
import { ArrowDownToLine, Edit2, Trash2, Plus } from 'lucide-react'
import { restockItem, deleteIngredient } from '@/app/actions/inventory'
import { EditIngredientModal, AddIngredientModal } from './InventoryModals'
import { useRouter } from 'next/navigation'

interface InventoryItem {
  id: string
  name: string
  unit_of_measure: string
  reorder_level: number
  cost_per_unit: number
}

export function InventoryRowActions({ item }: { item: InventoryItem }) {
  const router = useRouter()
  const [isRestocking, setIsRestocking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleRestock = async () => {
    if (!confirm('Quick-restock 100 units of this item? This will create a PO and log the expense.')) return
    
    setIsRestocking(true)
    const res = await restockItem(item.id, item.cost_per_unit)
    
    if (res.success) {
      setIsRestocking(false)
    } else {
      alert(res.error || 'Failed to restock item')
      setIsRestocking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ingredient? This action cannot be undone.')) return
    
    setIsDeleting(true)
    const res = await deleteIngredient(item.id)
    
    if (res.success) {
      setIsDeleting(false)
      router.refresh()
    } else {
      alert(res.error || 'Failed to delete ingredient')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end space-x-3">
        <button 
          onClick={handleRestock}
          disabled={isRestocking || isDeleting}
          title="Quick Restock"
          className="text-orange-600 hover:text-orange-800 p-2 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
        >
          <ArrowDownToLine className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setShowEditModal(true)}
          disabled={isRestocking || isDeleting}
          title="Edit"
          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={handleDelete}
          disabled={isRestocking || isDeleting}
          title="Delete"
          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {showEditModal && <EditIngredientModal item={item} onClose={() => setShowEditModal(false)} />}
    </>
  )
}

export function AddIngredientButton() {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <>
      <button 
        onClick={() => setShowAddModal(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2 font-medium transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>New Item</span>
      </button>

      {showAddModal && <AddIngredientModal onClose={() => setShowAddModal(false)} />}
    </>
  )
}
