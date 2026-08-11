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
  if (secs >= 600) return { timer: 'text-red-400 font-black', ring: 'border-red-500/60' }
  if (secs >= 300) return { timer: 'text-amber-400 font-black', ring: 'border-amber-500/60' }
  return { timer: 'text-[#9CA3AF] font-semibold', ring: 'border-[#374151]' }
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  NEW: {
    badge: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'NEW' },
    button: { bg: 'bg-blue-500 hover:bg-blue-400', text: 'text-white', label: 'START COOKING', next: 'PREPARING' as OrderStatus },
  },
  PREPARING: {
    badge: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'PREPARING' },
    button: { bg: 'bg-amber-500 hover:bg-amber-400', text: 'text-white', label: 'MARK READY', next: 'READY' as OrderStatus },
  },
  READY: {
    badge: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'READY ✓' },
    button: { bg: 'bg-emerald-500 hover:bg-emerald-400', text: 'text-white', label: 'COMPLETE ORDER', next: 'COMPLETED' as OrderStatus },
  },
  COMPLETED: {
    badge: { bg: 'bg-[#374151]', text: 'text-[#9CA3AF]', label: 'DONE' },
    button: { bg: '', text: '', label: '', next: 'COMPLETED' as OrderStatus },
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KOTCard({ order, now, onUpdateStatus, onToggleItem, isUpdating }: KOTCardProps) {
  const cfg    = STATUS_CONFIG[order.fulfillment_status]
  const secs   = getElapsedSeconds(order.created_at, now)
  const urg    = getUrgencyClass(secs)
  const isReady = order.fulfillment_status === 'READY'

  const handleAction = () => {
    if (order.fulfillment_status === 'COMPLETED' || isUpdating) return
    onUpdateStatus(order.id, cfg.button.next)
  }

  return (
    <div className={`flex flex-col rounded-2xl border-2 overflow-hidden bg-[#1F2937] shadow-lg transition-all ${urg.ring} ${isReady ? 'border-emerald-500/60' : ''}`}>

      {/* ── Card Header ── */}
      <div className={`px-4 py-3 flex items-center justify-between shrink-0 ${isReady ? 'bg-emerald-500/10' : 'bg-[#111827]/60'}`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-white font-black text-[22px] leading-none tracking-tight">#{order.order_number}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${cfg.badge.bg} ${cfg.badge.text}`}>
              {cfg.badge.label}
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[11px] text-[#6B7280]">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[#374151]">·</span>
            <span className={`text-[13px] tabular-nums ${urg.timer}`}>
              {formatElapsed(secs)}
            </span>
            {secs >= 600 && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">OVERDUE</span>}
            {secs >= 300 && secs < 600 && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">SLOW</span>}
          </div>
        </div>

        {/* Order type badge — shows DINE IN by default since order type isn't in current DB */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">DINE IN</span>
        </div>
      </div>

      {/* ── Items ── */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {order.items.map(item => (
          <button
            key={item.id}
            onClick={() => onToggleItem(item.id, item.fulfillment_status)}
            className={`w-full text-left px-3 py-3 rounded-xl border transition-all active:scale-[0.98] ${
              item.fulfillment_status === 'DONE'
                ? 'bg-[#111827]/40 border-[#374151]/50 opacity-60'
                : 'bg-[#111827] border-[#374151] hover:border-[#4B5563]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Qty + Name */}
                <div className="flex items-baseline space-x-2">
                  <span className="text-[#FF6500] font-black text-[15px] shrink-0">{item.quantity}×</span>
                  <span className={`font-bold text-[15px] leading-tight ${
                    item.fulfillment_status === 'DONE' ? 'line-through text-[#6B7280]' : 'text-white'
                  }`}>
                    {item.product_name_snapshot}
                  </span>
                </div>
                {/* Modifiers */}
                {item.modifiers.length > 0 && (
                  <div className="mt-1.5 pl-7 space-y-0.5">
                    {item.modifiers.map((mod, i) => (
                      <div key={i} className={`text-[12px] ${
                        item.fulfillment_status === 'DONE' ? 'line-through text-[#4B5563]' : 'text-[#9CA3AF]'
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
                  : <Circle className="w-5 h-5 text-[#4B5563]" />
                }
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Primary Action ── */}
      {order.fulfillment_status !== 'COMPLETED' && (
        <div className="p-3 shrink-0 border-t border-[#374151]/50">
          <button
            onClick={handleAction}
            disabled={isUpdating}
            className={`w-full py-4 rounded-xl font-black text-[15px] tracking-wide transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed ${cfg.button.bg} ${cfg.button.text}`}
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
