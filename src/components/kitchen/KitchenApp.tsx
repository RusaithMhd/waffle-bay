'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient }     from '@/lib/supabase/client'
import { CheckCircle2, Volume2, VolumeX } from 'lucide-react'
import { KitchenHeader }    from './KitchenHeader'
import { KitchenFilters, FilterStatus } from './KitchenFilters'
import { KOTCard, KOTData, OrderStatus, ItemStatus } from './KOTCard'
import { getBusinessDate } from '@/lib/dateUtils'

// ── Types ─────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING'

// ── KitchenApp ────────────────────────────────────────────────────────────────

export function KitchenApp({ userRole }: { userRole?: string }) {
  const supabase                                = createClient()
  const [orders, setOrders]                     = useState<KOTData[]>([])
  const [loading, setLoading]                   = useState(true)
  const [filter, setFilter]                     = useState<FilterStatus>('ALL')
  const [connection, setConnection]             = useState<ConnectionStatus>('ONLINE')
  const [updatingIds, setUpdatingIds]           = useState<Set<string>>(new Set())
  const [newOrderId, setNewOrderId]             = useState<string | null>(null)
  const [now, setNow]                           = useState(Date.now())
  const [selectedDate, setSelectedDate]         = useState(getBusinessDate(new Date()))
  const [muted, setMuted]                       = useState(false)
  const [soundUnlocked, setSoundUnlocked]       = useState(false)   // tracks browser unlock
  const prevOrderIdsRef                         = useRef<Set<string>>(new Set())
  const audioRef                                = useRef<HTMLAudioElement | null>(null)
  const completeAudioRef                        = useRef<HTMLAudioElement | null>(null)
  const mutedRef                                = useRef(false)

  // Keep mutedRef in sync (avoid stale closure in playKitchenAlert)
  useEffect(() => { mutedRef.current = muted }, [muted])

  // Keep mutedRef in sync (avoid stale closure in playKitchenAlert)
  useEffect(() => { mutedRef.current = muted }, [muted])

  // ── Unlock audio on first user interaction ──────────────────────────────────
  useEffect(() => {
    const unlock = () => setSoundUnlocked(true)
    window.addEventListener('click',     unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
    return () => {
      window.removeEventListener('click',      unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [])

  // ── Play the chime (New Order) ──────────────────────────────────────────────
  const playKitchenAlert = useCallback(() => {
    if (mutedRef.current) return
    const audio = audioRef.current
    if (!audio) return
    try {
      audio.currentTime = 0
      audio.volume = 0.85
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[Kitchen] Audio play blocked:', err)
          setSoundUnlocked(false)
        })
      }
    } catch (e) {
      console.warn('[Kitchen] Audio alert failed:', e)
    }
  }, [])

  // ── Play the chime (Order Complete) ─────────────────────────────────────────
  const playCompleteAlert = useCallback(() => {
    if (mutedRef.current) return
    const audio = completeAudioRef.current
    if (!audio) return
    try {
      audio.currentTime = 0
      audio.volume = 0.85
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[Kitchen] Complete Audio play blocked:', err)
          setSoundUnlocked(false)
        })
      }
    } catch (e) {
      console.warn('[Kitchen] Complete Audio alert failed:', e)
    }
  }, [])

  // ── Single global 1s timer ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Fetch orders ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const selectQuery = `
      id,
      order_id,
      kot_number,
      batch_number,
      status,
      sent_at,
      orders (
        order_number,
        order_type,
        business_date,
        table_number
      ),
      kitchen_order_items (
        id,
        quantity,
        status,
        notes,
        order_items (
          product_name_snapshot,
          order_item_modifiers ( modifier_name_snapshot )
        )
      )
    `

    const activeQuery = supabase
      .from('kitchen_orders')
      .select(selectQuery)
      .in('status', ['NEW', 'PREPARING', 'READY'])
      .order('sent_at', { ascending: true })

    const completedQuery = supabase
      .from('kitchen_orders')
      .select(selectQuery)
      .eq('status', 'COMPLETED')
      .eq('business_date', selectedDate)
      .order('sent_at', { ascending: false })

    const [activeRes, completedRes] = await Promise.all([activeQuery, completedQuery])

    if (activeRes.error || completedRes.error) {
      console.error('[Kitchen] fetch error:', activeRes.error || completedRes.error)
      return
    }

    const allData = [...(activeRes.data || []), ...(completedRes.data || [])]

    const mapped: KOTData[] = allData.map(o => {
      const orders = (o.orders as any) || {}
      const items = (o.kitchen_order_items as any[] || []).map(ki => {
        const orderItem = (ki.order_items as any) || {}
        return {
          id: ki.id,
          product_name_snapshot: orderItem.product_name_snapshot || '',
          quantity: ki.quantity,
          fulfillment_status: ki.status || 'PENDING',
          notes: ki.notes,
          modifiers: orderItem.order_item_modifiers || [],
        }
      })

      return {
        id: o.id,
        order_id: o.order_id,
        order_number: Number(orders.order_number || 0),
        kot_number: Number(o.kot_number || 0),
        batch_number: Number(o.batch_number || 1),
        business_date: orders.business_date,
        fulfillment_status: o.status || 'NEW',
        order_type: orders.order_type,
        table_number: orders.table_number,
        created_at: o.sent_at,
        items,
      }
    })

    // Detect new orders → flash banner + chime sound
    const currentIds = new Set(mapped.map(o => o.id))
    if (prevOrderIdsRef.current.size > 0) {
      let foundNew = false
      for (const id of currentIds) {
        if (!prevOrderIdsRef.current.has(id)) {
          playKitchenAlert()
          setNewOrderId(id)
          setTimeout(() => setNewOrderId(null), 5000)
          foundNew = true
          break
        }
      }
    }
    prevOrderIdsRef.current = currentIds

    setOrders(mapped)
    setLoading(false)
  }, [supabase, selectedDate, playKitchenAlert])

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('kitchen-room-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_orders' }, () => {
        setConnection('SYNCING')
        fetchOrders().then(() => setConnection('ONLINE'))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_order_items' }, () => {
        setConnection('SYNCING')
        fetchOrders().then(() => setConnection('ONLINE'))
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED')         setConnection('ONLINE')
        else if (status === 'CLOSED')        setConnection('OFFLINE')
        else if (status === 'CHANNEL_ERROR') setConnection('OFFLINE')
      })

    const onOffline = () => setConnection('OFFLINE')
    const onOnline  = () => { setConnection('SYNCING'); fetchOrders().then(() => setConnection('ONLINE')) }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
    }
  }, [fetchOrders, supabase])

  // ── Status update ───────────────────────────────────────────────────────────
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingIds(prev => new Set(prev).add(orderId))
    
    if (status === 'COMPLETED') {
      playCompleteAlert()
    }

    try {
      const { error } = await supabase
        .from('kitchen_orders')
        .update({ status: status })
        .eq('id', orderId)
      if (error) throw error

      setOrders(prev =>
        status === 'COMPLETED'
          ? prev.filter(o => o.id !== orderId)
          : prev.map(o => o.id === orderId ? { ...o, fulfillment_status: status } : o)
      )
    } catch (err) {
      console.error('[Kitchen] status update failed:', err)
      fetchOrders()
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(orderId); return s })
    }
  }

  // ── Item toggle ─────────────────────────────────────────────────────────────
  const handleToggleItem = async (itemId: string, current: ItemStatus) => {
    const next = current === 'PENDING' ? 'DONE' : 'PENDING'
    setOrders(prev => prev.map(o => ({
      ...o,
      items: o.items.map(i => i.id === itemId ? { ...i, fulfillment_status: next } : i),
    })))
    try {
      const { error } = await supabase
        .from('kitchen_order_items')
        .update({ status: next })
        .eq('id', itemId)
      if (error) throw error
    } catch (err) {
      console.error('[Kitchen] item toggle failed:', err)
      fetchOrders()
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────────
  const counts = {
    ALL:       orders.filter(o => o.fulfillment_status !== 'COMPLETED').length,
    NEW:       orders.filter(o => o.fulfillment_status === 'NEW').length,
    PREPARING: orders.filter(o => o.fulfillment_status === 'PREPARING').length,
    READY:     orders.filter(o => o.fulfillment_status === 'READY').length,
    COMPLETED: orders.filter(o => o.fulfillment_status === 'COMPLETED').length,
  }

  const visibleOrders = filter === 'ALL'
    ? orders.filter(o => o.fulfillment_status !== 'COMPLETED')
    : orders.filter(o => o.fulfillment_status === filter)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-orange-50 via-[#F8FAFC] to-orange-100 overflow-hidden text-slate-900">

      {/* Header */}
      <KitchenHeader
        activeOrderCount={orders.length}
        connectionStatus={connection}
        onRefresh={fetchOrders}
      />

      {/* Status Filters */}
      <KitchenFilters
        activeFilter={filter}
        counts={counts}
        onFilterChange={setFilter}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Sound unlock prompt — shows only if browser blocked autoplay */}
      {!soundUnlocked && (
        <div
          className="mx-4 mt-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => {
            const audio = audioRef.current
            const audio2 = completeAudioRef.current
            if (audio) {
              audio.currentTime = 0
              audio.volume = 0.85
              audio.play().then(() => setSoundUnlocked(true)).catch(() => {})
            }
            if (audio2) {
              audio2.currentTime = 0
              audio2.volume = 0.85
              // We just unlock it, we don't need to actually play the whole sound for the second one,
              // but playing and pausing ensures it's unlocked.
              audio2.play().then(() => { audio2.pause(); audio2.currentTime = 0; }).catch(() => {})
            }
          }}
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          Tap here to enable notification sounds for new orders
        </div>
      )}

      {/* New Order Flash Banner */}
      {newOrderId && (
        <div className="mx-4 mt-3 px-4 py-3 bg-blue-500 rounded-xl text-white font-bold text-[14px] flex items-center space-x-2 shadow-lg animate-pulse shrink-0">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>🔔 NEW ORDER — #{orders.find(o => o.id === newOrderId)?.order_number}</span>
        </div>
      )}

      {/* Top-right Sound Controls */}
      <div className="flex justify-end items-center gap-3 px-4 pt-2 shrink-0">
        <button
          onClick={() => setMuted(m => !m)}
          title={muted ? 'Unmute notifications' : 'Mute notifications'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            muted
              ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
          }`}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {muted ? 'Sound Off' : 'Sound On'}
        </button>
      </div>

      {/* Main Board */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-[#FF6500] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#6B7280] font-medium">Loading Kitchen Display...</p>
            </div>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-[20px] font-black text-slate-900 mb-1">
              {filter === 'ALL' ? 'All Orders Clear!' : `No ${filter} Orders`}
            </h2>
            <p className="text-[#6B7280] text-[14px]">
              {filter === 'ALL'
                ? 'Kitchen is up to date. Waiting for new orders.'
                : `No orders are currently in ${filter.toLowerCase()} status.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-start">
            {visibleOrders.map(order => (
              <KOTCard
                key={order.id}
                order={order}
                now={now}
                onUpdateStatus={handleUpdateStatus}
                onToggleItem={handleToggleItem}
                isUpdating={updatingIds.has(order.id)}
                readOnly={userRole === 'cashier'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Offline overlay */}
      {connection === 'OFFLINE' && (
        <div className="absolute bottom-4 inset-x-4 bg-red-600 text-white px-4 py-3 rounded-xl font-bold text-[14px] flex items-center space-x-2 shadow-2xl z-50">
          <span>⚠</span>
          <span>OFFLINE — Orders may not be up to date. Reconnecting...</span>
        </div>
      )}

      {/* Hidden Audio Elements */}
      <audio ref={audioRef} src="/chime.mp3" preload="auto" />
      <audio ref={completeAudioRef} src="/Complete.mp3" preload="auto" />
    </div>
  )
}
