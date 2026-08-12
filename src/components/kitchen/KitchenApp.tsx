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
  const [newOrderId, setNewOrderId]             = useState<string | null>(null)   // for new-order flash
  const [now, setNow]                           = useState(Date.now())             // single global timer tick
  const [selectedDate, setSelectedDate]         = useState(getBusinessDate(new Date()))
  const [muted, setMuted]                       = useState(false)
  const prevOrderIdsRef                         = useRef<Set<string>>(new Set())
  const audioCtxRef                             = useRef<AudioContext | null>(null)
  const mutedRef                                = useRef(false)

  // Keep mutedRef in sync so playKitchenAlert always reads the latest value
  useEffect(() => { mutedRef.current = muted }, [muted])

  // ── Kitchen Alert Sound (Web Audio API — no audio file needed) ──────────────
  const playKitchenAlert = useCallback(() => {
    if (mutedRef.current) return
    try {
      // Re-use or lazily create AudioContext (browsers require user-gesture first;
      // the kitchen screen is always open by staff so this fires fine on interaction)
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const now = ctx.currentTime

      // Two-tone "ding dong" kitchen chime
      const tones = [
        { freq: 880, start: 0,    dur: 0.18 },  // high ding
        { freq: 660, start: 0.22, dur: 0.22 },  // mid dong
        { freq: 880, start: 0.48, dur: 0.18 },  // high ding again
        { freq: 550, start: 0.70, dur: 0.30 },  // low resonance
      ]

      tones.forEach(({ freq, start, dur }) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + start)

        gain.gain.setValueAtTime(0, now + start)
        gain.gain.linearRampToValueAtTime(0.55, now + start + 0.02)  // fast attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur) // decay

        osc.start(now + start)
        osc.stop(now + start + dur + 0.05)
      })
    } catch (e) {
      console.warn('[Kitchen] Audio alert failed:', e)
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
      id, order_number, kot_number, business_date, fulfillment_status, order_type, created_at,
      order_items (
        id, product_name_snapshot, quantity, fulfillment_status, notes,
        order_item_modifiers ( modifier_name_snapshot )
      )
    `

    const activeQuery = supabase
      .from('orders')
      .select(selectQuery)
      .in('fulfillment_status', ['NEW', 'PREPARING', 'READY'])
      .order('created_at', { ascending: true })

    const completedQuery = supabase
      .from('orders')
      .select(selectQuery)
      .eq('fulfillment_status', 'COMPLETED')
      .eq('business_date', selectedDate)
      .order('created_at', { ascending: false })

    const [activeRes, completedRes] = await Promise.all([activeQuery, completedQuery])

    if (activeRes.error || completedRes.error) {
      console.error('[Kitchen] fetch error:', activeRes.error || completedRes.error)
      return
    }

    const allData = [...(activeRes.data || []), ...(completedRes.data || [])]

    const mapped: KOTData[] = allData.map(o => ({
      id:                 o.id,
      order_number:       o.order_number,
      kot_number:         o.kot_number,
      business_date:      o.business_date,
      fulfillment_status: o.fulfillment_status,
      order_type:         o.order_type,
      created_at:         o.created_at,
      items: (o.order_items as any[]).map(i => ({
        id:                       i.id,
        product_name_snapshot:    i.product_name_snapshot,
        quantity:                 i.quantity,
        fulfillment_status:       i.fulfillment_status,
        notes:                    i.notes,
        modifiers:                i.order_item_modifiers || [],
      })),
    }))

    // Detect new orders → flash banner + sound alert
    const currentIds = new Set(mapped.map(o => o.id))
    for (const id of currentIds) {
      if (prevOrderIdsRef.current.size > 0 && !prevOrderIdsRef.current.has(id)) {
        // Only play sound if this isn't the very first load (prevOrderIdsRef has data)
        playKitchenAlert()
        setNewOrderId(id)
        setTimeout(() => setNewOrderId(null), 4000)
        break
      } else if (prevOrderIdsRef.current.size === 0) {
        // First load — just track but don't alert
        break
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
      .channel('kitchen-room-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        setConnection('SYNCING')
        fetchOrders().then(() => setConnection('ONLINE'))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchOrders()
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED')      setConnection('ONLINE')
        else if (status === 'CLOSED')     setConnection('OFFLINE')
        else if (status === 'CHANNEL_ERROR') setConnection('OFFLINE')
      })

    // Offline detection
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
    try {
      const { error } = await supabase
        .from('orders')
        .update({ fulfillment_status: status })
        .eq('id', orderId)
      if (error) throw error

      // Optimistic update
      setOrders(prev =>
        status === 'COMPLETED'
          ? prev.filter(o => o.id !== orderId)
          : prev.map(o => o.id === orderId ? { ...o, fulfillment_status: status } : o)
      )
    } catch (err) {
      console.error('[Kitchen] status update failed:', err)
      fetchOrders() // re-sync on failure
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(orderId); return s })
    }
  }

  // ── Item toggle ─────────────────────────────────────────────────────────────
  const handleToggleItem = async (itemId: string, current: ItemStatus) => {
    const next = current === 'PENDING' ? 'DONE' : 'PENDING'
    // Optimistic update
    setOrders(prev => prev.map(o => ({
      ...o,
      items: o.items.map(i => i.id === itemId ? { ...i, fulfillment_status: next } : i),
    })))
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ fulfillment_status: next })
        .eq('id', itemId)
      if (error) throw error
    } catch (err) {
      console.error('[Kitchen] item toggle failed:', err)
      fetchOrders() // re-sync on failure
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

      {/* New Order Flash Banner */}
      {newOrderId && (
        <div className="mx-4 mt-3 px-4 py-3 bg-blue-500 rounded-xl text-white font-bold text-[14px] flex items-center space-x-2 shadow-lg animate-pulse shrink-0">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span>🔔 NEW ORDER — #{orders.find(o => o.id === newOrderId)?.order_number}</span>
        </div>
      )}

      {/* Mute Toggle */}
      <div className="flex justify-end px-4 pt-2 shrink-0">
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
          /* Empty State */
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
          /* KOT Grid:
             Mobile:           1 column
             Tablet portrait:  2 columns (sm: 640px+)
             Tablet landscape: 3 columns (lg: 1024px+)
             Desktop wide:     4 columns (xl: 1280px+)
          */
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
    </div>
  )
}
