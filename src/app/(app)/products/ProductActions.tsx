'use client'

import { useState } from 'react'
import { Edit2, Trash2, Plus } from 'lucide-react'
import { deleteProduct } from '@/app/actions/products'
import { EditProductModal, AddProductModal, Category } from './ProductModals'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'react-hot-toast'

export interface ProductItem {
  id: string
  name: string
  category_id: string
  base_price: number
  is_active: boolean
  image_url?: string | null
}

export function ProductRowActions({ item, categories }: { item: ProductItem, categories: Category[] }) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    const res = await deleteProduct(item.id)
    
    if (res.success) {
      toast.success('Product deleted successfully')
      router.refresh()
      setShowDeleteConfirm(false)
    } else {
      toast.error(res.error || 'Failed to delete product')
    }
  }

  return (
    <>
      <div className="flex items-center justify-end space-x-3">
        <button 
          onClick={() => setShowEditModal(true)}
          title="Edit"
          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 border border-blue-100 md:border-transparent flex-1 md:flex-none flex items-center justify-center"
        >
          <Edit2 className="w-4 h-4 md:mr-0 mr-2" />
          <span className="md:hidden font-medium text-sm">Edit</span>
        </button>
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete"
          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 border border-red-100 md:border-transparent flex-1 md:flex-none flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 md:mr-0 mr-2" />
          <span className="md:hidden font-medium text-sm">Delete</span>
        </button>
      </div>
      
      {showEditModal && <EditProductModal item={item} categories={categories} onClose={() => setShowEditModal(false)} />}
      
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Product"
          message={`Are you sure you want to delete "${item.name}"? If it has been ordered before, you should just edit it and mark it as Inactive.`}
          confirmText="Delete Product"
          isDestructive={true}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
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
