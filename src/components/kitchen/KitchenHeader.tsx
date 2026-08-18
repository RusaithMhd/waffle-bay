'use client'

import { useEffect, useState } from 'react'
import { Store, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react'
import { logout } from '@/app/login/actions'
import Link from 'next/link'

interface KitchenHeaderProps {
  activeOrderCount: number
  connectionStatus: 'ONLINE' | 'OFFLINE' | 'SYNCING'
  onRefresh: () => void
}

export function KitchenHeader({ activeOrderCount, connectionStatus, onRefresh }: KitchenHeaderProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = now ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'

  return (
    <div className="bg-white/70 backdrop-blur-md border-b border-white/50 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 z-20 shadow-sm">
      {/* Left: Brand */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Link
          href="/pos"
          className="w-8 h-8 sm:w-9 sm:h-9 bg-[#FF6500] rounded-lg flex items-center justify-center shrink-0 hover:bg-[#e65a00] active:scale-95 transition-all shadow-sm"
          title="Back to POS"
        >
          <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </Link>
        <div className="leading-none">
          <div className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#FF6500] uppercase">Waffle Bay</div>
          <div className="text-[15px] sm:text-[18px] font-black text-slate-900 tracking-tight">KITCHEN</div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Active orders badge — always visible, small on mobile */}
        <div className="flex items-center gap-1 bg-orange-50 border border-orange-100 rounded-lg px-2 py-1 shadow-sm">
          <span className="text-[14px] sm:text-[15px] font-black text-[#FF6500]">{activeOrderCount}</span>
          <span className="text-[9px] sm:text-[11px] text-orange-500 font-semibold hidden xs:block">active</span>
        </div>

        {/* Connection dot */}
        <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border shadow-sm ${
          connectionStatus === 'ONLINE'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : connectionStatus === 'SYNCING'
            ? 'bg-amber-50 border-amber-100 text-amber-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {connectionStatus === 'OFFLINE' ? (
            <WifiOff className="w-3.5 h-3.5" />
          ) : connectionStatus === 'SYNCING' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span className="hidden sm:inline">
            {connectionStatus === 'ONLINE' ? 'LIVE' : connectionStatus}
          </span>
        </div>

        {/* Time */}
        <div suppressHydrationWarning className="text-[13px] sm:text-[15px] font-bold text-slate-900 tabular-nums bg-white/60 px-2 sm:px-3 py-1.5 rounded-lg border border-white/50 shadow-sm">
          {timeStr}
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/80 border border-transparent hover:border-slate-200/60 active:scale-90 transition-all"
          aria-label="Refresh orders"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Logout - hidden on mobile, visible sm+ */}
        <button
          onClick={async () => { await logout() }}
          className="hidden sm:flex p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 active:scale-90 transition-all"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
