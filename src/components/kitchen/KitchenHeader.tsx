'use client'

import { useEffect, useState } from 'react'
import { Store, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react'
import { logout } from '@/app/login/actions'

interface KitchenHeaderProps {
  activeOrderCount: number
  connectionStatus: 'ONLINE' | 'OFFLINE' | 'SYNCING'
  onRefresh: () => void
}

export function KitchenHeader({ activeOrderCount, connectionStatus, onRefresh }: KitchenHeaderProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <div className="bg-[#111827] border-b border-[#374151] px-4 py-3 flex items-center justify-between shrink-0 z-20">
      {/* Left: Brand + Screen Label */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 bg-[#FF6500] rounded-lg flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#9CA3AF] uppercase leading-none">Waffle Bay</div>
          <div className="text-[18px] font-black text-white leading-tight tracking-tight">KITCHEN</div>
        </div>
      </div>

      {/* Right: Status + Time + Refresh */}
      <div className="flex items-center space-x-3">
        {/* Active orders badge */}
        <div className="hidden sm:flex items-center bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-1.5">
          <span className="text-[13px] font-bold text-white">{activeOrderCount}</span>
          <span className="text-[11px] text-[#9CA3AF] ml-1">active</span>
        </div>

        {/* Connection status */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold ${
          connectionStatus === 'ONLINE'
            ? 'bg-emerald-500/10 text-emerald-400'
            : connectionStatus === 'SYNCING'
            ? 'bg-amber-500/10 text-amber-400'
            : 'bg-red-500/10 text-red-400'
        }`}>
          {connectionStatus === 'OFFLINE' ? (
            <WifiOff className="w-3.5 h-3.5" />
          ) : connectionStatus === 'SYNCING' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <span className="hidden sm:inline">
            {connectionStatus === 'ONLINE' ? 'LIVE' : connectionStatus}
          </span>
        </div>

        {/* Time */}
        <div className="text-[15px] font-bold text-white tabular-nums">{timeStr}</div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#374151] transition-colors"
          aria-label="Refresh orders"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg text-[#6B7280] hover:text-red-400 hover:bg-[#374151] transition-colors"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
