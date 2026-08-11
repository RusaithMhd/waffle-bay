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
      <div className="flex items-center justify-end space-x-2">
        <button 
          onClick={() => setShowEditModal(true)}
          title="Edit"
          className="text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 border border-blue-100 flex-1 md:flex-none flex items-center justify-center space-x-1.5 bg-white shadow-sm"
        >
          <Edit2 className="w-4 h-4" />
          <span className="font-medium text-sm">Edit</span>
        </button>
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete"
          className="text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 border border-red-100 flex-1 md:flex-none flex items-center justify-center space-x-1.5 bg-white shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          <span className="font-medium text-sm">Delete</span>
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
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 h-[42px] rounded-lg shadow-sm flex items-center space-x-2 font-medium transition-colors w-full sm:w-auto justify-center"
      >
        <Plus className="w-5 h-5" />
        <span>New Product</span>
      </button>

      {showAddModal && <AddProductModal categories={categories} onClose={() => setShowAddModal(false)} />}
    </>
  )
}

export function ProductSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    
    // Debounce the search using a simple timeout
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams()
      if (val) {
        params.set('q', val)
      }
      router.push(`/products?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </div>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        className="block w-full pl-10 pr-3 h-[42px] border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm transition-colors"
        placeholder="Search products..."
      />
    </div>
  )
}
