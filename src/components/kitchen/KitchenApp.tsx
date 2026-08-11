'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Clock, Bell } from 'lucide-react'

// Basic types for the kitchen view
type OrderItem = {
  id: string
  product_name_snapshot: string
  quantity: number
  fulfillment_status: 'PENDING' | 'DONE'
  modifiers: { modifier_name_snapshot: string }[]
}

type Order = {
  id: string
  order_number: number
  fulfillment_status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED'
  created_at: string
  items: OrderItem[]
}

export function KitchenApp() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchActiveOrders = async () => {
    // Fetch orders that are not COMPLETED
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, order_number, fulfillment_status, created_at,
        order_items (
          id, product_name_snapshot, quantity, fulfillment_status,
          order_item_modifiers ( modifier_name_snapshot )
        )
      `)
      .in('fulfillment_status', ['NEW', 'PREPARING', 'READY'])
      .order('created_at', { ascending: true })

    if (ordersError) {
      console.error(ordersError)
      return
    }

    // Map to our local type
    const mapped: Order[] = ordersData.map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      fulfillment_status: o.fulfillment_status,
      created_at: o.created_at,
      items: o.order_items.map((i: any) => ({
        id: i.id,
        product_name_snapshot: i.product_name_snapshot,
        quantity: i.quantity,
        fulfillment_status: i.fulfillment_status,
        modifiers: i.order_item_modifiers || []
      }))
    }))

    setOrders(mapped)
    setLoading(false)
  }

  useEffect(() => {
    fetchActiveOrders()

    // Subscribe to realtime changes on orders and order_items
    const channel = supabase.channel('kitchen-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchActiveOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchActiveOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ fulfillment_status: status }).eq('id', orderId)
    fetchActiveOrders()
  }

  const toggleItemStatus = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PENDING' ? 'DONE' : 'PENDING'
    await supabase.from('order_items').update({ fulfillment_status: newStatus }).eq('id', itemId)
    fetchActiveOrders()
  }

  if (loading) {
    return <div className="text-white p-10">Loading Kitchen Display...</div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-2xl font-bold flex items-center">
          <Bell className="mr-3 text-orange-500" /> Waffle Bay Kitchen
        </h1>
        <div className="flex gap-4 text-sm font-medium">
          <span className="bg-gray-700 px-3 py-1 rounded-full">{orders.length} Active Orders</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 flex gap-6 hide-scrollbar items-start">
        {orders.map(order => {
          const isReady = order.fulfillment_status === 'READY'
          const allItemsDone = order.items.every(i => i.fulfillment_status === 'DONE')
          
          return (
            <div 
              key={order.id} 
              className={`min-w-[300px] w-[300px] flex flex-col rounded-2xl shadow-xl overflow-hidden border-2 transition-colors ${
                isReady ? 'bg-green-50 border-green-500' : 
                allItemsDone ? 'bg-orange-50 border-orange-400' : 'bg-white border-gray-200'
              }`}
            >
              {/* Ticket Header */}
              <div className={`p-4 border-b flex justify-between items-center ${
                isReady ? 'bg-green-500 text-white' : 'bg-gray-100'
              }`}>
                <div>
                  <h2 className={`text-2xl font-black ${isReady ? 'text-white' : 'text-gray-900'}`}>
                    #{order.order_number}
                  </h2>
                  <p className={`text-sm flex items-center ${isReady ? 'text-green-100' : 'text-gray-500'}`}>
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.fulfillment_status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                  order.fulfillment_status === 'PREPARING' ? 'bg-orange-100 text-orange-700' :
                  'bg-white text-green-700'
                }`}>
                  {order.fulfillment_status}
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[50vh]">
                {order.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItemStatus(item.id, item.fulfillment_status)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      item.fulfillment_status === 'DONE' 
                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                        : 'bg-white border-gray-300 shadow-sm hover:border-orange-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`font-bold ${item.fulfillment_status === 'DONE' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        <span className="text-orange-500 mr-2">{item.quantity}x</span>
                        {item.product_name_snapshot}
                      </div>
                      {item.fulfillment_status === 'DONE' && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 ml-2" />}
                    </div>
                    {item.modifiers.map((mod, idx) => (
                      <div key={idx} className={`text-sm ml-6 mt-1 ${item.fulfillment_status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                        + {mod.modifier_name_snapshot}
                      </div>
                    ))}
                  </button>
                ))}
              </div>

              {/* Ticket Footer Actions */}
              <div className="p-4 bg-gray-50 border-t flex flex-col gap-2">
                {!isReady ? (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'READY')}
                    className={`w-full py-3 rounded-xl font-bold transition-colors ${
                      allItemsDone 
                        ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md animate-pulse' 
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                  >
                    Mark Ready
                  </button>
                ) : (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                    className="w-full py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 shadow-md"
                  >
                    Complete & Clear
                  </button>
                )}
                
                {order.fulfillment_status === 'NEW' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                    className="w-full py-2 rounded-xl font-bold text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    Start Preparing
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {orders.length === 0 && (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
            <CheckCircle2 className="w-24 h-24 mb-4 opacity-20" />
            <h2 className="text-2xl font-bold opacity-50">Kitchen is all caught up!</h2>
          </div>
        )}
      </div>
    </div>
  )
}
