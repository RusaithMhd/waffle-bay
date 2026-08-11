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
  return (
    <div className="bg-white/40 backdrop-blur-md border-b border-white/50 px-4 py-2 flex items-center justify-between overflow-x-auto hide-scrollbar shrink-0 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10">
      <div className="flex items-center space-x-2">
        <FilterButton
          id="ALL"
          label="All Orders"
          icon={ListTodo}
          count={counts.ALL}
          active={activeFilter === 'ALL'}
          onClick={() => onFilterChange('ALL')}
        />
        <div className="w-px h-6 bg-slate-200/60 mx-1 shrink-0" />
        <FilterButton
          id="NEW"
          label="New"
          icon={Clock}
          count={counts.NEW}
          active={activeFilter === 'NEW'}
          onClick={() => onFilterChange('NEW')}
          colorClass="text-blue-600 bg-blue-50"
        />
        <FilterButton
          id="PREPARING"
          label="Preparing"
          icon={ChefHat}
          count={counts.PREPARING}
          active={activeFilter === 'PREPARING'}
          onClick={() => onFilterChange('PREPARING')}
          colorClass="text-amber-600 bg-amber-50"
        />
        <FilterButton
          id="READY"
          label="Ready"
          icon={CheckCircle2}
          count={counts.READY}
          active={activeFilter === 'READY'}
          onClick={() => onFilterChange('READY')}
          colorClass="text-emerald-600 bg-emerald-50"
        />
        <div className="w-px h-6 bg-slate-200/60 mx-1 shrink-0" />
        <FilterButton
          id="COMPLETED"
          label="Completed"
          icon={CheckSquare}
          count={counts.COMPLETED}
          active={activeFilter === 'COMPLETED'}
          onClick={() => onFilterChange('COMPLETED')}
          colorClass="text-slate-600 bg-slate-200"
        />
      </div>

      {/* Date Picker (visible only when COMPLETED is active, or we can leave it always visible on the right) */}
      {activeFilter === 'COMPLETED' && (
        <div className="flex items-center space-x-2 bg-white/60 border border-white/40 px-3 py-1.5 rounded-lg ml-4">
          <CalendarIcon className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent border-none text-[13px] font-semibold text-slate-700 outline-none cursor-pointer"
          />
        </div>
      )}
    </div>
  )
}

function FilterButton({ id, label, icon: Icon, count, active, onClick, colorClass }: any) {
  const isAll = id === 'ALL'
  
  return (
    <button
      onClick={onClick}
      className={`group flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap border ${
        active
          ? 'bg-white border-white/60 shadow-sm'
          : 'bg-transparent border-transparent hover:bg-white/60 hover:border-white/40'
      }`}
    >
      {isAll ? (
        <Icon className={`w-4 h-4 ${active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`} />
      ) : (
        <div className={`p-1 rounded-md ${active ? colorClass : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      )}
      <span className={`text-[14px] font-semibold ${
        active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'
      }`}>
        {label}
      </span>
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
        active
          ? isAll ? 'bg-slate-100 text-slate-700' : colorClass
          : 'bg-slate-100/50 text-slate-400'
      }`}>
        {count}
      </span>
    </button>
  )
}

export type { FilterStatus }
