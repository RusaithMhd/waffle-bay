'use client'

import { useState } from 'react'
import { Edit2, Trash2, Plus } from 'lucide-react'
import { deleteProduct } from '@/app/actions/products'
import { EditProductModal, AddProductModal, Category } from './ProductModals'
import { useRouter } from 'next/navigation'

export interface ProductItem {
  id: string
  name: string
  category_id: string
  base_price: number
  is_active: boolean
}

export function ProductRowActions({ item, categories }: { item: ProductItem, categories: Category[] }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? If it has been ordered before, you should just mark it as Inactive.')) return
    
    setIsDeleting(true)
    const res = await deleteProduct(item.id)
    
    if (res.success) {
      setIsDeleting(false)
      router.refresh()
    } else {
      alert(res.error || 'Failed to delete product')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end space-x-3">
        <button 
          onClick={() => setShowEditModal(true)}
          disabled={isDeleting}
          title="Edit"
          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          title="Delete"
          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {showEditModal && <EditProductModal item={item} categories={categories} onClose={() => setShowEditModal(false)} />}
    </>
  )
}

export function AddProductButton({ categories }: { categories: Category[] }) {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <>
      <button 
        onClick={() => setShowAddModal(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2 font-medium transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>New Product</span>
      </button>

      {showAddModal && <AddProductModal categories={categories} onClose={() => setShowAddModal(false)} />}
    </>
  )
}
