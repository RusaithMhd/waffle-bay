'use client'

import { useState } from 'react'
import { addCashEntry } from '@/app/actions/cash_management'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CashManagementModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return alert('Enter a valid amount.')
    if (!description.trim()) return alert('Enter a description.')

    setIsProcessing(true)
    const res = await addCashEntry(type, Number(amount), description)
    if (res.success) {
      setIsOpen(false)
      setAmount('')
      setDescription('')
      router.refresh()
    } else {
      alert(res.error)
    }
    setIsProcessing(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2 font-medium transition-colors"
      >
        <span>Manage Cash Drawer</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Cash Management</h2>
            
            <div className="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setType('CASH_IN')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center font-bold transition-colors ${type === 'CASH_IN' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <ArrowDownToLine className="w-4 h-4 mr-2" /> CASH IN
              </button>
              <button 
                onClick={() => setType('CASH_OUT')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center font-bold transition-colors ${type === 'CASH_OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <ArrowUpFromLine className="w-4 h-4 mr-2" /> CASH OUT
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Amount (Rs.)</label>
                <input 
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-2xl font-black text-gray-900 p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Reason / Description</label>
                <input 
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={type === 'CASH_IN' ? 'e.g. Additional float added' : 'e.g. Petty cash for supplies'}
                  className="w-full text-gray-900 p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isProcessing}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isProcessing}
                className={`flex-1 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 ${type === 'CASH_IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isProcessing ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
