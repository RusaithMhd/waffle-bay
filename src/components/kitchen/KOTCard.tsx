'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Loader2, Printer, ChevronDown, ChevronUp } from 'lucide-react'

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
  order_id: string
  order_number: number
  kot_number?: number
  batch_number?: number
  business_date?: string
  fulfillment_status: OrderStatus
  order_type?: 'DINE_IN' | 'TAKEAWAY'
  table_number?: string
  created_at: string
  items: KOTItemData[]
}

interface KOTCardProps {
  order: KOTData
  now: number
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

function getUrgencyStyle(secs: number, status: OrderStatus) {
  if (status === 'COMPLETED') {
    return {
      timer: 'text-slate-400',
      border: 'border-l-4 border-l-emerald-400',
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50/60 opacity-90',
      ring: 'border-emerald-200',
    }
  }
  if (secs >= 600) {
    return {
      timer: 'text-red-600 font-black animate-pulse',
      border: 'border-l-4 border-l-red-600 shadow-[0_0_18px_rgba(220,38,38,0.2)]',
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      ring: 'border-red-200',
    }
  }
  if (secs >= 300) {
    return {
      timer: 'text-orange-600 font-black',
      border: 'border-l-4 border-l-orange-500',
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      ring: 'border-orange-200',
    }
  }
  if (status === 'NEW') {
    return {
      timer: 'text-blue-500 font-semibold',
      border: 'border-l-4 border-l-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.15)]',
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/80',
      ring: 'border-blue-200',
    }
  }
  if (status === 'PREPARING') {
    return {
      timer: 'text-amber-500 font-semibold',
      border: 'border-l-4 border-l-amber-400',
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/80',
      ring: 'border-amber-200',
    }
  }
  if (status === 'READY') {
    return {
      timer: 'text-emerald-500 font-semibold',
      border: 'border-l-4 border-l-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.18)]',
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/90',
      ring: 'border-emerald-200',
    }
  }
  return {
    timer: 'text-slate-500 font-semibold',
    border: 'border-l-4 border-l-slate-200',
    bg: 'bg-gradient-to-br from-white/80 to-white/50',
    ring: 'border-white/60',
  }
}

const STATUS_CONFIG = {
  NEW: {
    badge: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'NEW' },
    button: { bg: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700', text: 'text-white', label: '▶  START COOKING', next: 'PREPARING' as OrderStatus },
  },
  PREPARING: {
    badge: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PREPARING' },
    button: { bg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700', text: 'text-white', label: '✓  MARK READY', next: 'READY' as OrderStatus },
  },
  READY: {
    badge: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'READY ✓' },
    button: { bg: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700', text: 'text-white', label: '✔  COMPLETE ORDER', next: 'COMPLETED' as OrderStatus },
  },
  COMPLETED: {
    badge: { bg: 'bg-slate-200', text: 'text-slate-500', label: 'DONE' },
    button: { bg: '', text: '', label: '', next: 'COMPLETED' as OrderStatus },
  },
}

// ── KOT Print helper ──────────────────────────────────────────────────────────
function printKOT(order: KOTData) {
  const kotLabel = order.kot_number
    ? `KOT-${String(order.kot_number).padStart(3, '0')}-${String(order.batch_number || 1).padStart(2, '0')}`
    : `KOT`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`
    <html>
      <head>
        <title>${kotLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; padding: 10px; font-size: 14px; color: #000; width: 80mm; }
          .c { text-align: center; }
          .sep { border-bottom: 1px dashed #000; margin: 8px 0; }
          .title { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
          .kot { font-size: 18px; font-weight: 900; margin: 4px 0; }
          .item { margin: 6px 0; }
          .qty { font-weight: 900; font-size: 16px; margin-right: 6px; }
          .name { font-size: 15px; font-weight: 700; }
          .note { font-style: italic; color: #555; margin-left: 22px; font-size: 12px; }
          .mod { font-size: 12px; margin-left: 22px; color: #333; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="c">
          <div class="title">KITCHEN</div>
          <div class="sep"></div>
          <div class="kot">${kotLabel}</div>
          <div>INV-${String(order.order_number).padStart(6,'0')} &bull; ${order.order_type === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE IN'}</div>
          ${order.table_number ? `<div>Table: ${order.table_number}</div>` : ''}
          <div>${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="sep"></div>
        ${order.items.map(item => `
          <div class="item">
            <span class="qty">${item.quantity}×</span>
            <span class="name">${item.product_name_snapshot}</span>
            ${item.notes ? `<div class="note">⚑ ${item.notes}</div>` : ''}
            ${item.modifiers.map(m => `<div class="mod">+ ${m.modifier_name_snapshot}</div>`).join('')}
          </div>
        `).join('')}
        <div class="sep"></div>
      </body>
    </html>
  `)
  w.document.close()
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KOTCard({ order, now, onUpdateStatus, onToggleItem, isUpdating, readOnly = false }: KOTCardProps) {
  const [showCompleted, setShowCompleted] = useState(false)
  const cfg    = STATUS_CONFIG[order.fulfillment_status]
  const secs   = getElapsedSeconds(order.created_at, now)
  const urg    = getUrgencyStyle(secs, order.fulfillment_status)
  const isReady = order.fulfillment_status === 'READY'

  const pendingItems   = order.items.filter(i => i.fulfillment_status !== 'DONE')
  const completedItems = order.items.filter(i => i.fulfillment_status === 'DONE')

  const handleAction = () => {
    if (order.fulfillment_status === 'COMPLETED' || isUpdating) return
    onUpdateStatus(order.id, cfg.button.next)
  }

  const kotLabel = order.kot_number
    ? `KOT-${String(order.kot_number).padStart(3, '0')}-${String(order.batch_number || 1).padStart(2, '0')}`
    : 'KOT'

  return (
    <div className={`flex flex-col rounded-2xl border overflow-hidden backdrop-blur-md transition-all duration-300 ${urg.ring} ${urg.bg} ${urg.border} ${isReady ? 'scale-[1.01] sm:scale-[1.02]' : ''}`}>

      {/* ── Card Header ── */}
      <div className="px-3 sm:px-4 py-3 flex items-start justify-between gap-2 border-b border-black/6">
        {/* Left: KOT id, invoice, status, timer */}
        <div className="flex-1 min-w-0">
          {/* KOT + Invoice */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-900 font-black text-[18px] sm:text-[20px] leading-none tracking-tight">
              {kotLabel}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0 ${cfg.badge.bg} ${cfg.badge.text}`}>
              {cfg.badge.label}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
            INV-{String(order.order_number).padStart(6, '0')}
            {order.table_number && <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md">Table {order.table_number}</span>}
          </div>

          {/* Timer + urgency */}
          {order.fulfillment_status !== 'COMPLETED' && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">
                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-slate-300 text-[10px]">·</span>
              <span className={`text-[14px] sm:text-[15px] font-bold tabular-nums ${urg.timer}`}>
                {formatElapsed(secs)}
              </span>
              {secs >= 600 && (
                <span className="text-[9px] font-black text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md animate-pulse">
                  OVERDUE
                </span>
              )}
              {secs >= 300 && secs < 600 && (
                <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                  SLOW
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: order type + print */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border shadow-sm ${
            order.order_type === 'TAKEAWAY'
              ? 'text-purple-700 bg-purple-50 border-purple-200'
              : 'text-blue-700 bg-blue-50 border-blue-200'
          }`}>
            {order.order_type === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE IN'}
          </span>
          <button
            onClick={() => printKOT(order)}
            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold rounded-md shadow-sm active:scale-95 transition-all"
            title="Reprint KOT"
          >
            <Printer className="w-3 h-3" />
            <span className="hidden sm:inline">PRINT</span>
          </button>
        </div>
      </div>

      {/* ── Pending Items ── */}
      <div className="flex-1 px-2 sm:px-3 pt-2 pb-1 space-y-1.5">
        {pendingItems.length === 0 && (
          <div className="py-4 text-center text-[12px] text-slate-400 font-semibold">
            All items completed ✓
          </div>
        )}

        {pendingItems.map(item => (
          <button
            key={item.id}
            onClick={() => readOnly ? undefined : onToggleItem(item.id, item.fulfillment_status)}
            disabled={readOnly}
            className={`w-full text-left px-3 py-3 sm:py-3.5 rounded-xl border transition-all ${
              readOnly ? 'cursor-default' : 'active:scale-[0.98] cursor-pointer'
            } bg-white/55 backdrop-blur-sm border-white/70 shadow-sm hover:bg-white/75`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[#FF6500] font-black text-[15px] sm:text-[16px] shrink-0">{item.quantity}×</span>
                  <span className="font-bold text-[14px] sm:text-[15px] leading-tight text-slate-800 break-words">
                    {item.product_name_snapshot}
                  </span>
                </div>
                {item.notes && (
                  <div className="mt-1 pl-7 text-[12px] text-[#FF6500] font-medium leading-snug">
                    <span className="font-bold">Note:</span> {item.notes}
                  </div>
                )}
                {item.modifiers.length > 0 && (
                  <div className="mt-1 pl-7 space-y-0.5">
                    {item.modifiers.map((mod, i) => (
                      <div key={i} className="text-[11px] sm:text-[12px] font-medium text-slate-500">
                        <span className="text-[#FF6500] mr-1">+</span>{mod.modifier_name_snapshot}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 mt-0.5">
                <Circle className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          </button>
        ))}

        {/* Completed items toggle */}
        {completedItems.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold tracking-wide uppercase bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 rounded-xl transition-all active:scale-[0.98]"
            >
              {showCompleted
                ? <><ChevronUp className="w-3.5 h-3.5" /> Hide Completed ({completedItems.length})</>
                : <><ChevronDown className="w-3.5 h-3.5" /> Show Completed ({completedItems.length})</>
              }
            </button>

            {showCompleted && (
              <div className="mt-1.5 space-y-1.5">
                {completedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => readOnly ? undefined : onToggleItem(item.id, item.fulfillment_status)}
                    disabled={readOnly}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-black/5 bg-slate-50/50 opacity-55 hover:opacity-80 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-slate-400 font-bold text-[14px] shrink-0">{item.quantity}×</span>
                          <span className="font-bold text-[14px] leading-tight line-through text-slate-400">
                            {item.product_name_snapshot}
                          </span>
                        </div>
                        {item.modifiers.length > 0 && (
                          <div className="mt-0.5 pl-7 space-y-0.5">
                            {item.modifiers.map((mod, i) => (
                              <div key={i} className="text-[11px] font-medium line-through text-slate-400">
                                + {mod.modifier_name_snapshot}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <CheckCircle2 className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Primary Action Button ── */}
      {!readOnly && order.fulfillment_status !== 'COMPLETED' && (
        <div className="p-2 sm:p-3 shrink-0 border-t border-white/50 bg-white/30">
          <button
            onClick={handleAction}
            disabled={isUpdating}
            className={`w-full py-3.5 sm:py-4 rounded-xl font-black text-[14px] sm:text-[15px] tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${cfg.button.bg} ${cfg.button.text}`}
          >
            {isUpdating
              ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Updating...</span></>
              : <span>{cfg.button.label}</span>
            }
          </button>
        </div>
      )}

      {/* Completed stamp */}
      {order.fulfillment_status === 'COMPLETED' && (
        <div className="px-3 py-2 flex items-center justify-center gap-2 bg-emerald-50/60 border-t border-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-[12px] font-black text-emerald-600 uppercase tracking-wider">Order Completed</span>
        </div>
      )}
    </div>
  )
}
