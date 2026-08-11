'use client'

import { useState } from 'react'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/settings'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'

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
      handleCancel()
    } else {
      alert(`Error: ${res.error}`)
    }
    setIsProcessing(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    setIsProcessing(true)
    const res = await deleteCategory(id)
    if (!res.success) {
      alert(`Error: ${res.error}`)
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
            <th className="p-6 font-semibold">Category Name</th>
            <th className="p-6 font-semibold w-1/2">Description</th>
            <th className="p-6 font-semibold text-center">Status</th>
            <th className="p-6 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-gray-700">
          
          {showNewRow && (
            <tr className="bg-orange-50">
              <td className="p-4">
                <input 
                  type="text" autoFocus placeholder="Name..." required
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded outline-none"
                />
              </td>
              <td className="p-4">
                <input 
                  type="text" placeholder="Description..."
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded outline-none"
                />
              </td>
              <td className="p-4 text-center">Active</td>
              <td className="p-4 text-right space-x-2">
                <button onClick={() => handleSave(null)} disabled={isProcessing || !formData.name} className="text-green-600 font-medium px-3 py-1 rounded hover:bg-green-100 disabled:opacity-50">Save</button>
                <button onClick={handleCancel} disabled={isProcessing} className="text-gray-600 font-medium px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-50">Cancel</button>
              </td>
            </tr>
          )}

          {categories.map((cat) => (
            <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
              {editingId === cat.id ? (
                <>
                  <td className="p-4">
                    <input 
                      type="text" required
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded outline-none"
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      type="text"
                      value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded outline-none"
                    />
                  </td>
                  <td className="p-4 text-center">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4"/>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleSave(cat.id)} disabled={isProcessing || !formData.name} className="text-green-600 font-medium px-3 py-1 rounded hover:bg-green-100 disabled:opacity-50">Save</button>
                    <button onClick={handleCancel} disabled={isProcessing} className="text-gray-600 font-medium px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-6 font-medium">{cat.name}</td>
                  <td className="p-6 text-gray-500">{cat.description}</td>
                  <td className="p-6 text-center">
                    {cat.is_active ? (
                      <span className="inline-flex items-center text-green-600 space-x-1 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400 space-x-1 text-sm font-medium">
                        <XCircle className="w-4 h-4" />
                        <span>Inactive</span>
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-right space-x-2">
                    <button onClick={() => handleEdit(cat)} disabled={isProcessing || editingId !== null || showNewRow} className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} disabled={isProcessing || editingId !== null || showNewRow} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {categories.length === 0 && !showNewRow && (
            <tr>
              <td colSpan={4} className="p-8 text-center text-gray-500">
                No categories found.
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  )
}
