'use client'

import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

// Types
export type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED'
export type ItemStatus  = 'PENDING' | 'DONE'

export interface KOTItemData {
  id: string
  product_name_snapshot: string
  quantity: number
  fulfillment_status: ItemStatus
  notes?: string
  modifiers: { modifier_name_snapshot: string }[]
}

export interface KOTData {
  id: string
  order_number: number
  fulfillment_status: OrderStatus
  created_at: string
  items: KOTItemData[]
}

interface KOTCardProps {
  order: KOTData
  now: number                           // epoch ms — passed from parent to avoid per-card timers
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>
  onToggleItem:   (itemId: string, current: ItemStatus)  => Promise<void>
  isUpdating: boolean
  readOnly?: boolean
}

// ── Elapsed time helpers ──────────────────────────────────────────────────────

function getElapsedSeconds(createdAt: string, now: number): number {
  return Math.floor((now - new Date(createdAt).getTime()) / 1000)
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s < 10 ? '0' : ''}${s}s`
}

function getUrgencyClass(secs: number): { timer: string; ring: string } {
  if (secs >= 600) return { timer: 'text-red-600 font-black', ring: 'border-red-400' }
  if (secs >= 300) return { timer: 'text-amber-600 font-black', ring: 'border-amber-400' }
  return { timer: 'text-slate-500 font-semibold', ring: 'border-white/60' }
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  NEW: {
    badge: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'NEW' },
    button: { bg: 'bg-blue-500 hover:bg-blue-600', text: 'text-white', label: 'START COOKING', next: 'PREPARING' as OrderStatus },
  },
  PREPARING: {
    badge: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PREPARING' },
    button: { bg: 'bg-amber-500 hover:bg-amber-600', text: 'text-white', label: 'MARK READY', next: 'READY' as OrderStatus },
  },
  READY: {
    badge: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'READY ✓' },
    button: { bg: 'bg-emerald-500 hover:bg-emerald-600', text: 'text-white', label: 'COMPLETE ORDER', next: 'COMPLETED' as OrderStatus },
  },
  COMPLETED: {
    badge: { bg: 'bg-slate-200', text: 'text-slate-500', label: 'DONE' },
    button: { bg: '', text: '', label: '', next: 'COMPLETED' as OrderStatus },
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KOTCard({ order, now, onUpdateStatus, onToggleItem, isUpdating, readOnly = false }: KOTCardProps) {
  const cfg    = STATUS_CONFIG[order.fulfillment_status]
  const secs   = getElapsedSeconds(order.created_at, now)
  const urg    = getUrgencyClass(secs)
  const isReady = order.fulfillment_status === 'READY'

  const handleAction = () => {
    if (order.fulfillment_status === 'COMPLETED' || isUpdating) return
    onUpdateStatus(order.id, cfg.button.next)
  }

  return (
    <div className={`flex flex-col rounded-2xl border border-white/60 overflow-hidden bg-white/70 backdrop-blur-md shadow-sm transition-all ${urg.ring} ${isReady ? 'border-emerald-300' : ''}`}>

      {/* ── Card Header ── */}
      <div className={`px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/40 ${isReady ? 'bg-emerald-50/80' : 'bg-white/40'}`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-900 font-black text-[22px] leading-none tracking-tight">#{order.order_number}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${cfg.badge.bg} ${cfg.badge.text}`}>
              {cfg.badge.label}
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[11px] text-slate-500 font-semibold">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-slate-300">·</span>
            <span className={`text-[13px] font-bold tabular-nums ${urg.timer}`}>
              {formatElapsed(secs)}
            </span>
            {secs >= 600 && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">OVERDUE</span>}
            {secs >= 300 && secs < 600 && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">SLOW</span>}
          </div>
        </div>

        {/* Order type badge */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white/60 px-2 py-1 rounded-md border border-white/50 shadow-sm">DINE IN</span>
        </div>
      </div>

      {/* ── Items ── */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {order.items.map(item => (
          <button
            key={item.id}
            onClick={() => readOnly ? null : onToggleItem(item.id, item.fulfillment_status)}
            disabled={readOnly}
            className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${!readOnly ? 'active:scale-[0.98]' : 'cursor-default'} ${
              item.fulfillment_status === 'DONE'
                ? 'bg-slate-50/50 border-slate-200/50 opacity-60'
                : 'bg-white/80 border-slate-200/60 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Qty + Name */}
                <div className="flex items-baseline space-x-2">
                  <span className="text-[#FF6500] font-black text-[15px] shrink-0">{item.quantity}×</span>
                  <span className={`font-bold text-[15px] leading-tight ${
                    item.fulfillment_status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}>
                    {item.product_name_snapshot}
                  </span>
                </div>
                {/* Note */}
                {item.notes && (
                  <div className="mt-1 pl-7 text-[13px] text-[#FF6500] font-medium leading-snug">
                    <span className="font-bold">Note:</span> {item.notes}
                  </div>
                )}
                {/* Modifiers */}
                {item.modifiers.length > 0 && (
                  <div className="mt-1.5 pl-7 space-y-0.5">
                    {item.modifiers.map((mod, i) => (
                      <div key={i} className={`text-[12px] font-medium ${
                        item.fulfillment_status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-500'
                      }`}>
                        <span className="text-[#FF6500] mr-1">+</span>{mod.modifier_name_snapshot}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Checkbox indicator */}
              <div className="shrink-0 mt-0.5">
                {item.fulfillment_status === 'DONE'
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <Circle className="w-5 h-5 text-slate-300" />
                }
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Primary Action ── */}
      {!readOnly && order.fulfillment_status !== 'COMPLETED' && (
        <div className="p-3 shrink-0 border-t border-white/50 bg-white/40">
          <button
            onClick={handleAction}
            disabled={isUpdating}
            className={`w-full py-4 rounded-xl font-black text-[15px] tracking-wide transition-all active:scale-[0.98] flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${cfg.button.bg} ${cfg.button.text} ${order.fulfillment_status === 'NEW' ? 'hover:bg-[#e65a00]' : ''}`}
          >
            {isUpdating
              ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Updating...</span></>
              : <span>{cfg.button.label}</span>
            }
          </button>
        </div>
      )}
    </div>
  )
}
