'use client'

import { useState } from 'react'
import { ArrowDownToLine } from 'lucide-react'
import { restockItem } from '@/app/actions/inventory'

export function RestockButton({ ingredientId, costPerUnit }: { ingredientId: string, costPerUnit: number }) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleRestock = async () => {
    if (!confirm('Are you sure you want to quick-restock 100 units of this item? This will create a purchase order and debit your accounting ledger.')) return
    
    setIsProcessing(true)
    const res = await restockItem(ingredientId, costPerUnit)
    
    if (res.success) {
      setIsProcessing(false)
      // The page will automatically revalidate data due to revalidatePath
    } else {
      alert(res.error || 'Failed to restock item')
      setIsProcessing(false)
    }
  }

  return (
    <button 
      onClick={handleRestock}
      disabled={isProcessing}
      className="text-orange-600 hover:text-orange-800 font-medium text-sm flex items-center justify-end space-x-1 ml-auto disabled:opacity-50 transition-colors"
    >
      <ArrowDownToLine className="w-4 h-4" />
      <span>{isProcessing ? 'Restocking...' : 'Restock'}</span>
    </button>
  )
}
