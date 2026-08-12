'use client'

import { useRouter } from 'next/navigation'

export function DatePickerFilter({ currentDate }: { currentDate?: string }) {
  const router = useRouter()
  
  return (
    <input 
      type="date" 
      value={currentDate || ''} 
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/accounting?period=custom&date=${e.target.value}`)
        } else {
          router.push(`/accounting`)
        }
      }}
      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 shadow-sm"
    />
  )
}
