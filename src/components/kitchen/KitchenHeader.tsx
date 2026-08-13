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
    // Set immediately on mount (client only — avoids SSR mismatch)
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = now ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <div className="bg-white/60 backdrop-blur-md border-b border-white/50 px-4 py-3 flex items-center justify-between shrink-0 z-20 shadow-sm">
      {/* Left: Brand + Screen Label */}
      <div className="flex items-center space-x-3">
        <Link href="/pos" className="w-9 h-9 bg-[#FF6500] rounded-lg flex items-center justify-center shrink-0 hover:bg-[#e65a00] transition-colors shadow-sm" title="Back to POS">
          <Store className="w-5 h-5 text-white" />
        </Link>
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#FF6500] uppercase leading-none">Waffle Bay</div>
          <div className="text-[18px] font-black text-slate-900 leading-tight tracking-tight">KITCHEN</div>
        </div>
      </div>

      {/* Right: Status + Time + Refresh */}
      <div className="flex items-center space-x-3">
        {/* Active orders badge */}
        <div className="hidden sm:flex items-center bg-white/80 border border-slate-200/60 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-[13px] font-bold text-slate-900">{activeOrderCount}</span>
          <span className="text-[11px] text-slate-500 ml-1">active</span>
        </div>

        {/* Connection status */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold shadow-sm border ${
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
        <div suppressHydrationWarning className="text-[15px] font-bold text-slate-900 tabular-nums bg-white/60 px-3 py-1.5 rounded-lg border border-white/50 shadow-sm">{timeStr}</div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/80 border border-transparent hover:border-slate-200/60 transition-all shadow-sm"
          aria-label="Refresh orders"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all shadow-sm"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
