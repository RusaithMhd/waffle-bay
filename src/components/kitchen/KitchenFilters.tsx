'use client'

type FilterStatus = 'ALL' | 'NEW' | 'PREPARING' | 'READY'

interface KitchenFiltersProps {
  activeFilter: FilterStatus
  counts: { ALL: number; NEW: number; PREPARING: number; READY: number }
  onFilterChange: (filter: FilterStatus) => void
}

const FILTERS: { key: FilterStatus; label: string; color: string; activeColor: string }[] = [
  { key: 'ALL',       label: 'ALL',       color: 'text-[#9CA3AF]', activeColor: 'bg-white text-[#111827]' },
  { key: 'NEW',       label: 'NEW',       color: 'text-[#9CA3AF]', activeColor: 'bg-blue-500 text-white' },
  { key: 'PREPARING', label: 'PREPARING', color: 'text-[#9CA3AF]', activeColor: 'bg-amber-500 text-white' },
  { key: 'READY',     label: 'READY',     color: 'text-[#9CA3AF]', activeColor: 'bg-emerald-500 text-white' },
]

export function KitchenFilters({ activeFilter, counts, onFilterChange }: KitchenFiltersProps) {
  return (
    <div className="bg-[#111827] border-b border-[#374151] px-4 py-3 shrink-0">
      <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-0.5">
        {FILTERS.map(({ key, label, activeColor }) => {
          const isActive = activeFilter === key
          const count = counts[key]
          return (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl whitespace-nowrap font-bold text-[13px] transition-all shrink-0 ${
                isActive
                  ? activeColor + ' shadow-sm'
                  : 'bg-[#1F2937] text-[#9CA3AF] hover:bg-[#374151] hover:text-white border border-[#374151]'
              }`}
            >
              <span>{label}</span>
              <span className={`text-[12px] font-black px-1.5 py-0.5 rounded-md ${
                isActive ? 'bg-black/20' : 'bg-[#374151] text-[#D1D5DB]'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { FilterStatus }
