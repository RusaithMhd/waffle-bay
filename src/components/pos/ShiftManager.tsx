'use client'

import { useState } from 'react'
import { openShift, closeShift } from '@/app/actions/shifts'
import { Lock, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ShiftBlocker() {
  const [startingCash, setStartingCash] = useState('5000')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleOpenShift = async () => {
    setIsProcessing(true)
    setError(null)
    const res = await openShift(Number(startingCash))
    if (res.success) {
      router.refresh()
    } else {
      setError(res.error || 'Failed to open shift')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Register Locked</h2>
        <p className="text-gray-500 text-center mb-6">You must open a cash register shift to start taking orders.</p>
        
        <div className="w-full mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Starting Cash Float (Rs.)</label>
          <input 
            type="number"
            value={startingCash}
            onChange={e => setStartingCash(e.target.value)}
            className="w-full text-center text-3xl font-black text-gray-900 p-4 border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

        <button 
          onClick={handleOpenShift}
          disabled={isProcessing}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 disabled:opacity-50 transition-colors text-lg"
        >
          {isProcessing ? 'Opening...' : 'Open Shift'}
        </button>
      </div>
    </div>
  )
}

export function CloseShiftModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [actualCash, setActualCash] = useState('')
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const handleCloseShift = async () => {
    if (actualCash === '') return alert('Please enter the actual physical cash count (enter 0 if empty).')

    setIsProcessing(true)
    const res = await closeShift(Number(actualCash), reason)
    if (res.success) {
      onClose()
      router.refresh()
    } else {
      alert(res.error || 'Failed to close shift')
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col items-center relative">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Close Shift</h2>
            <p className="text-gray-500 text-center mb-6">Count the physical cash in the drawer to generate your Z-Report.</p>
            
            <div className="w-full mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Actual Cash Count (Rs.)</label>
              <input 
                type="number"
                value={actualCash}
                onChange={e => setActualCash(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full text-center text-3xl font-black text-gray-900 p-4 border-2 border-gray-200 rounded-2xl focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="w-full mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Variance Reason (Optional)</label>
              <input 
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Counting error, Petty cash..."
                className="w-full text-gray-900 p-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex w-full space-x-4">
              <button 
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCloseShift}
                disabled={isProcessing || actualCash === ''}
                className="flex-1 bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Confirm Closing'}
              </button>
            </div>
          </div>
        </div>
  )
}

export function CloseShiftButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={className || "flex items-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition-colors"}
      >
        <LogOut className="w-5 h-5" />
        <span>Close Shift</span>
      </button>
      <CloseShiftModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
