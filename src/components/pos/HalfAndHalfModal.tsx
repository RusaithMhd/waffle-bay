import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import { Product } from '@/types'
import Image from 'next/image'

interface HalfAndHalfModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToCart: (firstHalf: Product, secondHalf: Product) => void
  products: Product[] // List of all eligible products
  surcharge: number
  currencySymbol: string
}

export const HalfAndHalfModal: React.FC<HalfAndHalfModalProps> = ({
  isOpen,
  onClose,
  onAddToCart,
  products,
  surcharge,
  currencySymbol
}) => {
  const [firstHalf, setFirstHalf] = useState<Product | null>(null)
  const [secondHalf, setSecondHalf] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<'first' | 'second'>('first')

  if (!isOpen) return null

  const calculateTotal = () => {
    let total = surcharge
    if (firstHalf) total += firstHalf.base_price / 2
    if (secondHalf) total += secondHalf.base_price / 2
    return total
  }

  const handleSelect = (product: Product) => {
    if (activeTab === 'first') {
      setFirstHalf(product)
      if (!secondHalf) setActiveTab('second')
    } else {
      setSecondHalf(product)
    }
  }

  const handleAdd = () => {
    if (firstHalf && secondHalf) {
      onAddToCart(firstHalf, secondHalf)
      setFirstHalf(null)
      setSecondHalf(null)
      setActiveTab('first')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Custom Half & Half Waffle</h2>
            <p className="text-sm text-gray-500 mt-1">Select two flavors to combine</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Tabs for Selection */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('first')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${activeTab === 'first' ? 'border-[#FF6500] bg-[#FFF5F0]' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">First Half</span>
              <span className="font-semibold text-gray-900 text-center">
                {firstHalf ? firstHalf.name : 'Select Flavor'}
              </span>
              {firstHalf && <span className="text-[#FF6500] text-sm mt-1">{currencySymbol}{(firstHalf.base_price / 2).toFixed(2)}</span>}
            </button>
            
            <button
              onClick={() => setActiveTab('second')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${activeTab === 'second' ? 'border-[#FF6500] bg-[#FFF5F0]' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Second Half</span>
              <span className="font-semibold text-gray-900 text-center">
                {secondHalf ? secondHalf.name : 'Select Flavor'}
              </span>
              {secondHalf && <span className="text-[#FF6500] text-sm mt-1">{currencySymbol}{(secondHalf.base_price / 2).toFixed(2)}</span>}
            </button>
          </div>

          {/* Grid of flavors */}
          <h3 className="text-sm font-bold text-gray-900 mb-3">Available Flavors</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.map(product => {
              const isSelected = (activeTab === 'first' && firstHalf?.id === product.id) || 
                                 (activeTab === 'second' && secondHalf?.id === product.id)
              return (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all text-left overflow-hidden ${isSelected ? 'border-[#FF6500] bg-[#FF6500]/5 ring-2 ring-[#FF6500]/20' : 'border-gray-100 bg-white hover:border-[#FF6500]/50 hover:shadow-md'}`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-[#FF6500] text-white p-0.5 rounded-full z-10">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-3 overflow-hidden relative shadow-inner">
                    {product.image_url ? (
                      <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 64px, 80px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">No Img</div>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900 text-xs sm:text-sm text-center leading-tight line-clamp-2 w-full">{product.name}</h4>
                  <p className="text-[#FF6500] font-bold text-xs mt-1">+{currencySymbol}{(product.base_price / 2).toFixed(2)}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-auto">
              <p className="text-sm text-gray-500 font-medium">Total Price (including {currencySymbol}{surcharge.toFixed(2)} surcharge)</p>
              <p className="text-2xl font-bold text-gray-900">{currencySymbol}{calculateTotal().toFixed(2)}</p>
            </div>
            <button
              disabled={!firstHalf || !secondHalf}
              onClick={handleAdd}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center ${(!firstHalf || !secondHalf) ? 'bg-gray-300 shadow-none cursor-not-allowed' : 'bg-[#FF6500] hover:bg-[#E55A00] hover:shadow-[#FF6500]/25'}`}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
