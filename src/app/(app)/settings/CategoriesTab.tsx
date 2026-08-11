'use client'

import { useState } from 'react'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/settings'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function CategoriesTab({ categories }: { categories: any[] }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true })
  
  // For new category
  const [showNewRow, setShowNewRow] = useState(false)

  const handleEdit = (cat: any) => {
    setEditingId(cat.id)
    setFormData({ name: cat.name, description: cat.description || '', is_active: cat.is_active })
  }

  const handleCancel = () => {
    setEditingId(null)
    setShowNewRow(false)
    setFormData({ name: '', description: '', is_active: true })
  }

  const handleSave = async (id: string | null) => {
    if (!formData.name) return
    setIsProcessing(true)

    let res
    if (id) {
      res = await updateCategory(id, formData.name, formData.description, formData.is_active)
    } else {
      res = await createCategory(formData.name, formData.description)
    }

    if (res.success) {
      toast.success(id ? 'Category updated!' : 'Category created!')
      handleCancel()
    } else {
      toast.error(`Error: ${res.error}`)
    }
    setIsProcessing(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    setIsProcessing(true)
    const res = await deleteCategory(id)
    if (res.success) {
      toast.success('Category deleted!')
    } else {
      toast.error(`Error: ${res.error}`)
    }
    setIsProcessing(false)
  }

  return (
    <div className="p-0">
      <div className="p-4 flex justify-end border-b border-gray-200">
        <button 
          onClick={() => { setShowNewRow(true); setEditingId(null); setFormData({ name: '', description: '', is_active: true }) }}
          disabled={showNewRow}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2 font-medium transition-colors disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="flex flex-col">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider font-semibold">
          <div className="col-span-3">Category Name</div>
          <div className="col-span-5">Description</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        
        <div className="divide-y divide-gray-200 text-gray-700">
          
          {showNewRow && (
            <div className="bg-orange-50 p-4 md:grid md:grid-cols-12 md:gap-4 md:items-center flex flex-col space-y-3 md:space-y-0">
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-gray-500 uppercase md:hidden block mb-1">Name</label>
                <input 
                  type="text" autoFocus placeholder="Name..." required
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded outline-none"
                />
              </div>
              <div className="md:col-span-5">
                <label className="text-xs font-semibold text-gray-500 uppercase md:hidden block mb-1">Description</label>
                <input 
                  type="text" placeholder="Description..."
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded outline-none"
                />
              </div>
              <div className="md:col-span-2 flex items-center md:justify-center">
                <span className="text-sm font-medium">Active</span>
              </div>
              <div className="md:col-span-2 flex justify-end space-x-2">
                <button onClick={() => handleSave(null)} disabled={isProcessing || !formData.name} className="text-green-600 font-medium px-4 py-2 rounded hover:bg-green-100 disabled:opacity-50 w-full md:w-auto text-center border border-green-200 md:border-none">Save</button>
                <button onClick={handleCancel} disabled={isProcessing} className="text-gray-600 font-medium px-4 py-2 rounded hover:bg-gray-200 disabled:opacity-50 w-full md:w-auto text-center border border-gray-200 md:border-none">Cancel</button>
              </div>
            </div>
          )}

          {categories.map((cat) => (
            <div key={cat.id} className="p-4 hover:bg-gray-50 transition-colors md:grid md:grid-cols-12 md:gap-4 md:items-center flex flex-col space-y-3 md:space-y-0">
              {editingId === cat.id ? (
                <>
                  <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase md:hidden block mb-1">Name</label>
                    <input 
                      type="text" required
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded outline-none"
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="text-xs font-semibold text-gray-500 uppercase md:hidden block mb-1">Description</label>
                    <input 
                      type="text"
                      value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-center space-x-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase md:hidden block">Active</label>
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"/>
                  </div>
                  <div className="md:col-span-2 flex justify-end space-x-2 mt-2 md:mt-0">
                    <button onClick={() => handleSave(cat.id)} disabled={isProcessing || !formData.name} className="text-green-600 font-medium px-4 py-2 rounded hover:bg-green-100 disabled:opacity-50 w-full md:w-auto text-center border border-green-200 md:border-none">Save</button>
                    <button onClick={handleCancel} disabled={isProcessing} className="text-gray-600 font-medium px-4 py-2 rounded hover:bg-gray-200 disabled:opacity-50 w-full md:w-auto text-center border border-gray-200 md:border-none">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-3 font-medium text-gray-900 text-lg md:text-base">
                    {cat.name}
                  </div>
                  <div className="md:col-span-5 text-gray-500 text-sm md:text-base">
                    {cat.description || <span className="italic text-gray-400">No description</span>}
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-center">
                    {cat.is_active ? (
                      <span className="inline-flex items-center text-green-600 space-x-1 text-sm font-medium bg-green-50 px-2.5 py-1 rounded-full md:bg-transparent md:px-0 md:py-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400 space-x-1 text-sm font-medium bg-gray-100 px-2.5 py-1 rounded-full md:bg-transparent md:px-0 md:py-0">
                        <XCircle className="w-4 h-4" />
                        <span>Inactive</span>
                      </span>
                    )}
                  </div>
                  <div className="md:col-span-2 flex justify-end space-x-2 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-gray-100 md:border-none">
                    <button onClick={() => handleEdit(cat)} disabled={isProcessing || editingId !== null || showNewRow} className="flex-1 md:flex-none flex items-center justify-center text-blue-600 hover:text-blue-800 py-2 md:p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 border border-blue-100 md:border-transparent">
                      <Edit2 className="w-4 h-4 md:mr-0 mr-2" />
                      <span className="md:hidden font-medium text-sm">Edit</span>
                    </button>
                    <button onClick={() => handleDelete(cat.id)} disabled={isProcessing || editingId !== null || showNewRow} className="flex-1 md:flex-none flex items-center justify-center text-red-600 hover:text-red-800 py-2 md:p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 border border-red-100 md:border-transparent">
                      <Trash2 className="w-4 h-4 md:mr-0 mr-2" />
                      <span className="md:hidden font-medium text-sm">Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {categories.length === 0 && !showNewRow && (
            <div className="p-8 text-center text-gray-500">
              No categories found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
