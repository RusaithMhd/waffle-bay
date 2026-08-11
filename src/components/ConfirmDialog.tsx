'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => Promise<void> | void
  onCancel: () => void
  isDestructive?: boolean
}

export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    await onConfirm()
    setIsProcessing(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6">
          <div className="flex items-start mb-4">
            <div className={`p-3 rounded-full mr-4 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-gray-500 mt-1 text-[15px] leading-snug">{message}</p>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-8">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {isProcessing ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  )
}
