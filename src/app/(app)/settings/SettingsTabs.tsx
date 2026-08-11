'use client'

import Link from 'next/link'
import { Store, Users, Layers } from 'lucide-react'

export function SettingsTabs({ activeTab }: { activeTab: string }) {
  const tabs = [
    { id: 'store', name: 'Store Config', icon: Store },
    { id: 'categories', name: 'Menu Categories', icon: Layers },
    { id: 'staff', name: 'Staff & Roles', icon: Users },
  ]

  return (
    <div className="border-b border-gray-200 overflow-x-auto hide-scrollbar">
      <nav className="-mb-px flex space-x-4 md:space-x-8 min-w-max px-2 md:px-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <Link
              key={tab.id}
              href={`/settings?tab=${tab.id}`}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${isActive
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon
                className={`
                  -ml-0.5 mr-2 h-5 w-5
                  ${isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'}
                `}
              />
              {tab.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
