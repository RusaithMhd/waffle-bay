'use client'

import { ListTodo, Clock, ChefHat, CheckCircle2, CheckSquare, Calendar as CalendarIcon } from 'lucide-react'

type FilterStatus = 'ALL' | 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED'

interface KitchenFiltersProps {
  activeFilter: FilterStatus
  counts: { ALL: number; NEW: number; PREPARING: number; READY: number; COMPLETED: number }
  onFilterChange: (filter: FilterStatus) => void
  selectedDate: string
  onDateChange: (date: string) => void
}

export function KitchenFilters({ activeFilter, counts, onFilterChange, selectedDate, onDateChange }: KitchenFiltersProps) {
  const filters: { id: FilterStatus; label: string; icon: any; colorActive: string; colorDot: string }[] = [
    { id: 'ALL',       label: 'All',       icon: ListTodo,     colorActive: 'bg-slate-800 text-white',          colorDot: '' },
    { id: 'NEW',       label: 'New',       icon: Clock,        colorActive: 'bg-blue-500 text-white',           colorDot: 'bg-blue-500' },
    { id: 'PREPARING', label: 'Cooking',   icon: ChefHat,      colorActive: 'bg-amber-500 text-white',          colorDot: 'bg-amber-500' },
    { id: 'READY',     label: 'Ready',     icon: CheckCircle2, colorActive: 'bg-emerald-500 text-white',        colorDot: 'bg-emerald-500' },
    { id: 'COMPLETED', label: 'Done',      icon: CheckSquare,  colorActive: 'bg-slate-500 text-white',          colorDot: 'bg-slate-400' },
  ]

  return (
    <div className="bg-white/50 backdrop-blur-md border-b border-white/50 shrink-0 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.07)] z-10">
      {/* Filter tabs - horizontally scrollable on mobile */}
      <div className="flex items-center overflow-x-auto hide-scrollbar px-2 py-1.5 gap-1">
        {filters.map(f => {
          const Icon = f.icon
          const isActive = activeFilter === f.id
          const count = counts[f.id]
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[12px] whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
                isActive
                  ? `${f.colorActive} border-transparent shadow-md`
                  : 'bg-white/60 text-slate-500 border-white/40 hover:bg-white hover:text-slate-700 hover:border-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{f.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums min-w-[18px] text-center ${
                isActive
                  ? 'bg-white/30 text-white'
                  : count > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Date picker row — only when COMPLETED is selected */}
      {activeFilter === 'COMPLETED' && (
        <div className="flex items-center gap-2 px-3 pb-2">
          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-white/70 border border-slate-200 text-[12px] font-semibold text-slate-700 outline-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-300 transition-all w-full max-w-[180px]"
          />
          <span className="text-[11px] text-slate-400 font-medium">Filter date</span>
        </div>
      )}
    </div>
  )
}

export type { FilterStatus }
