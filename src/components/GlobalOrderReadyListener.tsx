'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

export function GlobalOrderReadyListener() {
  const readyAudioRef = useRef<HTMLAudioElement | null>(null)
  const notifiedOrdersRef = useRef<Set<string>>(new Set())

  // Unlock audio context on first interaction
  useEffect(() => {
    const unlock = () => {
      if (readyAudioRef.current) {
        readyAudioRef.current.play().then(() => {
          if (readyAudioRef.current) {
            readyAudioRef.current.pause()
            readyAudioRef.current.currentTime = 0
          }
        }).catch(() => {})
      }
    }
    window.addEventListener('click', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
    return () => {
      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const globalChannel = supabase
      .channel('global-order-ready')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new
        if ((updated.fulfillment_status === 'READY' || updated.fulfillment_status === 'COMPLETED') && !notifiedOrdersRef.current.has(updated.id)) {
          notifiedOrdersRef.current.add(updated.id)
          
          if (readyAudioRef.current) {
            readyAudioRef.current.currentTime = 0
            readyAudioRef.current.volume = 0.85
            readyAudioRef.current.play().catch(e => console.warn('Ready chime play blocked:', e))
          }
          
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden border-l-4 ${updated.fulfillment_status === 'COMPLETED' ? 'border-green-500' : 'border-[#FF6500]'}`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${updated.fulfillment_status === 'COMPLETED' ? 'bg-green-100' : 'bg-orange-100'}`}>
                      <span className="text-xl">🛎️</span>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-[14px] font-bold text-gray-900">
                      Order #{updated.order_number} is {updated.fulfillment_status}!
                    </p>
                    <p className="mt-1 text-[13px] text-gray-500 font-medium">
                      {updated.table_number ? `Table ${updated.table_number}` : 'Takeaway / Delivery'} • Ready to serve
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-100">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-600 focus:outline-none transition-colors hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          ), { duration: 10000 })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(globalChannel)
    }
  }, [])

  return <audio ref={readyAudioRef} src="/Complete.mp3" preload="auto" className="hidden" />
}
